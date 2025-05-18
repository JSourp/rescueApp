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
    public class CreateVolunteerApplication
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<CreateVolunteerApplication> _logger;

        public CreateVolunteerApplication(AppDbContext dbContext, ILogger<CreateVolunteerApplication> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [Function("CreateVolunteerApplication")]
        public async Task<AzureFuncHttp.HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "volunteer-applications")] AzureFuncHttp.HttpRequestData req)
        {
            _logger.LogInformation("C# HTTP trigger function processed CreateVolunteerApplication request.");

            string requestBody = string.Empty;
            CreateVolunteerApplicationRequest? appRequest;

            try
            {
                requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                if (string.IsNullOrEmpty(requestBody))
                {
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Request body is required.");
                }

                // Deserialize with PropertyNameCaseInsensitive to handle frontend camelCase/snake_case to C# PascalCase DTO
                appRequest = JsonSerializer.Deserialize<CreateVolunteerApplicationRequest>(requestBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var validationResults = new List<ValidationResult>();
                var validationContext = new ValidationContext(appRequest!, serviceProvider: null, items: null);
                bool isValid = Validator.TryValidateObject(appRequest!, validationContext, validationResults, true);

                if (!isValid || appRequest == null)
                {
                    string errors = string.Join("; ", validationResults.Select(vr => $"{(vr.MemberNames.Any() ? vr.MemberNames.First() : "Request")}: {vr.ErrorMessage}"));
                    _logger.LogWarning("Volunteer application DTO validation failed. Errors: [{ValidationErrors}]. Body: {BodyPreview}", errors, requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                    return await CreateErrorResponse(req, HttpStatusCode.BadRequest, $"Invalid application data: {errors}");
                }
                 // Specific logic checks
                if (appRequest.LocationAcknowledgement != true) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Location acknowledgement is required.");
                if (appRequest.PolicyAcknowledgement != true) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Policy acknowledgement is required.");
                if (appRequest.AgeConfirmation?.ToLower() != "yes") return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Volunteers must confirm they are 18 or older.");
                // Handle CrimeConvictionCheck - for now, just accept it
                if (appRequest.WaiverAgreed != true) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Waiver agreement is required.");
                if (appRequest.WaiverAgreed == true && string.IsNullOrWhiteSpace(appRequest.ESignatureName)) return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "E-signature name is required if waiver is agreed.");

            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "Error deserializing volunteer application request body. Body: {BodyPreview}", requestBody.Substring(0, Math.Min(requestBody.Length, 500)));
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid JSON format in request body.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing volunteer application request body.");
                return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Invalid request data.");
            }
            if (appRequest == null) { return await CreateErrorResponse(req, HttpStatusCode.BadRequest, "Application data could not be processed."); }


			// Map DTO to Entity (using PascalCase for C# Model properties)
			var newApplication = new VolunteerApplication // Using PascalCase for Model properties
            {
                // Map from appRequest (PascalCase DTO) to newApplication (PascalCase Model)
                FirstName = appRequest.FirstName!, LastName = appRequest.LastName!, SpousePartnerRoommate = appRequest.SpousePartnerRoommate,
                StreetAddress = appRequest.StreetAddress!, AptUnit = appRequest.AptUnit, City = appRequest.City!, StateProvince = appRequest.StateProvince!, ZipPostalCode = appRequest.ZipPostalCode!,
                PrimaryPhone = appRequest.PrimaryPhone!, PrimaryPhoneType = appRequest.PrimaryPhoneType!, SecondaryPhone = appRequest.SecondaryPhone, SecondaryPhoneType = appRequest.SecondaryPhoneType,
                PrimaryEmail = appRequest.PrimaryEmail!, SecondaryEmail = appRequest.SecondaryEmail, HowHeard = appRequest.HowHeard,
                AgeConfirmation = appRequest.AgeConfirmation!, PreviousVolunteerExperience = appRequest.PreviousVolunteerExperience, PreviousExperienceDetails = appRequest.PreviousExperienceDetails,
                ComfortLevelSpecialNeeds = appRequest.ComfortLevelSpecialNeeds, AreasOfInterest = appRequest.AreasOfInterest, OtherSkills = appRequest.OtherSkills,
                LocationAcknowledgement = appRequest.LocationAcknowledgement ?? false, VolunteerReason = appRequest.VolunteerReason,
                EmergencyContactName = appRequest.EmergencyContactName!, EmergencyContactPhone = appRequest.EmergencyContactPhone!,
                CrimeConvictionCheck = appRequest.CrimeConvictionCheck!, PolicyAcknowledgement = appRequest.PolicyAcknowledgement ?? false,
                WaiverAgreed = appRequest.WaiverAgreed ?? false, ESignatureName = appRequest.ESignatureName,
                WaiverAgreementTimestamp = (appRequest.WaiverAgreed ?? false) ? DateTime.UtcNow : (DateTime?)null,
                SubmissionDate = DateTime.UtcNow, Status = "Pending Review"
            };

            try
            {
                _dbContext.VolunteerApplications.Add(newApplication);
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("New volunteer application submitted successfully. ID: {AppId}", newApplication.Id);

                var response = req.CreateResponse(HttpStatusCode.Created);
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
