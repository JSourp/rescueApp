using System; // Ensure System is included for DateTime

namespace rescue_app_backend.Models
{
    public class AdoptionHistory
    {
        public int id { get; set; }
        public int animalid { get; set; }
        public DateTime adoptiondate { get; set; }
        public DateTime? returndate { get; set; }

        public string adopter_first_name { get; set; } = string.Empty;
        public string adopter_last_name { get; set; } = string.Empty;
        public string adopter_email { get; set; } = string.Empty;
        public string adopter_phone { get; set; } = string.Empty;
        public string adopter_street_address { get; set; } = string.Empty;
        public string? adopter_apt_unit { get; set; }
        public string adopter_city { get; set; } = string.Empty;
        public string adopter_state_province { get; set; } = string.Empty;
        public string adopter_zip_postal_code { get; set; } = string.Empty;

        public string? notes { get; set; }

        // Add Navigation Property back to Animal
        public virtual Animal? Animal { get; set; }
    }
}
