namespace rescueApp.Models
{
    public class CreateAdoptionRequest
    {
        // Required field to identify the animal
        public int AnimalId { get; set; }

        // Required Adopter Fields (match AdoptionFormData on frontend)
        // Use exact casing from your form submission data if PropertyNameCaseInsensitive isn't used/reliable
        public string adopter_first_name { get; set; } = string.Empty;
        public string adopter_last_name { get; set; } = string.Empty;
        public string adopter_email { get; set; } = string.Empty;
        public string adopter_phone { get; set; } = string.Empty;
        public string adopter_street_address { get; set; } = string.Empty;
        public string adopter_city { get; set; } = string.Empty;
        public string adopter_state_province { get; set; } = string.Empty;
        public string adopter_zip_postal_code { get; set; } = string.Empty;
        public string primary_phone_type { get; set; } = string.Empty;

        // Optional Adopter Fields
        public string? spouse_partner_roommate { get; set; }
        public string? adopter_apt_unit { get; set; }
        public string? secondary_phone { get; set; }
        public string? secondary_phone_type {get; set;}
        public string? secondary_email { get; set; }
        public string? how_heard { get; set; }
        public string? adoption_notes { get; set; } // Specific notes for this adoption

        // Include any other fields submitted by AdoptionForm that you want to capture
        // public string? which_animal { get; set; } // Maybe store this in notes?
        // public string? home_type { get; set; } // etc.
    }
}
