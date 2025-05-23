using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models
{
    public class CreateAdoptionRequest
    {
        [Required(ErrorMessage = "animal Id is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid animal Id is required.")]
        public int AnimalId { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter first name is required.")]
        [MaxLength(100)]
        public string? AdopterFirstName { get; set; } // Nullable string, Required handles validation

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter last name is required.")]
        [MaxLength(100)]
        public string? AdopterLastName { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string? AdopterEmail { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Primary phone is required.")]
        [Phone(ErrorMessage = "Invalid phone number format.")] // Basic phone format check
        [MaxLength(30)]
        public string? AdopterPrimaryPhone { get; set; }

        [Required(ErrorMessage = "Primary phone type is required.")]
        [RegularExpression("^(Cell|Home|Work)$", ErrorMessage = "Phone type must be Cell, Home, or Work.")] // Enforce specific values
        [MaxLength(10)]
        public string? AdopterPrimaryPhoneType { get; set; }

        [Phone(ErrorMessage = "Invalid secondary phone format.")]
        [MaxLength(30)]
        public string? AdopterSecondaryPhone { get; set; }

        [RegularExpression("^(Cell|Home|Work)$", ErrorMessage = "Phone type must be Cell, Home, or Work.")]
        [MaxLength(10)]
        public string? AdopterSecondaryPhoneType { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Street address is required.")]
        [MaxLength(255)]
        public string? AdopterStreetAddress { get; set; }

        [MaxLength(50)]
        public string? AdopterAptUnit { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "City is required.")]
        [MaxLength(100)]
        public string? AdopterCity { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "State/Province is required.")]
        [MaxLength(100)]
        public string? AdopterStateProvince { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Zip/Postal code is required.")]
        [MaxLength(20)]
        public string? AdopterZipPostalCode { get; set; }

        [MaxLength(100)]
        public string? SpousePartnerRoommate { get; set; }

        // Optional fields below
        public DateTime? AdoptionDate { get; set; }
        public string? Notes { get; set; }
        public string? HowHeard { get; set; }
        public string? Botcheck { get; set; } // Honeypot field for spam prevention
    }
}
