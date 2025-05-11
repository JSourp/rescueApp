using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic; // For ICollection

namespace rescueApp.Models
{
    public class FosterProfile
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public Guid UserId { get; set; } // FK to User

        public int? FosterApplicationId { get; set; } // Nullable FK to FosterApplication

        public DateTime ApprovalDate { get; set; } = DateTime.UtcNow;
        public bool IsActiveFoster { get; set; } = true;
        public string? AvailabilityNotes { get; set; }
        public string? CapacityDetails { get; set; }
        public DateTime? HomeVisitDate {get; set;}
        public string? HomeVisitNotes {get; set;}

        // Audit columns for the profile itself
        public DateTime DateCreated { get; set; }
        public DateTime DateUpdated { get; set; }

        // Navigation Properties
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("FosterApplicationId")]
        public virtual FosterApplication? FosterApplication { get; set; }

        // Animals this foster currently has (derived via Animal.CurrentFosterUserId)
        // This is not a direct FK in this table, but a reverse navigation
        [NotMapped] // This won't be a DB column but can be populated by queries
        public virtual ICollection<Animal>? FosteredAnimals { get; set; }

        public FosterProfile()
        {
            FosteredAnimals = new HashSet<Animal>();
        }
    }
}
