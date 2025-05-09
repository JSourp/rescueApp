using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
using rescueApp.Data;
using rescueApp.Models;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Protocols;

// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    // DTO for the request body for processing a return
    public class ProcessReturnRequest
    {
		[Required(ErrorMessage = "Animal Id is required.")]
		[Range(1, int.MaxValue, ErrorMessage = "Valid Animal Id is required.")]
		public int animal_id { get; set; }

		[Required(ErrorMessage = "Return date is required.")]
		public DateTime? return_date { get; set; } // Frontend should send YYYY-MM-DD or ISO string

		[Required(AllowEmptyStrings = false, ErrorMessage = "New animal status is required.")]
        [MaxLength(50)]
		public string? adoption_status { get; set; } // The status AFTER the return

		public string? notes { get; set; } // Optional notes about the return
	}

    public class ProcessReturn
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ProcessReturn> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public ProcessReturn(AppDbContext dbContext, ILogger<ProcessReturn> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
            if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { /* LogError */ }
        }

        [Function("ProcessReturn")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            // TODO: Secure this endpoint properly
            [HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "returns")]
            AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed ProcessReturn request.");

            User? currentUser;
            ClaimsPrincipal? principal;
            string? auth0UserId;
                var utcNow = DateTime.UtcNow;

            // --- 1. Authentication & Authorization ---
            try
            {
                // --- Token Validation ---
                principal = await ValidateTokenAndGetPrincipal(req);
                if (principal == null)
                {
                    _logger.LogWarning("ProcessReturn: Token validation failed.");
                    return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
                }

                auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(auth0UserId))
                {
                    _logger.LogError("ProcessReturn: 'sub' (NameIdentifier) claim missing from token.");
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

                // Check Role - Admins or Staff can process a return
                var allowedRoles = new[] { "Admin", "Staff" }; // Case-sensitive match with DB role
                if (!allowedRoles.Contains(currentUser.Role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to process a return. UserID: {UserId}", currentUser.Role, currentUser.Id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to process a return.");
                }

                _logger.LogInformation("User {UserId} with role {UserRole} authorized to process a return.", currentUser.Id, currentUser.Role);

            }
            catch (Exception ex) // Catch potential exceptions during auth/authz
            {
                _logger.LogError(ex, "Error during authentication/authorization in ProcessReturn.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication/Authorization error.");
            }
            // --- End Auth ---

            // --- 2. Deserialize & Validate Request Body ---
            string requestBody = string.Empty;
            ProcessReturnRequest? returnRequest;
            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

                returnRequest = JsonSerializer.Deserialize<ProcessReturnRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new List<ValidationResult>();
                bool isValid = Validator.TryValidateObject(returnRequest!, new ValidationContext(returnRequest!), validationResults, true);

                if (!isValid || returnRequest == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.FirstOrDefault() ?? "Request")}: {vr.ErrorMessage}"));
                    _logger.LogWarning("ProcessReturn request body validation failed. Errors: [{ValidationErrors}]. Body: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid return data: {errors}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deserializing or validating ProcessReturn request body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
            }
            if (returnRequest == null) { /* Should be caught above, but defensive check */ return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }


            // --- 3. Database Transaction ---
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // 4. Find the ACTIVE AdoptionHistory record
                var activeAdoption = await _dbContext.AdoptionHistories
                    .Include(ah => ah.Animal) // Include animal to check status easily
                    .FirstOrDefaultAsync(ah => ah.AnimalId == returnRequest.animal_id && ah.ReturnDate == null);

                if (activeAdoption == null)
                {
					_logger.LogWarning("No active adoption record found for Animal ID: {animal_id} to process return.", returnRequest.animal_id);
					await transaction.RollbackAsync();
					return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"No active (non-returned) adoption record found for Animal ID {returnRequest.animal_id}.");
				}

                 // 5. Find the Animal (should be loaded via Include) & Check Status
                 var animalToUpdate = activeAdoption.Animal;
                 if (animalToUpdate == null) { // Should not happen if FK constraint exists
                    _logger.LogError("Animal record not found for AdoptionHistory ID: {HistoryId}, Animal ID: {animal_id}", activeAdoption.Id, activeAdoption.AnimalId);
                    await transaction.RollbackAsync();
                    return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Data inconsistency: Animal not found for existing adoption record.");
                }

                if (animalToUpdate.AdoptionStatus != "Adopted")
                {
                    _logger.LogWarning("Attempted to return animal whose status is not 'Adopted'. Animal Id: {animal_id}, Status: {Status}", animalToUpdate.Id, animalToUpdate.AdoptionStatus);
                    await transaction.RollbackAsync();
                    // Use Conflict or BadRequest? Conflict seems appropriate as state doesn't match expected pre-condition.
                    return await CreateErrorResponse(req, HttpStatusCode.Conflict, $"Cannot process return: Animal status is currently '{animalToUpdate.AdoptionStatus ?? "None"}', not 'Adopted'.");
                }

                // 6. Update AdoptionHistory Record
                // Ensure return_date has UTC Kind
                activeAdoption.ReturnDate = DateTime.SpecifyKind(returnRequest.return_date!.Value, DateTimeKind.Utc); // Use ! after validation ensures it has value
                activeAdoption.UpdatedByUserId = currentUser.Id;
                if (!string.IsNullOrWhiteSpace(returnRequest.notes))
                { // Append to existing notes
                    activeAdoption.Notes = string.IsNullOrEmpty(activeAdoption.Notes)
                         ? $"Return processed on {utcNow:yyyy-MM-dd}: {returnRequest.notes}"
                         : $"{activeAdoption.Notes}\nReturn processed on {utcNow:yyyy-MM-dd}: {returnRequest.notes}";
                }

                // 7. Update Animal Record
                animalToUpdate.AdoptionStatus = returnRequest.adoption_status!; // Use validated status from request
                animalToUpdate.UpdatedByUserId = currentUser.Id;

                _dbContext.AdoptionHistories.Update(activeAdoption); // Mark history as updated
                _dbContext.Animals.Update(animalToUpdate); // Mark animal as updated

                // 8. Save Changes
                await _dbContext.SaveChangesAsync();

                // 9. Commit Transaction
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully processed return for Animal ID: {animal_id}. AdoptionHistory ID: {HistoryId}. New Status: {NewStatus}",
                   animalToUpdate.Id, activeAdoption.Id, animalToUpdate.AdoptionStatus);

                // 10. Return Success Response (200 OK is fine for updates)
                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new { message = "Return processed successfully." });
                return response;
            }
            catch (Exception ex)
            {
                 await transaction.RollbackAsync();
				_logger.LogError(ex, "Error processing return transaction for Animal ID: {animal_id}. Request Body Preview: {BodyPreview}", returnRequest?.animal_id ?? -1, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while processing the return.");
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
