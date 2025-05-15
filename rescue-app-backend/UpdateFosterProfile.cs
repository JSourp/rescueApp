using System;
using System.Collections.Generic;
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
// Auth0 Usings
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs;       // For FosterApplicationListItemDto
using rescueApp.Models.Requests;  // For UpdateFosterApplicationRequest
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	public class UpdateFosterProfile
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<UpdateFosterProfile> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public UpdateFosterProfile(AppDbContext dbContext, ILogger<UpdateFosterProfile> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { _logger.LogError("Auth0 Domain/Audience not configured for UpdateFosterProfile."); }
		}

		[Function("UpdateFosterProfile")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			[HttpTrigger(AuthorizationLevel.Anonymous, "PUT", Route = "fosters/{userId:guid}")] AzureFuncHttp.HttpRequestData req,
			Guid userId)
		{
			_logger.LogInformation("C# HTTP trigger processing UpdateFosterProfile request for User ID: {UserId}.", userId);

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

			// Deserialize Request Body
			string requestBody = string.Empty;
			UpdateFosterProfileRequest? updateRequest = null;
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				_logger.LogInformation("Received request body: {RequestBody}", requestBody); // Log raw body

				if (string.IsNullOrEmpty(requestBody))
				{
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");
				}
				var serializerOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
				updateRequest = JsonSerializer.Deserialize<UpdateFosterProfileRequest>(requestBody, serializerOptions);

				// Log the deserialized object
				if (updateRequest == null)
				{
					_logger.LogWarning("Deserialization resulted in a NULL updateRequest object.");
				}
				else
				{
					// Log some key fields to see if they populated
					_logger.LogInformation("Deserialized updateRequest - FirstName: {FirstName}, IsActiveFoster: {IsActiveFoster}",
						updateRequest.FirstName, updateRequest.IsActiveFoster);
				}

				var validationResults = new List<ValidationResult>();
				// Add a null check before validation if it's not already robust
				if (updateRequest == null)
				{
					_logger.LogWarning("updateRequest is null before validation.");
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data: could not parse body.");
				}

				var validationContext = new ValidationContext(updateRequest, serviceProvider: null, items: null);
				bool isValid = Validator.TryValidateObject(updateRequest, validationContext, validationResults, true);

				if (!isValid) // Removed || updateRequest == null here as it's checked above
				{
					string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.Any() ? vr.MemberNames.First() : "Request")}: {vr.ErrorMessage}"));
					_logger.LogWarning("UpdateFosterProfile DTO validation failed. Errors: [{ValidationErrors}]", errors);
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid update data: {errors}");
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error deserializing or validating UpdateAnimal request body.");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
			}

			using var transaction = await _dbContext.Database.BeginTransactionAsync();
			try
			{
				var userToUpdate = await _dbContext.Users.FindAsync(userId);
				if (userToUpdate == null)
				{
					await transaction.RollbackAsync();
					return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"User with ID {userId} not found.");
				}

				var fosterProfileToUpdate = await _dbContext.FosterProfiles
					.Include(fp => fp.FosterApplication)
					.FirstOrDefaultAsync(fp => fp.UserId == userId);
				if (fosterProfileToUpdate == null)
				{
					await transaction.RollbackAsync();
					return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"Foster profile not found for User ID {userId}.");
				}

				bool userChanged = false;
				bool profileChanged = false;

				// Update User fields if provided
				if (updateRequest.FirstName != null && userToUpdate.FirstName != updateRequest.FirstName) { userToUpdate.FirstName = updateRequest.FirstName; userChanged = true; }
				if (updateRequest.LastName != null && userToUpdate.LastName != updateRequest.LastName) { userToUpdate.LastName = updateRequest.LastName; userChanged = true; }
				if (updateRequest.PrimaryPhone != null && userToUpdate.PrimaryPhone != updateRequest.PrimaryPhone) { userToUpdate.PrimaryPhone = updateRequest.PrimaryPhone; userChanged = true; }
				if (updateRequest.PrimaryPhoneType != null && userToUpdate.PrimaryPhoneType != updateRequest.PrimaryPhoneType) { userToUpdate.PrimaryPhoneType = updateRequest.PrimaryPhoneType; userChanged = true; }
				if (updateRequest.IsUserActive.HasValue && userToUpdate.IsActive != updateRequest.IsUserActive.Value) { userToUpdate.IsActive = updateRequest.IsUserActive.Value; userChanged = true; }
				if (userChanged) { userToUpdate.DateUpdated = DateTime.UtcNow; }

				// Update FosterProfile fields if provided
				if (updateRequest.IsActiveFoster.HasValue && fosterProfileToUpdate.IsActiveFoster != updateRequest.IsActiveFoster.Value) { fosterProfileToUpdate.IsActiveFoster = updateRequest.IsActiveFoster.Value; profileChanged = true; }
				if (updateRequest.AvailabilityNotes != null && fosterProfileToUpdate.AvailabilityNotes != updateRequest.AvailabilityNotes) { fosterProfileToUpdate.AvailabilityNotes = updateRequest.AvailabilityNotes; profileChanged = true; }
				if (updateRequest.CapacityDetails != null && fosterProfileToUpdate.CapacityDetails != updateRequest.CapacityDetails) { fosterProfileToUpdate.CapacityDetails = updateRequest.CapacityDetails; profileChanged = true; }
				if (updateRequest.HomeVisitDate.HasValue && fosterProfileToUpdate.HomeVisitDate != updateRequest.HomeVisitDate.Value) { fosterProfileToUpdate.HomeVisitDate = updateRequest.HomeVisitDate.Value; profileChanged = true; }
				if (updateRequest.HomeVisitNotes != null && fosterProfileToUpdate.HomeVisitNotes != updateRequest.HomeVisitNotes) { fosterProfileToUpdate.HomeVisitNotes = updateRequest.HomeVisitNotes; profileChanged = true; }
				if (profileChanged) { fosterProfileToUpdate.DateUpdated = DateTime.UtcNow; }

				if (userChanged || profileChanged)
				{
					await _dbContext.SaveChangesAsync();
					_logger.LogInformation("Foster profile and/or user details updated for User ID: {UserId} by {AdminUserId}", userId, currentUser.Id);
				}
				else
				{
					_logger.LogInformation("No changes detected for User ID: {UserId}", userId);
				}

				await transaction.CommitAsync();

				// Fetch the updated combined details to return (using logic similar to GetFosterById)
				// This ensures the response is fresh and reflects all changes.
				var updatedFosterDetail = await _dbContext.FosterProfiles
					.Where(fp => fp.UserId == userId)
					.Select(fp => new FosterDetailDto { /* ... map all fields for FosterDetailDto ... */ })
					.FirstOrDefaultAsync();

				// --- Return Response ---
				var response = req.CreateResponse(HttpStatusCode.OK); // Return 200 OK
				var jsonResponse = JsonSerializer.Serialize(updatedFosterDetail, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
				await response.WriteStringAsync(jsonResponse);
				return response;
			}
			catch (Exception ex)
			{
				await transaction.RollbackAsync();
				_logger.LogError(ex, "Error updating foster profile for User ID {UserId}.", userId);
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
