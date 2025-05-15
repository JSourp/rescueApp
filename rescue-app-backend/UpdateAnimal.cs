using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt; // Ensure this is included
using System.IO;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs;
using rescueApp.Models.Requests;
// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
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
                    _logger.LogWarning("UpdateAnimal: Token validation failed.");
                    return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
                }

                auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(auth0UserId))
                {
                    _logger.LogError("UpdateAnimal: 'sub' (NameIdentifier) claim missing from token.");
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
                }

                _logger.LogInformation("Token validation successful for user ID (sub): {Auth0UserId}", auth0UserId);

                // Fetch user from DB based on validated Auth0 ID
                currentUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.ExternalProviderId == auth0UserId);

                if (currentUser == null || !currentUser.IsActive)
                {
                    _logger.LogWarning("UpdateAnimal: User not authorized or inactive. ExternalId: {ExternalId}", auth0UserId);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User not authorized or inactive.");
                }

                // Check Role - Admins and Staff can update
                var allowedRoles = new[] { "Admin", "Staff" }; // Case-sensitive
                if (!allowedRoles.Contains(currentUser.Role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to update animal. UserID: {UserId}", currentUser.Role, currentUser.Id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to update animal.");
                }
                _logger.LogInformation("User {UserId} with role {UserRole} authorized.", currentUser.Id, currentUser.Role);
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
                    return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Animal not found.");
                }

                bool changed = false;

                // Update properties comparing model to DTO
                if (updateData!.AnimalType != null && existingAnimal.AnimalType != updateData.AnimalType) { existingAnimal.AnimalType = updateData.AnimalType; changed = true; }
                if (updateData!.Name != null && existingAnimal.Name != updateData.Name) { existingAnimal.Name = updateData.Name; changed = true; }
                if (updateData!.Breed != null && existingAnimal.Breed != updateData.Breed) { existingAnimal.Breed = updateData.Breed; changed = true; }
                // Use SpecifyKind for date again
                DateTime? dobUtc = updateData.DateOfBirth.HasValue ? DateTime.SpecifyKind(updateData.DateOfBirth.Value, DateTimeKind.Utc) : null;
                if (updateData!.DateOfBirth != null && existingAnimal.DateOfBirth != dobUtc) { existingAnimal.DateOfBirth = dobUtc; changed = true; }
                if (updateData!.Gender != null && existingAnimal.Gender != updateData.Gender) { existingAnimal.Gender = updateData.Gender; changed = true; }
                if (updateData!.Weight != null && existingAnimal.Weight != updateData.Weight) { existingAnimal.Weight = updateData.Weight; changed = true; }
                if (updateData!.Story != null && existingAnimal.Story != updateData.Story) { existingAnimal.Story = updateData.Story; changed = true; }
                if (updateData!.AdoptionStatus != null && existingAnimal.AdoptionStatus != updateData.AdoptionStatus) { existingAnimal.AdoptionStatus = updateData.AdoptionStatus; changed = true; }

                // Always set the user performing the update if any profile data changed
                existingAnimal.UpdatedByUserId = currentUser.Id;

                // --- Logic for AdoptionStatus and CurrentFosterUserId ---
                if (updateData.AdoptionStatus != null && existingAnimal.AdoptionStatus != updateData.AdoptionStatus)
                {
                    existingAnimal.AdoptionStatus = updateData.AdoptionStatus;
                    changed = true;
                    _logger.LogInformation("Animal ID {AnimalId} status changed to {NewStatus}", existingAnimal.Id, existingAnimal.AdoptionStatus);

                    // If status indicates "In Foster", expect CurrentFosterUserId
                    if (existingAnimal.AdoptionStatus.Contains("foster", StringComparison.CurrentCultureIgnoreCase))
                    {
                        if (updateData.CurrentFosterUserId.HasValue)
                        {
                            // Check if the provided foster user ID is valid (exists and is not a "Guest")
                            var fosterUser = await _dbContext.Users.FirstOrDefaultAsync(u =>
                                u.Id == updateData.CurrentFosterUserId.Value &&
                                u.Role != "Guest");

                            if (fosterUser != null)
                            {
                                if (existingAnimal.CurrentFosterUserId != updateData.CurrentFosterUserId.Value)
                                {
                                    existingAnimal.CurrentFosterUserId = updateData.CurrentFosterUserId.Value;
                                    _logger.LogInformation("Animal ID {AnimalId} assigned to Foster User ID {FosterId} ({FosterRole})",
                                        existingAnimal.Id, existingAnimal.CurrentFosterUserId, fosterUser.Role);
                                }
                            }
                            else
                            {
                                _logger.LogWarning("Invalid or non-Foster User ID {FosterId} provided for foster placement of Animal ID {AnimalId}. CurrentFosterUserId will not be set.", updateData.CurrentFosterUserId.Value, existingAnimal.Id);
                            }
                        }
                        else // Status implies foster, but no foster ID provided
                        {
                            _logger.LogWarning("Animal ID {AnimalId} status set to '{Status}' but no CurrentFosterUserId provided. Clearing existing foster if any.", existingAnimal.Id, existingAnimal.AdoptionStatus);
                            if (existingAnimal.CurrentFosterUserId != null)
                            {
                                existingAnimal.CurrentFosterUserId = null; // Clear foster
                            }
                        }
                    }
                    else // Status does NOT indicate "In Foster"
                    {
                        if (existingAnimal.CurrentFosterUserId != null)
                        {
                            _logger.LogInformation("Animal ID {AnimalId} status changed away from foster status. Clearing CurrentFosterUserId.", existingAnimal.Id);
                            existingAnimal.CurrentFosterUserId = null; // Clear foster
                        }
                    }
                }
                else if (updateData.CurrentFosterUserId.HasValue && existingAnimal.CurrentFosterUserId != updateData.CurrentFosterUserId.Value)
                {
                    // This handles direct change of foster parent without status necessarily changing,
                    // OR initial assignment if status was already "In Foster".
                    // Requires the status to already be a foster status or to be changing to one.
                    if (existingAnimal.AdoptionStatus != null && existingAnimal.AdoptionStatus.Contains("foster", StringComparison.CurrentCultureIgnoreCase))
                    {
                        var fosterUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == updateData.CurrentFosterUserId.Value && u.Role == "Foster");
                        if (fosterUser != null)
                        {
                            existingAnimal.CurrentFosterUserId = updateData.CurrentFosterUserId.Value;
                            changed = true;
                            _logger.LogInformation("Animal ID {AnimalId} CurrentFosterUserId updated to {FosterId}", existingAnimal.Id, existingAnimal.CurrentFosterUserId);
                        }
                        else
                        {
                            _logger.LogWarning("Invalid or non-Foster User ID {FosterId} provided for direct foster assignment of Animal ID {AnimalId}.", updateData.CurrentFosterUserId.Value, existingAnimal.Id);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Attempted to set CurrentFosterUserId for Animal ID {AnimalId} but its status '{AnimalStatus}' is not a foster status.", existingAnimal.Id, existingAnimal.AdoptionStatus);
                    }
                }
                else if (updateData.CurrentFosterUserId == null && existingAnimal.CurrentFosterUserId != null &&
                    (updateData.AdoptionStatus == null || updateData.AdoptionStatus?.ToLower().Contains("foster", StringComparison.CurrentCultureIgnoreCase) == false))
                {
                    // Explicitly clearing foster (CurrentFosterUserId sent as null) AND status is not (or not becoming) a foster status
                    _logger.LogInformation("CurrentFosterUserId explicitly cleared for Animal ID {AnimalId}.", existingAnimal.Id);
                    existingAnimal.CurrentFosterUserId = null;
                    changed = true;
                }

                if (changed)
                {
                    existingAnimal.UpdatedByUserId = currentUser!.Id; // Use non-null assertion after auth check
                    // DateUpdated handled by DB trigger or EF config
                    await _dbContext.SaveChangesAsync();
                    _logger.LogInformation("Animal ID {AnimalId} updated successfully.", existingAnimal.Id);
                }
                else
                {
                    _logger.LogInformation("No changes detected for Animal ID {AnimalId}", id);
                }

                // --- Return Response ---
                var response = req.CreateResponse(HttpStatusCode.OK);
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
