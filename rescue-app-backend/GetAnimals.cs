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
                string? animal_type = queryParams["animal_type"];
                string? breed = queryParams["breed"];
                string? adoptionStatusParam = queryParams["adoption_status"];
                string? sortBy = queryParams["sortBy"];

                // Start with the base queryable
                IQueryable<Animal> query = _dbContext.Animals.AsQueryable();

                // --- Apply Filtering ---

                // Gender Filter (Case-insensitive using ToLower)
                if (!string.IsNullOrEmpty(gender))
                {
                    string lowerGender = gender.ToLower();
                    // Convert DB property to lower and compare with lower parameter value
                    query = query.Where(a => a.gender != null && a.gender.ToLower() == lowerGender);
                    logger.LogInformation("Applying filter - Gender: {Gender}", gender);
                }

                // Animal Type Filter (Case-insensitive using ToLower)
                if (!string.IsNullOrEmpty(animal_type))
                {
                    string lowerAnimalType = animal_type.ToLower();
                    // Convert DB property to lower and compare with lower parameter value
                    query = query.Where(a => a.animal_type != null && a.animal_type.ToLower() == lowerAnimalType);
                    logger.LogInformation("Applying filter - AnimalType: {AnimalType}", animal_type);
                }

                // Breed Filter (Case-insensitive using ToLower, exact match)
                if (!string.IsNullOrEmpty(breed))
                {
                    string lowerBreed = breed.ToLower();
                    // Convert DB property to lower and perform partial compare with lower parameter value
                    query = query.Where(a => a.breed != null && a.breed.ToLower().Contains(lowerBreed));
                    logger.LogInformation("Applying filter - Breed: {Breed}", breed);
                }

                // --- Adoption Status Filter ---
                // This uses a different pattern (Contains)
                if (!string.IsNullOrEmpty(adoptionStatusParam))
                {
                    List<string> desiredStatuses = adoptionStatusParam.Split(',')
                                                        .Select(s => s.Trim().ToLower())
                                                        .Where(s => !string.IsNullOrEmpty(s))
                                                        .ToList();
                    if (desiredStatuses.Count != 0)
                    {
                        logger.LogInformation("Filtering by adoption statuses (case-insensitive): {Statuses}", string.Join(", ", desiredStatuses));
                        query = query.Where(a => a.adoption_status != null && desiredStatuses.Contains(a.adoption_status.ToLower()));
                    }
                }
                // --- End of Filters ---


                // --- Apply Sorting ---
                // Assuming 'date_added' is a DateTime property representing intake date
                logger.LogInformation("Applying sorting - SortBy: {SortBy}", string.IsNullOrEmpty(sortBy) ? "id (default)" : sortBy);
                switch (sortBy?.ToLower()) // Use null-conditional operator for safety
                {
                    case "longest": // Longest stay = oldest intake date = Ascending order
                        query = query.OrderBy(a => a.date_added);
                        break;
                    case "shortest": // Shortest stay = newest intake date = Descending order
                        query = query.OrderByDescending(a => a.date_added);
                        break;
                    // Add more sorting options here if needed (e.g., by name, age)
                    // case "nameasc":
                    //    query = query.OrderBy(a => a.name);
                    //    break;
                    default: // Default sort by id if sortBy is missing or unrecognized
                        query = query.OrderBy(a => a.id);
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
                // --- Start Dev Only Block ---
                // Log the full exception details, including inner exceptions and stack trace
                logger.LogError(ex, "Error getting animals. Query: {Query}. ExceptionType: {ExceptionType}, Message: {ExceptionMessage}, StackTrace: {StackTrace}",
                    req.Url.Query, ex.GetType().FullName, ex.Message, ex.StackTrace);

                // Also log inner exception if it exists, as it often contains the root cause
                if (ex.InnerException != null)
                {
                    logger.LogError(ex.InnerException, "Inner Exception Details. Type: {InnerType}, Message: {InnerMessage}",
                        ex.InnerException.GetType().FullName, ex.InnerException.Message);
                }

                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                // IMPORTANT: Keep sending a generic message to the client for security
                await errorResponse.WriteStringAsync("An internal error occurred while processing your request.");
                return errorResponse;
                // --- End Dev Only Block ---

                // --- Prod Block ---
                //logger.LogError(ex, "Error getting animals. Request Query: {Query}", req.Url.Query);
                //var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                //// Avoid sending detailed exception messages to the client
                //await errorResponse.WriteStringAsync("An error occurred while processing your request.");
                //return errorResponse;
            }
        }
    }
}