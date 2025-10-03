using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace rescueApp.Models.Requests
{
    public class SendContractRequest
    {
		[Required]
		[EmailAddress]
		[JsonPropertyName("recipientEmail")]
		public string RecipientEmail { get; set; } = string.Empty;

		[Required]
		[JsonPropertyName("animalName")]
		public string AnimalName { get; set; } = string.Empty;

		[Required]
		[JsonPropertyName("animalSpecies")]
		public string AnimalSpecies { get; set; } = string.Empty;

		[Required]
		[JsonPropertyName("animalBreed")]
		public string AnimalBreed { get; set; } = string.Empty;

		[Required]
		[JsonPropertyName("animalGender")]
		public string AnimalGender { get; set; } = string.Empty;

		[Required]
		[JsonPropertyName("scarsId")]
		public int ScarsId { get; set; }
    }
}
