using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AnimalImage
    {
        [Key]
        public int id { get; set; } // Matches SERIAL PK

        [Required]
        public int animal_id { get; set; } // Foreign key property

        [Required]
        public string image_url { get; set; } = string.Empty;

        [Required]
        public string blob_name { get; set; } = string.Empty; // Unique name in storage

        public string? caption { get; set; } // Optional

        [Required]
        public int display_order { get; set; } = 0; // Default order

        [Required]
        public bool is_primary { get; set; } = false; // Default not primary

        // Audit columns (DB handles default for date_uploaded)
        public DateTime date_uploaded { get; set; }
        public Guid? uploaded_by_user_id { get; set; } // Nullable Guid FK

        // Navigation properties
        [ForeignKey("animal_id")]
        public virtual Animal? Animal { get; set; }

        [ForeignKey("uploaded_by_user_id")]
        public virtual User? UploadedByUser { get; set; }
    }
}
