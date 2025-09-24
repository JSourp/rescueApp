using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AdoptionApplication
    {
        [Key]
        public int Id { get; set; }
        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending Review";

        public int? AnimalId { get; set; } // Nullable FK
        public string? WhichAnimalText { get; set; }

        // Applicant Information
        [Required][MaxLength(100)] public string FirstName { get; set; } = string.Empty;
        [Required][MaxLength(100)] public string LastName { get; set; } = string.Empty;
        [MaxLength(255)] public string? SpousePartnerRoommate { get; set; }
        [Required][MaxLength(255)][EmailAddress] public string PrimaryEmail { get; set; } = string.Empty;
        [MaxLength(255)] public string? SecondaryEmail { get; set; }
        [Required][MaxLength(30)] public string PrimaryPhone { get; set; } = string.Empty;
        [Required][MaxLength(10)] public string PrimaryPhoneType { get; set; } = string.Empty;
        [MaxLength(30)] public string? SecondaryPhone { get; set; }
        [MaxLength(10)] public string? SecondaryPhoneType { get; set; }

        // Home & Household
        [Required][MaxLength(255)] public string StreetAddress { get; set; } = string.Empty;
        [MaxLength(50)] public string? AptUnit { get; set; }
        [Required][MaxLength(100)] public string City { get; set; } = string.Empty;
        [Required][MaxLength(100)] public string StateProvince { get; set; } = string.Empty;
        [Required][MaxLength(20)] public string ZipPostalCode { get; set; } = string.Empty;
        [Required][MaxLength(50)] public string DwellingType { get; set; } = string.Empty;
        [Required][MaxLength(10)] public string RentOrOwn { get; set; } = string.Empty;
        public bool? LandlordPermission { get; set; }
        [MaxLength(50)] public string? YardType { get; set; }
        [Required][MaxLength(255)] public string AdultsInHome { get; set; } = string.Empty;
        public string? ChildrenInHome { get; set; }
        [MaxLength(10)] public string? HasAllergies { get; set; }
        [Required][MaxLength(10)] public string HouseholdAware { get; set; } = string.Empty;

        // Pet Experience
        [Required][MaxLength(10)] public string HasCurrentPets { get; set; } = string.Empty;
        public string? CurrentPetsDetails { get; set; }
        [MaxLength(10)] public string? CurrentPetsSpayedNeutered { get; set; }
        [MaxLength(10)] public string? CurrentPetsVaccinations { get; set; }
        [MaxLength(10)] public string? HasPreviousPets { get; set; }
        public string? PreviousPetsDetails { get; set; }
        [MaxLength(255)] public string? VetClinicName { get; set; }
        [MaxLength(30)] public string? VetPhone { get; set; }

        // Lifestyle & Care Plan
        public string? WhyAdopt { get; set; }
        [Required][MaxLength(255)] public string PrimaryCaregiver { get; set; } = string.Empty;
        [Required][MaxLength(20)] public string HoursAlonePerDay { get; set; } = string.Empty;
        [Required] public string PetAloneLocation { get; set; } = string.Empty;
        [Required] public string PetSleepLocation { get; set; } = string.Empty;
        public string? MovingPlan { get; set; }
        [Required][MaxLength(10)] public string PreparedForCosts { get; set; } = string.Empty;

        // Additional Information
        public string? HowHeard { get; set; }

        // Waiver Information
        public bool WaiverAgreed { get; set; }
        [MaxLength(255)] public string? ESignatureName { get; set; }
        public DateTime? WaiverAgreementTimestamp { get; set; }

        // Admin Review Fields
        public Guid? ReviewedByUserId { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string? InternalNotes { get; set; }

        // Navigation Properties
        [ForeignKey("AnimalId")]
        public virtual Animal? Animal { get; set; }

        [ForeignKey("ReviewedByUserId")]
        public virtual User? ReviewedByUser { get; set; }
    }
}
