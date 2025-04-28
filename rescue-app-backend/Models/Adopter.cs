using System;
using System.Collections.Generic; // <-- Add this for ICollection
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    [Table("adopters")]
    public class Adopter
    {
        [Key]
        public int id { get; set; }

        [Required]
        [MaxLength(100)]
        public string adopter_first_name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string adopter_last_name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string adopter_email { get; set; } = string.Empty;

        [Required]
        [Phone]
        [MaxLength(30)]
        public string adopter_primary_phone { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string adopter_primary_phone_type { get; set; } = string.Empty;

        [Phone]
        [MaxLength(30)]
        public string? adopter_secondary_phone { get; set; }

        [MaxLength(10)]
        public string? adopter_secondary_phone_type { get; set; }

        [Required]
        [MaxLength(255)]
        public string adopter_street_address { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? adopter_apt_unit { get; set; }

        [Required]
        [MaxLength(100)]
        public string adopter_city { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string adopter_state_province { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string adopter_zip_postal_code { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? spouse_partner_roommate { get; set; }

        // These two date values should be handled automatically by DB defaults or EF Core value generation
        // As a result NOT [Required]
        public DateTime date_created { get; set; }

        public DateTime date_updated { get; set; }
        public Guid? created_by_user_id { get; set; } // Nullable Guid (matches User PK type)
        public Guid? updated_by_user_id { get; set; } // Nullable Guid

        public string? notes { get; set; }

        public virtual ICollection<AdoptionHistory>? AdoptionHistories { get; set; } // Adopter has many histories

        // Optional: Navigation properties for user tracking
        [ForeignKey("created_by_user_id")]
        public virtual User? CreatedByUser { get; set; }

        [ForeignKey("updated_by_user_id")]
        public virtual User? UpdatedByUser { get; set; }
        // --- End Navigation Properties ---
    }
}
