namespace rescueApp.Models.DTOs
{
    public class AnimalImageDto
    {
        public int Id { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public bool IsPrimary { get; set; }
        public int DisplayOrder { get; set; }
        public DateTime DateUploaded { get; set; }
    }

    public class AnimalDetailDto
    {
        public int Id { get; set; }
        public string? AnimalType { get; set; }
        public string? Name { get; set; }
        public string? Breed { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public decimal? Weight { get; set; }
        public string? Story { get; set; }
        public string? AdoptionStatus { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime DateUpdated { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
        public string? PrimaryImageUrl { get; set; }
        public List<AnimalImageDto> AnimalImages { get; set; } = new List<AnimalImageDto>();
        public Guid? CurrentFosterUserId { get; set; }
        public string? CurrentFosterName { get; set; }
    }
}
