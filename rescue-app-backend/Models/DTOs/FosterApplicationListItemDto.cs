using System;

namespace rescueApp.Models.DTOs
{
    public class FosterApplicationListItemDto
    {
        public int Id { get; set; }
        public DateTime SubmissionDate { get; set; }
        public string ApplicantName { get; set; } = string.Empty; // Combined First + Last
        public string PrimaryEmail { get; set; } = string.Empty;
        public string PrimaryPhone { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ReviewedBy { get; set; } // Name or email of reviewer
        public DateTime? ReviewDate { get; set; }
    }
}
