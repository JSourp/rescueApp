using System;
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
    public class GetAdoptionApplicationById
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<GetAdoptionApplicationById> _logger;
        // Same auth variables
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public GetAdoptionApplicationById(AppDbContext dbContext, ILogger<GetAdoptionApplicationById> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("GetAdoptionApplicationById")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "adoption-applications/{id}")] AzureFuncHttp.HttpRequestData req, int id)
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
                var app = await _dbContext.AdoptionApplications
                    .Include(a => a.ReviewedByUser)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (app == null) return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Application not found.");

                // Map to anonymous object to prevent JSON circular reference loops with Entity Framework
                var responseDto = new {
                    id = app.Id,
                    submissionDate = app.SubmissionDate,
                    status = app.Status,
                    firstName = app.FirstName,
                    lastName = app.LastName,
                    primaryEmail = app.PrimaryEmail,
                    primaryPhone = app.PrimaryPhone,
                    primaryPhoneType = app.PrimaryPhoneType,
                    streetAddress = app.StreetAddress,
                    city = app.City,
                    stateProvince = app.StateProvince,
                    zipPostalCode = app.ZipPostalCode,
                    whyAdopt = app.WhyAdopt,
                    whichAnimalText = app.WhichAnimalText,
                    internalNotes = app.InternalNotes,
                    reviewedByName = app.ReviewedByUser != null ? $"{app.ReviewedByUser.FirstName} {app.ReviewedByUser.LastName}" : null,
                    reviewDate = app.ReviewDate
                };

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await response.WriteStringAsync(JsonSerializer.Serialize(responseDto, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching adoption application detail.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Error fetching detail.");
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
