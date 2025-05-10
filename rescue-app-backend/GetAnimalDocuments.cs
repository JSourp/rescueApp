using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
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
	// DTO for returning document metadata to the frontend
	public class AnimalDocumentDto
	{
		public int Id { get; set; }
		public int AnimalId { get; set; }
		public string DocumentType { get; set; } = string.Empty;
		public string FileName { get; set; } = string.Empty;
		public string BlobName { get; set; } = string.Empty; // Might not be needed by frontend
		public string ImageUrl { get; set; } = string.Empty;  // Maybe not needed directly by list view but needed for download link generation.
		public string? Description { get; set; }
		public DateTime DateUploaded { get; set; }
		public Guid? UploadedByUserId { get; set; }
		public string? UploaderEmail { get; set; }
		public string? UploaderFirstName { get; set; }
		public string? UploaderLastName { get; set; }
	}

	public class GetAnimalDocuments
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<GetAnimalDocuments> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public GetAnimalDocuments(AppDbContext dbContext, ILogger<GetAnimalDocuments> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		[Function("GetAnimalDocuments")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// Secure: Admin/Staff/Volunteer can view document lists
			[HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "animals/{animalId:int}/documents")]
			AzureFuncHttp.HttpRequestData req,
			int animalId)
		{
			_logger.LogInformation("C# HTTP trigger processing GetAnimalDocuments request for Animal ID: {AnimalId}.", animalId);

			User? currentUser;
			ClaimsPrincipal? principal;
			string? auth0UserId = null;

			// 1. Authentication & Authorization ---
			try
			{
				// Token Validation ---
				principal = await ValidateTokenAndGetPrincipal(req);
				if (principal == null)
				{
					_logger.LogWarning("GetAnimalDocuments: Token validation failed.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
				}

				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("GetAnimalDocuments: 'sub' (NameIdentifier) claim missing from token.");
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


			// --- 2. Fetch Document Metadata ---
			try
			{
				// Check if animal exists
				var animalExists = await _dbContext.Animals.AnyAsync(a => a.Id == animalId);
				if (!animalExists)
				{
					_logger.LogWarning("Animal not found when fetching documents. Animal ID: {AnimalId}", animalId);
					return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"Animal with ID {animalId} not found.");
				}

				var documents = await _dbContext.AnimalDocuments
					.Where(d => d.AnimalId == animalId)
					.OrderByDescending(d => d.DateUploaded) // Show newest first
															// Include uploader info if needed
					.Include(d => d.UploadedByUser)
					.Select(d => new AnimalDocumentDto // Map to DTO
					{
						Id = d.Id,
						AnimalId = d.AnimalId,
						DocumentType = d.DocumentType,
						FileName = d.FileName,
						BlobName = d.BlobName,
						ImageUrl = d.ImageUrl,
						Description = d.Description,
						DateUploaded = d.DateUploaded,
						UploadedByUserId = d.UploadedByUserId,
						UploaderEmail = d.UploadedByUser != null ? d.UploadedByUser.Email : null,
						UploaderFirstName = d.UploadedByUser != null ? d.UploadedByUser.FirstName : null,
						UploaderLastName = d.UploadedByUser != null ? d.UploadedByUser.LastName : null
					})
					.ToListAsync(); // Execute query

				_logger.LogInformation("Found {Count} documents for Animal ID: {AnimalId}", documents.Count, animalId);

				// --- 3. Return Response ---
				var response = req.CreateResponse(HttpStatusCode.OK);

				// Define serialization options
				var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

				// Manually serialize DTO and use WriteStringAsync ---
				var jsonPayload = JsonSerializer.Serialize(documents, jsonOptions);
				response.Headers.Add("Content-Type", "application/json; charset=utf-8"); // Set Content-Type
				await response.WriteStringAsync(jsonPayload); // Write the JSON string

				return response; // Return the successful response
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error fetching documents for Animal ID: {AnimalId}", animalId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while fetching documents.");
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
