using Microsoft.EntityFrameworkCore;
using rescueApp.Models;
namespace rescueApp.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Animal> Animals { get; set; }
    public DbSet<Adopter> Adopters { get; set; }
    public DbSet<AdoptionHistory> AdoptionHistories { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

        base.OnModelCreating(modelBuilder); // Call base method if overriding

        // --- Animal Configuration ---
        modelBuilder.Entity<Animal>(entity =>
        {
            entity.ToTable("animals", schema: "public");
            entity.Property(e => e.id).UseIdentityByDefaultColumn();
            // Add relationship back to AdoptionHistory (optional but good practice)
            entity.HasMany(e => e.AdoptionHistories)
                  .WithOne(ah => ah.Animal)
                  .HasForeignKey(ah => ah.animal_id);
        });

        // --- Adopter Configuration ---
        modelBuilder.Entity<Adopter>(entity =>
        {
            entity.ToTable("adopters", schema: "public");
        entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate(); // Requires Trigger
        entity.HasIndex(e => e.adopter_email).IsUnique(); // Ensure unique email index is configured
                                                          // Add relationship back to AdoptionHistory (optional but good practice)
        entity.HasMany(e => e.AdoptionHistories)
              .WithOne(ah => ah.Adopter)
              .HasForeignKey(ah => ah.adopter_id);
    });

        // --- User Configuration ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users", schema: "public");
            entity.HasIndex(e => e.email).IsUnique();
            entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate(); // Requires Trigger
                                                                                // Add relationship back to AdoptionHistory (optional but good practice)
            entity.HasMany(e => e.CreatedAdoptionHistories)
                  .WithOne(ah => ah.CreatedByUser)
                  .HasForeignKey(ah => ah.created_by_user_id)
                  .IsRequired(false) // Since created_by_user_id is nullable Guid?
                  .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if user deleted
        });

        // --- AdoptionHistory Configuration (Most Important Part for the Fix) ---
        modelBuilder.Entity<AdoptionHistory>(entity =>
        {
            entity.ToTable("adoptionhistory", schema: "public"); // Use lowercase table name
        entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");

        // -- Explicitly define relationships using the correct snake_case FKs --
        entity.HasOne(ah => ah.Animal) // Navigation property in AdoptionHistory
              .WithMany(a => a.AdoptionHistories) // Inverse navigation property in Animal
              .HasForeignKey(ah => ah.animal_id); // The ACTUAL foreign key property in AdoptionHistory

        entity.HasOne(ah => ah.Adopter) // Navigation property in AdoptionHistory
              .WithMany(ad => ad.AdoptionHistories) // Inverse navigation property in Adopter
              .HasForeignKey(ah => ah.adopter_id); // The ACTUAL foreign key property

        entity.HasOne(ah => ah.CreatedByUser) // Navigation property in AdoptionHistory
              .WithMany(u => u.CreatedAdoptionHistories) // Inverse navigation property in User
              .HasForeignKey(ah => ah.created_by_user_id); // The ACTUAL foreign key property
                                                           // Add .IsRequired(false) / .OnDelete here if needed, matching User config
    });

        // Add configurations for other entities if needed
    }
}
