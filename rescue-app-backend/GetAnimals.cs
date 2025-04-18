using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using rescue_app_backend.Models;

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
                var queryParams = HttpUtility.ParseQueryString(req.Url.Query);

                // Read parameters
                string? gender = queryParams["gender"];
                string? animal_type = queryParams["animal_type"];
                string? breed = queryParams["breed"];
                string? adoptionStatusParam = queryParams["adoption_status"];
                string? sortBy = queryParams["sortBy"];
                string? limitParam = queryParams["limit"];

                IQueryable<Animal> query = _dbContext.Animals.AsQueryable();

                // --- Apply Filtering ---
                if (!string.IsNullOrEmpty(adoptionStatusParam))
                {
                    List<string> desiredStatuses = adoptionStatusParam.Split(',')
                                                        .Select(s => s.Trim().ToLowerInvariant())
                                                        .Where(s => !string.IsNullOrEmpty(s))
                                                        .ToList();
                    if (desiredStatuses.Any())
                    {
                        logger.LogInformation("Filtering by adoption statuses: {Statuses}", string.Join(", ", desiredStatuses));
                        query = query.Where(a => a.adoption_status != null && desiredStatuses.Contains(a.adoption_status.ToLower())); // Use ToLower() if that worked
                    }
                }
                if (!string.IsNullOrEmpty(breed))
                {
                    List<string> desiredBreeds = breed.Split(',')
                                                        .Select(s => s.Trim().ToLowerInvariant())
                                                        .Where(s => !string.IsNullOrEmpty(s))
                                                        .ToList();
                    if (desiredBreeds.Any())
                    {
                        logger.LogInformation("Filtering by breeds: {Breeds}", string.Join(", ", desiredBreeds));
                        query = query.Where(a => a.breed != null && desiredBreeds.Contains(a.breed.ToLower()));
                    }
                }
                if (!string.IsNullOrEmpty(animal_type))
                {
                    List<string> desiredTypes = animal_type.Split(',')
                                                        .Select(s => s.Trim().ToLowerInvariant())
                                                        .Where(s => !string.IsNullOrEmpty(s))
                                                        .ToList();
                    if (desiredTypes.Any())
                    {
                        logger.LogInformation("Filtering by animal types: {AnimalTypes}", string.Join(", ", desiredTypes));
                        query = query.Where(a => a.animal_type != null && desiredTypes.Contains(a.animal_type.ToLower()));
                    }
                }
                if (!string.IsNullOrEmpty(gender))
                {
                    List<string> desiredGender = gender.Split(',')
                                                        .Select(s => s.Trim().ToLowerInvariant())
                                                        .Where(s => !string.IsNullOrEmpty(s))
                                                        .ToList();
                    if (desiredGender.Any())
                    {
                        logger.LogInformation("Filtering by gender: {Gender}", string.Join(", ", desiredGender));
                        query = query.Where(a => a.gender != null && desiredGender.Contains(a.gender.ToLower()));
                    }
                }


                // --- Apply Sorting (Enhanced) ---
                string sortField = "id"; // Default sort field
                bool ascending = true;   // Default sort direction

                switch (sortBy?.ToLowerInvariant()) // Process sortBy parameter
                {
                    case "longest": // Alias for oldest first
                        sortField = "date_added";
                        ascending = true;
                        break;
                    case "shortest": // Alias for newest first
                        sortField = "date_added";
                        ascending = false;
                        break;
                    case "date_added": // Explicit date added ascending
                        sortField = "date_added";
                        ascending = true;
                        break;
                    case "date_added_desc": // Explicit date added descending
                        sortField = "date_added";
                        ascending = false;
                        break;
                    case "name": // Explicit name ascending
                    case "name_asc":
                        sortField = "name";
                        ascending = true;
                        break;
                    case "name_desc": // Explicit name descending
                        sortField = "name";
                        ascending = false;
                        break;
                    // Add more sort options as needed (e.g., age, id)
                    case "id":
                    case "id_asc":
                        sortField = "id";
                        ascending = true;
                        break;
                    case "id_desc":
                        sortField = "id";
                        ascending = false;
                        break;
                    default:
                        // Keep default sort by id ascending if sortBy is missing or unrecognized
                        sortField = "id";
                        ascending = true;
                        break;
                }

                logger.LogInformation("Applying sorting - Field: {SortField}, Ascending: {IsAscending}", sortField, ascending);

                // Apply sorting using property names
                // This requires careful mapping or a more dynamic approach for many fields,
                // but for a few common ones, a switch/if-else works.
                if (sortField == "date_added")
                {
                    query = ascending ? query.OrderBy(a => a.date_added) : query.OrderByDescending(a => a.date_added);
                }
                else if (sortField == "name")
                {
                    query = ascending ? query.OrderBy(a => a.name) : query.OrderByDescending(a => a.name);
                }
                else // Default to id
                {
                    query = ascending ? query.OrderBy(a => a.id) : query.OrderByDescending(a => a.id);
                }
                // Add .ThenBy(a => a.id) for consistent secondary sort if desired


                // --- Apply Limit ---
                int? limit = null;
                if (!string.IsNullOrEmpty(limitParam) && int.TryParse(limitParam, out int parsedLimit) && parsedLimit > 0)
                {
                    limit = parsedLimit;
                    logger.LogInformation("Applying limit: {Limit}", limit.Value);
                    query = query.Take(limit.Value); // Apply Take() AFTER OrderBy
                }
                // --- End Apply Limit ---


                // --- Execute Query ---
                List<Animal> animals = await query.ToListAsync();
                logger.LogInformation("Found {AnimalCount} animals matching criteria (after limit).", animals.Count);

                // --- Serialize and Respond ---
                var jsonResponse = JsonSerializer.Serialize(animals, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                });

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await response.WriteStringAsync(jsonResponse);
                return response;
            }
            catch (Exception ex)
            {
                // Use detailed logging
                logger.LogError(ex, "Error getting animals. Request Query: {Query}. ExceptionType: {ExceptionType}, Message: {ExceptionMessage}", req.Url.Query, ex.GetType().FullName, ex.Message);
                if (ex.InnerException != null) { logger.LogError(ex.InnerException, "Inner Exception Details."); }

                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteStringAsync("An internal error occurred while fetching animals.");
                return errorResponse;
            }
        }
    }
}
