using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models
{
	public class FosterApplication
	{
		[Key]
		public int Id { get; set; }
		public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
		[Required]
		[MaxLength(50)]
		public string Status { get; set; } = "Pending Review";

		// Applicant Information
		[Required][MaxLength(100)] public string FirstName { get; set; } = string.Empty;
		[Required][MaxLength(100)] public string LastName { get; set; } = string.Empty;
		[MaxLength(255)] public string? SpousePartnerRoommate { get; set; }
		[Required][MaxLength(255)] public string StreetAddress { get; set; } = string.Empty;
		[MaxLength(50)] public string? AptUnit { get; set; }
		[Required][MaxLength(100)] public string City { get; set; } = string.Empty;
		[Required][MaxLength(100)] public string StateProvince { get; set; } = string.Empty;
		[Required][MaxLength(20)] public string ZipPostalCode { get; set; } = string.Empty;
		[Required][MaxLength(30)] public string PrimaryPhone { get; set; } = string.Empty;
		[Required][MaxLength(10)] public string PrimaryPhoneType { get; set; } = string.Empty;
		[MaxLength(30)] public string? SecondaryPhone { get; set; }
		[MaxLength(10)] public string? SecondaryPhoneType { get; set; }
		[Required][MaxLength(255)][EmailAddress] public string PrimaryEmail { get; set; } = string.Empty;
		[MaxLength(255)] public string? SecondaryEmail { get; set; }
		public string? HowHeard { get; set; }

		// Household & Home Environment
		[Required][MaxLength(255)] public string AdultsInHome { get; set; } = string.Empty;
		public string? ChildrenInHome { get; set; }
		[MaxLength(10)] public string? HasAllergies { get; set; }
		[Required][MaxLength(10)] public string HouseholdAwareFoster { get; set; } = string.Empty;
		[Required][MaxLength(50)] public string DwellingType { get; set; } = string.Empty;
		[Required][MaxLength(10)] public string RentOrOwn { get; set; } = string.Empty;
		public bool? LandlordPermission { get; set; }
		[MaxLength(50)] public string? YardType { get; set; }
		[Required] public string SeparationPlan { get; set; } = string.Empty;

		// Current Pet Information
		[Required][MaxLength(10)] public string HasCurrentPets { get; set; } = string.Empty;
		public string? CurrentPetsDetails { get; set; }
		[MaxLength(10)] public string? CurrentPetsSpayedNeutered { get; set; }
		[MaxLength(10)] public string? CurrentPetsVaccinations { get; set; }
		[MaxLength(255)] public string? VetClinicName { get; set; }
		[MaxLength(30)] public string? VetPhone { get; set; }

		// Foster Experience & Preferences
		[Required][MaxLength(10)] public string HasFosteredBefore { get; set; } = string.Empty;
		public string? PreviousFosterDetails { get; set; }
		[Required] public string WhyFoster { get; set; } = string.Empty;
		public string? FosterAnimalTypes { get; set; } // Storing as comma-separated string, map from string[] on frontend
		[Required][MaxLength(10)] public string WillingMedical { get; set; } = string.Empty;
		[Required][MaxLength(10)] public string WillingBehavioral { get; set; } = string.Empty;
		[Required][MaxLength(50)] public string CommitmentLength { get; set; } = string.Empty;
		[Required][MaxLength(10)] public string CanTransport { get; set; } = string.Empty;
		public string? TransportExplanation { get; set; }
		public string? PreviousPetsDetails { get; set; }

		// Foster Waver
		[Required] // Should always have a value, even if false initially
		public bool WaiverAgreed { get; set; } = false;
		[MaxLength(255)]
		public string? ESignatureName { get; set; } // Name typed as signature
		public DateTime? WaiverAgreementTimestamp { get; set; } // When they agreed

		// Admin Review Fields
		public Guid? ReviewedByUserId { get; set; }
		public DateTime? ReviewDate { get; set; }
		public string? InternalNotes { get; set; }

		// Navigation for reviewer
		[ForeignKey("ReviewedByUserId")]
		public virtual User? ReviewedByUser { get; set; }
	}
}
