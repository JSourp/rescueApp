using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    [Table("users")]
    public class User
    {
        [Key]
        public Guid id { get; set; } // Matches UUID PK

        [MaxLength(255)]
        public string? external_provider_id { get; set; } // Matches VARCHAR UNIQUE NULL

        [Required]
        [MaxLength(100)]
        public string first_name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string last_name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string email { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string role { get; set; } = string.Empty; // e.g., 'Admin', 'Staff', 'Volunteer', 'Guest'

        public bool is_active { get; set; } = true;

        // Let DB handle these via defaults/triggers
        public DateTime date_created { get; set; }
        public DateTime date_updated { get; set; }
        public DateTime? last_login_date { get; set; }

        // Navigation Property: A user might create many adoption records
        public virtual ICollection<AdoptionHistory>? CreatedAdoptionHistories { get; set; }
    }
}
