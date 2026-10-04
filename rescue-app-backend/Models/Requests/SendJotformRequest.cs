using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace rescueApp.Models.Requests
{
    public class SendJotformRequest
    {
        [Required]
        [EmailAddress]
        [JsonPropertyName("recipientEmail")]
        public string RecipientEmail { get; set; } = string.Empty;

        [Required]
        [JsonPropertyName("formId")]
        public string FormId { get; set; } = string.Empty;
    }
}
