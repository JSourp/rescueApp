using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web; // For HttpUtility
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
// Auth0 Usings
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs; // For the DTO
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    public class GetFosterApplicationById
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<GetFosterApplicationById> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

        public GetFosterApplicationById(AppDbContext dbContext, ILogger<GetFosterApplicationById> logger)
        {
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { _logger.LogError("Auth0 Domain/Audience not configured for GetFosterApplicationById."); }
        }

        [Function("GetFosterApplicationById")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "foster-applications/{applicationId:int}")] AzureFuncHttp.HttpRequestData req,
            int applicationId)
        {
            _logger.LogInformation("C# HTTP trigger function processed GetFosterApplicationById request for ID: {ApplicationId}.", applicationId);

			User? currentUser;
			ClaimsPrincipal? principal;
			string? auth0UserId;

			// --- 1. Authentication & Authorization ---
			try
			{
				// --- Token Validation ---
				principal = await ValidateTokenAndGetPrincipal(req);
				if (principal == null)
				{
					_logger.LogWarning("GenerateDocumentUploadUrl: Token validation failed.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
				}

				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("GenerateDocumentUploadUrl: 'sub' (NameIdentifier) claim missing from token.");
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

			// --- Get ---
            try
            {
                var application = await _dbContext.FosterApplications
                    .Include(app => app.ReviewedByUser) // Include user who reviewed it
                    .FirstOrDefaultAsync(app => app.Id == applicationId); // Use PascalCase model property

                if (application == null)
                {
                    return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"Foster application with ID {applicationId} not found.");
                }

                // Map Entity to DTO
                var applicationDetailDto = new FosterApplicationDetailDto
                {
                    Id = application.Id,
                    SubmissionDate = application.SubmissionDate,
                    Status = application.Status,
                    FirstName = application.FirstName,
                    LastName = application.LastName,
                    SpousePartnerRoommate = application.SpousePartnerRoommate,
                    StreetAddress = application.StreetAddress,
                    AptUnit = application.AptUnit,
                    City = application.City,
                    StateProvince = application.StateProvince,
                    ZipPostalCode = application.ZipPostalCode,
                    PrimaryPhone = application.PrimaryPhone,
                    PrimaryPhoneType = application.PrimaryPhoneType,
                    SecondaryPhone = application.SecondaryPhone,
                    SecondaryPhoneType = application.SecondaryPhoneType,
                    PrimaryEmail = application.PrimaryEmail,
                    SecondaryEmail = application.SecondaryEmail,
                    HowHeard = application.HowHeard,
                    AdultsInHome = application.AdultsInHome,
                    ChildrenInHome = application.ChildrenInHome,
                    HasAllergies = application.HasAllergies,
                    HouseholdAwareFoster = application.HouseholdAwareFoster,
                    DwellingType = application.DwellingType,
                    RentOrOwn = application.RentOrOwn,
                    LandlordPermission = application.LandlordPermission,
                    YardType = application.YardType,
                    SeparationPlan = application.SeparationPlan,
                    HasCurrentPets = application.HasCurrentPets,
                    CurrentPetsDetails = application.CurrentPetsDetails,
                    CurrentPetsSpayedNeutered = application.CurrentPetsSpayedNeutered,
                    CurrentPetsVaccinations = application.CurrentPetsVaccinations,
                    VetClinicName = application.VetClinicName,
                    VetPhone = application.VetPhone,
                    HasFosteredBefore = application.HasFosteredBefore,
                    PreviousFosterDetails = application.PreviousFosterDetails,
                    WhyFoster = application.WhyFoster,
                    FosterAnimalTypes = application.FosterAnimalTypes,
                    WillingMedical = application.WillingMedical,
                    WillingBehavioral = application.WillingBehavioral,
                    CommitmentLength = application.CommitmentLength,
                    CanTransport = application.CanTransport,
                    TransportExplanation = application.TransportExplanation,
                    PreviousPetsDetails = application.PreviousPetsDetails,
                    ReviewedByUserId = application.ReviewedByUserId,
                    ReviewedByName = application.ReviewedByUser != null ? $"{application.ReviewedByUser.FirstName} {application.ReviewedByUser.LastName}" : null,
                    ReviewDate = application.ReviewDate,
                    InternalNotes = application.InternalNotes
                };

				// --- Return Response ---
				var response = req.CreateResponse(HttpStatusCode.OK); // Return 200 OK
				var jsonResponse = JsonSerializer.Serialize(applicationDetailDto, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
				await response.WriteStringAsync(jsonResponse);
				return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching foster application ID {ApplicationId}.", applicationId);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred.");
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
				WriteIndented = true // Optional: Pretty-print the JSON
			}));

			return response;
		}
	}
}
