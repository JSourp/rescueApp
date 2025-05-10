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

// Alias
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	public class GraduateDto
	{
		public int Id { get; set; }
		public int AnimalId { get; set; }
		public string? Name { get; set; }
		public string? ImageUrl { get; set; } // Or PrimaryImageUrl
		public string? AnimalType { get; set; }
		public string? Breed { get; set; }
		public string? Gender { get; set; }
		public DateTime AdoptionDate { get; set; }
	}
	public class GetGraduates
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<GetGraduates> _logger; // Correctly defined instance variable

		public GetGraduates(AppDbContext dbContext, ILogger<GetGraduates> logger)
		{
			_dbContext = dbContext;
			_logger = logger; // Assign injected logger
		}

		[Function("GetGraduates")]
		public async Task<HttpResponseData> Run(
			[HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "graduates")] HttpRequestData req)
		{
			// Use the injected _logger instance
			_logger.LogInformation("C# HTTP trigger function processed GetGraduates request.");
			var queryParams = HttpUtility.ParseQueryString(req.Url.Query);

			// Read Filters
			string? animal_type = queryParams["animal_type"];
			string? gender = queryParams["gender"];
			string? breed = queryParams["breed"];
			string? sortBy = queryParams["sortBy"];

			try
			{
				// Join with the LATEST ACTIVE AdoptionHistory record for each animal to get the relevant adoption date.
				// NOTE: This join logic needs care. Selecting the relevant history record might be complex.
				// A simpler approach might be to query AdoptionHistory first WHERE return_date IS NULL
				// and include Animal, then filter Animal properties. Like so.

				IQueryable<AdoptionHistory> historyQuery = _dbContext.AdoptionHistories
					.Include(ah => ah.Animal) // Include animal data
						.ThenInclude(a => a!.AnimalImages) // <-- THEN INCLUDE the related images for the animal
					.Where(ah => ah.ReturnDate == null && ah.Animal != null && ah.Animal.AdoptionStatus == "Adopted"); // Only active adoptions for animals marked Adopted

				// Apply filters based on the JOINED Animal properties
				if (!string.IsNullOrEmpty(animal_type))
				{
					historyQuery = historyQuery.Where(ah => ah.Animal!.AnimalType != null && ah.Animal.AnimalType.ToLower() == animal_type.ToLower());
				}
				if (!string.IsNullOrEmpty(gender))
				{
					historyQuery = historyQuery.Where(ah => ah.Animal!.Gender != null && ah.Animal.Gender.ToLower() == gender.ToLower());
				}
				if (!string.IsNullOrEmpty(breed))
				{
					historyQuery = historyQuery.Where(ah => ah.Animal!.Breed != null && ah.Animal.Breed.ToLower().Contains(breed.ToLower())); // Contains for breed? Or exact match?
				}


				// Apply sorting based on AdoptionDate or Animal Name
				bool descending = sortBy?.ToLowerInvariant().EndsWith("_desc") ?? true; // Default desc?
				string? sortField = sortBy?.ToLowerInvariant().Replace("_desc", "").Replace("_asc", "");

				_logger.LogInformation("Sorting Graduates by {SortField} {Direction}", sortField ?? "adoption_date", descending ? "DESC" : "ASC");

				switch (sortField)
				{
					case "name":
						historyQuery = descending
							? historyQuery.OrderByDescending(ah => ah.Animal!.Name).ThenByDescending(ah => ah.AdoptionDate)
							: historyQuery.OrderBy(ah => ah.Animal!.Name).ThenBy(ah => ah.AdoptionDate);
						break;
					case "adoption_date":
					default: // Default sort by adoption date
						historyQuery = descending
						   ? historyQuery.OrderByDescending(ah => ah.AdoptionDate)
						   : historyQuery.OrderBy(ah => ah.AdoptionDate);
						break;
				}

				List<GraduateDto> dtoList = await historyQuery
					.Select(ah => new GraduateDto
					{
						Id = ah.Id,
						AnimalId = ah.Animal!.Id,
						Name = ah.Animal!.Name,
						AnimalType = ah.Animal!.AnimalType,
						Breed = ah.Animal!.Breed,
						Gender = ah.Animal!.Gender,
						AdoptionDate = ah.AdoptionDate,
						// Find the image marked as primary, or the first by display order, or null
						ImageUrl = ah.Animal.AnimalImages! // Use ! since Animal should be included
									 .OrderBy(img => img.IsPrimary ? 0 : 1) // Prioritize primary=true
									 .ThenBy(img => img.DisplayOrder) // Then by explicit order
									 .Select(img => img.ImageUrl)      // Select the URL string
									 .FirstOrDefault(),                 // Get the best match or null
					})
					.ToListAsync();

				_logger.LogInformation("Found {GraduateCount} graduate animals matching criteria.", dtoList.Count);

				// --- Serialize and Respond ---
				var jsonResponse = JsonSerializer.Serialize(dtoList, new JsonSerializerOptions
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
				_logger.LogError(ex, "Error getting graduates. Request Query: {Query}", req.Url.Query);
				var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
				await errorResponse.WriteStringAsync("An internal error occurred while fetching graduates data.");
				return errorResponse;
			}
		}
	}
}
