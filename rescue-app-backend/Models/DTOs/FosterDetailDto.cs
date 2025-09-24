using System;
using System.Collections.Generic;

namespace rescueApp.Models.DTOs
{
    // A simple DTO for animals fostered by this person
    public class FosteredAnimalDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? AnimalType { get; set; }
        public string? AdoptionStatus { get; set; } // To see if it's "In Foster"
    }

    public class FosterDetailDto
    {
        // From User table
        public Guid UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PrimaryPhone { get; set; } // Assuming this is on User model now
        public bool IsUserActive { get; set; }
        public string UserRole { get; set; } = string.Empty; // Should be "Foster"

        // From FosterProfile table
        public int FosterProfileId { get; set; }
        public DateTime ApprovalDate { get; set; }
        public bool IsActiveFoster { get; set; }
        public string? AvailabilityNotes { get; set; }
        public string? CapacityDetails { get; set; }
        public DateTime? HomeVisitDate { get; set; }
        public string? HomeVisitNotes { get; set; }
        public DateTime ProfileDateCreated { get; set; }
        public DateTime ProfileDateUpdated { get; set; }

        // From linked FosterApplication
        public int? FosterApplicationId { get; set; }
        public string? ApplicantStreetAddress { get; set; }
        public string? ApplicantCity { get; set; }

        // List of animals currently fostered
        public List<FosteredAnimalDto> CurrentlyFostering { get; set; } = new List<FosteredAnimalDto>();
    }
}
