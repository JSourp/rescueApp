    using System.ComponentModel.DataAnnotations;

    namespace rescueApp.Models.Requests
    {
        public class CreatePartnershipSponsorshipRequest
        {
        // Contact Information
        [Required][MaxLength(100)] public string? FirstName { get; set; }
            [Required][MaxLength(100)] public string? LastName { get; set; }
            [MaxLength(255)] public string? OrganizationName { get; set; }
            [MaxLength(100)] public string? ContactTitle { get; set; }
            [MaxLength(255)] public string? StreetAddress { get; set; }
            [MaxLength(50)] public string? AptUnit { get; set; }
            [MaxLength(100)] public string? City { get; set; }
            [MaxLength(100)] public string? StateProvince { get; set; }
            [MaxLength(20)] public string? ZipPostalCode { get; set; }
            [Required][MaxLength(30)] public string? PrimaryPhone { get; set; }
            [Required][MaxLength(10)] public string? PrimaryPhoneType { get; set; }
            [MaxLength(30)] public string? SecondaryPhone { get; set; }
            [MaxLength(10)] public string? SecondaryPhoneType { get; set; }
            [Required][MaxLength(255)][EmailAddress] public string? PrimaryEmail { get; set; }
            [MaxLength(255)] public string? SecondaryEmail { get; set; }
            [MaxLength(255)] public string? WebsiteUrl { get; set; }
            public string? HowHeard { get; set; }

            // Partnership/Sponsorship Specific
            [MaxLength(100)] public string? InterestType { get; set; }
            public string? DetailsOfInterest { get; set; }
        }
    }
