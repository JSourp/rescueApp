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
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs;

// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	public class GetVolunteerApplications
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<GetVolunteerApplications> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public GetVolunteerApplications(AppDbContext dbContext, ILogger<GetVolunteerApplications> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience))
			{
				_logger.LogError("Auth0 Domain/Audience not configured.");
			}
		}

		[Function("GetVolunteerApplications")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// Security is handled by internal Auth0 Bearer token validation and role-based authorization.
			[HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "volunteer-applications")] AzureFuncHttp.HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed GetVolunteerApplications request.");

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

			try
			{
				// --- 2. Get Query Parameters ---
				var queryParams = HttpUtility.ParseQueryString(req.Url.Query);
				string? statusFilter = queryParams["status"];
				string? sortBy = queryParams["sortBy"]?.ToLowerInvariant() ?? "submissiondate_desc";

				IQueryable<VolunteerApplication> query = _dbContext.VolunteerApplications
					.Include(app => app.ReviewedByUser); // Include reviewer info

				// Apply Filters
				if (!string.IsNullOrWhiteSpace(statusFilter))
				{
					_logger.LogInformation("Filtering volunteer applications by status: {Status}", statusFilter);
					query = query.Where(app => app.Status != null && app.Status.ToLower() == statusFilter.ToLower());
				}

				// Apply Sorting
				bool descending = sortBy.EndsWith("_desc");
				string sortField = sortBy.Replace("_desc", "").Replace("_asc", "");

				switch (sortField)
				{
					case "submissiondate":
						query = descending ? query.OrderByDescending(app => app.SubmissionDate) : query.OrderBy(app => app.SubmissionDate);
						break;
					case "applicantname":
						query = descending
							? query.OrderByDescending(app => app.LastName).ThenByDescending(app => app.FirstName)
							: query.OrderBy(app => app.LastName).ThenBy(app => app.FirstName);
						break;
					case "status":
						query = descending ? query.OrderByDescending(app => app.Status) : query.OrderBy(app => app.Status);
						break;
					default:
						query = query.OrderByDescending(app => app.SubmissionDate);
						break;
				}

				// Project to DTO
				var applicationsDto = await query
					.Select(app => new VolunteerApplicationListItemDto
					{
						Id = app.Id,
						SubmissionDate = app.SubmissionDate,
						ApplicantName = $"{app.FirstName} {app.LastName}",
						PrimaryEmail = app.PrimaryEmail,
						PrimaryPhone = app.PrimaryPhone,
						Status = app.Status,
						AreasOfInterest = app.AreasOfInterest, // Pass this through
						ReviewedBy = app.ReviewedByUser != null ? $"{app.ReviewedByUser.FirstName} {app.ReviewedByUser.LastName}" : null,
						ReviewDate = app.ReviewDate
					})
					.ToListAsync();

				_logger.LogInformation("Returning {Count} volunteer applications.", applicationsDto.Count);

				var response = req.CreateResponse(HttpStatusCode.OK);
				response.Headers.Add("Content-Type", "application/json; charset=utf-8");
				try
				{
					var jsonPayload = JsonSerializer.Serialize(applicationsDto, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
					await response.WriteStringAsync(jsonPayload);
					_logger.LogInformation("Successfully serialized and sent {Count} volunteer applications.", applicationsDto.Count);
				}
				catch (JsonException jsonEx)
				{
					_logger.LogError(jsonEx, "JSON SERIALIZATION FAILED for volunteer applications. Count: {Count}", applicationsDto.Count);
					// Return a 500 with a specific error
					response = req.CreateResponse(HttpStatusCode.InternalServerError);
					await response.WriteStringAsync("Error serializing application data.");
				}
				catch (Exception writeEx)
				{
					_logger.LogError(writeEx, "Error writing JSON payload to response for volunteer applications.");
					response = req.CreateResponse(HttpStatusCode.InternalServerError);
					await response.WriteStringAsync("Error writing response.");
				}
				return response;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error fetching volunteer applications.");
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while fetching volunteer applications.");
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
