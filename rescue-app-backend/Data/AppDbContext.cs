using Microsoft.EntityFrameworkCore;
using rescue_app_backend.Models;

namespace rescue_app_backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Animal> Animals { get; set; }
    public DbSet<AdoptionHistory> AdoptionHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Animal>().ToTable("animals", schema: "public");
        modelBuilder.Entity<AdoptionHistory>().ToTable("adoptionhistory", schema: "public");
    }
}