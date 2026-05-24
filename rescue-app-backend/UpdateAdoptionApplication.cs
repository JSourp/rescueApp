using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Text.Json;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;

using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    // Local class to read the JSON body securely
    public class UpdateAdoptionAppRequest
    {
        public string? NewStatus { get; set; }
        public string? InternalNotes { get; set; }
    }

    public class UpdateAdoptionApplication
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<UpdateAdoptionApplication> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public UpdateAdoptionApplication(AppDbContext dbContext, ILogger<UpdateAdoptionApplication> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("UpdateAdoptionApplication")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "PUT", Route = "adoption-applications/{id}")] AzureFuncHttp.HttpRequestData req, int id)
        {
            var principal = await ValidateTokenAndGetPrincipal(req);
            if (principal == null) return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid token.");

            var auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.ExternalProviderId == auth0UserId);

            if (currentUser == null || !currentUser.IsActive || !(currentUser.Role == "Admin" || currentUser.Role == "Staff"))
            {
                return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Access Denied.");
            }

            try
            {
                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var updateData = JsonSerializer.Deserialize<UpdateAdoptionAppRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (updateData == null || string.IsNullOrEmpty(updateData.NewStatus))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "New status is required.");
                }

                var application = await _dbContext.AdoptionApplications.FindAsync(id);
                if (application == null) return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Application not found.");

                // Apply Updates
                application.Status = updateData.NewStatus;
                application.ReviewDate = DateTime.UtcNow;
                application.ReviewedByUserId = currentUser.Id;

                // Append internal notes if provided
                if (!string.IsNullOrWhiteSpace(updateData.InternalNotes))
                {
                    var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
                    var newNoteLine = $"[{timestamp} - {currentUser.FirstName} {currentUser.LastName}]: {updateData.InternalNotes}";

                    application.InternalNotes = string.IsNullOrWhiteSpace(application.InternalNotes)
                        ? newNoteLine
                        : application.InternalNotes + "\n" + newNoteLine;
                }

                await _dbContext.SaveChangesAsync();

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json");
                await response.WriteStringAsync("{\"message\": \"Application updated successfully.\"}");
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating adoption application.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Error updating application.");
            }
        }

        // --- AUTH & ERROR HELPERS ---
        private async Task<ClaimsPrincipal?> ValidateTokenAndGetPrincipal(AzureFuncHttp.HttpRequestData req)
        {
            if (!req.Headers.TryGetValues("Authorization", out var authHeaders) || !authHeaders.Any()) return null;
            string bearerToken = authHeaders.First();
            if (!bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
            string token = bearerToken.Substring("Bearer ".Length).Trim();

            if (_validationParameters == null)
            {
                _configManager ??= new ConfigurationManager<OpenIdConnectConfiguration>($"{_auth0Domain}.well-known/openid-configuration", new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever());
                var discoveryDocument = await _configManager.GetConfigurationAsync(default);
                _validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true, ValidIssuer = _auth0Domain,
                    ValidateAudience = true, ValidAudience = _auth0Audience,
                    ValidateIssuerSigningKey = true, IssuerSigningKeys = discoveryDocument.SigningKeys,
                    ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
                };
            }
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var validationResult = await handler.ValidateTokenAsync(token, _validationParameters);
                return validationResult.IsValid ? new ClaimsPrincipal(validationResult.ClaimsIdentity) : null;
            }
            catch { return null; }
        }

        private async Task<AzureFuncHttp.HttpResponseData> CreateErrorResponse(AzureFuncHttp.HttpRequestData req, HttpStatusCode statusCode, string message)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json");
            await response.WriteStringAsync(JsonSerializer.Serialize(new { error = new { code = statusCode.ToString(), message } }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
            return response;
        }
    }
}
