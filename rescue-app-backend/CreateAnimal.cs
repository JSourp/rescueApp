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
    // DTO (Data Transfer Object) for the request body
    // Uses PascalCase for C# naming conventions. System.Text.Json can map
    // incoming camelCase JSON to this using PropertyNameCaseInsensitive = true.
    public class CreateAnimalRequest
    {
        [Required(AllowEmptyStrings = false)]
        [MaxLength(100)]
        public string? animal_type { get; set; } // e.g., "Dog", "Cat"

        [Required(AllowEmptyStrings = false)]
        [MaxLength(100)]
        public string? Name { get; set; }

        [Required(AllowEmptyStrings = false)]
        [MaxLength(100)]
        public string? Breed { get; set; }

        public DateTime? date_of_birth { get; set; } // Nullable DateTime

        [Required(AllowEmptyStrings = false)]
        [MaxLength(10)] // e.g., "Male", "Female", "Unknown"
        public string? Gender { get; set; }

        [Range(0.1, 300)] // Example reasonable weight range in lbs
        public decimal? Weight { get; set; } // Nullable decimal

        public string? Story { get; set; } // Nullable string

        [Required(AllowEmptyStrings = false)]
        [MaxLength(50)] // Match DB size if needed
        public string? adoption_status { get; set; } // e.g., "Available", "Not Yet Available"
    }

    public class CreateAnimal
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<CreateAnimal> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public CreateAnimal(AppDbContext dbContext, ILogger<CreateAnimal> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("CreateAnimal")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            // TODO: Change AuthorizationLevel from Anonymous after testing/implementing real auth
            [HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "animals")]
            AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed CreateAnimal request.");

            User? currentUser;
            ClaimsPrincipal? principal;
            string? auth0UserId = null;

            // --- 1. Authentication & Authorization ---
            try
            {
                // --- Token Validation ---
                principal = await ValidateTokenAndGetPrincipal(req);
                if (principal == null)
                {
                    _logger.LogWarning("CreateAnimal: Token validation failed.");
                    return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
                }

                auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(auth0UserId))
                {
                    _logger.LogError("CreateAnimal: 'sub' (NameIdentifier) claim missing from token.");
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
                }

                _logger.LogInformation("Token validation successful for user ID (sub): {Auth0UserId}", auth0UserId);

                // Fetch user from DB based on validated Auth0 ID
                currentUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.ExternalProviderId == auth0UserId);

                if (currentUser == null || !currentUser.IsActive)
                {
                    _logger.LogWarning("User not found in DB or inactive for external ID: {ExternalId}", auth0UserId);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User not authorized or inactive.");
                }

                // Check Role - Admins and Staff can create
                var allowedRoles = new[] { "Admin", "Staff" }; // Case-sensitive match with DB role
                if (!allowedRoles.Contains(currentUser.Role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to create animal. UserID: {UserId}", currentUser.Role, currentUser.Id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to create animal.");
                }

                _logger.LogInformation("User {UserId} with role {UserRole} authorized to create animal.", currentUser.Id, currentUser.Role);

            }
            catch (Exception ex) // Catch potential exceptions during auth/authz
            {
                _logger.LogError(ex, "Error during authentication/authorization in CreateAnimal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication/Authorization error.");
            }


            // --- 2. Deserialize & Validate Request Body ---
            string requestBody;
            CreateAnimalRequest? createData;
            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

                createData = JsonSerializer.Deserialize<CreateAnimalRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new List<ValidationResult>();
                bool isValid = Validator.TryValidateObject(createData!, new ValidationContext(createData!), validationResults, true);

                if (!isValid || createData == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => vr.ErrorMessage));
                    _logger.LogWarning("CreateAnimal request body validation failed. Errors: {ValidationErrors}, Body: {Body}", errors, requestBody);
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid animal data provided: {errors}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deserializing or validating CreateAnimal request body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
            }
            if (createData == null) { /* Should be caught above, but defensive check */ return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }


            // --- 3. Create and Save Animal ---
            try
            {
                var utcNow = DateTime.UtcNow; // Kind is Utc

                // Ensure date_of_birth has Utc Kind if provided
                DateTime? dateOfBirthUtc = null;
                if (createData.date_of_birth.HasValue)
                {
                    dateOfBirthUtc = DateTime.SpecifyKind(createData.date_of_birth.Value, DateTimeKind.Utc);
                }

                var newAnimal = new Animal
                {
                    AnimalType = createData.animal_type!,
                    Name = createData.Name!,
                    Breed = createData.Breed!,
                    DateOfBirth = dateOfBirthUtc,
                    Gender = createData.Gender!,
                    Weight = createData.Weight, // Nullable decimal?
                    Story = createData.Story, // Nullable string
                    AdoptionStatus = createData.adoption_status!, // Use status from request
                    CreatedByUserId = currentUser.Id,
                    UpdatedByUserId = currentUser.Id
                };

                _dbContext.Animals.Add(newAnimal);
                await _dbContext.SaveChangesAsync(); // Should now save DOB correctly

                _logger.LogInformation("Successfully created new Animal with ID: {animal_id} by User ID: {UserId}", newAnimal.Id, currentUser!.Id); // Use currentUser safely

                // --- 4. Return Response ---
                var response = req.CreateResponse(HttpStatusCode.Created);
                var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                var jsonPayload = JsonSerializer.Serialize(newAnimal, jsonOptions);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                response.Headers.Add("Location", $"/api/animals/{newAnimal.Id}");
                await response.WriteStringAsync(jsonPayload);
                return response;
            }
            catch (DbUpdateException dbEx) // Catch specific DB errors
            {
                _logger.LogError(dbEx, "Database error creating animal. InnerEx: {InnerMessage}", dbEx.InnerException?.Message);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "A database error occurred while creating the animal.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating animal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while creating the animal.");
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
