using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations; // Required for validation attributes
using System.IdentityModel.Tokens.Jwt; // Ensure this is included
using System.IO;
using System.Linq;
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
    public class CreateAdoptionRequest
    {
        [Required(ErrorMessage = "animal_id is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid animal_id is required.")]
        public int animal_id { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter first name is required.")]
        [MaxLength(100)]
        public string? adopter_first_name { get; set; } // Nullable string, Required handles validation

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter last name is required.")]
        [MaxLength(100)]
        public string? adopter_last_name { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string? adopter_email { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Primary phone is required.")]
        [Phone(ErrorMessage = "Invalid phone number format.")] // Basic phone format check
        [MaxLength(30)]
        public string? adopter_primary_phone { get; set; }

        [Required(ErrorMessage = "Primary phone type is required.")]
        [RegularExpression("^(Cell|Home|Work)$", ErrorMessage = "Phone type must be Cell, Home, or Work.")] // Enforce specific values
        [MaxLength(10)]
        public string? adopter_primary_phone_type { get; set; }

        [Phone(ErrorMessage = "Invalid secondary phone format.")]
        [MaxLength(30)]
        public string? adopter_secondary_phone { get; set; } // Optional

        [RegularExpression("^(Cell|Home|Work)$", ErrorMessage = "Phone type must be Cell, Home, or Work.")]
        [MaxLength(10)]
        public string? adopter_secondary_phone_type { get; set; } // Optional

        [Required(AllowEmptyStrings = false, ErrorMessage = "Street address is required.")]
        [MaxLength(255)]
        public string? adopter_street_address { get; set; }

        [MaxLength(50)]
        public string? adopter_apt_unit { get; set; } // Optional

        [Required(AllowEmptyStrings = false, ErrorMessage = "City is required.")]
        [MaxLength(100)]
        public string? adopter_city { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "State/Province is required.")]
        [MaxLength(100)]
        public string? adopter_state_province { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Zip/Postal code is required.")]
        [MaxLength(20)]
        public string? adopter_zip_postal_code { get; set; }

        [MaxLength(100)]
        public string? spouse_partner_roommate { get; set; } // Optional

        // Optional fields below
        public DateTime? adoption_date { get; set; } // Optional? Default to now if missing
        public string? notes { get; set; }
        public string? how_heard { get; set; }
        public string? botcheck { get; set; } // Honeypot field for spam prevention
    }


    public class CreateAdoption
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<CreateAdoption> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public CreateAdoption(AppDbContext dbContext, ILogger<CreateAdoption> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("CreateAdoption")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            // TODO: Secure this endpoint properly (AuthorizationLevel.Function/Admin)
            [HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "adoptions")]
            AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed CreateAdoption request.");

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
                    _logger.LogWarning("User not found in DB or inactive for external ID: {ExternalId}", auth0UserId);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User not authorized or inactive.");
                }

                // Check Role - Admins, Staff, or Volunteers can create
                var allowedRoles = new[] { "Admin", "Staff", "Volunteer" }; // Case-sensitive match with DB role
                if (!allowedRoles.Contains(currentUser.role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to create animal. UserID: {UserId}", currentUser.role, currentUser.id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to create animal.");
                }

                _logger.LogInformation("User {UserId} with role {UserRole} authorized to create animal.", currentUser.id, currentUser.role);

            }
            catch (Exception ex) // Catch potential exceptions during auth/authz
            {
                _logger.LogError(ex, "Error during authentication/authorization in CreateAnimal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication/Authorization error.");
            }
            // --- End Auth ---


            // --- 2. Deserialize & Validate Request Body ---
            string requestBody = string.Empty; // Initialize outside try
            CreateAdoptionRequest? adoptionRequest;
            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

                adoptionRequest = JsonSerializer.Deserialize<CreateAdoptionRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                // Honeypot check first
                if (adoptionRequest != null && !string.IsNullOrEmpty(adoptionRequest.botcheck))
                {
                    _logger.LogWarning("Bot submission detected via honeypot field in CreateAdoption.");
                    return req.CreateResponse(HttpStatusCode.OK); // Return OK to not alert bot
                }

                // Use Data Annotations for Validation
                var validationResults = new List<ValidationResult>();
                var validationContext = new ValidationContext(adoptionRequest!, serviceProvider: null, items: null);
                bool isValid = Validator.TryValidateObject(adoptionRequest!, validationContext, validationResults, validateAllProperties: true);

                if (!isValid || adoptionRequest == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.FirstOrDefault() ?? "Request")}: {vr.ErrorMessage}"));
                    _logger.LogWarning("CreateAdoption request body validation failed. Validation Errors: [{ValidationErrors}]. Body Preview: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid adoption data: {errors}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deserializing or validating CreateAnimal request body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
            }
            if (adoptionRequest == null) { /* Should be caught above, but defensive check */ return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }


            // --- 3. Database Transaction ---
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // 4. Find Animal & Check Status
                var animalToAdopt = await _dbContext.Animals.FindAsync(adoptionRequest.animal_id);
                if (animalToAdopt == null)
                {
                    _logger.LogWarning("Animal not found for adoption. Animal ID: {animal_id}", adoptionRequest.animal_id);
                    return req.CreateResponse(HttpStatusCode.NotFound);
                }

                {/* TODO: remove 'Adopted' from this, once all current test 'Adopted' animals have an adoption record */}
                var adoptableStatuses = new List<string> { "Available", "Available - In Foster", "Adoption Pending", "Adopted" };
                if (animalToAdopt!.adoption_status == null || !adoptableStatuses.Contains(animalToAdopt.adoption_status))
                {
                    _logger.LogWarning("Animal not found for adoption. Animal ID: {animal_id}", adoptionRequest.animal_id);
                    return req.CreateResponse(HttpStatusCode.NotFound);
                }


                // 5. Find or Create Adopter
                var adopter = await FindOrCreateAdopterAsync(adoptionRequest);
                if (adopter == null)
                {
                    // This implies DB save failed within helper or data was invalid, should not happen if validation is good
                    _logger.LogError("Failed to find or create adopter record.");
                    await transaction.RollbackAsync();
                    return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to process adopter information.");
                }
                // Ensure adopter ID is available if newly created (SaveChanges in helper not ideal for transaction)
                if (adopter.Id <= 0 && _dbContext.Entry(adopter).State == EntityState.Added)
                {
                    // If FindOrCreateAdopterAsync adds but doesn't save, save here to get ID
                    // OR modify FindOrCreateAdopterAsync to just return the *object* and add it here
                    await _dbContext.SaveChangesAsync(); // Save Adopter first if new to get ID
                }


                // 6. Check Active Adoption History
                bool alreadyActivelyAdopted = await _dbContext.AdoptionHistories
                    .AnyAsync(ah => ah.animal_id == adoptionRequest.animal_id && ah.return_date == null);
                if (alreadyActivelyAdopted)
                {
                    /* Log, Rollback, return 409 Conflict */
                    _logger.LogWarning("Animal ID {animal_id} already has an active adoption record.", adoptionRequest.animal_id);
                    await transaction.RollbackAsync();
                    return await CreateErrorResponse(req, HttpStatusCode.Conflict, "Animal already has an active adoption record.");
                }


                // 7. Create AdoptionHistory Record
                var utcNow = DateTime.UtcNow;
                var newAdoptionRecord = new AdoptionHistory
                {
                    animal_id = animalToAdopt.id,
                    adopter_id = adopter.Id, // Use ID from found/created adopter
                    // Use provided date (ensure UTC) or default to now
                    adoption_date = adoptionRequest.adoption_date.HasValue
                                    ? DateTime.SpecifyKind(adoptionRequest.adoption_date.Value, DateTimeKind.Utc)
                                    : utcNow,
                    return_date = null,
                    notes = adoptionRequest.notes,
                    created_by_user_id = currentUser.id, // Use the validated admin/staff user ID
                    date_created = utcNow // Explicitly set or rely on DB default configured via EF
                };
                _dbContext.AdoptionHistories.Add(newAdoptionRecord);

                // 8. Update Animal
                animalToAdopt.adoption_status = "Adopted";
                animalToAdopt.date_updated = utcNow; // Explicitly set or rely on DB trigger configured via EF
                _dbContext.Animals.Update(animalToAdopt);


                // 9. Save Changes (Adopter, History, Animal)
                await _dbContext.SaveChangesAsync();

                // 10. Commit Transaction
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully recorded adoption for Animal ID: {animal_id}. Adopter ID: {AdopterId}, History ID: {HistoryId}", animalToAdopt.id, adopter.Id, newAdoptionRecord.id);

                // 11. Return Success Response
                var response = req.CreateResponse(HttpStatusCode.Created);
                var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                var jsonPayload = JsonSerializer.Serialize(newAdoptionRecord, jsonOptions); // Return history record
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                response.Headers.Add("Location", $"/api/adoptionhistory/{newAdoptionRecord.id}"); // Example location
                await response.WriteStringAsync(jsonPayload);
                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error processing adoption transaction for Animal ID: {animal_id}. Request Body Preview: {BodyPreview}", adoptionRequest?.animal_id, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while finalizing the adoption.");
            }
        }


        // --- Helper Method: Find Or Create Adopter ---
        private async Task<Adopter?> FindOrCreateAdopterAsync(CreateAdoptionRequest reqData)
        {
            // Use email as the unique identifier (ensure it's not null/whitespace due to prior validation)
            var adopterEmailLower = reqData.adopter_email!.ToLowerInvariant();
            var existingAdopter = await _dbContext.Adopters
                                      .FirstOrDefaultAsync(a => a.adopter_email.ToLowerInvariant() == adopterEmailLower);

            if (existingAdopter != null)
            {
                _logger.LogInformation("Found existing adopter by email. AdopterId: {AdopterId}", existingAdopter.Id);
                // Optional: Update existing adopter's info if provided data differs
                bool changed = false;
                if (existingAdopter.adopter_first_name != reqData.adopter_first_name) { existingAdopter.adopter_first_name = reqData.adopter_first_name!; changed = true; }
                if (existingAdopter.adopter_last_name != reqData.adopter_last_name) { existingAdopter.adopter_last_name = reqData.adopter_last_name!; changed = true; }
                // ... check/update other fields ...
                if (changed)
                {
                    _logger.LogInformation("Updating existing adopter info for AdopterId: {AdopterId}", existingAdopter.Id);
                    // date_updated handled by EF config/trigger
                    _dbContext.Adopters.Update(existingAdopter);
                    // SaveChanges will happen in the main transaction
                }
                return existingAdopter;
            }
            else
            {
                _logger.LogInformation("Creating new adopter record for email: {Email}", reqData.adopter_email);
                var newAdopter = new Adopter
                {
                    // Map ALL required fields from reqData (use ! safely after validation)
                    adopter_first_name = reqData.adopter_first_name!,
                    adopter_last_name = reqData.adopter_last_name!,
                    adopter_email = reqData.adopter_email!,
                    adopter_primary_phone = reqData.adopter_primary_phone!,
                    adopter_primary_phone_type = reqData.adopter_primary_phone_type!,
                    adopter_street_address = reqData.adopter_street_address!,
                    adopter_city = reqData.adopter_city!,
                    adopter_state_province = reqData.adopter_state_province!,
                    adopter_zip_postal_code = reqData.adopter_zip_postal_code!,
                    // Map optional fields
                    adopter_secondary_phone = reqData.adopter_secondary_phone,
                    adopter_secondary_phone_type = reqData.adopter_secondary_phone_type,
                    spouse_partner_roommate = reqData.spouse_partner_roommate,
                    adopter_apt_unit = reqData.adopter_apt_unit,
                    notes = null, // General notes not part of this request DTO
                                  // date_created / date_updated handled by EF config/DB defaults/triggers
                };
                _dbContext.Adopters.Add(newAdopter);
                // Let the main SaveChangesAsync call handle this insert within the transaction
                return newAdopter;
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
