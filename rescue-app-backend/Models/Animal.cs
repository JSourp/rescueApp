namespace rescue_app_backend.Models;

public class Animal
{
    public int id { get; set; }
    public string? animaltype { get; set; }
    public string? name { get; set; }
    public string? breed { get; set; }
    public DateTime? dateofbirth { get; set; }
    public string? gender { get; set; }
    public decimal? weight { get; set; }
    public string? story { get; set; }
    public string? adoptionstatus { get; set; }
    public string? imageurl { get; set; }
    public DateTime dateadded { get; set; }
    public DateTime dateupdated { get; set; }
}