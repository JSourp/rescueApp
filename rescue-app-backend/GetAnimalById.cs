using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;
using System.Text.Json;

namespace rescueApp;

public class GetAnimalById
{
    private readonly AppDbContext _dbContext;

    public GetAnimalById(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("GetAnimalById")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "animals/{id:int}")] HttpRequestData req,
        int id,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetAnimalById");

        try
        {
            var animal = await _dbContext.Animals.FindAsync(id);

            if (animal == null)
            {
                var notFoundResponse = req.CreateResponse(HttpStatusCode.NotFound);
                await notFoundResponse.WriteStringAsync("Animal not found.");
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
            logger.LogError($"Error getting animal by ID: {ex.Message}");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("An error occurred while fetching the animal.");
            return errorResponse;
        }
    }
}
