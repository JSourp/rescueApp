using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;

namespace rescueApp
{
	// Request model matching the payload sent from Next.js afterCallback
	// Ensure this namespace is correct too, or define it inline
	// namespace rescueApp.Models.Requests { ... }
	public class SyncUserRequest
	{
		public string ExternalProviderId { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
		public string? FirstName { get; set; }
		public string? LastName { get; set; }
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
			[HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "users/sync")] HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed SyncUser request.");

			string requestBody = string.Empty;
			SyncUserRequest? syncRequest;

			// --- Deserialize Request Body ---
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody))
				{
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body cannot be empty.");
				}
				syncRequest = JsonSerializer.Deserialize<SyncUserRequest>(requestBody,
					new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				if (syncRequest == null || string.IsNullOrWhiteSpace(syncRequest.ExternalProviderId) || string.IsNullOrWhiteSpace(syncRequest.Email))
				{
					_logger.LogWarning("SyncUser request missing required fields (ExternalProviderId, Email). Body: {Body}", requestBody);
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Missing required fields: externalProviderId and email.");
				}
			}
			catch (Exception ex) // Catch broader exception during parsing/reading
			{
				_logger.LogError(ex, "Error reading/deserializing request body for SyncUser. Body: {Body}", requestBody ?? "<empty>");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Could not read or parse request body.");
			}
			// Ensure syncRequest is not null after try-catch for safety
			if (syncRequest == null) { return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }

			try
			{
				var utcNow = DateTime.UtcNow;

				// --- Find or Create User ---
				var existingUser = await _dbContext.Users
										 .FirstOrDefaultAsync(u => u.external_provider_id == syncRequest.ExternalProviderId);

				User? userToReturn;

				if (existingUser != null)
				{
					_logger.LogInformation("User found in local DB. ExternalProviderId: {ExternalId}, UserId: {UserId}", syncRequest.ExternalProviderId, existingUser.id);
					userToReturn = existingUser;
					bool updated = false;

					// Update profile info if changed
					if (existingUser.first_name != syncRequest.FirstName && !string.IsNullOrWhiteSpace(syncRequest.FirstName))
					{
						existingUser.first_name = syncRequest.FirstName;
						updated = true;
					}
					if (existingUser.last_name != syncRequest.LastName && !string.IsNullOrWhiteSpace(syncRequest.LastName))
					{
						existingUser.last_name = syncRequest.LastName;
						updated = true;
					}
					if (existingUser.email != syncRequest.Email)
					{
						existingUser.email = syncRequest.Email;
						updated = true;
					}

					// Always update last_login_date
					existingUser.last_login_date = utcNow;

					// Save changes if any field was updated
					if (updated)
					{
						existingUser.date_updated = utcNow;
						_dbContext.Users.Update(existingUser);
						await _dbContext.SaveChangesAsync();
						_logger.LogInformation("Updated user details for UserId: {UserId}. ProfileUpdated: {ProfileUpdated}", existingUser.id, updated);
					}
				}
				else
				{
					_logger.LogInformation("User not found in local DB, creating new user. ExternalProviderId: {ExternalId}", syncRequest.ExternalProviderId);
					var newUser = new User
					{
						id = Guid.NewGuid(),
						external_provider_id = syncRequest.ExternalProviderId,
						email = syncRequest.Email,
						first_name = syncRequest.FirstName ?? "Unknown",
						last_name = syncRequest.LastName ?? "User",
						role = "Guest", // Default role
						is_active = true,
						date_created = utcNow,
						date_updated = utcNow,
						last_login_date = utcNow
					};
					_dbContext.Users.Add(newUser);
					await _dbContext.SaveChangesAsync(); // Save the new user
					_logger.LogInformation("Created new user with ID: {UserId}", newUser.id);
					userToReturn = newUser;
				}

				// --- Return Success Response ---
				var response = req.CreateResponse(HttpStatusCode.OK);
				var jsonResponse = JsonSerializer.Serialize(userToReturn, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
				await response.WriteStringAsync(jsonResponse); // Write serialized JSON string to response
				return response;

			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error syncing user data for ExternalProviderId: {ExternalId}", syncRequest.ExternalProviderId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while syncing user data.");
			}
		}

		// Helper for creating consistent error responses
		private async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
		{
			var response = req.CreateResponse(statusCode);
			await response.WriteAsJsonAsync(new { message = message }, statusCode);
			return response;
		}
	}
}
