// rescue-app-backend/GetGraduates.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json; // Using System.Text.Json
using System.Threading.Tasks;
using System.Web;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;

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
			[HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "graduates")] HttpRequestData req)
		{
			// Use the injected _logger instance
			_logger.LogInformation("C# HTTP trigger function processed GetGraduates request.");

			try
			{
				var queryParams = HttpUtility.ParseQueryString(req.Url.Query);

				// Read Filters (using snake_case keys)
				string? animal_type = queryParams["animal_type"];
				string? gender = queryParams["gender"];
				string? breed = queryParams["breed"];
				string? sortBy = queryParams["sortBy"];

				IQueryable<Animal> query = _dbContext.Animals
					.Where(a => a.adoption_status == "Adopted");

				// Apply other filters (using snake_case properties)
				if (!string.IsNullOrEmpty(animal_type))
				{
					string lowerAnimalType = animal_type.ToLowerInvariant();
					query = query.Where(a => a.animal_type != null && a.animal_type.ToLowerInvariant() == lowerAnimalType);
					_logger.LogInformation("Applying GRAD filter - animal_type: {AnimalType}", animal_type); // Use _logger
				}
				if (!string.IsNullOrEmpty(gender))
				{
					string lowerGender = gender.ToLowerInvariant();
					query = query.Where(a => a.gender != null && a.gender.ToLowerInvariant() == lowerGender);
					_logger.LogInformation("Applying GRAD filter - gender: {Gender}", gender); // Use _logger
				}
				if (!string.IsNullOrEmpty(breed))
				{
					string lowerBreed = breed.ToLowerInvariant();
					query = query.Where(a => a.breed != null && a.breed.ToLowerInvariant() == lowerBreed);
					_logger.LogInformation("Applying GRAD filter - breed: {Breed}", breed); // Use _logger
				}


				// Apply Sorting (using snake_case properties)
				_logger.LogInformation("Applying GRAD sorting - SortBy: {SortBy}", string.IsNullOrEmpty(sortBy) ? "most_recent_update (default)" : sortBy); // Use _logger
				switch (sortBy?.ToLowerInvariant())
				{
					case "least_recent_update":
						query = query.OrderBy(a => a.date_updated);
						break;
					case "name_asc":
						query = query.OrderBy(a => a.name);
						break;
					case "name_desc":
						query = query.OrderByDescending(a => a.name);
						break;
					case "most_recent_update":
					default:
						query = query.OrderByDescending(a => a.date_updated);
						break;
				}
				query = ((IOrderedQueryable<Animal>)query).ThenBy(a => a.id);


				List<Animal> graduates = await query.ToListAsync();
				_logger.LogInformation("Found {GraduateCount} graduate animals matching criteria.", graduates.Count); // Use _logger

				// Serialize and Respond (REMOVED camelCase policy -> will output snake_case)
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
				_logger.LogError(ex, "Error getting graduates. Request Query: {Query}", req.Url.Query); // Use _logger
				var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
				await errorResponse.WriteStringAsync("An internal error occurred while fetching graduates data.");
				return errorResponse;
			}
		}
	}
}
