using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
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
        private static readonly HttpClient httpClient = new HttpClient();

        public SendAdoptionContract(AppDbContext dbContext, ILogger<SendAdoptionContract> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("SendAdoptionContract")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "send-contract")]
            AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function 'SendAdoptionContract' processed a request.");

            // --- 1. Authentication & Authorization ---
            try
            {
                var principal = await ValidateTokenAndGetPrincipal(req);
                if (principal == null)
                {
                    return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
                }

                var auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(auth0UserId))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
                }

                var currentUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.ExternalProviderId == auth0UserId);
                if (currentUser == null || !currentUser.IsActive)
                {
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User not authorized or inactive.");
                }

                var allowedRoles = new[] { "Admin", "Staff" };
                if (!allowedRoles.Contains(currentUser.Role))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized for SendAdoptionContract. UserID: {UserId}", currentUser.Role, currentUser.Id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied.");
                }
                _logger.LogInformation("User {UserId} with role {UserRole} authorized for SendAdoptionContract.", currentUser.Id, currentUser.Role);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during authentication/authorization in SendAdoptionContract.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication error.");
            }

            // --- 2. Deserialize & Validate Request Body ---
            SendContractRequest? contractData;
            try
            {
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                contractData = JsonSerializer.Deserialize<SendContractRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new System.Collections.Generic.List<ValidationResult>();
                if (contractData == null || !Validator.TryValidateObject(contractData, new ValidationContext(contractData), validationResults, true))
                {
                    string errors = string.Join("; ", validationResults.Select(vr => vr.ErrorMessage));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid request data: {errors}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deserializing SendContractRequest body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format.");
            }

            // --- 3. Send Email Logic ---
            try
            {
                string jotformBaseUrl = "https://form.jotform.com/252745581529062";
                string jotformUrl = $"{jotformBaseUrl}?animalName={Uri.EscapeDataString(contractData.AnimalName)}&animalSpecies={Uri.EscapeDataString(contractData.AnimalSpecies)}&animalBreed={Uri.EscapeDataString(contractData.AnimalBreed)}&animalGender={Uri.EscapeDataString(contractData.AnimalGender)}&scarsId={contractData.ScarsId}";

				string? web3FormsAccessKey = Environment.GetEnvironmentVariable("NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY");
				if (string.IsNullOrEmpty(web3FormsAccessKey))
                {
                    _logger.LogError("WEB3FORMS_ACCESS_KEY environment variable is not set.");
                    return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Email service is not configured.");
                }

                var emailContent = new
				{
					access_key = web3FormsAccessKey,
					subject = $"Adoption Contract for {contractData.AnimalName}",
					from_name = "SCARS Adoption Team",
					email = contractData.RecipientEmail,
					message = $"Hello,\n\nPlease complete the adoption contract for {contractData.AnimalName} by clicking the link below:\n\n{jotformUrl}\n\nThank you,\nSCARS Team"
				};

				var jsonContent = new StringContent(JsonSerializer.Serialize(emailContent), Encoding.UTF8, "application/json");
				var response = await httpClient.PostAsync("https://api.web3forms.com/submit", jsonContent);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Contract email sent successfully to {RecipientEmail} for animal {AnimalName}", contractData.RecipientEmail, contractData.AnimalName);
                    var successResponse = req.CreateResponse(HttpStatusCode.OK);
                    await successResponse.WriteStringAsync("{\"message\": \"Contract email sent successfully.\"}");
                    return successResponse;
                }
                else
                {
                    string errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to send email via Web3Forms. Status: {StatusCode}, Body: {ErrorBody}", response.StatusCode, errorBody);
                    return await CreateErrorResponse(req, HttpStatusCode.ServiceUnavailable, "Failed to send email.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred while sending the contract email.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred.");
            }
        }

        // --- Helper Methods (Copied from UpdateAnimal for consistency) ---
        private async Task<ClaimsPrincipal?> ValidateTokenAndGetPrincipal(AzureFuncHttp.HttpRequestData req)
        {
             // This implementation is identical to the one in your UpdateAnimal.cs
             // It is recommended to refactor this into a shared service in the future.
            if (!req.Headers.TryGetValues("Authorization", out var authHeaders) || !authHeaders.Any()) return null;
            string bearerToken = authHeaders.First();
            if (!bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
            string token = bearerToken.Substring("Bearer ".Length).Trim();

            if (_validationParameters == null)
            {
                _configManager ??= new ConfigurationManager<OpenIdConnectConfiguration>(
                    $"{_auth0Domain}.well-known/openid-configuration",
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever());

                var discoveryDocument = await _configManager.GetConfigurationAsync(default);
                _validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = _auth0Domain,
                    ValidateAudience = true,
                    ValidAudience = _auth0Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = discoveryDocument.SigningKeys,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            }

            try
            {
                var handler = new JwtSecurityTokenHandler();
                var validationResult = await handler.ValidateTokenAsync(token, _validationParameters);
                return validationResult.IsValid ? new ClaimsPrincipal(validationResult.ClaimsIdentity) : null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed.");
                return null;
            }
        }

        private async Task<AzureFuncHttp.HttpResponseData> CreateErrorResponse(
            AzureFuncHttp.HttpRequestData req,
            HttpStatusCode statusCode,
            string message)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json");
            var errorResponse = new { error = new { code = statusCode.ToString(), message = message } };
            await response.WriteStringAsync(JsonSerializer.Serialize(errorResponse));
            return response;
        }
    }
}
