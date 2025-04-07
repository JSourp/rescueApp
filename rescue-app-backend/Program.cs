using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using rescue_app_backend.Data;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(Environment.GetEnvironmentVariable("PostgreSQLConnection")));
    })
    .Build();

host.Run();