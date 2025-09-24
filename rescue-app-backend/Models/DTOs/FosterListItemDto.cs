using System;

namespace rescueApp.Models.DTOs
{
    public class FosterListItemDto
    {
        public Guid UserId { get; set; } // The User's ID (from users table)
        public int FosterProfileId { get; set; } // The FosterProfile's own ID
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PrimaryPhone { get; set; } // From User or FosterApplication data initially
        public DateTime ApprovalDate { get; set; }
        public bool IsActiveFoster { get; set; }
        public string? AvailabilityNotes { get; set; }
        public int CurrentFosterCount { get; set; } // Number of animals currently fostered
    }
}
