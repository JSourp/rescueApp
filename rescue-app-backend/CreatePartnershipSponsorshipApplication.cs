using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;
using rescueApp.Models;
using rescueApp.Models.Requests; // For the DTO

using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
	public class CreatePartnershipSponsorshipApplication
	{
		private readonly AppDbContext _dbContext;
		private readonly ILogger<CreatePartnershipSponsorshipApplication> _logger;

		public CreatePartnershipSponsorshipApplication(AppDbContext dbContext, ILogger<CreatePartnershipSponsorshipApplication> logger)
		{
			_dbContext = dbContext;
			_logger = logger;
		}

		[Function("CreatePartnershipSponsorshipApplication")]
		public async Task<AzureFuncHttp.HttpResponseData> Run(
			[HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "partnership-sponsorship-applications")] AzureFuncHttp.HttpRequestData req)
		{
			_logger.LogInformation("C# HTTP trigger function processed CreatePartnershipSponsorshipApplication request.");

			string requestBody = string.Empty;
			CreatePartnershipSponsorshipRequest? appRequest;

			try
			{
				requestBody = await new StreamReader(req.Body).ReadToEndAsync();
				if (string.IsNullOrEmpty(requestBody))
				{
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body is required.");
				}

				appRequest = JsonSerializer.Deserialize<CreatePartnershipSponsorshipRequest>(requestBody,
					new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				var validationResults = new List<ValidationResult>();
				var validationContext = new ValidationContext(appRequest!, serviceProvider: null, items: null);
				bool isValid = Validator.TryValidateObject(appRequest!, validationContext, validationResults, true);

				if (!isValid || appRequest == null)
				{
					string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.Any() ? vr.MemberNames.First() : "Request")}: {vr.ErrorMessage}"));
					_logger.LogWarning("Partnership/Sponsorship application DTO validation failed. Errors: [{ValidationErrors}]. Body: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
					return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid application data: {errors}");
				}
			}
			catch (JsonException jsonEx)
			{
				_logger.LogError(jsonEx, "Error deserializing partnership/sponsorship request. Body: {BodyPreview}", requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error processing partnership/sponsorship request body.");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
			}
			if (appRequest == null) { return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Application data could not be processed."); }


			var newApplication = new PartnershipSponsorshipApplication // PascalCase Model
			{
				// Map from appRequest (PascalCase DTO) to newApplication (PascalCase Model)
				FirstName = appRequest.FirstName!,
				LastName = appRequest.LastName!,
				OrganizationName = appRequest.OrganizationName,
				ContactTitle = appRequest.ContactTitle,
				StreetAddress = appRequest.StreetAddress!,
				AptUnit = appRequest.AptUnit,
				City = appRequest.City!,
				StateProvince = appRequest.StateProvince!,
				ZipPostalCode = appRequest.ZipPostalCode!,
				PrimaryPhone = appRequest.PrimaryPhone!,
				PrimaryPhoneType = appRequest.PrimaryPhoneType!,
				SecondaryPhone = appRequest.SecondaryPhone,
				SecondaryPhoneType = appRequest.SecondaryPhoneType,
				PrimaryEmail = appRequest.PrimaryEmail!,
				SecondaryEmail = appRequest.SecondaryEmail,
				WebsiteUrl = appRequest.WebsiteUrl,
				HowHeard = appRequest.HowHeard,
				InterestType = appRequest.InterestType,
				DetailsOfInterest = appRequest.DetailsOfInterest,
				// Default values for status and submission_date are handled by DB/Model
			};

			try
			{
				_dbContext.PartnershipSponsorshipApplications.Add(newApplication);
				await _dbContext.SaveChangesAsync();
				_logger.LogInformation("New partnership/sponsorship application submitted successfully. ID: {AppId}", newApplication.Id);

				var response = req.CreateResponse(HttpStatusCode.Created);
				await response.WriteAsJsonAsync(appRequest);
				return response;
			}
			catch (DbUpdateException dbEx)
			{
				_logger.LogError(dbEx, "Database error saving partnership/sponsorship application. InnerEx: {InnerEx}", dbEx.InnerException?.Message);
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "A database error occurred.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error saving partnership/sponsorship application.");
				return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred.");
			}
		}

		// Helper for creating error responses
		private async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
		{
			var response = req.CreateResponse(statusCode);
			response.Headers.Add("Content-Type", "application/json");
			await response.WriteStringAsync(JsonSerializer.Serialize(new { error = new { code = statusCode.ToString(), message = message } },
				new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
			return response;
		}
	}
}
