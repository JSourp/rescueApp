using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using System.Linq;
using Microsoft.AspNetCore.Http; // Add this using directive
using System.Text.Json;

namespace rescue_app_backend;

public class GetAnimalTypes
{
    private readonly AppDbContext _dbContext;

    public GetAnimalTypes(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("GetAnimalTypes")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "animals/types")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetAnimalTypes");

        try
        {
            // Fetch distinct animal types from the database
            var animalTypes = await _dbContext.Animals
                .Select(a => a.animalType)
                .Distinct()
                .ToListAsync();

            // Serialize the result to JSON
            var jsonResponse = JsonSerializer.Serialize(animalTypes, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // Use camelCase for JSON properties
                WriteIndented = false // Optional: Pretty-print JSON if needed
            });

            // Create the HTTP response
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");
            await response.WriteStringAsync(jsonResponse);

            return response;
        }
        catch (Exception ex)
        {
            logger.LogError($"Error getting animal types: {ex.Message}");
            
            // Return a 500 Internal Server Error response
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("An error occurred while fetching animal types.");
            return errorResponse;
        }
    }
}