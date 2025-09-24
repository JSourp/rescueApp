using System;
using System.Collections.Generic;

namespace rescueApp.Models.DTOs
{
    public class FosterApplicationDetailDto
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

        // Household & Home Environment
        public string AdultsInHome { get; set; } = string.Empty;
        public string? ChildrenInHome { get; set; }
        public string? HasAllergies { get; set; }
        public string HouseholdAwareFoster { get; set; } = string.Empty;
        public string DwellingType { get; set; } = string.Empty;
        public string RentOrOwn { get; set; } = string.Empty;
        public bool? LandlordPermission { get; set; }
        public string? YardType { get; set; }
        public string SeparationPlan { get; set; } = string.Empty;

        // Current Pet Information
        public string HasCurrentPets { get; set; } = string.Empty;
        public string? CurrentPetsDetails { get; set; }
        public string? CurrentPetsSpayedNeutered { get; set; }
        public string? CurrentPetsVaccinations { get; set; }
        public string? VetClinicName { get; set; }
        public string? VetPhone { get; set; }

        // Foster Experience & Preferences
        public string HasFosteredBefore { get; set; } = string.Empty;
        public string? PreviousFosterDetails { get; set; }
        public string WhyFoster { get; set; } = string.Empty;
        public string? FosterAnimalTypes { get; set; } // Comma-separated string
        public string WillingMedical { get; set; } = string.Empty;
        public string WillingBehavioral { get; set; } = string.Empty;
        public string CommitmentLength { get; set; } = string.Empty;
        public string CanTransport { get; set; } = string.Empty;
        public string? TransportExplanation { get; set; }
        public string? PreviousPetsDetails { get; set; }

        // Foster Waiver
        public bool WaiverAgreed { get; set; }
        public string? ESignatureName { get; set; }

        // Admin Review Fields
        public Guid? ReviewedByUserId { get; set; }
        public string? ReviewedByName { get; set; } // For display
        public DateTime? ReviewDate { get; set; }
        public string? InternalNotes { get; set; }
    }
}
