// rescueApp/Models/AdoptionHistory.cs
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AdoptionHistory
    {
        public int id { get; set; }
        public int animal_id { get; set; }
        public int adopter_id { get; set; }
        public DateTime adoption_date { get; set; }
        public DateTime? return_date { get; set; }
        public string? notes { get; set; }

        // Foreign key for the user who created the record
        public Guid? created_by_user_id { get; set; }

        // Timestamp for creation (DB generates default)
        public DateTime date_created { get; set; }

        // Foreign key for the user who LAST updated the record
        public Guid? updated_by_user_id { get; set; } // Nullable Guid

        // Timestamp for update (DB generates via DEFAULT and TRIGGER)
        public DateTime date_updated { get; set; }


        // --- Navigation Properties ---
        public virtual Animal? Animal { get; set; }
        public virtual Adopter? Adopter { get; set; }
        public virtual User? CreatedByUser { get; set; }

        // Optional: Navigation property for the updating user
        // Define Foreign Key relationship in OnModelCreating if adding this
        // [ForeignKey("updated_by_user_id")]
        // public virtual User? UpdatedByUser { get; set; }
        // --- End Navigation Properties ---
    }
}
