using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using rescueApp.Data;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Attempt to get the real connection string
        string? connectionString = Environment.GetEnvironmentVariable("PostgreSQLConnection");

        // Check if running in design time (EF tools) by checking if the env var is missing
        if (string.IsNullOrEmpty(connectionString))
        {
            Console.WriteLine("!!! WARNING: 'PostgreSQLConnection' environment variable not found.");
            Console.WriteLine("!!! Providing dummy string for EF Core design-time tools. Factory should override this.");
            // Provide a syntactically valid placeholder connection string.
            connectionString = "Host=design_time;Database=design_time_db;Username=design;Password=time";
        }
        else
        {
            Console.WriteLine("--- 'PostgreSQLConnection' environment variable FOUND. ---");
        }


        // Now register DbContext using either the real or dummy string
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention() // This will use the dummy string during 'dotnet ef'
        );
    })
    .Build();

host.Run();
