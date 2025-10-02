using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models.Requests
{
    public class SendContractRequest
    {
        [Required]
        [EmailAddress]
        public string RecipientEmail { get; set; } = string.Empty;

        [Required]
        public string AnimalName { get; set; } = string.Empty;

        [Required]
        public string AnimalSpecies { get; set; } = string.Empty;

        [Required]
        public string AnimalBreed { get; set; } = string.Empty;

        [Required]
        public string AnimalGender { get; set; } = string.Empty;

        [Required]
        public int ScarsId { get; set; }
    }
}
