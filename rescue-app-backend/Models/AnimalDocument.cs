// rescueApp/Models/AnimalDocument.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AnimalDocument
    {
        [Key]
        public int id { get; set; } // Matches SERIAL PK

        [Required]
        public int animal_id { get; set; } // FK

        [Required]
        [MaxLength(100)]
        public string document_type { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string file_name { get; set; } = string.Empty; // Original filename

        [Required]
        [MaxLength(300)] // Match potential GUID + filename length
        public string blob_name { get; set; } = string.Empty; // Unique name in blob storage

        [Required]
        public string blob_url { get; set; } = string.Empty; // Full base URL

        public string? description { get; set; } // Nullable

        // --- Audit Columns ---
        // DB handles default for date_uploaded
        public DateTime date_uploaded { get; set; }

        // Nullable Guid to match User PK and allow null
        public Guid? uploaded_by_user_id { get; set; }
        // --- End Audit Columns ---


        // --- Navigation Properties ---
        [ForeignKey("animal_id")]
        public virtual Animal? Animal { get; set; }

        [ForeignKey("uploaded_by_user_id")]
        public virtual User? UploadedByUser { get; set; }
        // --- End Navigation Properties ---
    }
}
