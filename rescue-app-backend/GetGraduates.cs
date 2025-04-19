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

// Assuming AdoptionHistory model has correct navigation property to Animal,
// or Animal model has a collection of AdoptionHistories.
// Also assuming AppDbContext includes: public DbSet<AdoptionHistory> AdoptionHistories { get; set; }

public class GetGraduates
{
	private readonly AppDbContext _dbContext;
	private readonly ILogger<GetGraduates> _logger;

	public GetGraduates(AppDbContext dbContext, ILogger<GetGraduates> logger)
	{
		_dbContext = dbContext;
		_logger = logger;
	}

	[Function("GetGraduates")]
	public async Task<HttpResponseData> Run(
		[HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "graduates")] HttpRequestData req)
	{
		_logger.LogInformation("Processing request for GetGraduates.");
		var queryParams = HttpUtility.ParseQueryString(req.Url.Query);

		// Read Filters
		string? animal_type = queryParams["animal_type"];
		string? gender = queryParams["gender"];
		string? breed = queryParams["breed"];
		string? sortBy = queryParams["sortBy"]; // e.g., adoption_date_desc

		try
		{
			// 1. Start with Animals table, filter by status = "Adopted"
			IQueryable<Animal> adoptedAnimalsQuery = _dbContext.Animals
				.Where(a => a.adoption_status != null && a.adoption_status == "Adopted");

			// 2. Apply additional ANIMAL filters (Type, Gender, Breed)
			if (!string.IsNullOrEmpty(animal_type))
			{
				string lowerAnimalType = animal_type.ToLowerInvariant();
				adoptedAnimalsQuery = adoptedAnimalsQuery.Where(a => a.animal_type != null && a.animal_type.ToLowerInvariant() == lowerAnimalType);
				_logger.LogInformation("Applying GRAD filter - AnimalType: {AnimalType}", animal_type);
			}
			if (!string.IsNullOrEmpty(gender))
			{
				string lowerGender = gender.ToLowerInvariant();
				adoptedAnimalsQuery = adoptedAnimalsQuery.Where(a => a.gender != null && a.gender.ToLowerInvariant() == lowerGender);
				_logger.LogInformation("Applying GRAD filter - Gender: {Gender}", gender);
			}
			if (!string.IsNullOrEmpty(breed))
			{
				string lowerBreed = breed.ToLowerInvariant();
				adoptedAnimalsQuery = adoptedAnimalsQuery.Where(a => a.breed != null && a.breed.ToLowerInvariant() == lowerBreed);
				_logger.LogInformation("Applying GRAD filter - Breed: {Breed}", breed);
			}

			// 3. Project Animal data ALONG WITH the relevant Adoption Date
			//    We find the LATEST AdoptionHistory entry for this animal WHERE returndate IS NULL.
			var queryWithDate = adoptedAnimalsQuery.Select(a => new
			{
				AnimalData = a, // Keep the whole animal object for now
				AdoptionDate = _dbContext.AdoptionHistories
									.Where(ah => ah.animalid == a.id && ah.returndate == null) // Match animal AND ensure not returned
									.OrderByDescending(ah => ah.adoptiondate) // Get the latest adoption if multiple exist (shouldn't for status='Adopted')
									.Select(ah => (DateTime?)ah.adoptiondate) // Make it nullable just in case
									.FirstOrDefault() // Get the date or null
			})
				.Where(result => result.AdoptionDate != null); // Ensure we actually found a valid adoption date

			// 4. Apply Sorting based on the retrieved AdoptionDate
			bool descending = sortBy?.ToLowerInvariant() == "adoption_date_desc"; // Default to ascending (Least Recent)
			_logger.LogInformation("Applying GRAD sorting by AdoptionDate {Direction}", descending ? "DESC" : "ASC");

			var sortedQuery = descending
				? queryWithDate.OrderByDescending(result => result.AdoptionDate)
				: queryWithDate.OrderBy(result => result.AdoptionDate);

			// 5. Select the final structure (DTO) for the frontend
			//    Map properties to camelCase here if not handled by serializer
			var graduatesDto = await sortedQuery
				.Select(result => new
				{
					id = result.AnimalData.id,
					name = result.AnimalData.name,
					imageUrl = result.AnimalData.image_url,
					animalType = result.AnimalData.animal_type,
					breed = result.AnimalData.breed,
					gender = result.AnimalData.gender,
					adoptionDate = result.AdoptionDate ?? DateTime.MinValue // Provide a default value if null
					// Add other fields as needed by the Graduates page card
				})
				.ToListAsync();


			// 6. Serialize and Respond (using camelCase via options)
			var jsonResponse = JsonSerializer.Serialize(graduatesDto, new JsonSerializerOptions
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
			_logger.LogError(ex, "Error getting graduates. Request Query: {Query}", req.Url.Query);
			var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
			await errorResponse.WriteStringAsync("An internal error occurred while fetching graduates data.");
			return errorResponse;
		}
	}
}
