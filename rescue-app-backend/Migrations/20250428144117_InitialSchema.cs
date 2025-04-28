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
                    date_created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    last_login_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "adopters",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
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
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_adopters", x => x.id);
                    table.ForeignKey(
                        name: "FK_adopters_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_adopters_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
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
                    date_created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_animals", x => x.id);
                    table.ForeignKey(
                        name: "FK_animals_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_animals_users_updated_by_user_id",
                        column: x => x.updated_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "adoptionhistory",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animal_id = table.Column<int>(type: "integer", nullable: false),
                    adopter_id = table.Column<int>(type: "integer", nullable: false),
                    adoption_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    return_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    date_created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    date_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_adoptionhistory", x => x.id);
                    table.ForeignKey(
                        name: "FK_adoptionhistory_adopters_adopter_id",
                        column: x => x.adopter_id,
                        principalSchema: "public",
                        principalTable: "adopters",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_adoptionhistory_animals_animal_id",
                        column: x => x.animal_id,
                        principalSchema: "public",
                        principalTable: "animals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_adoptionhistory_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_adopters_adopter_email",
                schema: "public",
                table: "adopters",
                column: "adopter_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_adopters_created_by_user_id",
                schema: "public",
                table: "adopters",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_adopters_updated_by_user_id",
                schema: "public",
                table: "adopters",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_adoptionhistory_adopter_id",
                schema: "public",
                table: "adoptionhistory",
                column: "adopter_id");

            migrationBuilder.CreateIndex(
                name: "IX_adoptionhistory_animal_id",
                schema: "public",
                table: "adoptionhistory",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_adoptionhistory_created_by_user_id",
                schema: "public",
                table: "adoptionhistory",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_animals_created_by_user_id",
                schema: "public",
                table: "animals",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_animals_updated_by_user_id",
                schema: "public",
                table: "animals",
                column: "updated_by_user_id");

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
