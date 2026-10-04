using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
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

using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    public class SendJotform
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<SendJotform> _logger;
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        private static readonly Dictionary<string, (string Title, string Url)> AllowedForms =
            new(StringComparer.Ordinal)
            {
                ["260725402790051"] = ("Found Animal Transfer to Rescue", "https://form.jotform.com/260725402790051"),
                ["252758223440051"] = ("Transfer of Ownership Agreement", "https://form.jotform.com/252758223440051")
            };

        public SendJotform(AppDbContext dbContext, ILogger<SendJotform> logger)
        {
            _dbContext = dbContext;
            _logger = logger;

            if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience))
            {
                _logger.LogError("Auth0 Domain/Audience not configured for SendJotform.");
            }
        }

        [Function("SendJotform")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "send-jotform")]
            AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function 'SendJotform' processed a request.");

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

                if (!string.Equals(currentUser.Role, "Admin", StringComparison.Ordinal))
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to send Jotforms. UserID: {UserId}", currentUser.Role, currentUser.Id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied.");
                }

                string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");
                }

                var requestData = JsonSerializer.Deserialize<SendJotformRequest>(
                    requestBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (requestData == null)
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
                }

                var validationResults = new List<ValidationResult>();
                if (!Validator.TryValidateObject(
                    requestData,
                    new ValidationContext(requestData),
                    validationResults,
                    true))
                {
                    var errors = string.Join("; ", validationResults.Select(v => v.ErrorMessage));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid request data: {errors}");
                }

                if (!AllowedForms.TryGetValue(requestData.FormId, out var form))
                {
                    _logger.LogWarning("Unauthorized Jotform ID requested: {FormId}", requestData.FormId);
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "The requested form is not available.");
                }

                string smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST") ?? "smtp-relay.brevo.com";
                int smtpPort = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
                string smtpUser = Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? string.Empty;
                string smtpPass = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? string.Empty;

                if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
                {
                    _logger.LogError("SMTP credentials not configured.");
                    return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Email configuration error.");
                }

                string htmlContent = $@"
                    <p>Hello,</p>
                    <p>Please complete the <strong>{form.Title}</strong> form by clicking the link below:</p>
                    <p><a href='{form.Url}'>Open the {form.Title} form</a></p>
                    <p>Thank you,<br>SCARS Team</p>";

                using (var message = new MailMessage())
                {
                    message.From = new MailAddress("contact@scars-az.com", "SCARS Team");
                    message.To.Add(new MailAddress(requestData.RecipientEmail));
                    message.Subject = form.Title;
                    message.Body = htmlContent;
                    message.IsBodyHtml = true;

                    using (var client = new SmtpClient(smtpHost, smtpPort))
                    {
                        client.EnableSsl = true;
                        client.Credentials = new NetworkCredential(smtpUser, smtpPass);
                        await client.SendMailAsync(message);
                    }
                }

                _logger.LogInformation(
                    "Jotform email sent successfully via SMTP to {RecipientEmail} for form {FormId}",
                    requestData.RecipientEmail,
                    requestData.FormId);

                var successResponse = req.CreateResponse(HttpStatusCode.OK);
                await successResponse.WriteStringAsync("{\"message\":\"Form email sent successfully.\"}");
                return successResponse;
            }
            catch (SmtpException ex)
            {
                _logger.LogError(ex, "SMTP error sending Jotform email.");
                return await CreateErrorResponse(req, HttpStatusCode.ServiceUnavailable, "Failed to send email via SMTP provider.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error sending Jotform email.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred.");
            }
        }

        private async Task<ClaimsPrincipal?> ValidateTokenAndGetPrincipal(AzureFuncHttp.HttpRequestData req)
        {
            if (!req.Headers.TryGetValues("Authorization", out var authHeaders) || !authHeaders.Any())
            {
                return null;
            }

            string bearerToken = authHeaders.First();
            if (!bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            string token = bearerToken.Substring("Bearer ".Length).Trim();

            if (_validationParameters == null &&
                !string.IsNullOrEmpty(_auth0Domain) &&
                !string.IsNullOrEmpty(_auth0Audience))
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
            else if (_validationParameters == null)
            {
                _logger.LogError("Auth0 Domain or Audience configuration missing, cannot validate token.");
                return null;
            }

            try
            {
                var handler = new JwtSecurityTokenHandler();
                var validationResult = await handler.ValidateTokenAsync(token, _validationParameters);

                if (!validationResult.IsValid || validationResult.ClaimsIdentity == null)
                {
                    return null;
                }

                return new ClaimsPrincipal(validationResult.ClaimsIdentity);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token validation.");
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

            var errorResponse = new
            {
                error = new
                {
                    code = statusCode.ToString(),
                    message
                }
            };

            await response.WriteStringAsync(JsonSerializer.Serialize(
                errorResponse,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));

            return response;
        }
    }
}
