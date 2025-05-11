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

using AzureFuncHttp = Microsoft.Azure.Functions.Worker.Http;

namespace rescueApp
{
    public class CreateFosterApplication
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<CreateFosterApplication> _logger;

        public CreateFosterApplication(AppDbContext dbContext, ILogger<CreateFosterApplication> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("CreateFosterApplication")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "foster-applications")] AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed CreateFosterApplication request.");

            string requestBody = string.Empty;
            CreateFosterApplicationRequest? appRequest;

            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body is required.");
                }

                // Deserialize with PropertyNameCaseInsensitive to handle frontend camelCase/snake_case to C# PascalCase DTO
                appRequest = JsonSerializer.Deserialize<CreateFosterApplicationRequest>(requestBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new List<ValidationResult>();
                var validationContext = new ValidationContext(appRequest!, serviceProvider: null, items: null);
                bool isValid = Validator.TryValidateObject(appRequest!, validationContext, validationResults, validateAllProperties: true);

                if (!isValid || appRequest == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => $"{ (vr.MemberNames.Any() ? vr.MemberNames.First() : "Request")}: {vr.ErrorMessage}"));
                    _logger.LogWarning("Foster application DTO validation failed. Errors: [{ValidationErrors}]. Body: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid application data: {errors}");
                }
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "Error deserializing foster application request body. Body: {BodyPreview}", requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format in request body.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing foster application request body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
            }
            if (appRequest == null) { return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Application data could not be processed."); }


            // Map DTO to Entity (using PascalCase for C# Model properties)
            var newApplication = new FosterApplication
            {
                SubmissionDate = DateTime.UtcNow,
                Status = "Pending Review", // Default status

                FirstName = appRequest.FirstName!,
                LastName = appRequest.LastName!,
                SpousePartnerRoommate = appRequest.SpousePartnerRoommate,
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
                HowHeard = appRequest.HowHeard,
                AdultsInHome = appRequest.AdultsInHome!,
                ChildrenInHome = appRequest.ChildrenInHome,
                HasAllergies = appRequest.HasAllergies,
                HouseholdAwareFoster = appRequest.HouseholdAwareFoster!,
                DwellingType = appRequest.DwellingType!,
                RentOrOwn = appRequest.RentOrOwn!,
                LandlordPermission = appRequest.LandlordPermission,
                YardType = appRequest.YardType,
                SeparationPlan = appRequest.SeparationPlan!,
                HasCurrentPets = appRequest.HasCurrentPets!,
                CurrentPetsDetails = appRequest.CurrentPetsDetails,
                CurrentPetsSpayedNeutered = appRequest.CurrentPetsSpayedNeutered,
                CurrentPetsVaccinations = appRequest.CurrentPetsVaccinations,
                VetClinicName = appRequest.VetClinicName,
                VetPhone = appRequest.VetPhone,
                HasFosteredBefore = appRequest.HasFosteredBefore!,
                PreviousFosterDetails = appRequest.PreviousFosterDetails,
                WhyFoster = appRequest.WhyFoster!,
                FosterAnimalTypes = appRequest.FosterAnimalTypes, // Already a string from DTO
                WillingMedical = appRequest.WillingMedical!,
                WillingBehavioral = appRequest.WillingBehavioral!,
                CommitmentLength = appRequest.CommitmentLength!,
                CanTransport = appRequest.CanTransport!,
                TransportExplanation = appRequest.TransportExplanation,
                PreviousPetsDetails = appRequest.PreviousPetsDetails
                // reviewed_by_user_id and review_date will be set by admin later
            };

            try
            {
                _dbContext.FosterApplications.Add(newApplication);
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("New foster application submitted successfully. ID: {AppId}", newApplication.Id);

                var response = req.CreateResponse(HttpStatusCode.Created);
                // Return the created application DTO (or a summary DTO)
                // For now, just return the input DTO to confirm what was processed.
                // Serialize with CamelCase for frontend
                await response.WriteAsJsonAsync(appRequest);
                return response;
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error saving foster application. InnerEx: {InnerEx}", dbEx.InnerException?.Message);
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "A database error occurred while submitting your application.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving foster application to database.");
                return await CreateErrorResponse(req, HttpStatusCode.InternalServerError, "An error occurred while submitting your application.");
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
