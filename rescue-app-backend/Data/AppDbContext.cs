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
  public DbSet<AnimalDocument> AnimalDocuments { get; set; }
  public DbSet<AnimalImage> AnimalImages { get; set; }

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {

    base.OnModelCreating(modelBuilder); // Call base method if overriding

    // --- Animal Configuration ---
    modelBuilder.Entity<Animal>(entity =>
{
  entity.ToTable("animals", schema: "public");
  entity.HasKey(e => e.id);
  entity.Property(e => e.id).UseIdentityByDefaultColumn();

  // --- Configure Timestamp Generation ---
  entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
  entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
  // --- End Timestamp Config ---

  // --- Configure User Audit FKs == ---
  entity.HasOne(a => a.CreatedByUser)
            .WithMany()
            .HasForeignKey(a => a.created_by_user_id)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

  entity.HasOne(a => a.UpdatedByUser)
            .WithMany()
            .HasForeignKey(a => a.updated_by_user_id)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
  // --- End User Audit FK Config ---

  // Relationship to AdoptionHistory
  entity.HasMany(a => a.AdoptionHistories)
            .WithOne(ah => ah.Animal)
            .HasForeignKey(ah => ah.animal_id);

  // Relationship to AnimalImages
  entity.HasMany(a => a.AnimalImages) // Animal has many AnimalImages
          .WithOne(ai => ai.Animal) // AnimalImage relates to one Animal
          .HasForeignKey(ai => ai.animal_id) // Foreign key in AnimalImage
          .OnDelete(DeleteBehavior.Cascade); // If Animal deleted, delete related images

});

    // --- Adopter Configuration ---
    modelBuilder.Entity<Adopter>(entity =>
{
  entity.ToTable("adopters", schema: "public"); // Ensure table name matches DB
  entity.HasKey(e => e.id); // Explicitly define PK if needed (convention usually finds 'id')

  // --- Configure Timestamp Generation ---
  entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
  entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
  // --- End Timestamp Config ---

  entity.HasIndex(e => e.adopter_email).IsUnique();

  // Relationship back to AdoptionHistory (should be there)
  entity.HasMany(e => e.AdoptionHistories)
            .WithOne(ah => ah.Adopter)
            .HasForeignKey(ah => ah.adopter_id);

  // --- ADD Configurations for User Audit FKs ---
  entity.HasOne(ad => ad.CreatedByUser) // Navigation property in Adopter
            .WithMany() // Assuming User doesn't need a collection of Adopters they created
            .HasForeignKey(ad => ad.created_by_user_id) // snake_case FK property in Adopter
            .IsRequired(false) // FK is nullable
            .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if creating user deleted

  entity.HasOne(ad => ad.UpdatedByUser) // Navigation property in Adopter
            .WithMany() // Assuming User doesn't need a collection of Adopters they updated
            .HasForeignKey(ad => ad.updated_by_user_id) // snake_case FK property in Adopter
            .IsRequired(false) // FK is nullable
            .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if updating user deleted
                                               // --- END User Audit FK Config ---
});

    // --- User Configuration ---
    modelBuilder.Entity<User>(entity =>
    {
      entity.ToTable("users", schema: "public");
      entity.HasIndex(e => e.email).IsUnique();

      // --- Configure Timestamp Generation ---
      entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
      // --- End Timestamp Config ---

      entity.HasMany(e => e.CreatedAdoptionHistories)
                .WithOne(ah => ah.CreatedByUser)
                .HasForeignKey(ah => ah.created_by_user_id)
                .IsRequired(false) // Since created_by_user_id is nullable Guid?
                .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if user deleted
    });

    // --- Configuration for AdoptionHistory Entity ---
    modelBuilder.Entity<AdoptionHistory>(entity =>
    {
      entity.ToTable("adoptionhistory", schema: "public");

      // --- Configure Timestamp Generation ---
      entity.Property(e => e.date_created).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.date_updated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
      // --- End Timestamp Config ---

      // Explicit FK configurations (recommended)
      entity.HasOne(ah => ah.Animal)
                .WithMany(a => a.AdoptionHistories)
                .HasForeignKey(ah => ah.animal_id);

      entity.HasOne(ah => ah.Adopter)
                .WithMany(ad => ad.AdoptionHistories)
                .HasForeignKey(ah => ah.adopter_id);

      entity.HasOne(ah => ah.CreatedByUser)
                .WithMany(u => u.CreatedAdoptionHistories) // Assumes ICollection name on User model
                .HasForeignKey(ah => ah.created_by_user_id)
                .IsRequired(false) // Since Guid? is nullable
                .OnDelete(DeleteBehavior.SetNull); // Example delete behavior

      // --- Optional: Configure relationship for updated_by_user_id ---
      // If you add the UpdatedByUser navigation property to AdoptionHistory model:
      // entity.HasOne(ah => ah.UpdatedByUser)
      //       .WithMany() // Assuming User doesn't need collection of records they updated
      //       .HasForeignKey(ah => ah.updated_by_user_id)
      //       .IsRequired(false)
      //       .OnDelete(DeleteBehavior.SetNull);
      // --- End Optional Config ---
    });

    // Configuration for AnimalDocument
    modelBuilder.Entity<AnimalDocument>(entity =>
    {
      entity.ToTable("animal_documents", schema: "public"); // Map to table
      entity.HasKey(e => e.id); // Define PK

      // Configure ID generation (if using SERIAL)
      entity.Property(e => e.id).UseIdentityByDefaultColumn();

      // Configure date_uploaded generation (DB handles default)
      entity.Property(e => e.date_uploaded)
                    .ValueGeneratedOnAdd()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

      // Configure unique constraint on blob_name if desired via Fluent API
      entity.HasIndex(e => e.blob_name).IsUnique();

      // Configure relationships
      entity.HasOne(d => d.Animal) // Navigation property in AnimalDocument
                    .WithMany(a => a.AnimalDocuments) // Requires ICollection<AnimalDocument> in Animal model
                    .HasForeignKey(d => d.animal_id) // The FK property in AnimalDocument
                    .OnDelete(DeleteBehavior.Cascade); // Example: Delete docs if animal is deleted

      entity.HasOne(d => d.UploadedByUser) // Navigation property in AnimalDocument
                    .WithMany() // Assuming User doesn't need ICollection<DocumentsUploaded>
                    .HasForeignKey(d => d.uploaded_by_user_id) // The FK property
                    .IsRequired(false) // FK is nullable
                    .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if user deleted
    });

    // --- ADD Configuration for AnimalImage ---
    modelBuilder.Entity<AnimalImage>(entity =>
    {
      entity.ToTable("animal_images", schema: "public"); // Map to table
      entity.HasKey(e => e.id); // Define PK

      // Configure ID generation
      entity.Property(e => e.id).UseIdentityByDefaultColumn();

      // Configure date_uploaded generation
      entity.Property(e => e.date_uploaded)
                    .ValueGeneratedOnAdd()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

      // Configure unique constraint on blob_name
      entity.HasIndex(e => e.blob_name).IsUnique();

      // Configure is_primary default (optional, DB default is preferred)
      entity.Property(e => e.is_primary).HasDefaultValue(false);
      // Configure display_order default (optional, DB default is preferred)
      entity.Property(e => e.display_order).HasDefaultValue(0);


      // Configure relationships (already defined from Animal/User side, but good practice)
      entity.HasOne(d => d.Animal) // Defined in Animal entity already
                    .WithMany(p => p.AnimalImages)
                    .HasForeignKey(d => d.animal_id);

      entity.HasOne(d => d.UploadedByUser)
                    .WithMany() // User doesn't need ICollection<AnimalImage>
                    .HasForeignKey(d => d.uploaded_by_user_id)
                    .IsRequired(false) // FK is nullable
                    .OnDelete(DeleteBehavior.SetNull); // Set null if user deleted
    });


    // Add configurations for other entities if needed
  }
}
