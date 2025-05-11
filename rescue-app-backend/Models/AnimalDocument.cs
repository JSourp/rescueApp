// rescueApp/Models/AnimalDocument.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AnimalDocument
    {
        public int Id { get; set; } // Matches SERIAL PK
        public int AnimalId { get; set; } // FK
        public string DocumentType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty; // Original filename
        public string BlobName { get; set; } = string.Empty; // Unique name in blob storage
        public string BlobUrl { get; set; } = string.Empty; // Full base URL
        public string? Description { get; set; } // Nullable
        public DateTime DateUploaded { get; set; }
        public Guid? UploadedByUserId { get; set; }

        [ForeignKey("AnimalId")]
        public virtual Animal? Animal { get; set; }

        [ForeignKey("UploadedByUserId")]
        public virtual User? UploadedByUser { get; set; }
    }
}
