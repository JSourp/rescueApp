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
	public class DeleteAnimalImage
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<DeleteAnimalImage> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;
		private readonly string _blobConnectionString = Environment.GetEnvironmentVariable("AzureBlobStorageConnectionString") ?? string.Empty;
		private readonly string _blobContainerName = "animal-images";

		public DeleteAnimalImage(AppDbContext dbContext, ILogger<DeleteAnimalImage> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_blobConnectionString)) { _logger.LogError("AzureBlobStorageConnectionString not configured."); }
			if (string.IsNullOrEmpty(_auth0Domain) || string.IsNullOrEmpty(_auth0Audience)) { _logger.LogError("Auth0 Domain/Audience not configured."); }
		}

		[Function("DeleteAnimalImage")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// Security is handled by internal Auth0 Bearer token validation and role-based authorization.
			[HttpTrigger(AuthorizationLevel.Anonymous, "DELETE", Route = "images/{imageId:int}")] // Route by image ID
            AzureFuncHttp.HttpRequestData req,
			int imageId)
		{
			_logger.LogInformation("C# HTTP trigger processing DeleteAnimalImage request for Image ID: {ImageId}.", imageId);

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
					_logger.LogWarning("DeleteAnimalImage: Token validation failed.");
					return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
				}

				auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (string.IsNullOrEmpty(auth0UserId))
				{
					_logger.LogError("DeleteAnimalImage: 'sub' (NameIdentifier) claim missing from token.");
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

			// --- 2. Database Transaction ---
			using var transaction = await _dbContext.Database.BeginTransactionAsync();
			try
			{
				// 3. Find Image Metadata Record
				var imageRecord = await _dbContext.AnimalImages.FindAsync(imageId);
				if (imageRecord == null)
				{
					_logger.LogWarning("Image metadata not found for ID: {ImageId}", imageId);
					await transaction.RollbackAsync();
					return await CreateErrorResponse(req, HttpStatusCode.NotFound, "Image record not found.");
				}

				string blobNameToDelete = imageRecord.BlobName;

				// 4. Delete Metadata Record from DB
				_dbContext.AnimalImages.Remove(imageRecord);
				_logger.LogInformation("Marked image metadata record {ImageId} for deletion.", imageId);

				// 5. Delete Blob from Azure Storage
				if (!string.IsNullOrEmpty(blobNameToDelete))
				{
					_logger.LogInformation("Attempting to delete blob: {Container}/{BlobName}", _blobContainerName, blobNameToDelete);
					try
					{
						if (string.IsNullOrEmpty(_blobConnectionString)) throw new InvalidOperationException("Storage connection missing.");
						var containerClient = new BlobContainerClient(_blobConnectionString, _blobContainerName);
						var blobClient = containerClient.GetBlobClient(blobNameToDelete);

						// DeleteIfExistsAsync returns Response<bool> where bool indicates if blob existed
						var deleteResponse = await blobClient.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots);

						if (deleteResponse.Value)
						{
							_logger.LogInformation("Successfully deleted blob '{BlobName}' from container '{Container}'.", blobNameToDelete, _blobContainerName);
						}
						else
						{
							_logger.LogWarning("Blob '{BlobName}' not found in container '{Container}', but proceeding with metadata deletion.", blobNameToDelete, _blobContainerName);
						}
					}
					catch (Exception blobEx)
					{
						// Log and rollback if blob deletion throws an unexpected error.
						_logger.LogError(blobEx, "Error deleting blob '{BlobName}' from storage. Rolling back DB changes.", blobNameToDelete);
						await transaction.RollbackAsync();
						return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Failed to delete document file from storage.");
					}
				}
				else
				{
					_logger.LogWarning("Image metadata record {ImageId} had no blob name stored. Skipping blob deletion.", imageId);
				}

				// 6. Save DB Changes
				await _dbContext.SaveChangesAsync();

				// 7. Commit Transaction
				await transaction.CommitAsync();

				_logger.LogInformation("Successfully deleted image metadata record {ImageId} and blob by User ID: {UserId}", imageId, currentUser.Id);

				// 8. Return Success Response (204 No Content)
				return req.CreateResponse(HttpStatusCode.NoContent);
			}
			catch (Exception ex)
			{
				await transaction.RollbackAsync();
				_logger.LogError(ex, "Error processing delete image transaction for Image ID: {ImageId}", imageId);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while deleting the image.");
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
				WriteIndented = true // Pretty-print the JSON
			}));

			return response;
		}
	}
}
