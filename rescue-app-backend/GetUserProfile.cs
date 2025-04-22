using System;
using System.Linq;
using System.Net;
using System.Security.Claims;
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
		public DateTime? LastLoginDate { get; set; }
	}

	public class GetUserProfile
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<GetUserProfile> _logger;

		public GetUserProfile(AppDbContext dbContext, ILogger<GetUserProfile> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		// TODO: Secure this endpoint properly (e.g., require authentication)
		[Function("GetUserProfile")]
		public async Task<HttpResponseData> Run(
			[HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "users/me")] HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed GetUserProfile request.");

			// --- Placeholder for getting authenticated user ID ---
			// Replace this with actual logic to extract Auth0 'sub' from validated token
			string? auth0UserId = GetUserIdFromToken(req); // Replace with actual logic

			if (string.IsNullOrEmpty(auth0UserId))
			{
				_logger.LogWarning("GetUserProfile: Unable to identify authenticated user.");
				return req.CreateResponse(HttpStatusCode.Unauthorized);
			}
			// --- End Placeholder ---

			try
			{
				// Find user in your DB linked to the Auth0 ID
				var user = await _dbContext.Users
									 .FirstOrDefaultAsync(u => u.external_provider_id == auth0UserId);

				if (user == null)
				{
					_logger.LogWarning("GetUserProfile: User not found in local DB for external ID: {ExternalId}", auth0UserId);
					return req.CreateResponse(HttpStatusCode.NotFound);
				}

				// --- Map User entity to the CORRECTED UserProfileDto ---
				var userProfile = new UserProfileDto
				{
					Id = user.id,
					ExternalProviderId = user.external_provider_id,
					FirstName = user.first_name,
					LastName = user.last_name,
					Email = user.email,
					Role = user.role,
					IsActive = user.is_active,
					DateCreated = user.date_created,
					LastLoginDate = user.last_login_date
					// Address/Phone fields removed
				};
				// --- End Mapping ---

				// Return Success Response
				var response = req.CreateResponse(HttpStatusCode.OK);
				// Return camelCase JSON
				var json = JsonSerializer.Serialize(userProfile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
				await response.WriteStringAsync(json);
				return response;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error fetching user profile for ExternalProviderId: {ExternalId}", auth0UserId ?? "N/A");
				var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
				await errorResponse.WriteStringAsync("An error occurred while fetching the user profile.");
				return errorResponse;
			}
		}

		// --- Placeholder Token Extraction - Needs Real Implementation ---
		private string? GetUserIdFromToken(HttpRequestData req)
		{
			_logger.LogWarning("GetUserIdFromToken: Using placeholder - NO REAL AUTHENTICATION!");
			// Replace with logic to validate Authorization header and extract 'sub' claim
			return null; // Return null until real auth is implemented
		}
		// --- End Placeholder ---
	}
}
