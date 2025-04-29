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
using Microsoft.EntityFrameworkCore.Storage;
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

                // Check Role - Admins or Staff can finalize an adoption
                var allowedRoles = new[] { "Admin", "Staff" }; // Case-sensitive match with DB role
                if (!allowedRoles.Contains(currentUser.role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to finalize an adoption. UserID: {UserId}", currentUser.role, currentUser.id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to finalize an adoption.");
                }

                _logger.LogInformation("User {UserId} with role {UserRole} authorized to finalize an adoption.", currentUser.id, currentUser.role);

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
                    _logger.LogWarning("Animal not found for adoption. Animal Id: {animal_id}", adoptionRequest.animal_id);
                    await transaction.RollbackAsync(); // Rollback before returning error
                    return req.CreateResponse(HttpStatusCode.NotFound);
                }

                var adoptableStatuses = new List<string> { "Available", "Available - In Foster", "Adoption Pending" };
                if (animalToAdopt!.adoption_status == null || !adoptableStatuses.Contains(animalToAdopt.adoption_status))
                {
                    _logger.LogWarning("Animal not found for adoption. Animal ID: {animal_id}", adoptionRequest.animal_id);
                    await transaction.RollbackAsync(); // Rollback before returning error
                    return req.CreateResponse(HttpStatusCode.NotFound);
                }

                // Ensure currentUser is not null before accessing id
                if (currentUser == null)
                {
                    // This case should ideally be caught by earlier checks, but defensive programming
                    return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Current user context lost.");
                }

                // 5. Find or Create Adopter
                var adopter = await FindOrCreateAdopterAsync(adoptionRequest, currentUser.id);
                if (adopter == null)
                {
                    _logger.LogError("Failed to find or create adopter record.");
                    await transaction.RollbackAsync();
                    return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to process adopter information.");
                }


                // 6. Check Active Adoption History
                bool alreadyActivelyAdopted = await _dbContext.AdoptionHistories
                    .AnyAsync(ah => ah.animal_id == adoptionRequest.animal_id && ah.return_date == null);
                if (alreadyActivelyAdopted)
                {
                    // Create more specific message
                    string conflictMessage = $"Cannot finalize: '{animalToAdopt.name ?? "Animal"}' (ID: {adoptionRequest.animal_id}) already has an active adoption record where a return has not been logged.";
                    _logger.LogWarning(conflictMessage);
                    await transaction.RollbackAsync();
                    // Send specific message back in the error response
                    return await CreateErrorResponse(req, HttpStatusCode.Conflict, conflictMessage);
                }


                // 7. Create AdoptionHistory Record
                var utcNow = DateTime.UtcNow;
                var newAdoptionRecord = new AdoptionHistory
                {
                    animal_id = animalToAdopt.id,
                    // --- Use Navigation Property instead of ID ---
                    // adopter_id = adopter.Id, // Let EF Core handle this
                    Adopter = adopter, // Assign the Adopter object directly
                    adoption_date = adoptionRequest.adoption_date.HasValue
                                    ? DateTime.SpecifyKind(adoptionRequest.adoption_date.Value, DateTimeKind.Utc)
                                    : utcNow,
                    return_date = null,
                    notes = adoptionRequest.notes,
                    created_by_user_id = currentUser!.id, // Use the validated admin/staff user ID, non-null assertion after auth check
                    updated_by_user_id = currentUser!.id,
                };
                _dbContext.AdoptionHistories.Add(newAdoptionRecord);


                // 8. Update Animal
                animalToAdopt.adoption_status = "Adopted";


                // 9. Save ALL Changes ONCE
                await _dbContext.SaveChangesAsync();


                // 10. Commit Transaction
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully recorded adoption for Animal ID: {animal_id}. Adopter ID: {adopter_id}, History ID: {HistoryId}",
                    animalToAdopt.id,
                    adopter.id, // ID is now available after SaveChanges
                    newAdoptionRecord.id); // ID is now available after SaveChanges

                // 11. Create Success Response using a DTO ---
                var response = req.CreateResponse(HttpStatusCode.Created);
                response.Headers.Add("Location", $"/api/adoptionhistory/{newAdoptionRecord.id}"); // Location of new resource

                // 12. Create a simple object/DTO to return, avoiding potential cycles
                var responseDto = new
                {
                    id = newAdoptionRecord.id,
                    animalId = newAdoptionRecord.animal_id,
                    adopterId = newAdoptionRecord.adopter_id,
                    adoptionDate = newAdoptionRecord.adoption_date
                    // Add any other simple fields the frontend might need immediately
                };

                // Define serialization options
                var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

                // Manually serialize DTO and use WriteStringAsync ---
                var jsonPayload = JsonSerializer.Serialize(responseDto, jsonOptions);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8"); // Set Content-Type
                await response.WriteStringAsync(jsonPayload); // Write the JSON string

                return response; // Return the successful response
            }
            catch (Exception ex)
            {
                // This catch block should now only catch errors during the transaction itself
                if (transaction != null && transaction.GetDbTransaction().Connection != null)
                {
                    try { await transaction.RollbackAsync(); } catch (Exception rbEx) { _logger.LogError(rbEx, "Error during transaction rollback."); }
                }
                // Log the actual exception from the try block
                _logger.LogError(ex, "Error processing adoption transaction for Animal ID: {animal_id}. ExceptionType: {ExType}, Message: {ExMsg}, InnerMsg: {InnerMsg}",
                    adoptionRequest?.animal_id ?? -1, ex.GetType().FullName, ex.Message, ex.InnerException?.Message ?? "N/A");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while finalizing the adoption.");
            }
        }


        // --- Helper Method: Find Or Create Adopter ---
        private async Task<Adopter?> FindOrCreateAdopterAsync(CreateAdoptionRequest reqData, Guid? currentUserId)
        {
            // Use snake_case DTO property, ensure not null after validation
            var inputEmail = reqData.adopter_email!;
            var adopterEmailLower = inputEmail.ToLower(); // Still useful for logging consistency
            var utcNow = DateTime.UtcNow;

            _logger.LogInformation("Attempting to find adopter case-insensitively with email: {Email}", inputEmail);

            // Use EF.Functions.ILike with the snake_case MODEL property 'adopter_email'
            var existingAdopter = await _dbContext.Adopters
                                      .FirstOrDefaultAsync(a => EF.Functions.ILike(a.adopter_email, inputEmail));

            if (existingAdopter != null)
            {
                _logger.LogInformation("Found existing adopter by email. Adopter Id: {adopter_id}", existingAdopter.id);

                // Optional: Update existing adopter's info if provided data differs
                // Compare Model.snake_case with DTO.snake_case
                bool changed = false;
                if (existingAdopter.adopter_first_name != reqData.adopter_first_name) { existingAdopter.adopter_first_name = reqData.adopter_first_name!; changed = true; }
                if (existingAdopter.adopter_last_name != reqData.adopter_last_name) { existingAdopter.adopter_last_name = reqData.adopter_last_name!; changed = true; }
                if (existingAdopter.adopter_primary_phone != reqData.adopter_primary_phone) { existingAdopter.adopter_primary_phone = reqData.adopter_primary_phone!; changed = true; }
                if (existingAdopter.adopter_primary_phone_type != reqData.adopter_primary_phone_type) { existingAdopter.adopter_primary_phone_type = reqData.adopter_primary_phone_type!; changed = true; }
                if (existingAdopter.adopter_street_address != reqData.adopter_street_address) { existingAdopter.adopter_street_address = reqData.adopter_street_address!; changed = true; }
                if (existingAdopter.adopter_city != reqData.adopter_city) { existingAdopter.adopter_city = reqData.adopter_city!; changed = true; }
                if (existingAdopter.adopter_state_province != reqData.adopter_state_province) { existingAdopter.adopter_state_province = reqData.adopter_state_province!; changed = true; }
                if (existingAdopter.adopter_zip_postal_code != reqData.adopter_zip_postal_code) { existingAdopter.adopter_zip_postal_code = reqData.adopter_zip_postal_code!; changed = true; }
                // Optional Fields
                if (existingAdopter.adopter_secondary_phone != reqData.adopter_secondary_phone) { existingAdopter.adopter_secondary_phone = reqData.adopter_secondary_phone; changed = true; } // Nullable
                if (existingAdopter.adopter_secondary_phone_type != reqData.adopter_secondary_phone_type) { existingAdopter.adopter_secondary_phone_type = reqData.adopter_secondary_phone_type; changed = true; } // Nullable
                if (existingAdopter.spouse_partner_roommate != reqData.spouse_partner_roommate) { existingAdopter.spouse_partner_roommate = reqData.spouse_partner_roommate; changed = true; } // Nullable
                if (existingAdopter.adopter_apt_unit != reqData.adopter_apt_unit) { existingAdopter.adopter_apt_unit = reqData.adopter_apt_unit; changed = true; } // Nullable

                if (changed)
                {
                    _logger.LogInformation("Updating existing adopter info for Adopter Id: {adopter_id}", existingAdopter.id);
                    // Set Updated By User ID when changes are detected
                    existingAdopter.updated_by_user_id = currentUserId;
                }

                return existingAdopter;
            }
            else
            {
                _logger.LogInformation("Creating new adopter record for email: {Email}", reqData.adopter_email);
                var newAdopter = new Adopter
                {
                    // Map snake_case DTO to snake_case Model (use ! safely after validation)
                    adopter_first_name = reqData.adopter_first_name!,
                    adopter_last_name = reqData.adopter_last_name!,
                    adopter_email = reqData.adopter_email!,
                    adopter_primary_phone = reqData.adopter_primary_phone!,
                    adopter_primary_phone_type = reqData.adopter_primary_phone_type!,
                    adopter_street_address = reqData.adopter_street_address!,
                    adopter_city = reqData.adopter_city!,
                    adopter_state_province = reqData.adopter_state_province!,
                    adopter_zip_postal_code = reqData.adopter_zip_postal_code!,
                    // Optional fields
                    adopter_secondary_phone = reqData.adopter_secondary_phone,
                    adopter_secondary_phone_type = reqData.adopter_secondary_phone_type,
                    spouse_partner_roommate = reqData.spouse_partner_roommate,
                    adopter_apt_unit = reqData.adopter_apt_unit,
                    created_by_user_id = currentUserId,
                    updated_by_user_id = currentUserId,
                    notes = null,
                };
                _dbContext.Adopters.Add(newAdopter);
                // Let the main SaveChangesAsync call handle this insert
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
