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
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs;
using rescueApp.Models.Requests;

// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	public class UpdateFosterApplication
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<UpdateFosterApplication> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public UpdateFosterApplication(AppDbContext dbContext, ILogger<UpdateFosterApplication> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { _logger.LogError("Auth0 Domain/Audience not configured for UpdateFosterApplication."); }
		}

		[Function("UpdateFosterApplication")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// Security is handled by internal Auth0 Bearer token validation and role-based authorization.
			[HttpTrigger(AuthorizationLevel.Anonymous, "PUT", Route = "foster-applications/{applicationId:int}")] AzureFuncHttp.HttpRequestData req,
			int applicationId)
		{
			_logger.LogInformation("C# HTTP trigger function processed UpdateFosterApplication request for ID: {ApplicationId}.", applicationId);

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
					_logger.LogWarning("Token validation failed.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
				}

				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("'sub' (NameIdentifier) claim missing from token.");
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

			// --- 2. Deserialize & Validate Request Body ---
			string requestBody;
			UpdateFosterApplicationRequest? updateRequest;
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

				updateRequest = JsonSerializer.Deserialize<UpdateFosterApplicationRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				var validationResults = new List<ValidationResult>();
				bool isValid = Validator.TryValidateObject(updateRequest!, new ValidationContext(updateRequest!), validationResults, true);

				if (!isValid || updateRequest == null)
				{
					string errors = string.Join("; ", validationResults.Select(vr => vr.ErrorMessage));
					_logger.LogWarning("UpdateAnimal request body validation failed. Errors: {@ValidationErrors}, Body: {Body}", errors, requestBody);
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid animal data provided: {errors}");
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error deserializing or validating UpdateAnimal request body.");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
			}
			if (updateRequest == null)
			{
				/* Should be caught above, but defensive check */
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
			}

			// --- 3. Find and Update ---
			using var transaction = await _dbContext.Database.BeginTransactionAsync();
			try
			{
				var application = await _dbContext.FosterApplications.FindAsync(applicationId);
				if (application == null)
				{
					await transaction.RollbackAsync();
					return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"Foster application with ID {applicationId} not found.");
				}

				// Update basic application fields
				application.Status = updateRequest.NewStatus!;
				application.InternalNotes = string.IsNullOrWhiteSpace(application.InternalNotes)
					? $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm} by {currentUser.Email}]: {updateRequest.InternalNotes}"
					: $"{application.InternalNotes}\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm} by {currentUser.Email}]: {updateRequest.InternalNotes}";
				application.ReviewDate = DateTime.UtcNow;
				application.ReviewedByUserId = currentUser.Id;
				// EF Core tracks changes to 'application'

				// --- Logic for "Approved" status ---
				if (updateRequest.NewStatus == "Approved")
				{
					_logger.LogInformation("Application ID {ApplicationId} approved. Processing user and foster profile.", applicationId);

					// Ensure application.PrimaryEmail is not null (it's [Required] in DTO, but defensive)
					if (string.IsNullOrWhiteSpace(application.PrimaryEmail))
					{
						await transaction.RollbackAsync();
						_logger.LogError("Cannot process 'Approved' status: PrimaryEmail is missing from application ID {ApplicationId}.", applicationId);
						return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Application is missing primary email, cannot approve.");
					}

					var userForFoster = await _dbContext.Users
						.FirstOrDefaultAsync(u => u.Email.ToLower() == application.PrimaryEmail.ToLower());

					// Define roles that have higher or equivalent privileges to "Foster"
					string[] privilegedRoles = ["Admin", "Staff"];


					if (userForFoster == null)
					{
						_logger.LogInformation("No existing user found for email {ApplicantEmail}. Creating a local user record.", application.PrimaryEmail);
						userForFoster = new User
						{
							FirstName = application.FirstName,
							LastName = application.LastName,
							Email = application.PrimaryEmail,
							Role = "Foster", // Assign Foster role
							IsActive = true,  // Active in system as a foster
							ExternalProviderId = null, // No Auth0 link yet
							DateCreated = DateTime.UtcNow,
							DateUpdated = DateTime.UtcNow,
							LastLoginDate = null
						};
						_dbContext.Users.Add(userForFoster);
						_logger.LogInformation("Local user record prepared for {ApplicantEmail}. Auth0 account can be created/linked later.", application.PrimaryEmail);
					}
					else
					{
						_logger.LogInformation("Existing user ID {UserId} found for email {ApplicantEmail} with role '{UserRole}'.", userForFoster.Id, application.PrimaryEmail, userForFoster.Role);
						// Only update role if they are not already an Admin or Staff (or other privileged role)
						if (!privilegedRoles.Any(pr => pr.Equals(userForFoster.Role, StringComparison.OrdinalIgnoreCase)))
						{
							if (!"Foster".Equals(userForFoster.Role, StringComparison.OrdinalIgnoreCase))
							{
								_logger.LogInformation("Updating user {UserId} role to 'Foster'. Previous role: {OldRole}", userForFoster.Id, userForFoster.Role);
								userForFoster.Role = "Foster";
								userForFoster.DateUpdated = DateTime.UtcNow;
								_dbContext.Users.Update(userForFoster);
								// Log action required for Auth0 role update if role was changed
								_logger.LogWarning("ACTION REQUIRED: User {UserId} role updated to 'Foster' in local DB. Ensure Auth0 role is also updated if login exists and role sync is not automatic.", userForFoster.Id);
							}
						}
						else
						{
							_logger.LogInformation("User {UserId} already has a privileged role ({UserRole}), not changing to 'Foster'. Their existing role covers foster capabilities.", userForFoster.Id, userForFoster.Role);
						}
						userForFoster.IsActive = true; // Ensure they are active
					}

					// Create or update FosterProfile
					var fosterProfile = await _dbContext.FosterProfiles.FirstOrDefaultAsync(fp => fp.UserId == userForFoster.Id);
					if (fosterProfile == null)
					{
						_logger.LogInformation("Creating new FosterProfile for User ID: {UserId}, linked to Application ID: {ApplicationId}", userForFoster.Id, application.Id);
						fosterProfile = new FosterProfile
						{
							User = userForFoster,
							FosterApplicationId = application.Id,
							ApprovalDate = DateTime.UtcNow,
							IsActiveFoster = true,
							DateCreated = DateTime.UtcNow,
							DateUpdated = DateTime.UtcNow
						};
						_dbContext.FosterProfiles.Add(fosterProfile);
					}
					else
					{
						_logger.LogInformation("FosterProfile already exists for User ID: {UserId}. Ensuring it's active.", userForFoster.Id);
						fosterProfile.IsActiveFoster = true;
						fosterProfile.FosterApplicationId ??= application.Id;
						fosterProfile.DateUpdated = DateTime.UtcNow;
						_dbContext.FosterProfiles.Update(fosterProfile);
					}
				}

				await _dbContext.SaveChangesAsync();
				await transaction.CommitAsync();

				_logger.LogInformation("Successfully updated foster application ID {ApplicationId} to status '{NewStatus}' by User {ReviewerId}",
					applicationId, application.Status, currentUser.Id);

				// Return a representation of the updated application (e.g., ListItem DTO)
				var updatedAppDto = new FosterApplicationListItemDto
				{
					Id = application.Id,
					SubmissionDate = application.SubmissionDate,
					ApplicantName = $"{application.FirstName} {application.LastName}",
					PrimaryEmail = application.PrimaryEmail,
					PrimaryPhone = application.PrimaryPhone,
					Status = application.Status,
					ReviewedBy = currentUser.Email, // Or Name
					ReviewDate = application.ReviewDate
				};

				// --- 4. Return Response ---
				var response = req.CreateResponse(HttpStatusCode.OK); // Return 200 OK
				var jsonResponse = JsonSerializer.Serialize(updatedAppDto, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
				await response.WriteStringAsync(jsonResponse);
				return response;
			}
			catch (Exception ex)
			{
				await transaction.RollbackAsync();
				_logger.LogError(ex, "Error updating foster application ID {ApplicationId}.", applicationId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while updating the application.");
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
				WriteIndented = true // Pretty-print the JSON
			}));

			return response;
		}
	}
}
