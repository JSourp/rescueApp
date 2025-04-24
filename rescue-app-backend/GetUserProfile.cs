using System;
using System.IO;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text.Json; // Required for manual serialization
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http; // Use alias below
using Microsoft.EntityFrameworkCore;
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
	public class UserProfileDto
	{
		public Guid Id { get; set; }
		public string? ExternalProviderId { get; set; } // The Auth0 'sub' ID
		public string FirstName { get; set; } = string.Empty;
		public string LastName { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
		public string Role { get; set; } = string.Empty; // User's role in the app
		public bool IsActive { get; set; }
		public DateTime DateCreated { get; set; }
	}

	public class GetUserProfile
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<GetUserProfile> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters; // Static might be okay for validation params if keys don't change often

		public GetUserProfile(AppDbContext dbContext, ILogger<GetUserProfile> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience))
			{
				_logger.LogError("Auth0 Domain or Audience environment variables are not set.");
			}
		}

		[Function("GetUserProfile")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			[HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "users/me")]
			AzureFuncHttp.HttpRequestData req) // Use alias
		{
			_logger.LogInformation("C# HTTP trigger function processed GetUserProfile request.");

			ClaimsPrincipal? principal;
			string? auth0UserId = null;

			// --- Manual Token Validation Logic ---
			try
			{
				// 1. Get Token from Header
				if (!req.Headers.TryGetValues("Authorization", out var authHeaders) || !authHeaders.Any())
				{
					_logger.LogWarning("GetUserProfile: Missing Authorization header.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Authorization header is missing.");
				}
				string bearerToken = authHeaders.First();
				if (!bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
				{
					_logger.LogWarning("GetUserProfile: Invalid Authorization header format.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Authorization header is not a Bearer token.");
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
				else if (_validationParameters == null) // Check if init failed due to missing config
				{
					_logger.LogError("Auth0 Domain or Audience configuration missing, cannot validate token.");
					return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication configuration error.");
				}

				// 3. Validate Token using ValidateTokenAsync
				var handler = new JwtSecurityTokenHandler();
				var validationResult = await handler.ValidateTokenAsync(token, _validationParameters);

				if (!validationResult.IsValid)
				{
					_logger.LogWarning("Token validation failed: {ExceptionMessage}", validationResult.Exception?.Message ?? "Unknown validation error");
					// Throw the inner exception if it exists for detailed logging
					if (validationResult.Exception != null) throw validationResult.Exception;
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Token validation failed.");
				}

				// 4. Extract ClaimsPrincipal and User ID ('sub')
				// If validationResult.IsValid is true, ClaimsIdentity should be populated
				if (validationResult.ClaimsIdentity == null)
				{
					_logger.LogError("Token validation succeeded but ClaimsIdentity is null.");
					return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Invalid identity data in token.");
				}
				principal = new ClaimsPrincipal(validationResult.ClaimsIdentity); // Create Principal from Identity
				auth0UserId = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("Token validated successfully but 'sub' (NameIdentifier) claim was missing from ClaimsIdentity.");
					return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
				}

				_logger.LogInformation("Token validation successful for user ID (sub): {Auth0UserId}", auth0UserId);

			}
			catch (SecurityTokenValidationException stvex)
			{
				/* ... return Unauthorized ... */
				_logger.LogWarning("GetUserProfile: SecurityTokenValidationException: {Message}", stvex.Message);
				if (stvex.InnerException != null)
				{
					_logger.LogError("Inner Exception: {Message}", stvex.InnerException.Message);
				}
			}
			catch (InvalidOperationException ioex) when (ioex.Message.Contains("IDX20803"))
			{
				/* ... return InternalServerError ... */
				_logger.LogError("GetUserProfile: InvalidOperationException: {Message}", ioex.Message);
				if (ioex.InnerException != null)
				{
					_logger.LogError("Inner Exception: {Message}", ioex.InnerException.Message);
				}
			}
			catch (HttpRequestException httpEx)
			{
				/* ... return InternalServerError ... */
				_logger.LogError("GetUserProfile: HttpRequestException: {Message}", httpEx.Message);
				if (httpEx.InnerException != null)
				{
					_logger.LogError("Inner Exception: {Message}", httpEx.InnerException.Message);
				}
			}
			catch (JsonException jex)
			{
				/* ... return BadRequest ... */
				_logger.LogError("GetUserProfile: JsonException: {Message}", jex.Message);
			}
			catch (ArgumentNullException argEx)
			{
				/* ... return BadRequest ... */
				_logger.LogError("GetUserProfile: ArgumentNullException: {Message}", argEx.Message);
			}
			catch (Exception ex)
			{
				/* ... return InternalServerError ... */
				_logger.LogError("GetUserProfile: General Exception: {Message}", ex.Message);
				if (ex.InnerException != null)
				{
					_logger.LogError("Inner Exception: {Message}", ex.InnerException.Message);
				}
			}
			// --- End Manual Token Validation Logic ---

			// --- Proceed with DB lookup ---
			try
			{
				var user = await _dbContext.Users
									 .FirstOrDefaultAsync(u => u.external_provider_id == auth0UserId);

				if (user == null)
				{
					_logger.LogWarning("GetUserProfile: User not found in local DB for external ID: {ExternalId}", auth0UserId);
					return req.CreateResponse(HttpStatusCode.NotFound); // Return 404
				}

				// Map to DTO
				var userProfile = new UserProfileDto
				{
					Id = user.id,
					ExternalProviderId = user.external_provider_id,
					FirstName = user.first_name,
					LastName = user.last_name,
					Email = user.email,
					Role = user.role,
					IsActive = user.is_active,
					DateCreated = user.date_created
				};

				var response = req.CreateResponse(HttpStatusCode.OK);

				// Manually serialize with desired options and use WriteStringAsync
				var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
				var jsonPayload = JsonSerializer.Serialize(userProfile, jsonOptions);
				response.Headers.Add("Content-Type", "application/json; charset=utf-8");
				await response.WriteStringAsync(jsonPayload);

				return response;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error fetching user profile from DB for ExternalProviderId: {ExternalId}", auth0UserId ?? "N/A");
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while fetching the user profile.");
			}
		}

		// --- Helper Method ---
		private async Task<AzureFuncHttp.HttpResponseData> CreateErrorResponse(
			AzureFuncHttp.HttpRequestData req, // Use alias
			HttpStatusCode statusCode,
			string message)
		{
			var response = req.CreateResponse(statusCode);
			// Use WriteAsJsonAsync with named statusCode parameter
			// Ensure the object being serialized doesn't cause issues
			await response.WriteAsJsonAsync(new { message = message }, statusCode: statusCode);
			return response; // Ensure return
		}
	}
}
