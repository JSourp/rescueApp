using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AnimalImage
    {
        public int Id { get; set; } // Matches SERIAL PK
        public int AnimalId { get; set; } // Foreign key property
        public string ImageUrl { get; set; } = string.Empty;
        public string BlobName { get; set; } = string.Empty; // Unique name in storage
        public string? Caption { get; set; }
        public int DisplayOrder { get; set; } = 0; // Default order
        public bool IsPrimary { get; set; } = false; // Default not primary
        public DateTime DateUploaded { get; set; }
        public Guid? UploadedByUserId { get; set; } // Nullable Guid FK

        [ForeignKey("AnimalId")]
        public virtual Animal? Animal { get; set; }

        [ForeignKey("UploadedByUserId")]
        public virtual User? UploadedByUser { get; set; }
    }
}
