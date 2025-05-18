using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace rescueApp.Models.Requests
{
    public class CreateVolunteerApplicationRequest
    {
        // Applicant Information
        [Required][MaxLength(100)] public string? FirstName { get; set; }
        [Required][MaxLength(100)] public string? LastName { get; set; }
        [MaxLength(255)] public string? SpousePartnerRoommate { get; set; }
        [Required][MaxLength(255)] public string? StreetAddress { get; set; }
        [MaxLength(50)] public string? AptUnit { get; set; }
        [Required][MaxLength(100)] public string? City { get; set; }
        [Required][MaxLength(100)] public string? StateProvince { get; set; }
        [Required][MaxLength(20)] public string? ZipPostalCode { get; set; }
        [Required][MaxLength(30)] public string? PrimaryPhone { get; set; }
        [Required][MaxLength(10)] public string? PrimaryPhoneType { get; set; }
        [MaxLength(30)] public string? SecondaryPhone { get; set; }
        [MaxLength(10)] public string? SecondaryPhoneType { get; set; }
        [Required][MaxLength(255)][EmailAddress] public string? PrimaryEmail { get; set; }
        [MaxLength(255)] public string? SecondaryEmail { get; set; }
        public string? HowHeard { get; set; }

        // Volunteer Specific
        [Required][MaxLength(10)] public string? AgeConfirmation { get; set; }
        [MaxLength(10)] public string? PreviousVolunteerExperience { get; set; }
        public string? PreviousExperienceDetails { get; set; }
        [MaxLength(10)] public string? ComfortLevelSpecialNeeds { get; set; }
        public string? AreasOfInterest { get; set; }
        public string? OtherSkills { get; set; }
        [Required(ErrorMessage = "Location acknowledgement is required.")] // Validation for boolean
        public bool? LocationAcknowledgement { get; set; }
        public string? VolunteerReason { get; set; }
        [MaxLength(255)] public string? EmergencyContactName { get; set; }
        [MaxLength(30)] public string? EmergencyContactPhone { get; set; }
        [Required][MaxLength(10)] public string? CrimeConvictionCheck { get; set; }
        [Required(ErrorMessage = "Policy acknowledgement is required.")]
        public bool? PolicyAcknowledgement { get; set; }

        // Waiver
        [Required(ErrorMessage = "You must agree to the waiver terms.")]
        public bool? WaiverAgreed { get; set; }
        [MaxLength(255)]
        public string? ESignatureName { get; set; }
    }
}
