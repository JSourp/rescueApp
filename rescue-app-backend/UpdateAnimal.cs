using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt; // Ensure this is included
using System.IO;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;
using rescueApp.Models;
// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    // DTO for the update request body - Only include fields that can be updated
    // Properties are nullable to allow partial updates (PATCH-like behavior)
    public class UpdateAnimalRequest
    {
        [MaxLength(100)]
        public string? animal_type { get; set; }

        [MaxLength(100)]
        public string? Name { get; set; }

        [MaxLength(100)]
        public string? Breed { get; set; }

        public DateTime? date_of_birth { get; set; }

        [MaxLength(10)]
        public string? Gender { get; set; }

        [Range(0.1, 300)]
        public decimal? Weight { get; set; }

        public string? Story { get; set; }

        [MaxLength(50)]
        public string? adoption_status { get; set; }

        public string? image_url { get; set; } // Allow updating image URL
    }


    public class UpdateAnimal
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<UpdateAnimal> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public UpdateAnimal(AppDbContext dbContext, ILogger<UpdateAnimal> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("UpdateAnimal")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            // TODO: Change AuthorizationLevel from Anonymous after testing/implementing real auth
            [HttpTrigger(AuthorizationLevel.Anonymous, "PUT", Route = "animals/{id}")]
            AzureFuncHttp.HttpRequestData req,
            int id) // Animal ID from route
        {
            _logger.LogInformation("C# HTTP trigger function processed UpdateAnimal request for ID: {animal_id}", id);

            User? currentUser;
            ClaimsPrincipal? principal;
            string? auth0UserId = null;
            var utcNow = DateTime.UtcNow;

            // --- 1. Authentication & Authorization ---
            try
            {
                // --- Token Validation ---
                principal = await ValidateTokenAndGetPrincipal(req);
                if (principal == null)
                {
                    _logger.LogWarning("UpdateUserProfile: Token validation failed.");
                    return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
                }

                auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(auth0UserId))
                {
                    _logger.LogError("UpdateUserProfile: 'sub' (NameIdentifier) claim missing from token.");
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
                }

                _logger.LogInformation("Token validation successful for user ID (sub): {Auth0UserId}", auth0UserId);

                // Fetch user from DB based on validated Auth0 ID
                currentUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.external_provider_id == auth0UserId);

                if (currentUser == null || !currentUser.is_active)
                {
                    _logger.LogWarning("UpdateAnimal: User not authorized or inactive. ExternalId: {ExternalId}", auth0UserId);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User not authorized or inactive.");
                }

                // Check Role - Admins and Staff can update
                var allowedRoles = new[] { "Admin", "Staff" }; // Case-sensitive
                if (!allowedRoles.Contains(currentUser.role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to update animal. UserID: {UserId}", currentUser.role, currentUser.id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to update animal.");
                }
                _logger.LogInformation("User {UserId} with role {UserRole} authorized.", currentUser.id, currentUser.role);
            }
            catch (Exception ex) // Catch potential exceptions during auth/authz
            {
                _logger.LogError(ex, "Error during authentication/authorization in UpdateAnimal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication/Authorization error.");
            }
            // --- End Auth ---


            // --- 2. Deserialize & Validate Request Body ---
            string requestBody;
            UpdateAnimalRequest? updateData;
            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

                updateData = JsonSerializer.Deserialize<UpdateAnimalRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new List<ValidationResult>();
                bool isValid = Validator.TryValidateObject(updateData!, new ValidationContext(updateData!), validationResults, true);

                if (!isValid || updateData == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => vr.ErrorMessage));
                    _logger.LogWarning("UpdateAnimal request body validation failed. Errors: {@ValidationErrors}, Body: {Body}", errors, requestBody);
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid animal data provided: {errors}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deserializing or validating UpdateAnimal request body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
            }
            if (updateData == null) { /* Should be caught above, but defensive check */ return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }


            // --- 3. Find and Update Animal ---
            try
            {
                var existingAnimal = await _dbContext.Animals.FindAsync(id);

                if (existingAnimal == null)
                {
                    _logger.LogWarning("Animal not found for update. Animal ID: {animal_id}", id);
                    return req.CreateResponse(HttpStatusCode.NotFound);
                }

                // Update properties only if a value was provided in the request DTO
                if (updateData.animal_type != null && existingAnimal.animal_type != updateData.animal_type) { existingAnimal.animal_type = updateData.animal_type; }
                if (updateData.Name != null && existingAnimal.name != updateData.Name) { existingAnimal.name = updateData.Name; }
                if (updateData.Breed != null && existingAnimal.breed != updateData.Breed) { existingAnimal.breed = updateData.Breed; }
                if (updateData.date_of_birth.HasValue) // Check if a value was provided
                {
                    // Create a UTC DateTime from the potentially Unspecified input
                    DateTime dobUtc = DateTime.SpecifyKind(updateData.date_of_birth.Value, DateTimeKind.Utc);
                    if (existingAnimal.date_of_birth != dobUtc) // Compare with UTC value
                    {
                        existingAnimal.date_of_birth = dobUtc; // Assign the UTC DateTime
                    }
                } // Optional: Handle case where user explicitly clears the date
                else if (updateData.date_of_birth == null && existingAnimal.date_of_birth != null)
                {
                    existingAnimal.date_of_birth = null;
                }
                if (updateData.Gender != null && existingAnimal.gender != updateData.Gender) { existingAnimal.gender = updateData.Gender; }
                if (updateData.Weight != null && existingAnimal.weight != updateData.Weight) { existingAnimal.weight = updateData.Weight; }
                if (updateData.Story != null && existingAnimal.story != updateData.Story) { existingAnimal.story = updateData.Story; }
                if (updateData.adoption_status != null && existingAnimal.adoption_status != updateData.adoption_status) { existingAnimal.adoption_status = updateData.adoption_status; }
                if (updateData.image_url != null && existingAnimal.image_url != updateData.image_url) { existingAnimal.image_url = updateData.image_url; }
                // Add other updatable fields...

                // Always set the user performing the update if any profile data changed
                existingAnimal.updated_by_user_id = currentUser.id;

                // ---- Save if ANY changes were detected by EF Core ----
                // (This includes changes to updated_by_user_id or any other field)
                if (_dbContext.ChangeTracker.HasChanges())
                {
                    _logger.LogInformation("Saving updates for Animal ID: {AnimalId} by User ID: {UserId}.", existingAnimal.id, currentUser!.id);
                    await _dbContext.SaveChangesAsync(); // Save changes
                }
                else
                {
                    _logger.LogInformation("No changes detected by EF Core for Animal ID: {AnimalId}", existingAnimal.id);
                }

                // --- 4. Return Response ---
                var response = req.CreateResponse(HttpStatusCode.OK); // Return 200 OK
                                                                      // Return the updated animal data (serialized with camelCase)
                var jsonResponse = JsonSerializer.Serialize(existingAnimal, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                await response.WriteStringAsync(jsonResponse);
                return response;
            }
            catch (DbUpdateException dbEx) // Catch specific DB errors
            {
                _logger.LogError(dbEx, "Database error updating animal. InnerEx: {InnerMessage}", dbEx.InnerException?.Message);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "A database error occurred while updating the animal.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating animal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while updating the animal.");
            }
        }

        // --- Token Validation Logic shared helper/service ---
        private async Task<ClaimsPrincipal?> ValidateTokenAndGetPrincipal(AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("Validating token...");

            // 1. Get Token from Header
            if (!req.Headers.TryGetValues("Authorization", out var authHeaders) || !authHeaders.Any())
            {
                _logger.LogWarning("ValidateTokenAndGetPrincipal: Missing Authorization header.");
                return null;
            }

            string bearerToken = authHeaders.First();
            if (!bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("ValidateTokenAndGetPrincipal: Invalid Authorization header format.");
                return null;
            }

            string token = bearerToken.Substring("Bearer ".Length).Trim();

            // 2. Initialize Validation Parameters if needed
            if (_validationParameters == null && !string.IsNullOrEmpty(_auth0Domain) && !string.IsNullOrEmpty(_auth0Audience))
            {
                _configManager ??= new ConfigurationManager<OpenIdConnectConfiguration>(
                    $"{_auth0Domain}.well-known/openid-configuration",
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever());

                var discoveryDocument = await _configManager.GetConfigurationAsync(default);
                var signingKeys = discoveryDocument.SigningKeys;

                _validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = _auth0Domain,
                    ValidateAudience = true,
                    ValidAudience = _auth0Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1) // Allow for small clock differences
                };

                _logger.LogInformation("Initialized TokenValidationParameters...");
            }
            else if (_validationParameters == null)
            {
                _logger.LogError("Auth0 Domain or Audience configuration missing, cannot validate token.");
                return null;
            }

            // 3. Validate Token
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var validationResult = await handler.ValidateTokenAsync(token, _validationParameters);

                if (!validationResult.IsValid)
                {
                    _logger.LogWarning("Token validation failed: {ExceptionMessage}", validationResult.Exception?.Message ?? "Unknown validation error");
                    return null;
                }

                if (validationResult.ClaimsIdentity == null)
                {
                    _logger.LogError("Token validation succeeded but ClaimsIdentity is null.");
                    return null;
                }

                _logger.LogInformation("Token validation successful.");
                return new ClaimsPrincipal(validationResult.ClaimsIdentity);
            }
            catch (Exception ex)
            {
                _logger.LogError("Error during token validation: {Message}", ex.Message);
                return null;
            }
        }

        // Helper for creating error responses
        private async Task<AzureFuncHttp.HttpResponseData> CreateErrorResponse(
            AzureFuncHttp.HttpRequestData req,
            HttpStatusCode statusCode,
            string message)
        {
            // Log the error message
            _logger.LogWarning("Creating error response. StatusCode: {StatusCode}, Message: {Message}", statusCode, message);

            // Create the response object
            var response = req.CreateResponse(statusCode);

            // Set the content type to JSON
            response.Headers.Add("Content-Type", "application/json");

            // Build the error response body
            var errorResponse = new
            {
                error = new
                {
                    code = statusCode.ToString(),
                    message = message
                }
            };

            // Serialize the error response to JSON and write it to the response body
            await response.WriteStringAsync(JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // Use camelCase for JSON properties
                WriteIndented = true // Optional: Pretty-print the JSON
            }));

            return response;
        }
    }
}
