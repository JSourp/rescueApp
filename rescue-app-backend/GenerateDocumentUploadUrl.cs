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
using System.Web; // For HttpUtility
using Azure.Storage; // For StorageSharedKeyCredential
using Azure.Storage.Blobs; // Blob SDK
using Azure.Storage.Blobs.Models; // For PublicAccessType
using Azure.Storage.Sas; // SAS SDK
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
// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	public class GenerateDocumentUploadUrl
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<GenerateDocumentUploadUrl> _logger;
		private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
		private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
		private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
		private static TokenValidationParameters? _validationParameters;
		private readonly string _blobConnectionString = Environment.GetEnvironmentVariable("AzureBlobStorageConnectionString") ?? string.Empty;
		private readonly string _blobContainerName = "animal-documents"; // container name

		public GenerateDocumentUploadUrl(AppDbContext dbContext, ILogger<GenerateDocumentUploadUrl> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
			if (string.IsNullOrEmpty(_blobConnectionString))
			{
				_logger.LogError("AzureBlobStorageConnectionString is not configured.");
			}
		}

		[Function("GenerateDocumentUploadUrl")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			// TODO: Secure this endpoint (Admin/Staff/Volunteer roles)
			[HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "animals/{animalId:int}/document-upload-url")]
			AzureFuncHttp.HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed GenerateDocumentUploadUrl request.");

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
			// --- End Auth ---


			// --- 2. Get Query Parameters ---
			var queryParams = HttpUtility.ParseQueryString(req.Url.Query);
			string? file_name = queryParams["file_name"];
			string? contentType = queryParams["contentType"]; // e.g., image/jpeg, image/png

			if (string.IsNullOrWhiteSpace(file_name) || string.IsNullOrWhiteSpace(contentType))
			{
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Missing required query parameters: 'file_name' and 'contentType'.");
			}

			// Validation for Allowed Document Types ---
			// Define the MIME types to allow
			var allowedContentTypes = new HashSet<string> {
				 "image/jpeg",
				 "image/png",
				 "image/gif",
				 "image/webp",
				 "application/pdf",
				 "application/msword", // .doc
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
				 "text/plain" // .txt
            };

			if (!allowedContentTypes.Contains(contentType)) // Check if the received type is in our allowed set
			{
				_logger.LogWarning("Invalid contentType '{ContentType}' received for file '{file_name}'.", contentType, file_name);
				// Provide a more helpful error message listing allowed types
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid contentType. Allowed types are: {string.Join(", ", allowedContentTypes)}");
			}
			_logger.LogInformation("Validated contentType '{ContentType}' for file '{file_name}'.", contentType, file_name);

			// --- 3. Generate SAS URL ---
			try
			{
				if (string.IsNullOrEmpty(_blobConnectionString))
				{
					throw new InvalidOperationException("Storage connection string not configured.");
				}

				var containerClient = new BlobContainerClient(_blobConnectionString, _blobContainerName);
				// Ensure container exists (optional, depends on setup)
				await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

				// Create a unique blob name to prevent overwrites
				string uniqueBlobName = $"{Guid.NewGuid()}-{file_name}"; // Prepend GUID
				var blobClient = containerClient.GetBlobClient(uniqueBlobName);

				if (string.IsNullOrEmpty(_blobConnectionString))
				{
					_logger.LogError("AzureBlobStorageConnectionString is not configured.");
					return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Storage configuration error [CS Missing].");
				}

				// --- Get Account Name and Key from Connection String ---
				// Note: Robust parsing might be needed for complex connection strings
				string accountName = string.Empty;
				string accountKey = string.Empty;
				try
				{
					var parts = _blobConnectionString.Split(';');
					accountName = parts.FirstOrDefault(p => p.StartsWith("AccountName=", StringComparison.OrdinalIgnoreCase))?["AccountName=".Length..] ?? string.Empty;
					accountKey = parts.FirstOrDefault(p => p.StartsWith("AccountKey=", StringComparison.OrdinalIgnoreCase))?["AccountKey=".Length..] ?? string.Empty;

					if (string.IsNullOrEmpty(accountName) || string.IsNullOrEmpty(accountKey))
					{
						throw new InvalidOperationException("Could not parse AccountName or AccountKey from connection string.");
					}
				}
				catch (Exception parseEx)
				{
					_logger.LogError(parseEx, "Failed to parse Azure Blob Storage connection string.");
					return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Storage configuration error [CS Parse].");
				}
				// --- End Parsing ---

				// Create SAS builder configuration
				var sasBuilder = new BlobSasBuilder()
				{
					BlobContainerName = _blobContainerName,
					BlobName = uniqueBlobName,
					Resource = "b", // 'b' for blob
					StartsOn = DateTimeOffset.UtcNow.AddMinutes(-5), // Allow for clock skew
					ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(15), // Short expiry time
				};
				// Grant necessary permissions (Write for PUT upload)
				sasBuilder.SetPermissions(BlobSasPermissions.Write);

				// --- Generate SAS Token using Account Key ---
				var credential = new StorageSharedKeyCredential(accountName, accountKey);
				string sasToken = sasBuilder.ToSasQueryParameters(credential).ToString();
				// --- End Generate SAS Token ---


				// --- Construct Full SAS URI ---
				UriBuilder sasUriBuilder = new UriBuilder(blobClient.Uri)
				{
					Query = sasToken // Append the generated SAS token query string
				};
				Uri sasUri = sasUriBuilder.Uri;
				// --- End Construct URI ---

				_logger.LogInformation("Generated SAS URI for blob: {BlobName}", uniqueBlobName);

				// Return the SAS URI and the final blob URL
				var response = req.CreateResponse(HttpStatusCode.OK);
				await response.WriteAsJsonAsync(new
				{
					sasUrl = sasUri.ToString(),    // URL frontend uses for direct PUT upload
					blob_url = blobClient.Uri.ToString(), // URL to save in your database (without SAS)
					blob_name = uniqueBlobName
				});
				return response;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error generating SAS URL for file {file_name}", file_name);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Could not generate upload URL.");
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
				WriteIndented = true // Optional: Pretty-print the JSON
			}));

			return response;
		}
	}
}
