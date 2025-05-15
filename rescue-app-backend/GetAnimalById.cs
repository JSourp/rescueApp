using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore; // Required for Include/ThenInclude
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs;

using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp;
public class GetAnimalById
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<GetAnimalById> _logger;

    public GetAnimalById(AppDbContext dbContext, ILogger<GetAnimalById> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [Function("GetAnimalById")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "animals/{id:int}")] HttpRequestData req,
        int id,
        FunctionContext executionContext)
    {
        _logger.LogInformation("C# HTTP trigger function processed GetAnimalById request for ID: {id}", id);

        try
        {
            // Fetch the animal including the ordered list of its images
            var animalEntity = await _dbContext.Animals
                    .Include(a => a.AnimalImages
                                .OrderBy(img => !img.IsPrimary) // Primary first
                                .ThenBy(img => img.DisplayOrder)
                                .ThenBy(img => img.Id))
                    .Include(a => a.CurrentFoster)
                    .AsNoTracking() // Good for read-only queries
                    .FirstOrDefaultAsync(a => a.Id == id); // Find animal by ID

            if (animalEntity == null)
            {
                _logger.LogWarning("Animal not found with ID: {id}", id);
                var notFoundResponse = req.CreateResponse(HttpStatusCode.NotFound);
                await notFoundResponse.WriteStringAsync($"Animal with ID {id} not found.");
                return notFoundResponse;
            }

            // Serialize the animal object to JSON
            var jsonResponse = JsonSerializer.Serialize(animalEntity, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false,
                ReferenceHandler = ReferenceHandler.IgnoreCycles
            });

            // --- Project to DTO ---
            var animalDetailDto = new AnimalDetailDto
            {
                Id = animalEntity.Id,
                AnimalType = animalEntity.AnimalType,
                Name = animalEntity.Name,
                Breed = animalEntity.Breed,
                DateOfBirth = animalEntity.DateOfBirth,
                Gender = animalEntity.Gender,
                Weight = animalEntity.Weight,
                Story = animalEntity.Story,
                AdoptionStatus = animalEntity.AdoptionStatus,
                DateCreated = animalEntity.DateCreated,
                DateUpdated = animalEntity.DateUpdated,
                CreatedByUserId = animalEntity.CreatedByUserId,
                UpdatedByUserId = animalEntity.UpdatedByUserId,
                CurrentFosterUserId = animalEntity.CurrentFosterUserId,
                CurrentFosterName = animalEntity.CurrentFoster != null
                    ? $"{animalEntity.CurrentFoster.FirstName} {animalEntity.CurrentFoster.LastName}"
                    : null,
                AnimalImages = animalEntity.AnimalImages.Select(img => new AnimalImageDto
                {
                    Id = img.Id,
                    FileName = img.BlobName,
                    ImageUrl = img.ImageUrl,
                    Caption = img.Caption,
                    IsPrimary = img.IsPrimary,
                    DisplayOrder = img.DisplayOrder,
                    DateUploaded = img.DateUploaded
                }).ToList()
            };

            var response = req.CreateResponse(HttpStatusCode.OK);
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
                // No ReferenceHandler needed for DTOs
            };
            var jsonString = JsonSerializer.Serialize(animalDetailDto, jsonOptions);
            await response.WriteStringAsync(jsonString); // Serialize the DTO
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving animal with ID {id}.", id);
            // Create and return a proper error response
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("An error occurred while fetching animal details.");
            return errorResponse;
        }
    }
}
