using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models.Requests
{
    public class CreateFosterApplicationRequest
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

        // Household & Home Environment
        [Required][MaxLength(255)] public string? AdultsInHome { get; set; }
        public string? ChildrenInHome { get; set; }
        [MaxLength(10)] public string? HasAllergies { get; set; }
        [Required][MaxLength(10)] public string? HouseholdAwareFoster { get; set; }
        [Required][MaxLength(50)] public string? DwellingType { get; set; }
        [Required][MaxLength(10)] public string? RentOrOwn { get; set; }
        public bool? LandlordPermission { get; set; }
        [MaxLength(50)] public string? YardType { get; set; }
        [Required] public string? SeparationPlan { get; set; }

        // Current Pet Information
        [Required][MaxLength(10)] public string? HasCurrentPets { get; set; }
        public string? CurrentPetsDetails { get; set; }
        [MaxLength(10)] public string? CurrentPetsSpayedNeutered { get; set; }
        [MaxLength(10)] public string? CurrentPetsVaccinations { get; set; }
        [MaxLength(255)] public string? VetClinicName { get; set; }
        [MaxLength(30)] public string? VetPhone { get; set; }

        // Foster Experience & Preferences
        [Required][MaxLength(10)] public string? HasFosteredBefore { get; set; }
        public string? PreviousFosterDetails { get; set; }
        [Required] public string? WhyFoster { get; set; }
        // Frontend sends string[], backend DTO expects string (comma-separated)
        [Required(ErrorMessage = "Please select at least one type of animal you are interested in fostering.")]
        public string? FosterAnimalTypes { get; set; }
        [Required][MaxLength(10)] public string? WillingMedical { get; set; }
        [Required][MaxLength(10)] public string? WillingBehavioral { get; set; }
        [Required][MaxLength(50)] public string? CommitmentLength { get; set; }
        [Required][MaxLength(10)] public string? CanTransport { get; set; }
        public string? TransportExplanation { get; set; }
        public string? PreviousPetsDetails { get; set; }

        // Foster Waver
        [Required(ErrorMessage = "You must agree to the waiver terms to submit the application.")]
        public bool WaiverAgreed { get; set; }
        [MaxLength(255)]
        public string? ESignatureName { get; set; }
    }
}
