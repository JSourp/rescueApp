using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;

namespace rescue_app_backend;

public class TestDbConnection
{
    private readonly AppDbContext _dbContext;

    public TestDbConnection(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("TestDbConnection")]
    public IActionResult Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "testdb")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("TestDbConnection");

        try
        {
            _dbContext.Database.CanConnect(); // Just try to connect
            return new OkObjectResult("Database connection successful!");
        }
        catch (Exception ex)
        {
            logger.LogError($"Database connection failed: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}