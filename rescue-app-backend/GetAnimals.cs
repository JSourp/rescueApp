using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using rescue_app_backend.Models;
using System.Collections.Generic;
using Microsoft.Extensions.Primitives;

namespace rescue_app_backend;

public class GetAnimals
{
    private readonly AppDbContext _dbContext;

    public GetAnimals(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("GetAnimals")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "animals")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("GetAnimals");

        try
        {
            List<Animal> animals = await _dbContext.Animals.ToListAsync();
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(animals);
            return response;
        }
        catch (Exception ex)
        {
            logger.LogError($"Error getting animals: {ex.Message}");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            return response;
        }
    }
}