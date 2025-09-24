// rescueApp/Models/AdoptionHistory.cs
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AdoptionHistory
    {
        public int Id { get; set; }
        public int AnimalId { get; set; }
        public int AdopterId { get; set; }
        public DateTime AdoptionDate { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string? Notes { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public DateTime DateCreated { get; set; }
        public Guid? UpdatedByUserId { get; set; } // Nullable Guid
        public DateTime DateUpdated { get; set; }

        public virtual Animal? Animal { get; set; }
        public virtual Adopter? Adopter { get; set; }

        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }

        [ForeignKey("UpdatedByUserId")]
        public virtual User? UpdatedByUser { get; set; }
    }
}
