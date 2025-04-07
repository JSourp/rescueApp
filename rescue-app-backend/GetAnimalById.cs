using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using rescue_app_backend.Models;

namespace rescue_app_backend;

public class GetAnimalById
{
    private readonly AppDbContext _dbContext;

    public GetAnimalById(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("GetAnimalById")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "animals/{id}")] HttpRequestData req,
        int id,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetAnimalById");

        try
        {
            var animal = await _dbContext.Animals.FindAsync(id);

            if (animal == null)
            {
                return new NotFoundResult();
            }

            return new OkObjectResult(animal);
        }
        catch (Exception ex)
        {
            logger.LogError($"Error getting animal by ID: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}