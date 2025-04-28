using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace rescueApp.Models;

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
    public DateTime date_created { get; set; } // Renamed from date_added
    public DateTime date_updated { get; set; }
    public Guid? created_by_user_id { get; set; }
    public Guid? updated_by_user_id { get; set; }

    public virtual ICollection<AdoptionHistory>? AdoptionHistories { get; set; } // Animal has many histories

    [ForeignKey("created_by_user_id")]
    public virtual User? CreatedByUser { get; set; }

    [ForeignKey("updated_by_user_id")]
    public virtual User? UpdatedByUser { get; set; }

    public Animal()
    {
        AdoptionHistories = new HashSet<AdoptionHistory>();
    }
}
