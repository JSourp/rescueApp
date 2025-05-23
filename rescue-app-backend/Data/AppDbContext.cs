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
  public DbSet<FosterApplication> FosterApplications { get; set; }
  public DbSet<FosterProfile> FosterProfiles { get; set; }
  public DbSet<VolunteerApplication> VolunteerApplications { get; set; }
  public DbSet<PartnershipSponsorshipApplication> PartnershipSponsorshipApplications { get; set; }
  public DbSet<AdoptionApplication> AdoptionApplications { get; set; }

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {

    base.OnModelCreating(modelBuilder); // Call base method if overriding

    // --- Animal Configuration ---
    modelBuilder.Entity<Animal>(entity =>
{
  entity.ToTable("animals", schema: "public");
  entity.HasKey(e => e.Id);
  entity.Property(e => e.Id).UseIdentityByDefaultColumn();

  // --- Configure Timestamp Generation ---
  entity.Property(e => e.DateCreated).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
  entity.Property(e => e.DateUpdated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
  // --- End Timestamp Config ---

  // --- Configure User Audit FKs == ---
  entity.HasOne(a => a.CreatedByUser)
            .WithMany()
            .HasForeignKey(a => a.CreatedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

  entity.HasOne(a => a.UpdatedByUser)
            .WithMany()
            .HasForeignKey(a => a.UpdatedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
  // --- End User Audit FK Config ---

  // Relationship to AdoptionHistory
  entity.HasMany(a => a.AdoptionHistories)
            .WithOne(ah => ah.Animal)
            .HasForeignKey(ah => ah.AnimalId);

  // Relationship to AnimalImages
  entity.HasMany(a => a.AnimalImages) // Animal has many AnimalImages
          .WithOne(ai => ai.Animal) // AnimalImage relates to one Animal
          .HasForeignKey(ai => ai.AnimalId) // Foreign key in AnimalImage
          .OnDelete(DeleteBehavior.Cascade); // If Animal deleted, delete related images

  // Relationship to CurrentFoster
  entity.HasOne(a => a.CurrentFoster)
          .WithMany() // Assuming User doesn't have ICollection<AnimalsCurrentlyFostering>
          .HasForeignKey(a => a.CurrentFosterUserId)
          .IsRequired(false)
          .OnDelete(DeleteBehavior.SetNull);

});

    // --- Adopter Configuration ---
    modelBuilder.Entity<Adopter>(entity =>
{
  entity.ToTable("adopters", schema: "public"); // Ensure table name matches DB
  entity.HasKey(e => e.Id); // Explicitly define PK if needed (convention usually finds 'id')

  // --- Configure Timestamp Generation ---
  entity.Property(e => e.DateCreated).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
  entity.Property(e => e.DateUpdated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
  // --- End Timestamp Config ---

  entity.HasIndex(e => e.AdopterEmail).IsUnique();

  // Relationship back to AdoptionHistory (should be there)
  entity.HasMany(e => e.AdoptionHistories)
            .WithOne(ah => ah.Adopter)
            .HasForeignKey(ah => ah.AdopterId);

  // --- ADD Configurations for User Audit FKs ---
  entity.HasOne(ad => ad.CreatedByUser) // Navigation property in Adopter
            .WithMany() // Assuming User doesn't need a collection of Adopters they created
            .HasForeignKey(ad => ad.CreatedByUserId) // snake_case FK property in Adopter
            .IsRequired(false) // FK is nullable
            .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if creating user deleted

  entity.HasOne(ad => ad.UpdatedByUser) // Navigation property in Adopter
            .WithMany() // Assuming User doesn't need a collection of Adopters they updated
            .HasForeignKey(ad => ad.UpdatedByUserId) // snake_case FK property in Adopter
            .IsRequired(false) // FK is nullable
            .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if updating user deleted
  // --- END User Audit FK Config ---
});

    // --- User Configuration ---
    modelBuilder.Entity<User>(entity =>
    {
      entity.ToTable("users", schema: "public");
      entity.HasIndex(e => e.Email).IsUnique();

      // --- Configure Timestamp Generation ---
      entity.Property(e => e.DateCreated).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.DateUpdated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
      // --- End Timestamp Config ---

      entity.HasMany(e => e.CreatedAdoptionHistories)
                .WithOne(ah => ah.CreatedByUser)
                .HasForeignKey(ah => ah.CreatedByUserId)
                .IsRequired(false) // Since created_by_user_id is nullable Guid?
                .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if user deleted
    });

    // --- Configuration for AdoptionHistory Entity ---
    modelBuilder.Entity<AdoptionHistory>(entity =>
    {
      entity.ToTable("adoptionhistory", schema: "public");

      // --- Configure Timestamp Generation ---
      entity.Property(e => e.DateCreated).ValueGeneratedOnAdd().HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.DateUpdated).ValueGeneratedOnAddOrUpdate().HasDefaultValueSql("CURRENT_TIMESTAMP");
      // --- End Timestamp Config ---

      // Explicit FK configurations (recommended)
      entity.HasOne(ah => ah.Animal)
                .WithMany(a => a.AdoptionHistories)
                .HasForeignKey(ah => ah.AnimalId);

      entity.HasOne(ah => ah.Adopter)
                .WithMany(ad => ad.AdoptionHistories)
                .HasForeignKey(ah => ah.AdopterId);

      entity.HasOne(ah => ah.CreatedByUser)
                .WithMany(u => u.CreatedAdoptionHistories) // Assumes ICollection name on User model
                .HasForeignKey(ah => ah.CreatedByUserId)
                .IsRequired(false) // Since Guid? is nullable
                .OnDelete(DeleteBehavior.SetNull); // Example delete behavior

      // --- Optional: Configure relationship for updated_by_user_id ---
      // If want to add the UpdatedByUser navigation property to AdoptionHistory model:
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
      entity.HasKey(e => e.Id); // Define PK

      // Configure ID generation (if using SERIAL)
      entity.Property(e => e.Id).UseIdentityByDefaultColumn();

      // Configure date_uploaded generation (DB handles default)
      entity.Property(e => e.DateUploaded)
                    .ValueGeneratedOnAdd()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

      // Configure unique constraint on blob_name if desired via Fluent API
      entity.HasIndex(e => e.BlobName).IsUnique();

      // Configure relationships
      entity.HasOne(d => d.Animal) // Navigation property in AnimalDocument
                    .WithMany(a => a.AnimalDocuments) // Requires ICollection<AnimalDocument> in Animal model
                    .HasForeignKey(d => d.AnimalId) // The FK property in AnimalDocument
                    .OnDelete(DeleteBehavior.Cascade); // Example: Delete docs if animal is deleted

      entity.HasOne(d => d.UploadedByUser) // Navigation property in AnimalDocument
                    .WithMany() // Assuming User doesn't need ICollection<DocumentsUploaded>
                    .HasForeignKey(d => d.UploadedByUserId) // The FK property
                    .IsRequired(false) // FK is nullable
                    .OnDelete(DeleteBehavior.SetNull); // Example: Set FK null if user deleted
    });

    // --- ADD Configuration for AnimalImage ---
    modelBuilder.Entity<AnimalImage>(entity =>
    {
      entity.ToTable("animal_images", schema: "public"); // Map to table
      entity.HasKey(e => e.Id); // Define PK

      // Configure ID generation
      entity.Property(e => e.Id).UseIdentityByDefaultColumn();

      // Configure date_uploaded generation
      entity.Property(e => e.DateUploaded)
                    .ValueGeneratedOnAdd()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

      // Configure unique constraint on blob_name
      entity.HasIndex(e => e.BlobName).IsUnique();

      // Configure is_primary default (optional, DB default is preferred)
      entity.Property(e => e.IsPrimary).HasDefaultValue(false);
      // Configure display_order default (optional, DB default is preferred)
      entity.Property(e => e.DisplayOrder).HasDefaultValue(0);

      // Configure relationships (already defined from Animal/User side, but good practice)
      entity.HasOne(d => d.Animal) // Defined in Animal entity already
                    .WithMany(p => p.AnimalImages)
                    .HasForeignKey(d => d.AnimalId);

      entity.HasOne(d => d.UploadedByUser)
                    .WithMany() // User doesn't need ICollection<AnimalImage>
                    .HasForeignKey(d => d.UploadedByUserId)
                    .IsRequired(false) // FK is nullable
                    .OnDelete(DeleteBehavior.SetNull); // Set null if user deleted
    });

    modelBuilder.Entity<FosterApplication>(entity =>
        {
          entity.ToTable("foster_applications", schema: "public");
          entity.HasKey(e => e.Id);
          entity.Property(e => e.Id).UseIdentityByDefaultColumn();
          entity.Property(e => e.SubmissionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
          entity.Property(e => e.Status).HasDefaultValue("Pending Review");

          entity.HasOne(e => e.ReviewedByUser)
                .WithMany() // Assuming User doesn't have direct collection of applications reviewed
                .HasForeignKey(e => e.ReviewedByUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

    modelBuilder.Entity<FosterProfile>(entity =>
    {
      entity.ToTable("foster_profiles", schema: "public");
      entity.HasKey(e => e.Id);
      entity.Property(e => e.Id).UseIdentityByDefaultColumn();

      entity.HasIndex(e => e.UserId).IsUnique(); // Ensure UserId is unique

      entity.Property(e => e.ApprovalDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.IsActiveFoster).HasDefaultValue(true);
      entity.Property(e => e.DateCreated).HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.DateUpdated).ValueGeneratedOnAddOrUpdate(); // For DB trigger

      entity.HasOne(e => e.User)
                .WithOne() // Assuming a User has at most one FosterProfile
                .HasForeignKey<FosterProfile>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(e => e.FosterApplication)
                .WithOne() // One application results in one profile
                .HasForeignKey<FosterProfile>(e => e.FosterApplicationId)
                .IsRequired(false) // Application link is optional
                .OnDelete(DeleteBehavior.SetNull);
    });

    modelBuilder.Entity<VolunteerApplication>(entity =>
    {
      entity.ToTable("volunteer_applications", schema: "public");
      entity.HasKey(e => e.Id);
      entity.Property(e => e.Id).UseIdentityByDefaultColumn();
      entity.Property(e => e.SubmissionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.Status).HasDefaultValue("Pending Review");
      entity.Property(e => e.LocationAcknowledgement).HasDefaultValue(false);
      entity.Property(e => e.PolicyAcknowledgement).HasDefaultValue(false);
      entity.Property(e => e.WaiverAgreed).HasDefaultValue(false);

      entity.HasOne(e => e.ReviewedByUser)
            .WithMany()
            .HasForeignKey(e => e.ReviewedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    });

    modelBuilder.Entity<PartnershipSponsorshipApplication>(entity =>
    {
      entity.ToTable("partnership_sponsorship_applications", schema: "public");
      entity.HasKey(e => e.Id);
      entity.Property(e => e.Id).UseIdentityByDefaultColumn();

      entity.Property(e => e.SubmissionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.Status).HasDefaultValue("Pending Review");

      entity.HasOne(e => e.ReviewedByUser)
            .WithMany() // Assuming User doesn't have a direct collection of these
            .HasForeignKey(e => e.ReviewedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    });

    modelBuilder.Entity<AdoptionApplication>(entity =>
    {
      entity.ToTable("adoption_applications", schema: "public");
      entity.HasKey(e => e.Id);
      entity.Property(e => e.Id).UseIdentityByDefaultColumn();

      entity.Property(e => e.SubmissionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
      entity.Property(e => e.Status).HasDefaultValue("Pending Review");
      entity.Property(e => e.WaiverAgreed).HasDefaultValue(false);

      entity.HasOne(e => e.Animal) // Navigation property in AdoptionApplication
            .WithMany() // Assuming Animal doesn't have a direct collection of AdoptionApplications
            .HasForeignKey(e => e.AnimalId)
            .IsRequired(false) // AnimalId is nullable
            .OnDelete(DeleteBehavior.SetNull); // If animal is deleted, keep application but nullify link

      entity.HasOne(e => e.ReviewedByUser)
            .WithMany() // Assuming User doesn't have direct collection of applications reviewed
            .HasForeignKey(e => e.ReviewedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    });
  }
}
