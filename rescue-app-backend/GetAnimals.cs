using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using rescue_app_backend.Models;
using System.Text.Json;

namespace rescue_app_backend;

public class GetAnimals
{
    private readonly AppDbContext _dbContext;

    public GetAnimals(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("GetAnimals")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "animals")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetAnimals");

        try
        {
            IQueryable<Animal> query = _dbContext.Animals; // Start with the base query

            // Filtering
            if (req.Query.AllKeys.Contains("gender"))
            {
                string gender = req.Query["gender"] ?? string.Empty;
                if (!string.IsNullOrEmpty(gender))
                {
                    query = query.Where(a => a.gender == gender);
                }
            }

            if (req.Query.AllKeys.Contains("animalType"))
            {
                string animalType = req.Query["animalType"] ?? string.Empty;
                if (!string.IsNullOrEmpty(animalType))
                {
                    query = query.Where(a => a.animaltype == animalType);
                }
            }

            if (req.Query.AllKeys.Contains("breed"))
            {
                string breed = req.Query["breed"] ?? string.Empty;
                if (!string.IsNullOrEmpty(breed))
                {
                    query = query.Where(a => a.breed == breed);
                }
            }

            // Sorting
            if (req.Query.AllKeys.Contains("sortBy"))
            {
                string sortBy = req.Query["sortBy"] ?? string.Empty;
                switch (sortBy.ToLower())
                {
                    case "longest":
                        query = query.OrderBy(a => a.dateadded);
                        break;
                    case "shortest":
                        query = query.OrderByDescending(a => a.dateadded);
                        break;
                    default:
                        query = query.OrderBy(a => a.name); // Default sorting
                        break;
                }
            }
            else
            {
                query = query.OrderBy(a => a.name); // Default sorting
            }

            // Execute the query and fetch the results
            List<Animal> animals = await query.ToListAsync();

            // Serialize the result to JSON
            var jsonResponse = JsonSerializer.Serialize(animals, new JsonSerializerOptions
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
            logger.LogError($"Error getting animals: {ex.Message}");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("An error occurred while fetching animals.");
            return errorResponse;
        }
    }
}