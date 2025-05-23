using System.Linq;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;

namespace rescueApp;

public class GetAnimalTypes
{
    private readonly AppDbContext _dbContext;

    public GetAnimalTypes(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("GetAnimalTypes")]
    public async Task<HttpResponseData> Run(
        // Security is handled by internal Auth0 Bearer token validation and role-based authorization.
        [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "animals/types")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetAnimalTypes");

        try
        {
            // Fetch distinct animal types from the database
            var animalTypes = await _dbContext.Animals
                .Select(a => a.AnimalType)
                .Distinct()
                .ToListAsync();

            // Serialize the result to JSON
            var jsonResponse = JsonSerializer.Serialize(animalTypes, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // Use camelCase for JSON properties
                WriteIndented = false // Pretty-print JSON if needed
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
