// rescue-app-backend/GetGraduates.cs

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
using rescueApp.Data;
using rescueApp.Models;

// Alias
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
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
					.Where(ah => ah.return_date == null && ah.Animal != null && ah.Animal.adoption_status == "Adopted"); // Only active adoptions for animals marked Adopted

				// Apply filters based on the JOINED Animal properties
				if (!string.IsNullOrEmpty(animal_type))
				{
					historyQuery = historyQuery.Where(ah => ah.Animal!.animal_type != null && ah.Animal.animal_type.ToLower() == animal_type.ToLower());
				}
				if (!string.IsNullOrEmpty(gender))
				{
					historyQuery = historyQuery.Where(ah => ah.Animal!.gender != null && ah.Animal.gender.ToLower() == gender.ToLower());
				}
				if (!string.IsNullOrEmpty(breed))
				{
					historyQuery = historyQuery.Where(ah => ah.Animal!.breed != null && ah.Animal.breed.ToLower().Contains(breed.ToLower())); // Contains for breed? Or exact match?
				}


				// Apply sorting based on AdoptionDate or Animal Name
				bool descending = sortBy?.ToLowerInvariant().EndsWith("_desc") ?? true; // Default desc?
				string? sortField = sortBy?.ToLowerInvariant().Replace("_desc", "").Replace("_asc", "");

				_logger.LogInformation("Sorting Graduates by {SortField} {Direction}", sortField ?? "adoption_date", descending ? "DESC" : "ASC");

				switch (sortField)
				{
					case "name":
						historyQuery = descending
							? historyQuery.OrderByDescending(ah => ah.Animal!.name).ThenByDescending(ah => ah.adoption_date)
							: historyQuery.OrderBy(ah => ah.Animal!.name).ThenBy(ah => ah.adoption_date);
						break;
					case "adoption_date":
					default: // Default sort by adoption date
						historyQuery = descending
						   ? historyQuery.OrderByDescending(ah => ah.adoption_date)
						   : historyQuery.OrderBy(ah => ah.adoption_date);
						break;
				}

				// Select the data needed for the frontend Graduate type
				var graduates = await historyQuery
					.Select(ah => new // Create a DTO or anonymous type matching frontend Graduate interface
					{
						// Select needed properties from ah.Animal (using snake_case)
						ah.Animal!.id,
						ah.Animal.name,
						ah.Animal.image_url,
						ah.Animal.animal_type,
						ah.Animal.breed,
						ah.Animal.gender,
						// Select the adoption_date from AdoptionHistory
						ah.adoption_date
						// Add any other needed Animal fields
					})
					.ToListAsync(); // Execute query

				_logger.LogInformation("Found {GraduateCount} graduate animals matching criteria.", graduates.Count);

				// Serialize and Respond
				var jsonResponse = JsonSerializer.Serialize(graduates, new JsonSerializerOptions
				{
					// PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // REMOVED
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
}
