using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations; // Required for validation attributes
using System.IdentityModel.Tokens.Jwt; // Ensure this is included
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
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
	// DTO for request body when saving image metadata
	public class CreateAnimalImageMetadataRequest
	{
		[Required(AllowEmptyStrings = false)]
		[MaxLength(100)]
		public string? DocumentType { get; set; } = "Animal Photo"; // Default type
		[Required(AllowEmptyStrings = false)]
		[MaxLength(255)]
		public string? FileName { get; set; } // Original filename
		[Required(AllowEmptyStrings = false)]
		[MaxLength(300)]
		public string? BlobName { get; set; } // Unique name in storage
		[Required(AllowEmptyStrings = false)]
		[Url] // Basic URL validation
		public string? ImageUrl { get; set; } // Base URL from storage
		public string? Caption { get; set; } // Optional caption
		public bool IsPrimary { get; set; } = false; // Is this the main image?
		public int DisplayOrder { get; set; } = 0; // Display order
	}

	public class CreateAnimalImageMetadata
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<CreateAnimalImageMetadata> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;

		public CreateAnimalImageMetadata(AppDbContext dbContext, ILogger<CreateAnimalImageMetadata> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		[Function("CreateAnimalImageMetadata")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// Secure: Admin/Staff/Volunteer can add images
			[HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "animals/{animalId:int}/images")] // Changed route
            AzureFuncHttp.HttpRequestData req,
			int animalId)
		{
			_logger.LogInformation("C# HTTP trigger processing CreateAnimalImageMetadata for Animal ID: {AnimalId}.", animalId);

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
					_logger.LogWarning("CreateAnimalImageMetadata: Token validation failed.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
				}

				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("CreateAnimalImageMetadata: 'sub' (NameIdentifier) claim missing from token.");
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
			string requestBody = string.Empty;
			CreateAnimalImageMetadataRequest? imageRequest;
			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body required.");

				imageRequest = JsonSerializer.Deserialize<CreateAnimalImageMetadataRequest>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				// Use Data Annotations for Validation
				var validationResults = new List<ValidationResult>();
				var validationContext = new ValidationContext(imageRequest!, serviceProvider: null, items: null);
				bool isValid = Validator.TryValidateObject(imageRequest!, validationContext, validationResults, validateAllProperties: true);

				if (!isValid || imageRequest == null)
				{
					string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.FirstOrDefault() ?? "Request")}: {vr.ErrorMessage}"));
					_logger.LogWarning("CreateAnimalImageMetadata request body validation failed. Validation Errors: [{ValidationErrors}]. Body Preview: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid adoption data: {errors}");
				}
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error deserializing or validating CreateAnimal request body.");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request format or data.");
			}
			if (imageRequest == null) { /* Should be caught above, but defensive check */ return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data."); }


			// --- 3. Check if Animal Exists ---
			var animalExists = await _dbContext.Animals.AnyAsync(a => a.Id == animalId);
			if (!animalExists)
			{
				_logger.LogWarning("Attempted to add document metadata for non-existent Animal ID: {AnimalId}", animalId);
				return await CreateErrorResponse(req, HttpStatusCode.NotFound, $"Animal with ID {animalId} not found.");
			}

			// --- 4. Handle is_primary flag ---
			bool makeThisPrimary = imageRequest.IsPrimary; // Check if frontend explicitly requests primary

            // If frontend didn't explicitly set primary, AND no other images exist for this animal, make this one primary
            if (!makeThisPrimary)
            {
                bool hasExistingImages = await _dbContext.AnimalImages.AnyAsync(img => img.AnimalId == animalId);
                if (!hasExistingImages)
                {
                    _logger.LogInformation("No existing images found for Animal ID {AnimalId}. Marking new image as primary.", animalId);
                    makeThisPrimary = true;
                }
            }

            // If this image is set as primary, ensure no others are
            if (makeThisPrimary)
            {
                _logger.LogInformation("New image marked as primary for Animal ID {AnimalId}. Unsetting other primary flags.", animalId);
                var existingPrimaries = await _dbContext.AnimalImages
                    .Where(img => img.AnimalId == animalId && img.IsPrimary)
                    .ToListAsync(); // Find all existing primaries (should be 0 or 1)
                foreach(var existingPrimary in existingPrimaries)
                {
                    existingPrimary.IsPrimary = false;
                    _dbContext.AnimalImages.Update(existingPrimary); // Mark for update
                }
            }

			// --- 5. Create and Save Metadata Record ---
			try
			{
				var newImageRecord = new AnimalImage
				{
					AnimalId = animalId,
					ImageUrl = imageRequest.ImageUrl!,
					BlobName = imageRequest.BlobName!,
					Caption = imageRequest.Caption,
					DisplayOrder = imageRequest.DisplayOrder,
					IsPrimary = imageRequest.IsPrimary,
					DateUploaded = DateTime.UtcNow,
					UploadedByUserId = currentUser!.Id
				};

				_dbContext.AnimalImages.Add(newImageRecord);
				await _dbContext.SaveChangesAsync(); // Save new record (& potentially update old primary flag)

				_logger.LogInformation("Saved image metadata for Animal ID: {AnimalId}. Image ID: {ImageId}", animalId, newImageRecord.Id);

				var response = req.CreateResponse(HttpStatusCode.Created);

				// Define serialization options
                var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

                // Manually serialize DTO and use WriteStringAsync ---
                var jsonPayload = JsonSerializer.Serialize(newImageRecord, jsonOptions);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8"); // Set Content-Type
                await response.WriteStringAsync(jsonPayload); // Write the JSON string
				return response;
			}
            catch (DbUpdateException dbEx) // Catch specific DB errors
            {
                _logger.LogError(dbEx, "Database error creating animal. InnerEx: {InnerMessage}", dbEx.InnerException?.Message);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "A database error occurred while creating the animal.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating animal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while creating the animal.");
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
