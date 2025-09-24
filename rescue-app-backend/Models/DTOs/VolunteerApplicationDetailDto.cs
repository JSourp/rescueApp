using System;

namespace rescueApp.Models.DTOs
{
    public class VolunteerApplicationDetailDto
    {
        public int Id { get; set; }
        public DateTime SubmissionDate { get; set; }
        public string Status { get; set; } = string.Empty;

        // Applicant Information
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? SpousePartnerRoommate { get; set; }
        public string StreetAddress { get; set; } = string.Empty;
        public string? AptUnit { get; set; }
        public string City { get; set; } = string.Empty;
        public string StateProvince { get; set; } = string.Empty;
        public string ZipPostalCode { get; set; } = string.Empty;
        public string PrimaryPhone { get; set; } = string.Empty;
        public string PrimaryPhoneType { get; set; } = string.Empty;
        public string? SecondaryPhone { get; set; }
        public string? SecondaryPhoneType { get; set; }
        public string PrimaryEmail { get; set; } = string.Empty;
        public string? SecondaryEmail { get; set; }
        public string? HowHeard { get; set; }

        // Volunteer Specific
        public string AgeConfirmation { get; set; } = string.Empty;
        public string? PreviousVolunteerExperience { get; set; }
        public string? PreviousExperienceDetails { get; set; }
        public string? ComfortLevelSpecialNeeds { get; set; }
        public string? AreasOfInterest { get; set; } // Comma-separated string
        public string? OtherSkills { get; set; }
        public bool LocationAcknowledgement { get; set; }
        public string? VolunteerReason { get; set; }
        public string EmergencyContactName { get; set; } = string.Empty;
        public string EmergencyContactPhone { get; set; } = string.Empty;
        public string CrimeConvictionCheck { get; set; } = string.Empty;
        public bool PolicyAcknowledgement { get; set; }

        // Waiver Information
        public bool WaiverAgreed { get; set; }
        public string? ESignatureName { get; set; }
        public DateTime? WaiverAgreementTimestamp { get; set; }

        // Admin Review Fields
        public Guid? ReviewedByUserId { get; set; }
        public string? ReviewedByName { get; set; } // For display (e.g., "Admin Name")
        public DateTime? ReviewDate { get; set; }
        public string? InternalNotes { get; set; }
    }
}
