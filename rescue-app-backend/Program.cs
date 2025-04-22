using System; // Make sure System is imported for Environment/Console
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using rescueApp.Data; // Assuming namespace is now rescueApp.Data

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        Console.WriteLine("--- Program.ConfigureServices executing ---"); // You can keep this for debugging

        // Attempt to get the real connection string
        string? connectionString = Environment.GetEnvironmentVariable("PostgreSQLConnection");

        // Check if running in design time (EF tools) by checking if the env var is missing
        if (string.IsNullOrEmpty(connectionString))
        {
            Console.WriteLine("!!! WARNING: 'PostgreSQLConnection' environment variable not found.");
            Console.WriteLine("!!! Providing dummy string for EF Core design-time tools. Factory should override this.");
            // Provide a syntactically valid placeholder connection string.
            // It doesn't need to point to a real database.
            connectionString = "Host=design_time;Database=design_time_db;Username=design;Password=time";
        }
        else
        {
            Console.WriteLine("--- 'PostgreSQLConnection' environment variable FOUND. ---");
        }


        // Now register DbContext using either the real or dummy string
        // This allows the design-time analysis to succeed.
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString) // This will use the dummy string during 'dotnet ef'
                                                // Optional: Add minimal logging ONLY for design time if needed
                                                // #if DEBUG
                                                // .LogTo(Console.WriteLine, Microsoft.Extensions.Logging.LogLevel.Information)
                                                // #endif
        );
    })
    .Build();

host.Run();
