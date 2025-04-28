using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt; // Ensure this is included
using System.IO;
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
// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	// DTO for the incoming request body - only fields allowed to be updated
	public class UpdateUserProfileRequest
	{
		// Use annotations for basic validation from the request body
		[Required(AllowEmptyStrings = false, ErrorMessage = "First name cannot be empty.")]
		[MaxLength(100)]
		public string? FirstName { get; set; }

		[Required(AllowEmptyStrings = false, ErrorMessage = "Last name cannot be empty.")]
		[MaxLength(100)]
		public string? LastName { get; set; }

		// Add other *editable* fields here if needed in the future
		// public string? PhonePrimary { get; set; }
	}

	public class UpdateUserProfile
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<UpdateUserProfile> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public UpdateUserProfile(AppDbContext dbContext, ILogger<UpdateUserProfile> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { /* LogError */ }
		}

		[Function("UpdateUserProfile")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// TODO: Change AuthorizationLevel from Anonymous after testing/implementing real auth
			[HttpTrigger(AuthorizationLevel.Anonymous, "PUT", Route = "users/me")]
			AzureFuncHttp.HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed UpdateUserProfile request.");

			ClaimsPrincipal? principal;
			string? auth0UserId = null;

			// --- Token Validation ---
			principal = await ValidateTokenAndGetPrincipal(req);
			if (principal == null)
			{
				_logger.LogWarning("UpdateUserProfile: Token validation failed.");
				return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
			}

			auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
			if (string.IsNullOrEmpty(auth0UserId))
			{
				_logger.LogError("UpdateUserProfile: 'sub' (NameIdentifier) claim missing from token.");
				return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
			}

			_logger.LogInformation("Token validation successful for user ID (sub): {Auth0UserId}", auth0UserId);

			// --- Deserialize Request Body ---
			string requestBody;
			UpdateUserProfileRequest? updateData;
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

				updateData = JsonSerializer.Deserialize<UpdateUserProfileRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				if (updateData == null) { return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }

				// Validate the DTO itself
				var validationResults = new List<ValidationResult>();
				var validationContext = new ValidationContext(updateData!, serviceProvider: null, items: null); // Use ! assuming prior null check handled below
				bool isValid = Validator.TryValidateObject(updateData!, validationContext, validationResults, validateAllProperties: true); // Use !

				if (!isValid || updateData == null) // Check isValid and updateData null
				{
					_logger.LogWarning("UpdateUserProfile request body validation failed. Errors: {@ValidationErrors}, Body: {Body}", validationResults, requestBody);
					// Consider returning specific validation errors if needed
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid profile data provided.");
				}
			}
			catch (Exception ex)
			{
				/* Log and return BadRequest */
				_logger.LogError("UpdateUserProfile: Error deserializing request body: {Message}", ex.Message);
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request body format.");
			}


			// --- 3. Update User in Database ---
			try
			{
				var userToUpdate = await _dbContext.Users
										.FirstOrDefaultAsync(u => u.external_provider_id == auth0UserId);

				if (userToUpdate == null)
				{
					_logger.LogWarning("UpdateUserProfile: User not found in DB for authenticated external ID: {ExternalId}", auth0UserId);
					return req.CreateResponse(HttpStatusCode.NotFound); // User doesn't exist in our DB
				}

				// Apply changes only for fields present in the request DTO
				bool changed = false;
				if (updateData.FirstName != null && userToUpdate.first_name != updateData.FirstName)
				{
					userToUpdate.first_name = updateData.FirstName;
					changed = true;
				}
				if (updateData.LastName != null && userToUpdate.last_name != updateData.LastName)
				{
					userToUpdate.last_name = updateData.LastName;
					changed = true;
				}
				// Add other editable fields like phone if needed

				if (changed)
				{
					_logger.LogInformation("Updating profile for User ID: {UserId}", userToUpdate.id);
					await _dbContext.SaveChangesAsync();
				}
				else
				{
					_logger.LogInformation("No changes detected for User ID: {UserId}", userToUpdate.id);
				}

				// Return success - 204 No Content is suitable for PUT if not returning data
				var response = req.CreateResponse(HttpStatusCode.NoContent);
				return response;
			}
			catch (DbUpdateConcurrencyException dbConcEx)
			{
				_logger.LogError(dbConcEx, "Concurrency error updating user profile for User ID: {UserId}", auth0UserId);
				return await CreateErrorResponse(req, HttpStatusCode.Conflict, "Data conflict occurred. Please refresh and try again.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error updating user profile in DB for User ID: {UserId}", auth0UserId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while updating the profile.");
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
