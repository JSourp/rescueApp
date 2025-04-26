using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models
{
    public class CreateAdoptionRequest
    {
        [Required(ErrorMessage = "animalId is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid animalId is required.")]
        public int animalId { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter first name is required.")]
        [MaxLength(100)]
        public string? adopter_first_name { get; set; } // Nullable string, Required handles validation

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter last name is required.")]
        [MaxLength(100)]
        public string? adopter_last_name { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Adopter email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [MaxLength(255)]
        public string? adopter_email { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Primary phone is required.")]
        [Phone(ErrorMessage = "Invalid phone number format.")] // Basic phone format check
        [MaxLength(30)]
        public string? adopter_primary_phone { get; set; }

        [Required(ErrorMessage = "Primary phone type is required.")]
        [RegularExpression("^(Cell|Home|Work)$", ErrorMessage = "Phone type must be Cell, Home, or Work.")] // Enforce specific values
        [MaxLength(10)]
        public string? adopter_primary_phone_type { get; set; }

        [Phone(ErrorMessage = "Invalid secondary phone format.")]
        [MaxLength(30)]
        public string? adopter_secondary_phone { get; set; } // Optional

        [RegularExpression("^(Cell|Home|Work)$", ErrorMessage = "Phone type must be Cell, Home, or Work.")]
        [MaxLength(10)]
        public string? adopter_secondary_phone_type { get; set; } // Optional

        [Required(AllowEmptyStrings = false, ErrorMessage = "Street address is required.")]
        [MaxLength(255)]
        public string? adopter_street_address { get; set; }

        [MaxLength(50)]
        public string? adopter_apt_unit { get; set; } // Optional

        [Required(AllowEmptyStrings = false, ErrorMessage = "City is required.")]
        [MaxLength(100)]
        public string? adopter_city { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "State/Province is required.")]
        [MaxLength(100)]
        public string? adopter_state_province { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Zip/Postal code is required.")]
        [MaxLength(20)]
        public string? adopter_zip_postal_code { get; set; }

        [MaxLength(100)]
        public string? spouse_partner_roommate { get; set; } // Optional

        // Optional fields below
        public DateTime? adoption_date { get; set; } // Optional? Default to now if missing
        public string? notes { get; set; }
        public string? how_heard { get; set; }
        public string? botcheck { get; set; } // Honeypot field for spam prevention
    }
}
