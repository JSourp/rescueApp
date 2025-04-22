using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore; // Required for transactions & FindAsync
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;

namespace rescueApp // Adjust namespace
{
    public class CreateAdoption
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<CreateAdoption> _logger;

        public CreateAdoption(AppDbContext dbContext, ILogger<CreateAdoption> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("CreateAdoption")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "adoptions")] HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed CreateAdoption request.");

            string requestBody = string.Empty;
            CreateAdoptionRequest? adoptionRequest;

            // --- 1. Deserialize Request Body ---
            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body cannot be empty.");
                }

                // Use case-insensitive deserialization
                adoptionRequest = JsonSerializer.Deserialize<CreateAdoptionRequest>(requestBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                // --- 2. Validate Input Data ---
                 if (adoptionRequest == null || adoptionRequest.AnimalId <= 0 ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_first_name) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_last_name) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_email) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_phone) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_street_address) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_city) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_state_province) ||
                    string.IsNullOrWhiteSpace(adoptionRequest.adopter_zip_postal_code))
                {
                    _logger.LogWarning("CreateAdoption request missing required fields. Body: {Body}", requestBody);
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Missing required fields for adoption application.");
                }
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "JSON Deserialization error for CreateAdoption. Body: {Body}", requestBody ?? "<empty>");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format in request body.");
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, "Error reading/deserializing request body for CreateAdoption.");
                 return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Could not read or parse request body.");
            }

            // --- 3. Use a Database Transaction ---
            // Ensures both Animal update and AdoptionHistory creation succeed or fail together
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // 4. Find the Animal & Check Status
                var animalToAdopt = await _dbContext.Animals.FindAsync(adoptionRequest.AnimalId);

                if (animalToAdopt == null)
                {
                    _logger.LogWarning("Animal not found for adoption. AnimalId: {AnimalId}", adoptionRequest.AnimalId);
                    await transaction.RollbackAsync();
                    return req.CreateResponse(HttpStatusCode.NotFound); // Animal not found
                }

                var adoptableStatuses = new List<string> { "Available", "Available - In Foster", "Adoption Pending" };
                if (animalToAdopt.adoption_status == null || !adoptableStatuses.Contains(animalToAdopt.adoption_status))
                {
                    _logger.LogWarning("Attempted to adopt animal not in adoptable status. AnimalId: {AnimalId}, Status: {Status}", animalToAdopt.id, animalToAdopt.adoption_status);
                    await transaction.RollbackAsync();
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Animal is not in an adoptable status (Current: {animalToAdopt.adoption_status ?? "None"}).");
                }

                // 5. Update Animal Record
                animalToAdopt.adoption_status = "Adopted";
                animalToAdopt.date_updated = DateTime.UtcNow;
                _dbContext.Animals.Update(animalToAdopt);

                // 6. Create AdoptionHistory Record
                var newAdoptionRecord = new AdoptionHistory
                {
                    animal_id = animalToAdopt.id,
                    adopter_id = animalToAdopt.id,
                    adoption_date = DateTime.UtcNow,
                    return_date = null,
                    notes = adoptionRequest.adoption_notes // Example note field
                };
                _dbContext.AdoptionHistories.Add(newAdoptionRecord);

                // 7. Save Changes to DB
                await _dbContext.SaveChangesAsync();

                // 8. Commit Transaction
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully recorded adoption for Animal ID: {AnimalId}. New AdoptionHistory ID: {HistoryId}", animalToAdopt.id, newAdoptionRecord.id);

                // 9. Create Success Response
                var response = req.CreateResponse(HttpStatusCode.Created); // 201 Created is appropriate
                // Return the created history record (using camelCase)
                var jsonResponse = JsonSerializer.Serialize(newAdoptionRecord, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                await response.WriteStringAsync(jsonResponse);
                // Optional: Set Location header if you have a GET endpoint for individual adoption records
                // response.Headers.Add("Location", $"/api/adoptions/{newAdoptionRecord.id}");
                return response;
            }
            catch (Exception ex)
            {
                // Rollback transaction if anything failed
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error processing adoption transaction for Animal ID: {AnimalId}. Request Body: {Body}", adoptionRequest?.AnimalId, requestBody);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An internal error occurred while finalizing the adoption.");
            }
        }

        // Helper for creating consistent error responses
        private async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
        {
            var response = req.CreateResponse(statusCode);
            // Use a simple standard error structure
            response.StatusCode = statusCode;
            await response.WriteAsJsonAsync(new { message = message });
            return response;
        }
    }
}
