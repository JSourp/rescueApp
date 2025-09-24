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
using rescueApp.Models.Requests;

// Alias for Http Trigger type
using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    public class CreateAdoptionApplication
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<CreateAdoptionApplication> _logger;

        public CreateAdoptionApplication(AppDbContext dbContext, ILogger<CreateAdoptionApplication> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("CreateAdoptionApplication")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            // Security is handled by internal Auth0 Bearer token validation and role-based authorization.
            [HttpTrigger(AuthorizationLevel.Anonymous, "POST", Route = "adoption-applications")] AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed CreateAdoptionApplication request.");

            string requestBody = string.Empty;
            CreateAdoptionApplicationRequest? appRequest;

            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body is required.");
                }

                appRequest = JsonSerializer.Deserialize<CreateAdoptionApplicationRequest>(requestBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new List<ValidationResult>();
                var validationContext = new ValidationContext(appRequest!, serviceProvider: null, items: null);
                bool isValid = Validator.TryValidateObject(appRequest!, validationContext, validationResults, true);

                if (!isValid || appRequest == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.Any() ? vr.MemberNames.First() : "Request")}: {vr.ErrorMessage}"));
                    _logger.LogWarning("Adoption application DTO validation failed. Errors: [{ValidationErrors}]. Body: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid application data: {errors}");
                }

                // Specific logic checks
                if (appRequest.WaiverAgreed != true) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Waiver agreement is required.");
                if (appRequest.WaiverAgreed == true && string.IsNullOrWhiteSpace(appRequest.ESignatureName)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "E-signature name is required if waiver is agreed.");
                if (appRequest.RentOrOwn == "Rent" && appRequest.LandlordPermission != true) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Landlord permission is required if renting.");

            }
			catch (JsonException jsonEx)
			{
				_logger.LogError(jsonEx, "Error deserializing adoption request. Body: {BodyPreview}", requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error processing adoption request body.");
				return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
			}
			if (appRequest == null) { return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Application data could not be processed."); }

            var newApplication = new AdoptionApplication // PascalCase Model
            {
                // Map from appRequest (PascalCase DTO) to newApplication (PascalCase Model)
                AnimalId = appRequest!.AnimalId, // Will be null if general application
                WhichAnimalText = appRequest.WhichAnimal,

                FirstName = appRequest.FirstName!, LastName = appRequest.LastName!, SpousePartnerRoommate = appRequest.SpousePartnerRoommate,
                PrimaryEmail = appRequest.PrimaryEmail!, SecondaryEmail = appRequest.SecondaryEmail,
                PrimaryPhone = appRequest.PrimaryPhone!, PrimaryPhoneType = appRequest.PrimaryPhoneType!,
                SecondaryPhone = appRequest.SecondaryPhone, SecondaryPhoneType = appRequest.SecondaryPhoneType,
                StreetAddress = appRequest.StreetAddress!, AptUnit = appRequest.AptUnit, City = appRequest.City!, StateProvince = appRequest.StateProvince!, ZipPostalCode = appRequest.ZipPostalCode!,
                DwellingType = appRequest.DwellingType!, RentOrOwn = appRequest.RentOrOwn!, LandlordPermission = appRequest.LandlordPermission, YardType = appRequest.YardType,
                AdultsInHome = appRequest.AdultsInHome!, ChildrenInHome = appRequest.ChildrenInHome, HasAllergies = appRequest.HasAllergies, HouseholdAware = appRequest.HouseholdAware!,
                HasCurrentPets = appRequest.HasCurrentPets!, CurrentPetsDetails = appRequest.CurrentPetsDetails, CurrentPetsSpayedNeutered = appRequest.CurrentPetsSpayedNeutered, CurrentPetsVaccinations = appRequest.CurrentPetsVaccinations,
                HasPreviousPets = appRequest.HasPreviousPets, PreviousPetsDetails = appRequest.PreviousPetsDetails, VetClinicName = appRequest.VetClinicName, VetPhone = appRequest.VetPhone,
                WhyAdopt = appRequest.WhyAdopt, PrimaryCaregiver = appRequest.PrimaryCaregiver!, HoursAlonePerDay = appRequest.HoursAlonePerDay!, PetAloneLocation = appRequest.PetAloneLocation!, PetSleepLocation = appRequest.PetSleepLocation!,
                MovingPlan = appRequest.MovingPlan, PreparedForCosts = appRequest.PreparedForCosts!, HowHeard = appRequest.HowHeard,
                WaiverAgreed = appRequest.WaiverAgreed ?? false, ESignatureName = appRequest.ESignatureName,
                WaiverAgreementTimestamp = (appRequest.WaiverAgreed ?? false) ? DateTime.UtcNow : (DateTime?)null,
                // Default values for status and submission_date are handled by DB/Model
            };

			try
			{
				_dbContext.AdoptionApplications.Add(newApplication);
				await _dbContext.SaveChangesAsync();
				_logger.LogInformation("New adoption application submitted successfully. ID: {AppId}", newApplication.Id);

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

        private async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json");
            await response.WriteStringAsync(JsonSerializer.Serialize(new { error = new { code = statusCode.ToString(), message = message } }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
            return response;
        }
    }
}
