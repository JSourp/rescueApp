using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace rescueApp.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "adopters",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    adopter_first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    adopter_last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    adopter_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    adopter_primary_phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    adopter_primary_phone_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    adopter_secondary_phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    adopter_secondary_phone_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    adopter_street_address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    adopter_apt_unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    adopter_city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    adopter_state_province = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    adopter_zip_postal_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    spouse_partner_roommate = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    date_created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_adopters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "animals",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animal_type = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    breed = table.Column<string>(type: "text", nullable: true),
                    date_of_birth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    gender = table.Column<string>(type: "text", nullable: true),
                    weight = table.Column<decimal>(type: "numeric", nullable: true),
                    story = table.Column<string>(type: "text", nullable: true),
                    adoption_status = table.Column<string>(type: "text", nullable: true),
                    image_url = table.Column<string>(type: "text", nullable: true),
                    date_added = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_animals", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_provider_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    date_created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_login_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "adoptionhistory",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animalId = table.Column<int>(type: "integer", nullable: false),
                    adopter_id = table.Column<int>(type: "integer", nullable: false),
                    adoption_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    return_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    date_created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    AdopterId = table.Column<int>(type: "integer", nullable: true),
                    CreatedByUserid = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_adoptionhistory", x => x.id);
                    table.ForeignKey(
                        name: "FK_adoptionhistory_adopters_AdopterId",
                        column: x => x.AdopterId,
                        principalSchema: "public",
                        principalTable: "adopters",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_adoptionhistory_animals_Animalid",
                        column: x => x.Animalid,
                        principalSchema: "public",
                        principalTable: "animals",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_adoptionhistory_users_CreatedByUserid",
                        column: x => x.CreatedByUserid,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_adoptionhistory_AdopterId",
                schema: "public",
                table: "adoptionhistory",
                column: "AdopterId");

            migrationBuilder.CreateIndex(
                name: "IX_adoptionhistory_Animalid",
                schema: "public",
                table: "adoptionhistory",
                column: "Animalid");

            migrationBuilder.CreateIndex(
                name: "IX_adoptionhistory_CreatedByUserid",
                schema: "public",
                table: "adoptionhistory",
                column: "CreatedByUserid");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                schema: "public",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "adoptionhistory",
                schema: "public");

            migrationBuilder.DropTable(
                name: "adopters",
                schema: "public");

            migrationBuilder.DropTable(
                name: "animals",
                schema: "public");

            migrationBuilder.DropTable(
                name: "users",
                schema: "public");
        }
    }
}
