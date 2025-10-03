using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
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
using rescueApp.Models.Requests;
using SendGrid;
using SendGrid.Helpers.Mail;

// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    public class SendAdoptionContract
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<SendAdoptionContract> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public SendAdoptionContract(AppDbContext dbContext, ILogger<SendAdoptionContract> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { _logger.LogError("Auth0 Domain/Audience not configured for SendAdoptionContract."); }
		}

        [Function("SendAdoptionContract")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
			// Security is handled by internal Auth0 Bearer token validation and role-based authorization.
			[HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "send-contract")]
            AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function 'SendAdoptionContract' processed a request.");

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
					_logger.LogWarning("Token validation failed.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
				}

				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("'sub' (NameIdentifier) claim missing from token.");
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

				// Check Role - Admins or Staff
				var allowedRoles = new[] { "Admin", "Staff" }; // Case-sensitive match with DB role
				if (!allowedRoles.Contains(currentUser.Role))
				{
					_logger.LogWarning("User Role '{UserRole}' not authorized. UserID: {UserId}", currentUser.Role, currentUser.Id);
					return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied.");
				}

				_logger.LogInformation("User {UserId} with role {UserRole} authorized.", currentUser.Id, currentUser.Role);

			}
			catch (Exception ex) // Catch potential exceptions during auth/authz
			{
				_logger.LogError(ex, "Error during authentication/authorization in CreateAnimal.");
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication/Authorization error.");
			}

			// --- 2. Deserialize & Validate Request Body ---
			string requestBody;
			SendContractRequest? contractData;
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

				contractData = JsonSerializer.Deserialize<SendContractRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				var validationResults = new List<ValidationResult>();
				bool isValid = Validator.TryValidateObject(contractData!, new ValidationContext(contractData!), validationResults, true);

				if (!isValid || contractData == null)
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
			if (contractData == null)
			{
				/* Should be caught above, but defensive check */
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
			}

			// --- 3. Send Email Logic ---
			try
            {
				string? sendGridApiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY");
				if (string.IsNullOrEmpty(sendGridApiKey))
				{
					_logger.LogError("SENDGRID_API_KEY environment variable is not set.");
					return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Email service is not configured.");
                }

				var client = new SendGridClient(sendGridApiKey);
				var from = new EmailAddress("contact@scars-az.com", "SCARS Adoption Team");
				var to = new EmailAddress(contractData.RecipientEmail);
				var subject = $"Adoption Contract for {contractData.AnimalName}";

				string jotformBaseUrl = "https://form.jotform.com/252745581529062";
				string jotformUrl = $"{jotformBaseUrl}?animalName={Uri.EscapeDataString(contractData.AnimalName)}&animalSpecies={Uri.EscapeDataString(contractData.AnimalSpecies)}&animalBreed={Uri.EscapeDataString(contractData.AnimalBreed)}&animalGender={Uri.EscapeDataString(contractData.AnimalGender)}&scarsId={contractData.ScarsId}";

				var plainTextContent = $"Hello,\n\nPlease complete the adoption contract for {contractData.AnimalName} by clicking the link below:\n\n{jotformUrl}\n\nThank you,\nSCARS Team";
				var htmlContent = $"<p>Hello,</p><p>Please complete the adoption contract for <strong>{contractData.AnimalName}</strong> by clicking the link below:</p><p><a href='{jotformUrl}'>Click Here to Sign the Contract</a></p><p>Thank you,<br>SCARS Team</p>";

				var msg = MailHelper.CreateSingleEmail(from, to, subject, plainTextContent, htmlContent);
				var response = await client.SendEmailAsync(msg);

				if (response.IsSuccessStatusCode)
                {
					_logger.LogInformation("Contract email sent successfully via SendGrid to {RecipientEmail}", contractData.RecipientEmail);
					var successResponse = req.CreateResponse(HttpStatusCode.OK);
                    await successResponse.WriteStringAsync("{\"message\": \"Contract email sent successfully.\"}");
                    return successResponse;
                }
                else
                {
					string errorBody = await response.Body.ReadAsStringAsync();
					_logger.LogError("Failed to send email via SendGrid. Status: {StatusCode}, Body: {ErrorBody}", response.StatusCode, errorBody);
					return await CreateErrorResponse(req, HttpStatusCode.ServiceUnavailable, "Failed to send email.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while sending the contract email.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred.");
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
					message
				}
			};

			// Serialize the error response to JSON and write it to the response body
			await response.WriteStringAsync(JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
			{
				PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // Use camelCase for JSON properties
				WriteIndented = true // Pretty-print the JSON
			}));

			return response;
		}
	}
}
