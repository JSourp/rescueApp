using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt; // Ensure this is included
using System.IO;
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
    public class DeleteAnimal
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<DeleteAnimal> _logger;
        private readonly string _blobConnectionString = Environment.GetEnvironmentVariable("AzureBlobStorageConnectionString") ?? string.Empty;
        private readonly string _blobImageContainerName = "animal-images";
        private readonly string _auth0Domain = Environment.GetEnvironmentVariable("AUTH0_ISSUER_BASE_URL") ?? string.Empty;
        private readonly string _auth0Audience = Environment.GetEnvironmentVariable("AUTH0_AUDIENCE") ?? string.Empty;
        private static ConfigurationManager<OpenIdConnectConfiguration>? _configManager;
        private static TokenValidationParameters? _validationParameters;

        public DeleteAnimal(AppDbContext dbContext, ILogger<DeleteAnimal> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("DeleteAnimal")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            // TODO: Change AuthorizationLevel from Anonymous after testing/implementing real auth
            [HttpTrigger(AuthorizationLevel.Anonymous, "DELETE", Route = "animals/{id}")]
            AzureFuncHttp.HttpRequestData req,
            int id) // Animal ID from route
        {
            _logger.LogInformation("C# HTTP trigger function processed DeleteAnimal request for ID: {animal_id}", id);

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
                    _logger.LogWarning("DeleteAnimal: Token validation failed.");
                    return await CreateErrorResponse(req, HttpStatusCode.Unauthorized, "Invalid or missing token.");
                }

                auth0UserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(auth0UserId))
                {
                    _logger.LogError("DeleteAnimal: 'sub' (NameIdentifier) claim missing from token.");
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User identifier missing from token.");
                }

                _logger.LogInformation("Token validation successful for user ID (sub): {Auth0UserId}", auth0UserId);

                // Fetch user from DB based on validated Auth0 ID
                currentUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.ExternalProviderId == auth0UserId);

                if (currentUser == null || !currentUser.IsActive)
                {
                    _logger.LogWarning("DeleteAnimal: User not authorized or inactive. ExternalId: {ExternalId}", auth0UserId);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "User not authorized or inactive.");
                }

                // --- Role Check: ONLY Admin can delete ---
                if (currentUser.Role != "Admin")
                {
                    _logger.LogWarning("User Role '{UserRole}' not authorized to delete animal. UserID: {UserId}", currentUser.Role, currentUser.Id);
                    return await CreateErrorResponse(req, HttpStatusCode.Forbidden, "Permission denied to delete animal.");
                }
                _logger.LogInformation("User {UserId} with role {UserRole} authorized to delete animal.", currentUser.Id, currentUser.Role);

            }
            catch (Exception ex) // Catch potential exceptions during auth/authz
            {
                _logger.LogError(ex, "Error during authentication/authorization in DeleteAnimal.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "Authentication/Authorization error.");
            }


            // --- 2. Find and Delete Animal ---
            try
            {
                var animalToDelete = await _dbContext.Animals
                    .Include(a => a.AnimalImages) // Eager load related images
                    .FirstOrDefaultAsync(a => a.Id == id); // Use PascalCase for C# model property

                if (animalToDelete == null)
                {
                    _logger.LogWarning("Animal not found for deletion. Animal ID: {animal_id}", id);
                    return req.CreateResponse(HttpStatusCode.NotFound);
                }

                // --- 3. Delete Associated Blobs from Azure Storage ---
                if (animalToDelete.AnimalImages != null && animalToDelete.AnimalImages.Any())
                {
                    if (string.IsNullOrEmpty(_blobConnectionString))
                    {
                        _logger.LogError("Blob connection string is missing. Cannot delete images from storage for Animal ID {AnimalId}.", id);
                    }
                    else
                    {
                        var containerClient = new BlobContainerClient(_blobConnectionString, _blobImageContainerName);
                        foreach (var image in animalToDelete.AnimalImages) // Iterate through AnimalImages
                        {
                            if (!string.IsNullOrWhiteSpace(image.BlobName))
                            {
                                _logger.LogInformation("Attempting to delete blob: {Container}/{BlobName} for Animal ID {AnimalId}",
                                    _blobImageContainerName, image.BlobName, id);
                                try
                                {
                                    var blobClient = containerClient.GetBlobClient(image.BlobName);
                                    var deleteResponse = await blobClient.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots);
                                    if (deleteResponse.Value)
                                    {
                                        _logger.LogInformation("Successfully deleted blob '{BlobName}'.", image.BlobName);
                                    }
                                    else
                                    {
                                        _logger.LogWarning("Blob '{BlobName}' not found in container during delete for Animal ID {AnimalId}.", image.BlobName, id);
                                    }
                                }
                                catch (Exception blobEx)
                                {
                                    // Log error but continue, to ensure DB record can still be deleted.
                                    _logger.LogError(blobEx, "Error deleting blob '{BlobName}' for Animal ID {AnimalId}.", image.BlobName, id);
                                }
                            }
                            else
                            {
                                _logger.LogWarning("AnimalImage record ID {ImageId} for Animal ID {AnimalId} has a missing or empty BlobName.", image.Id, id);
                            }
                        }
                    }
                }

                _dbContext.Animals.Remove(animalToDelete);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Successfully deleted Animal ID: {animal_id} by User ID: {UserId}", id, currentUser.Id);

                // --- 4. Return Success Response ---
                // 204 No Content is standard for successful DELETE
                var response = req.CreateResponse(HttpStatusCode.NoContent);
                return response;
            }
            catch (DbUpdateException dbEx) // Handle potential FK constraint issues if related data exists
            {
                _logger.LogError(dbEx, "Database error deleting animal ID: {animal_id}. InnerEx: {InnerMessage}", id, dbEx.InnerException?.Message);
                // Return Conflict or Internal Server Error depending on constraint type
                return await CreateErrorResponse(req, HttpStatusCode.Conflict, "Could not delete animal due to related data. Please check adoption history or other dependencies.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting animal ID: {animal_id}", id);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while deleting the animal.");
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
