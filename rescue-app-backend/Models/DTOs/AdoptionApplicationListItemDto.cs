namespace rescueApp.Models.DTOs
{
    public class AdoptionApplicationListItemDto
    {
        public int Id { get; set; }
        public DateTime SubmissionDate { get; set; }
        public string ApplicantName { get; set; } = string.Empty;
        public string PrimaryEmail { get; set; } = string.Empty;
        public string PrimaryPhone { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? ReviewedBy { get; set; }
        public string? WhichAnimal { get; set; }
        public DateTime? ReviewDate { get; set; }
    }
}
