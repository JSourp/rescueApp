namespace rescue_app_backend.Models;

public class AdoptionHistory
{
    public int id { get; set; }
    public int animalid { get; set; }
    public DateTime adoptiondate { get; set; }
    public DateTime? returndate { get; set; }
    public string? notes { get; set; }
}