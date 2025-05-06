using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore; // Required for Include/ThenInclude
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models; // Assuming your models are here

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
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "animals/{id:int}")] HttpRequestData req,
        int id,
        FunctionContext executionContext)
    {
        _logger.LogInformation("C# HTTP trigger function processed GetAnimalById request for ID: {id}", id);

        try
        {
            // Fetch the animal INCLUDING the ordered list of its images
            var animal = await _dbContext.Animals
                    .Include(a => a.AnimalImages // Eager load the AnimalImages collection
                                    .OrderBy(img => img.display_order) // Order images by display_order
                                    .ThenBy(img => img.id)) // Consistent secondary sort
                    .FirstOrDefaultAsync(a => a.id == id); // Find animal by ID

            if (animal == null)
            {
                _logger.LogWarning("Animal not found with ID: {id}", id);
                var notFoundResponse = req.CreateResponse(HttpStatusCode.NotFound);
                await notFoundResponse.WriteStringAsync($"Animal with ID {id} not found.");
                return notFoundResponse;
            }

            // Serialize the animal object to JSON
            var jsonResponse = JsonSerializer.Serialize(animal, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            // Create the HTTP response
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");
            await response.WriteStringAsync(jsonResponse);

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
