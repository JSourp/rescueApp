    using System;
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;

    namespace rescueApp.Models
    {
        public class PartnershipSponsorshipApplication
        {
            [Key]
            public int Id { get; set; }
            public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
            [Required]
            [MaxLength(50)]
            public string Status { get; set; } = "Pending Review";

            // Contact Information
            [Required][MaxLength(100)] public string FirstName { get; set; } = string.Empty;
            [Required][MaxLength(100)] public string LastName { get; set; } = string.Empty;
            [MaxLength(255)] public string? OrganizationName { get; set; }
            [MaxLength(100)] public string? ContactTitle { get; set; }
            [MaxLength(255)] public string? StreetAddress { get; set; } = string.Empty;
            [MaxLength(50)] public string? AptUnit { get; set; }
            [MaxLength(100)] public string? City { get; set; } = string.Empty;
            [MaxLength(100)] public string? StateProvince { get; set; } = string.Empty;
            [MaxLength(20)] public string? ZipPostalCode { get; set; } = string.Empty;
            [Required][MaxLength(30)] public string PrimaryPhone { get; set; } = string.Empty;
            [Required][MaxLength(10)] public string PrimaryPhoneType { get; set; } = string.Empty;
            [MaxLength(30)] public string? SecondaryPhone { get; set; }
            [MaxLength(10)] public string? SecondaryPhoneType { get; set; }
            [Required][MaxLength(255)][EmailAddress] public string PrimaryEmail { get; set; } = string.Empty;
            [MaxLength(255)] public string? SecondaryEmail { get; set; }
            [MaxLength(255)] public string? WebsiteUrl { get; set; }
            public string? HowHeard { get; set; }

            // Partnership/Sponsorship Specific
            [MaxLength(100)] public string? InterestType { get; set; }
            public string? DetailsOfInterest { get; set; }

            // Admin Review Fields
            public Guid? ReviewedByUserId { get; set; }
            public DateTime? ReviewDate { get; set; }
            public string? InternalNotes { get; set; }

            [ForeignKey("ReviewedByUserId")]
            public virtual User? ReviewedByUser { get; set; }
        }
    }
