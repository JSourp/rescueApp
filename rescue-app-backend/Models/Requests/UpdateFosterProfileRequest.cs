using System;
using System.ComponentModel.DataAnnotations;

namespace rescueApp.Models.Requests
{
    public class UpdateFosterProfileRequest
    {
        // Fields from User model (all optional for update)
        [MaxLength(100)]
        public string? FirstName { get; set; }
        [MaxLength(100)]
        public string? LastName { get; set; }
        public bool? IsUserActive { get; set; }

        // Fields from FosterProfile model (all optional for update)
        [MaxLength(30)]
        public string? PrimaryPhone { get; set; }
        public string? PrimaryPhoneType { get; set; }
        public string? PrimaryEmail { get; set; } // Note: Email is typically not changed here, or handled via Auth0 profile updates
        public bool? IsActiveFoster { get; set; }
        public string? AvailabilityNotes { get; set; }
        public string? CapacityDetails { get; set; }
        public DateTime? HomeVisitDate { get; set; }
        public string? HomeVisitNotes { get; set; }
    }
}
