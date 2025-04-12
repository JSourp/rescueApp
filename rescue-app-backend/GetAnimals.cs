using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using rescue_app_backend.Models;
using System.Text.Json;
using System.Web;

namespace rescue_app_backend
{
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
            logger.LogInformation("C# HTTP trigger function processed GetAnimals request.");

            try
            {
                // Use HttpUtility to parse query string parameters
                var queryParams = HttpUtility.ParseQueryString(req.Url.Query);

                string? gender = queryParams["gender"];
                string? animalType = queryParams["animalType"];
                string? breed = queryParams["breed"];
                string? adoptionStatusParam = queryParams["adoptionStatus"];
                string? sortBy = queryParams["sortBy"];

                // Start with the base queryable
                IQueryable<Animal> query = _dbContext.Animals.AsQueryable();

                // --- Apply Filtering ---

                // Gender Filter (Case-insensitive)
                if (!string.IsNullOrEmpty(gender))
                {
                    string lowerGender = gender.ToLowerInvariant();
                    query = query.Where(a => a.gender != null && a.gender.Equals(lowerGender, StringComparison.InvariantCultureIgnoreCase));
                    logger.LogInformation("Applying filter - Gender: {Gender}", gender);
                }

                // Animal Type Filter (Case-insensitive)
                if (!string.IsNullOrEmpty(animalType))
                {
                    string lowerAnimalType = animalType.ToLowerInvariant();
                    query = query.Where(a => a.animalType != null && a.animalType.Equals(lowerAnimalType, StringComparison.InvariantCultureIgnoreCase));
                     logger.LogInformation("Applying filter - AnimalType: {AnimalType}", animalType);
                }

                // Breed Filter (Case-insensitive, exact match - consider Contains if needed)
                if (!string.IsNullOrEmpty(breed))
                {
                    string lowerBreed = breed.ToLowerInvariant();
                    query = query.Where(a => a.breed != null && a.breed.Equals(lowerBreed, StringComparison.InvariantCultureIgnoreCase));
                     logger.LogInformation("Applying filter - Breed: {Breed}", breed);
                }

                // --- Adoption Status Filter ---
                if (!string.IsNullOrEmpty(adoptionStatusParam))
                {
                    // Split the comma-separated string, trim whitespace, convert to lower, filter out empty
                    List<string> desiredStatuses = adoptionStatusParam.Split(',')
                        .Select(s => s.Trim().ToLowerInvariant())
                        .Where(s => !string.IsNullOrEmpty(s))
                        .ToList();

                    if (desiredStatuses.Any()) // Only apply filter if list has items
                    {
                        logger.LogInformation("Applying filter - Adoption Statuses: {Statuses}", string.Join(", ", desiredStatuses));
                        // Check if the animal's status is contained in the desired list
                        query = query.Where(a => a.adoptionStatus != null && desiredStatuses.Contains(a.adoptionStatus.ToLowerInvariant()));
                    }
                }
                // --- End of Adoption Status Filter ---


                // --- Apply Sorting ---
                // Assuming 'dateadded' is a DateTime property representing intake date
                logger.LogInformation("Applying sorting - SortBy: {SortBy}", string.IsNullOrEmpty(sortBy) ? "name (default)" : sortBy);
                switch (sortBy?.ToLowerInvariant()) // Use null-conditional operator for safety
                {
                    case "longest": // Longest stay = oldest intake date = Ascending order
                        query = query.OrderBy(a => a.dateAdded);
                        break;
                    case "shortest": // Shortest stay = newest intake date = Descending order
                        query = query.OrderByDescending(a => a.dateAdded);
                        break;
                    // Add more sorting options here if needed (e.g., by name, age)
                    // case "nameasc":
                    //    query = query.OrderBy(a => a.name);
                    //    break;
                    default: // Default sort by name if sortBy is missing or unrecognized
                        query = query.OrderBy(a => a.name);
                        break;
                }
                // Consider adding a secondary sort for consistency, e.g., .ThenBy(a => a.Id)


                // --- Execute Query ---
                List<Animal> animals = await query.ToListAsync();
                logger.LogInformation("Found {AnimalCount} animals matching criteria.", animals.Count);

                // --- Serialize and Respond ---
                var jsonResponse = JsonSerializer.Serialize(animals, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // Ensures JSON uses camelCase
                    WriteIndented = false // Set to true for debugging if needed
                });

                var response = req.CreateResponse(HttpStatusCode.OK);
                // Ensure correct content type with charset
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await response.WriteStringAsync(jsonResponse);

                return response;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error getting animals. Request Query: {Query}", req.Url.Query);
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                // Avoid sending detailed exception messages to the client
                await errorResponse.WriteStringAsync("An error occurred while processing your request.");
                return errorResponse;
            }
        }
    }
}