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
										 .FirstOrDefaultAsync(u => u.ExternalProviderId == syncRequest.ExternalProviderId);

				User? userToReturn;

				if (existingUser != null)
				{
					_logger.LogInformation("User found in local DB. ExternalProviderId: {ExternalId}, UserId: {UserId}", syncRequest.ExternalProviderId, existingUser.Id);
					userToReturn = existingUser;
					bool profileDataUpdated = false;

					// Update profile info if changed
					if (existingUser.FirstName != syncRequest.FirstName && !string.IsNullOrWhiteSpace(syncRequest.FirstName))
					{
						existingUser.FirstName = syncRequest.FirstName; profileDataUpdated = true;
					}
					if (existingUser.LastName != syncRequest.LastName && !string.IsNullOrWhiteSpace(syncRequest.LastName))
					{
						existingUser.LastName = syncRequest.LastName; profileDataUpdated = true;
					}
					if (existingUser.Email != syncRequest.Email && !string.IsNullOrWhiteSpace(syncRequest.Email))
					{ // Ensure email isn't empty/whitespace if updating
						existingUser.Email = syncRequest.Email; profileDataUpdated = true;
					}

					// Always update last_login_date
					existingUser.LastLoginDate = utcNow;

					// --- Conditionally set date_updated ONLY if profile data changed ---
					//if (profileDataUpdated)
					//{
					//	existingUser.date_updated = utcNow;
					//	_logger.LogInformation("Profile data fields require update for UserId: {UserId}", existingUser.id);
					//}

					// --- Always Save Changes if the entity is tracked and potentially modified ---
					// EF Core Change Tracker will detect if last_login_date or any profile field changed.
					// The database trigger (if exists) will handle date_updated on UPDATE regardless of profileDataUpdated flag.
					// If relying purely on C# for date_updated, the profileDataUpdated flag ensures it's only set then.
					try
					{
						await _dbContext.SaveChangesAsync(); // Save any tracked changes (login date, profile fields, updated date)
						_logger.LogInformation("SaveChangesAsync completed for UserId: {UserId}. ProfileDataUpdatedFlag: {ProfileUpdated}", existingUser.Id, profileDataUpdated);
					}
					catch (DbUpdateConcurrencyException ex)
					{
						// Handle potential concurrency issues if needed
						_logger.LogError(ex, "Concurrency error saving user update for UserId: {UserId}", existingUser.Id);
						// Decide how to handle - potentially reload and retry or return error
						throw; // Re-throw for outer catch block or handle specifically
					}
				}
				else
				{
					_logger.LogInformation("User not found in local DB, creating new user. ExternalProviderId: {ExternalId}", syncRequest.ExternalProviderId);
					var newUser = new User
					{
						Id = Guid.NewGuid(),
						ExternalProviderId = syncRequest.ExternalProviderId,
						Email = syncRequest.Email,
						FirstName = syncRequest.FirstName ?? "Unknown",
						LastName = syncRequest.LastName ?? "User",
						Role = "Guest", // Default role
						IsActive = true,
						LastLoginDate = utcNow
					};
					_dbContext.Users.Add(newUser);
					await _dbContext.SaveChangesAsync(); // Save the new user
					_logger.LogInformation("Created new user with ID: {UserId}", newUser.Id);
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
