using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;

namespace rescueApp;

public class TestDbConnection
{
    private readonly AppDbContext _dbContext;

    public TestDbConnection(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("TestDbConnection")]
    public IActionResult Run(
        // Security is handled by internal Auth0 Bearer token validation and role-based authorization.
        [HttpTrigger(AuthorizationLevel.Anonymous, "GET", Route = "testdb")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("TestDbConnection");

        try
        {
            _dbContext.Database.CanConnect();
            return new OkObjectResult("Database connection successful!");
        }
        catch (Exception ex)
        {
            logger.LogError($"Database connection failed: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}
