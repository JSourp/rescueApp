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
    public class GetFosterById
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<GetFosterById> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

        public GetFosterById(AppDbContext dbContext, ILogger<GetFosterById> logger)
        {
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { _logger.LogError("Auth0 Domain/Audience not configured for GetFosterById."); }
        }

        [Function("GetFosterById")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "fosters/{userId:guid}")] AzureFuncHttp.HttpRequestData req,
            Guid userId) // userId from route
        {
            _logger.LogInformation("C# HTTP trigger processing GetFosterById request for User ID: {UserId}.", userId);

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
                var fosterProfile = await _dbContext.FosterProfiles
                    .Include(fp => fp.User) // Include basic User info
                    .Include(fp => fp.FosterApplication) // Optionally include application details
                    .FirstOrDefaultAsync(fp => fp.UserId == userId);

                if (fosterProfile == null || fosterProfile.User == null)
                {
                    _logger.LogWarning("Foster profile or associated user not found for User ID: {UserId}", userId);
                    return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"Foster profile not found for User ID {userId}.");
                }

                // Get animals currently fostered by this user
                var fosteredAnimals = await _dbContext.Animals
                    .Where(a => a.CurrentFosterUserId == userId)
                    .Select(a => new FosteredAnimalDto
                    {
                        Id = a.Id,
                        Name = a.Name,
                        AnimalType = a.AnimalType,
                        AdoptionStatus = a.AdoptionStatus
                    })
                    .ToListAsync();

                // Map to DTO
                var fosterDetailDto = new FosterDetailDto
                {
                    UserId = fosterProfile.User.Id,
                    FirstName = fosterProfile.User.FirstName ?? string.Empty,
                    LastName = fosterProfile.User.LastName ?? string.Empty,
                    Email = fosterProfile.User.Email,
                    PrimaryPhone = fosterProfile.User.PrimaryPhone,
                    IsUserActive = fosterProfile.User.IsActive,
                    UserRole = fosterProfile.User.Role ?? string.Empty,

                    FosterProfileId = fosterProfile.Id,
                    ApprovalDate = fosterProfile.ApprovalDate,
                    IsActiveFoster = fosterProfile.IsActiveFoster,
                    AvailabilityNotes = fosterProfile.AvailabilityNotes,
                    CapacityDetails = fosterProfile.CapacityDetails,
                    HomeVisitDate = fosterProfile.HomeVisitDate,
                    HomeVisitNotes = fosterProfile.HomeVisitNotes,
                    ProfileDateCreated = fosterProfile.DateCreated,
                    ProfileDateUpdated = fosterProfile.DateUpdated,

                    FosterApplicationId = fosterProfile.FosterApplicationId,
                    // If FosterApplication was included, map its fields here:
                    ApplicantStreetAddress = fosterProfile.FosterApplication?.StreetAddress,
                    ApplicantCity = fosterProfile.FosterApplication?.City,

                    CurrentlyFostering = fosteredAnimals
                };

                // --- Return Response ---
				var response = req.CreateResponse(HttpStatusCode.OK); // Return 200 OK
				var jsonResponse = JsonSerializer.Serialize(fosterDetailDto, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
				await response.WriteStringAsync(jsonResponse);
				return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching foster details for User ID {UserId}.", userId);
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
