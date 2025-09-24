using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models.Requests
{
    public class UpdateAnimalRequest
    {
        [MaxLength(100)]
        public string? AnimalType { get; set; }
        [MaxLength(100)]
        public string? Name { get; set; }
        [MaxLength(100)]
        public string? Breed { get; set; }
        public DateTime? DateOfBirth { get; set; }
        [MaxLength(10)]
        public string? Gender { get; set; }
        [Range(0.1, 300)]
        public decimal? Weight { get; set; }
        public string? Story { get; set; }
        [MaxLength(50)]
        public string? AdoptionStatus { get; set; }
		public Guid? CurrentFosterUserId { get; set; }
    }
}
