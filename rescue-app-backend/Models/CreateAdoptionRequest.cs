using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models
{
    public class CreateAdoptionRequest
    {
        [Required(ErrorMessage = "animal Id is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid animal Id is required.")]
        public int AnimalId { get; set; }

        public string? AdopterFirstName { get; set; }
        public string? AdopterLastName { get; set; }
        public string? AdopterEmail { get; set; }
        public string? AdopterPrimaryPhone { get; set; }
        public string? AdopterPrimaryPhoneType { get; set; }
        public string? AdopterSecondaryPhone { get; set; }
        public string? AdopterSecondaryPhoneType { get; set; }
        public string? AdopterStreetAddress { get; set; }
        public string? AdopterAptUnit { get; set; }
        public string? AdopterCity { get; set; }
        public string? AdopterStateProvince { get; set; }
        public string? AdopterZipPostalCode { get; set; }
        public string? SpousePartnerRoommate { get; set; }

        public int? AdoptionApplicationId { get; set; }
        public DateTime? AdoptionDate { get; set; }
        public string? Notes { get; set; }
        public string? HowHeard { get; set; }
        public string? Botcheck { get; set; } // Honeypot field for spam prevention
    }
}
