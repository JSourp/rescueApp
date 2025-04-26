// Recommended Adjustments:
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class AdoptionHistory
    {
        public int id { get; set; }

        // [ForeignKey("Animal")] // Optional attribute for clarity
        public int animalId { get; set; }

        // [ForeignKey("Adopter")] // Optional attribute for clarity
        public int adopter_id { get; set; }

        public DateTime adoption_date { get; set; }
        public DateTime? return_date { get; set; }

        public string? notes { get; set; }

        public Guid? created_by_user_id { get; set; }

        public DateTime date_created { get; set; }

        public virtual Animal? Animal { get; set; }
        public virtual Adopter? Adopter { get; set; }
        public virtual User? CreatedByUser { get; set; }
    }
}
