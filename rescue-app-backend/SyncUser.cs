using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;

// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	// DTO for the incoming request from the frontend after Auth0 login
	// Properties should match the claims sent from Auth0 profile/token
	// TODO: Consider moving this to Models/Requests folder
	public class SyncUserRequest
	{
		[Required]
		[JsonPropertyName("sub")] // Matches Auth0 'sub' claim
		public string? Auth0UserId { get; set; }

		[Required]
		[EmailAddress]
		[JsonPropertyName("email")] // Matches Auth0 'email' claim
		public string? Email { get; set; }

		[JsonPropertyName("given_name")] // Matches Auth0 'given_name'
		public string? FirstName { get; set; }

		[JsonPropertyName("family_name")] // Matches Auth0 'family_name'
		public string? LastName { get; set; }

		[JsonPropertyName("name")] // Fallback for full name if given/family not present
		public string? FullName { get; set; }

		[JsonPropertyName("roles")]
		public List<string>? Roles { get; set; } // e.g., ["Admin", "Foster"]
	}

	public class SyncUser
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<SyncUser> _logger;

		public SyncUser(AppDbContext dbContext, ILogger<SyncUser> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		[Function("SyncUser")]
		public async Task<HttpResponseData> Run(
			// Security is handled by internal Auth0 Bearer token validation and role-based authorization.
			[HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "users/sync")] HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed SyncUser request.");

			string requestBody = string.Empty;
			SyncUserRequest? syncRequest;

			// --- Deserialize & Validate Request Body ---
			// The request body itself contains the authenticated user's claims from Auth0
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody))
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body is required.");

				syncRequest = JsonSerializer.Deserialize<SyncUserRequest>(requestBody,
					new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				var validationResults = new List<ValidationResult>();
				bool isValid = Validator.TryValidateObject(syncRequest!, new ValidationContext(syncRequest!), validationResults, true);

				if (!isValid || syncRequest == null || string.IsNullOrWhiteSpace(syncRequest.Auth0UserId) || string.IsNullOrWhiteSpace(syncRequest.Email))
				{
					string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.Any() ? vr.MemberNames.First() : "Request")}: {vr.ErrorMessage}"));
					if (string.IsNullOrWhiteSpace(syncRequest?.Auth0UserId)) errors += " Auth0UserId (sub) is required;";
					if (string.IsNullOrWhiteSpace(syncRequest?.Email)) errors += " Email is required;";
					_logger.LogWarning("SyncUser request DTO validation failed. Errors: [{ValidationErrors}]", errors);
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid user data for sync: {errors}");
				}
			}
			catch (JsonException jsonEx)
			{
				_logger.LogError(jsonEx, "Error deserializing SyncUser request body. Body: {BodyPreview}", requestBody.Substring(0, Math.Min(requestBody.Length, 200)));
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format in request body.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error processing SyncUser request body.");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
			}

			User? userEntity = null;
			bool isNewUser = false;
			DateTime utcNow = DateTime.UtcNow;

			// Find user by ExternalProviderId (Auth0 sub)
			userEntity = await _dbContext.Users.FirstOrDefaultAsync(u => u.ExternalProviderId == syncRequest.Auth0UserId);

			if (userEntity != null) // Existing user found by Auth0 ID
			{
				_logger.LogInformation("Existing user found by ExternalProviderId: {UserId} for Auth0 Sub: {Auth0Sub}", userEntity.Id, syncRequest.Auth0UserId);
				// User found by Auth0 ID, update their details
				userEntity.Email = syncRequest.Email!; // Email can change in Auth0
				userEntity.FirstName = syncRequest.FirstName ?? userEntity.FirstName;
				userEntity.LastName = syncRequest.LastName ?? userEntity.LastName;
				userEntity.LastLoginDate = utcNow;
				userEntity.IsActive = true; // Ensure active on login
				userEntity.DateUpdated = utcNow;

				// Role synchronization:
				// Get the primary role from the token (e.g., the first one, or based on priority)
				// Do not downgrade an Admin/Staff if they also have a "Foster" role from Auth0.
				string? roleFromToken = syncRequest.Roles?.FirstOrDefault(); // Takes the first role
				string[] privilegedRoles = { "Admin", "Staff" };

				if (!string.IsNullOrWhiteSpace(roleFromToken) &&
					!privilegedRoles.Any(pr => pr.Equals(userEntity.Role, StringComparison.OrdinalIgnoreCase)))
				{
					// Only update role if current role is not privileged, or if new role is privileged
					if (privilegedRoles.Contains(roleFromToken) || !privilegedRoles.Contains(userEntity.Role ?? ""))
					{
						if (userEntity.Role != roleFromToken)
						{
							_logger.LogInformation("Updating role for User {UserId} from '{OldRole}' to '{NewRole}' based on token.", userEntity.Id, userEntity.Role, roleFromToken);
							userEntity.Role = roleFromToken;
						}
					}
				}
				_dbContext.Users.Update(userEntity);
			}
			else // No user found by Auth0 ID, check for local-only or create new
			{
				// User not found by ExternalProviderId, try finding by Email where ExternalProviderId is NULL
				// This links a "local-only" user (e.g., created when an application was approved) to their new Auth0 login
				_logger.LogInformation("User not found by ExternalProviderId. Attempting to find local-only user by email: {Email}", syncRequest.Email);

				string emailToCompare = syncRequest.Email!.ToLowerInvariant(); // Convert incoming email to lower once
				userEntity = await _dbContext.Users
					.FirstOrDefaultAsync(u => u.Email.ToLower() == emailToCompare && u.ExternalProviderId == null);

				if (userEntity != null)
				{
					_logger.LogInformation("Found existing local-only user record (ID: {UserId}) for email {Email}. Linking to Auth0 Sub: {Auth0Sub}",
						userEntity.Id, syncRequest.Email, syncRequest.Auth0UserId);

					userEntity.ExternalProviderId = syncRequest.Auth0UserId; // Link to Auth0
					userEntity.FirstName = syncRequest.FirstName ?? userEntity.FirstName; // Update if Auth0 has it
					userEntity.LastName = syncRequest.LastName ?? userEntity.LastName;   // Update if Auth0 has it
					userEntity.LastLoginDate = utcNow;
					userEntity.IsActive = true; // Activate on first real login
					userEntity.DateUpdated = utcNow;

					// Role: If local user had a role (e.g., "Foster"), and token has roles, decide priority.
					// For now, let's assume if local user had a role, we keep it unless Auth0 provides a higher one.
					string? roleFromToken = syncRequest.Roles?.FirstOrDefault();
					string[] privilegedRoles = { "Admin", "Staff" };

					if (!string.IsNullOrWhiteSpace(roleFromToken) &&
						!privilegedRoles.Any(pr => pr.Equals(userEntity.Role, StringComparison.OrdinalIgnoreCase)))
					{
						if (privilegedRoles.Contains(roleFromToken) || !privilegedRoles.Contains(userEntity.Role ?? ""))
						{
							if (userEntity.Role != roleFromToken)
							{
								_logger.LogInformation("Updating role for linked User {UserId} from '{OldRole}' to '{NewRole}' based on token.", userEntity.Id, userEntity.Role, roleFromToken);
								userEntity.Role = roleFromToken;
							}
						}
					}
					_dbContext.Users.Update(userEntity);
				}
				else // Create brand new user
				{
					// User not found by ExternalProviderId or as local-only by Email. Create new user.
					_logger.LogInformation("No existing user found. Creating new user for Auth0 Sub: {Auth0Sub}, Email: {Email}",
						syncRequest.Auth0UserId, syncRequest.Email);
					isNewUser = true;

					string? finalFirstName = syncRequest.FirstName;
					string? finalLastName = syncRequest.LastName;

					if (string.IsNullOrWhiteSpace(finalFirstName) && !string.IsNullOrWhiteSpace(syncRequest.FullName))
					{
						var nameParts = syncRequest.FullName.Split(new[] { ' ' }, 2);
						finalFirstName = nameParts.FirstOrDefault();
						if (nameParts.Length > 1 && string.IsNullOrWhiteSpace(finalLastName))
						{
							finalLastName = nameParts.LastOrDefault();
						}
					}
					// Ensure FirstName is not null for DB constraint
					if (string.IsNullOrWhiteSpace(finalFirstName))
					{
						finalFirstName = syncRequest.Email!.Split('@')[0]; // Fallback to part of email
						_logger.LogWarning("FirstName was null for new user, using email prefix as fallback for Auth0 Sub: {Auth0Sub}", syncRequest.Auth0UserId);
					}

					userEntity = new User
					{
						ExternalProviderId = syncRequest.Auth0UserId,
						Email = syncRequest.Email!,
						FirstName = finalFirstName,
						LastName = finalLastName!, // Can be null
						Role = syncRequest.Roles?.FirstOrDefault() ?? "Guest",
						IsActive = true,
						DateCreated = utcNow,
						DateUpdated = utcNow,
						LastLoginDate = utcNow
					};
					_dbContext.Users.Add(userEntity);
				}
			}

			try
			{
				await _dbContext.SaveChangesAsync();
				_logger.LogInformation("User sync successful for User ID: {UserId} (IsNew: {IsNewUser})", userEntity.Id, isNewUser);

				var response = req.CreateResponse(isNewUser ? HttpStatusCode.Created : HttpStatusCode.OK);
				// Return the synced/created user (or a DTO of it)
				await response.WriteAsJsonAsync(userEntity);
				return response;
			}
			catch (DbUpdateException dbEx)
			{
				_logger.LogError(dbEx, "Database error during user sync. Auth0 Sub: {Auth0Sub}", syncRequest.Auth0UserId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Database error during user sync.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error during user sync. Auth0 Sub: {Auth0Sub}", syncRequest.Auth0UserId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Unexpected error during user sync.");
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
