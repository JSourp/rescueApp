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

		// Secure endpoint to get the authenticated user's profile
		// This function is called by the Next.js app to fetch user profile data
		[Function("GetUserProfile")]
		public async Task<HttpResponseData> Run(
			[HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "users/me")] HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed GetUserProfile request.");

			// --- Access Authenticated User Principal ---
			ClaimsPrincipal? principal = null;
			string? auth0UserId = null;

			// The principal might be directly available or within Identities
			if (req.Identities.Any() && req.Identities.First().IsAuthenticated)
			{
				principal = new ClaimsPrincipal(req.Identities.First());
				// The 'sub' claim from Auth0 maps to NameIdentifier
				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
			}

			// Fallback: Check headers sometimes populated by Easy Auth (less common in Isolated)
			if (string.IsNullOrEmpty(auth0UserId) && req.Headers.TryGetValues("X-MS-CLIENT-PRINCIPAL-ID", out var headerValues))
			{
				auth0UserId = headerValues.FirstOrDefault();
			}


			if (string.IsNullOrEmpty(auth0UserId))
			{
				_logger.LogWarning("GetUserProfile: Could not find authenticated user principal or 'sub' claim after Azure built-in auth check.");
				// Return Unauthorized because authentication failed or claims are missing
				return req.CreateResponse(HttpStatusCode.Unauthorized);
			}
			// --- User Identified ---

			_logger.LogInformation("GetUserProfile: Authenticated user ID (sub): {Auth0UserId}", auth0UserId);


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
	}
}
