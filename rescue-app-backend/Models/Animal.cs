namespace rescue_app_backend.Models;

public class Animal
{
    public int id { get; set; }
    public string? animalType { get; set; }
    public string? name { get; set; }
    public string? breed { get; set; }
    public DateTime? dateOfBirth { get; set; }
    public string? gender { get; set; }
    public decimal? weight { get; set; }
    public string? story { get; set; }
    public string? adoptionStatus { get; set; }
    public string? imageUrl { get; set; }
    public DateTime dateAdded { get; set; }
    public DateTime dateUpdated { get; set; }
}