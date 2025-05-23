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
        public Guid Id { get; set; } // Matches UUID PK

        [MaxLength(255)]
        public string? ExternalProviderId { get; set; } // Matches VARCHAR UNIQUE NULL

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? PrimaryPhone { get; set; }

        [MaxLength(10)]
        public string? PrimaryPhoneType { get; set; } // (e.g., "Cell", "Home")

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty; // e.g., 'Admin', 'Staff', 'Volunteer', 'Guest'

        public bool IsActive { get; set; } = true;

        // Let DB handle these via defaults/triggers
        public DateTime DateCreated { get; set; }
        public DateTime DateUpdated { get; set; }
        public DateTime? LastLoginDate { get; set; }
        public virtual ICollection<AdoptionHistory>? CreatedAdoptionHistories { get; set; } // User creates many histories
    }
}
