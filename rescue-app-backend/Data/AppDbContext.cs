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

        modelBuilder.Entity<Animal>().ToTable("animals", schema: "public");

        // --- Configuration for Adopter Entity ---
        modelBuilder.Entity<Adopter>(entity =>
        {
            // Tell EF Core Configure the 'id' property to use the database's default identity generation
            entity.Property(e => e.Id)
              .UseIdentityByDefaultColumn(); // Tells EF Core this is SERIAL/IDENTITY

            // Tell EF Core DB generates 'date_created' on ADD using DEFAULT
            entity.Property(e => e.date_created)
                  .ValueGeneratedOnAdd() // Generated when entity is added
                  .HasDefaultValueSql("CURRENT_TIMESTAMP"); // Specify the SQL default

            // Tell EF Core DB generates 'date_updated' on ADD *OR* UPDATE (due to trigger)
            entity.Property(e => e.date_updated)
                  .ValueGeneratedOnAddOrUpdate(); // Generated when added OR updated

            // If table name needs quotes or is different from DbSet name
            entity.ToTable("adopters", schema: "public");

            // Optional: Configure UNIQUE constraint for email explicitly if needed
            //entity.HasIndex(e => e.adopter_email).IsUnique();
        });

        // --- Configuration for AdoptionHistory Entity ---
        modelBuilder.Entity<AdoptionHistory>(entity =>
        {
            // Assuming date_created has a similar DEFAULT in its table definition
            entity.Property(e => e.date_created)
                     .ValueGeneratedOnAdd()
                     .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Add configuration for FKs if needed, though conventions might handle it
            // entity.HasOne(d => d.Animal)
            //    .WithMany(p => p.AdoptionHistories) // Assumes ICollection in Animal model
            //    .HasForeignKey(d => d.animalId)
            //    .OnDelete(DeleteBehavior.ClientSetNull) // Example delete behavior
            //    .HasConstraintName("fk_adoptionhistory_animal");

            // entity.HasOne(d => d.Adopter) // Assumes Adopter property exists
            //    .WithMany(p => p.AdoptionHistories) // Assumes ICollection in Adopter model
            //    .HasForeignKey(d => d.adopter_id)
            //    .OnDelete(DeleteBehavior.ClientSetNull)
            //    .HasConstraintName("fk_adoptionhistory_adopter");

            // Optional: If table name needs quotes or is different from DbSet name
            entity.ToTable("adoptionhistory", schema: "public");
        });

        // --- Configuration for User Entity ---
        modelBuilder.Entity<User>(entity =>
            {
                // Example: Ensure email is unique in the model config too
                entity.HasIndex(e => e.email).IsUnique();
                // Example: If table name is different from DbSet name
                entity.ToTable("users", schema: "public");

                // Configure relationship if needed (though conventions might handle it)
                //entity.HasMany(u => u.CreatedAdoptionHistories) // User has many histories...
                //        .WithOne(ah => ah.CreatedByUser) // ...each history created by one user
                //        .HasForeignKey(ah => ah.created_by_user_id) // Foreign key in AdoptionHistory
                //        .IsRequired(false) // Make FK optional if created_by_user_id is nullable
                //        .OnDelete(DeleteBehavior.SetNull); // Example: Set FK to null if user is deleted

                // Configure DB generated properties if not done previously
                //entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
                //entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate(); // If trigger exists
            });

        // Add configurations for other entities if needed
    }
}
