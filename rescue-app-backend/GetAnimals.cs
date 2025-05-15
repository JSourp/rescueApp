using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.DTOs;

namespace rescueApp
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
                string? adoption_statusParam = queryParams["adoption_status"];
                string? sortBy = queryParams["sortBy"];
                string? limitParam = queryParams["limit"];
                string? nameSearch = queryParams["name"];
                string? isNotFosteredParam = queryParams["isNotFostered"];

                IQueryable<Animal> query = _dbContext.Animals
                                          .Include(a => a.AnimalImages);

                // --- Apply Filtering ---
                if (!string.IsNullOrEmpty(adoption_statusParam))
                {
                    List<string> desiredStatuses = adoption_statusParam.Split(',')
                                                        .Select(s => s.Trim().ToLowerInvariant())
                                                        .Where(s => !string.IsNullOrEmpty(s))
                                                        .ToList();
                    if (desiredStatuses.Any())
                    {
                        logger.LogInformation("Filtering by adoption statuses: {Statuses}", string.Join(", ", desiredStatuses));
                        query = query.Where(a => a.AdoptionStatus != null && desiredStatuses.Contains(a.AdoptionStatus.ToLower()));
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
                        query = query.Where(a => a.Breed != null && desiredBreeds.Contains(a.Breed.ToLower()));
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
                        query = query.Where(a => a.AnimalType != null && desiredTypes.Contains(a.AnimalType.ToLower()));
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
                        query = query.Where(a => a.Gender != null && desiredGender.Contains(a.Gender.ToLower()));
                    }
                }
                if (!string.IsNullOrWhiteSpace(nameSearch))
                {
                    logger.LogInformation("Filtering by name (contains): {NameSearch}", nameSearch);
                    query = query.Where(a => a.Name != null && EF.Functions.ILike(a.Name, $"%{nameSearch}%"));
                }

                if (bool.TryParse(isNotFosteredParam, out bool fetchOnlyNotFostered) && fetchOnlyNotFostered)
                {
                    logger.LogInformation("Filtering for animals not currently fostered.");
                    query = query.Where(a => a.CurrentFosterUserId == null);
                }


                // --- Apply Sorting (Enhanced) ---
                string sortField = "id"; // Default sort field
                bool ascending = true;   // Default sort direction

                switch (sortBy?.ToLowerInvariant()) // Process sortBy parameter
                {
                    case "longest": // Alias for oldest first
                        sortField = "date_created";
                        ascending = true;
                        break;
                    case "shortest": // Alias for newest first
                        sortField = "date_created";
                        ascending = false;
                        break;
                    case "date_created": // Explicit date added ascending
                        sortField = "date_created";
                        ascending = true;
                        break;
                    case "date_created_desc": // Explicit date added descending
                        sortField = "date_created";
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
                if (sortField == "date_created")
                {
                    query = ascending ? query.OrderBy(a => a.DateCreated) : query.OrderByDescending(a => a.DateCreated);
                }
                else if (sortField == "name")
                {
                    query = ascending ? query.OrderBy(a => a.Name) : query.OrderByDescending(a => a.Name);
                }
                else // Default to id
                {
                    query = ascending ? query.OrderBy(a => a.Id) : query.OrderByDescending(a => a.Id);
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
                List<AnimalDetailDto> animalsDtoList = await query // query includes .Include(a => a.AnimalImages)
                    .Select(animal => new AnimalDetailDto // Project to DTO
                    {
                        Id = animal.Id,
                        Name = animal.Name,
                        AnimalType = animal.AnimalType,
                        Breed = animal.Breed,
                        Gender = animal.Gender,
                        AdoptionStatus = animal.AdoptionStatus,
                        DateCreated = animal.DateCreated,
                        DateUpdated = animal.DateUpdated,
                        DateOfBirth = animal.DateOfBirth,
                        Weight = animal.Weight,
                        Story = animal.Story,
                        // Logic to find the primary image URL
                        PrimaryImageUrl = animal.AnimalImages!
                                            .OrderBy(img => !img.IsPrimary) // Primary first
                                            .ThenBy(img => img.DisplayOrder)// Then by display order
                                            .Select(img => img.ImageUrl)     // Select the correct URL property
                                            .FirstOrDefault(),               // Get first or null
                        CurrentFosterUserId = animal.CurrentFosterUserId,
                        CurrentFosterName = animal.CurrentFoster != null ? $"{animal.CurrentFoster.FirstName} {animal.CurrentFoster.LastName}" : null,
                    })
                    .ToListAsync();

                logger.LogInformation("Found {AnimalCount} animals matching criteria (after limit).", animalsDtoList.Count);

                // --- Serialize and Respond ---
                var jsonResponse = JsonSerializer.Serialize(animalsDtoList, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false,
                    ReferenceHandler = ReferenceHandler.IgnoreCycles
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
