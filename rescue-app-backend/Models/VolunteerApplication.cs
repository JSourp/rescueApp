using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class VolunteerApplication
    {
        [Key]
        public int Id { get; set; }
        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending Review";

        // Applicant Information
        [Required][MaxLength(100)] public string FirstName { get; set; } = string.Empty;
        [Required][MaxLength(100)] public string LastName { get; set; } = string.Empty;
        [MaxLength(255)] public string? SpousePartnerRoommate { get; set; }
        [Required][MaxLength(255)] public string StreetAddress { get; set; } = string.Empty;
        [MaxLength(50)] public string? AptUnit { get; set; }
        [Required][MaxLength(100)] public string City { get; set; } = string.Empty;
        [Required][MaxLength(100)] public string StateProvince { get; set; } = string.Empty;
        [Required][MaxLength(20)] public string ZipPostalCode { get; set; } = string.Empty;
        [Required][MaxLength(30)] public string PrimaryPhone { get; set; } = string.Empty;
        [Required][MaxLength(10)] public string PrimaryPhoneType { get; set; } = string.Empty;
        [MaxLength(30)] public string? SecondaryPhone { get; set; }
        [MaxLength(10)] public string? SecondaryPhoneType { get; set; }
        [Required][MaxLength(255)][EmailAddress] public string PrimaryEmail { get; set; } = string.Empty;
        [MaxLength(255)] public string? SecondaryEmail { get; set; }
        public string? HowHeard { get; set; }

        // Volunteer Specific
        [Required][MaxLength(10)] public string AgeConfirmation { get; set; } = string.Empty;
        [MaxLength(10)] public string? PreviousVolunteerExperience { get; set; }
        public string? PreviousExperienceDetails { get; set; }
        [MaxLength(10)] public string? ComfortLevelSpecialNeeds { get; set; }
        public string? AreasOfInterest { get; set; } // Comma-separated from string[]
        public string? OtherSkills { get; set; }
        public bool LocationAcknowledgement { get; set; }
        public string? VolunteerReason { get; set; }
        [MaxLength(255)] public string EmergencyContactName { get; set; } = string.Empty;
        [MaxLength(30)] public string EmergencyContactPhone { get; set; } = string.Empty;
        [Required][MaxLength(10)] public string CrimeConvictionCheck { get; set; } = string.Empty;
        public bool PolicyAcknowledgement { get; set; }

        // Waiver Information
        public bool WaiverAgreed { get; set; }
        [MaxLength(255)] public string? ESignatureName { get; set; }
        public DateTime? WaiverAgreementTimestamp { get; set; }

        // Admin Review Fields
        public Guid? ReviewedByUserId { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string? InternalNotes { get; set; }

        [ForeignKey("ReviewedByUserId")]
        public virtual User? ReviewedByUser { get; set; }
    }
}
