using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class Animal
    {
        public int Id { get; set; }
        public string? AnimalType { get; set; }
        public string? Name { get; set; }
        public string? Breed { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public decimal? Weight { get; set; }
        public string? Story { get; set; }
        public string? AdoptionStatus { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime DateUpdated { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }

        public virtual ICollection<AdoptionHistory>? AdoptionHistories { get; set; }
        public virtual ICollection<AnimalDocument>? AnimalDocuments { get; set; }
        public virtual ICollection<AnimalImage> AnimalImages { get; set; }

        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }

        [ForeignKey("UpdatedByUserId")]
        public virtual User? UpdatedByUser { get; set; }

        public Animal()
        {
            AdoptionHistories = new HashSet<AdoptionHistory>();
            AnimalImages = new HashSet<AnimalImage>();
        }
    }
}
