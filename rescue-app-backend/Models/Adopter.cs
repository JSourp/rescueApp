using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
    public class Adopter
    {
        public int Id { get; set; }
        public string AdopterFirstName { get; set; } = string.Empty;
        public string AdopterLastName { get; set; } = string.Empty;
        public string AdopterEmail { get; set; } = string.Empty;
        public string AdopterPrimaryPhone { get; set; } = string.Empty;
        public string AdopterPrimaryPhoneType { get; set; } = string.Empty;
        public string? AdopterSecondaryPhone { get; set; }
        public string? AdopterSecondaryPhoneType { get; set; }
        public string AdopterStreetAddress { get; set; } = string.Empty;
        public string? AdopterAptUnit { get; set; }
        public string AdopterCity { get; set; } = string.Empty;
        public string AdopterStateProvince { get; set; } = string.Empty;
        public string AdopterZipPostalCode { get; set; } = string.Empty;
        public string? SpousePartnerRoommate { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime DateUpdated { get; set; }
        public Guid? CreatedByUserId { get; set; } // Nullable Guid (matches User PK type)
        public Guid? UpdatedByUserId { get; set; } // Nullable Guid
        public string? Notes { get; set; }

        public virtual ICollection<AdoptionHistory>? AdoptionHistories { get; set; } // Adopter has many histories

        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }

        [ForeignKey("UpdatedByUserId")]
        public virtual User? UpdatedByUser { get; set; }
    }
}
