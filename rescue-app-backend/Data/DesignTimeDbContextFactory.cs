using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace rescueApp.Data
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            // --- ADD LOGGING ---
            Console.WriteLine($"---> DesignTimeDbContextFactory: CreateDbContext executing.");
            string basePath = Directory.GetCurrentDirectory();
            Console.WriteLine($"---> DesignTimeDbContextFactory: Base Path = {basePath}");
            string settingsPath = Path.Combine(basePath, "local.settings.json");
            Console.WriteLine($"---> DesignTimeDbContextFactory: Checking for settings at = {settingsPath}");
            bool settingsExists = File.Exists(settingsPath);
            Console.WriteLine($"---> DesignTimeDbContextFactory: local.settings.json exists = {settingsExists}");
            // --- END LOGGING ---

            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("local.settings.json", optional: !settingsExists, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();

            string? connectionString = configuration[$"Values:PostgreSQLConnection"]
                ?? configuration.GetConnectionString("PostgreSQLConnection");

            // --- ADD LOGGING ---
            Console.WriteLine($"---> DesignTimeDbContextFactory: Connection string retrieved (Is Null or Empty? {string.IsNullOrEmpty(connectionString)})");
            if (!string.IsNullOrEmpty(connectionString))
            {
                Console.WriteLine($"---> DesignTimeDbContextFactory: Conn String starts with 'Host='? {connectionString.Trim().StartsWith("Host=", StringComparison.OrdinalIgnoreCase)}");
            }
            // --- END LOGGING ---

            if (string.IsNullOrEmpty(connectionString))
            {
                // Include base path in error for easier debugging
                throw new InvalidOperationException(
                    "DesignTimeDbContextFactory: Could not find 'PostgreSQLConnection' in " +
                    "local.settings.json[Values] or ConnectionStrings section." +
                    $" Base path checked: {basePath}");
            }

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();

            Console.WriteLine("---> DesignTimeDbContextFactory: Returning configured AppDbContext instance."); // Add log before returning
            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
