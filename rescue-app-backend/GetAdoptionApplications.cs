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
using rescueApp.Models;
using rescueApp.Models.DTOs;

using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;
using System.Web;

namespace rescueApp
{
    public class GetAdoptionApplications
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<GetAdoptionApplications> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public GetAdoptionApplications(AppDbContext dbContext, ILogger<GetAdoptionApplications> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("GetAdoptionApplications")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "adoption-applications")] AzureFuncHttp.HttpRequestData req)
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
                var queryParams = HttpUtility.ParseQueryString(req.Url.Query);
                string? statusFilter = queryParams["status"];
                string? sortBy = queryParams["sortBy"]?.ToLowerInvariant() ?? "submissiondate_desc";

                IQueryable<AdoptionApplication> query = _dbContext.AdoptionApplications.Include(app => app.ReviewedByUser);

                if (!string.IsNullOrWhiteSpace(statusFilter))
                {
                    query = query.Where(app => app.Status.ToLower() == statusFilter.ToLower());
                }

                bool descending = sortBy.EndsWith("_desc");
                string sortField = sortBy.Replace("_desc", "").Replace("_asc", "");

                query = sortField switch
                {
                    "submissiondate" => descending ? query.OrderByDescending(a => a.SubmissionDate) : query.OrderBy(a => a.SubmissionDate),
                    "applicantname" => descending ? query.OrderByDescending(a => a.LastName).ThenByDescending(a => a.FirstName) : query.OrderBy(a => a.LastName).ThenBy(a => a.FirstName),
                    "status" => descending ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                    _ => query.OrderByDescending(a => a.SubmissionDate)
                };

                // Use the DTO you already created
                var applicationsDto = await query.Select(app => new AdoptionApplicationListItemDto
                {
                    Id = app.Id,
                    SubmissionDate = app.SubmissionDate,
                    ApplicantName = $"{app.FirstName} {app.LastName}",
                    PrimaryEmail = app.PrimaryEmail,
                    PrimaryPhone = app.PrimaryPhone,
                    Status = app.Status,
                    ReviewedBy = app.ReviewedByUser != null ? $"{app.ReviewedByUser.FirstName} {app.ReviewedByUser.LastName}" : null,
                    ReviewDate = app.ReviewDate
                }).ToListAsync();

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await response.WriteStringAsync(JsonSerializer.Serialize(applicationsDto, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching adoption applications.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Error fetching applications.");
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
