namespace rescue_app_backend.Models;

public class Animal
{
    public int id { get; set; }
    public string? animal_type { get; set; }
    public string? name { get; set; }
    public string? breed { get; set; }
    public DateTime? date_of_birth { get; set; }
    public string? gender { get; set; }
    public decimal? weight { get; set; }
    public string? story { get; set; }
    public string? adoption_status { get; set; }
    public string? image_url { get; set; }
    public DateTime date_added { get; set; }
    public DateTime date_updated { get; set; }
}