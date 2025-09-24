using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models.Requests
{
    public class CreateAdoptionApplicationRequest
    {
        // Animal Information
        public int? AnimalId { get; set; } // Nullable, from frontend animal_id prop
        public string? WhichAnimal { get; set; } // From frontend which_animal field

        // Applicant Information
        [Required][MaxLength(100)] public string? FirstName { get; set; }
        [Required][MaxLength(100)] public string? LastName { get; set; }
        [MaxLength(255)] public string? SpousePartnerRoommate { get; set; }
        [Required][MaxLength(255)][EmailAddress] public string? PrimaryEmail { get; set; }
        [MaxLength(255)] public string? SecondaryEmail { get; set; }
        [Required][MaxLength(30)] public string? PrimaryPhone { get; set; }
        [Required][MaxLength(10)] public string? PrimaryPhoneType { get; set; }
        [MaxLength(30)] public string? SecondaryPhone { get; set; }
        [MaxLength(10)] public string? SecondaryPhoneType { get; set; }

        // Home & Household
        [Required][MaxLength(255)] public string? StreetAddress { get; set; }
        [MaxLength(50)] public string? AptUnit { get; set; }
        [Required][MaxLength(100)] public string? City { get; set; }
        [Required][MaxLength(100)] public string? StateProvince { get; set; }
        [Required][MaxLength(20)] public string? ZipPostalCode { get; set; }
        [Required][MaxLength(50)] public string? DwellingType { get; set; }
        [Required][MaxLength(10)] public string? RentOrOwn { get; set; }
        public bool? LandlordPermission { get; set; }
        [MaxLength(50)] public string? YardType { get; set; }
        [Required][MaxLength(255)] public string? AdultsInHome { get; set; }
        public string? ChildrenInHome { get; set; }
        [MaxLength(10)] public string? HasAllergies { get; set; }
        [Required][MaxLength(10)] public string? HouseholdAware { get; set; }

        // Pet Experience
        [Required][MaxLength(10)] public string? HasCurrentPets { get; set; }
        public string? CurrentPetsDetails { get; set; }
        [MaxLength(10)] public string? CurrentPetsSpayedNeutered { get; set; }
        [MaxLength(10)] public string? CurrentPetsVaccinations { get; set; }
        [MaxLength(10)] public string? HasPreviousPets { get; set; }
        public string? PreviousPetsDetails { get; set; }
        [MaxLength(255)] public string? VetClinicName { get; set; }
        [MaxLength(30)] public string? VetPhone { get; set; }

        // Lifestyle & Care Plan
        public string? WhyAdopt { get; set; }
        [Required][MaxLength(255)] public string? PrimaryCaregiver { get; set; }
        [Required][MaxLength(20)] public string? HoursAlonePerDay { get; set; }
        [Required] public string? PetAloneLocation { get; set; }
        [Required] public string? PetSleepLocation { get; set; }
        public string? MovingPlan { get; set; }
        [Required][MaxLength(10)] public string? PreparedForCosts { get; set; }

        // Additional Information
        public string? HowHeard { get; set; }

        // Waiver
        [Required(ErrorMessage = "You must agree to the waiver terms.")]
        public bool? WaiverAgreed { get; set; }
        [MaxLength(255)]
        public string? ESignatureName { get; set; }
    }
}
