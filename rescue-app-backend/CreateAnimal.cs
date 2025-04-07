using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescue_app_backend.Data;
using rescue_app_backend.Models;

namespace rescue_app_backend;

public class CreateAnimal
{
    private readonly AppDbContext _dbContext;

    public CreateAnimal(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("CreateAnimal")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "animals")] HttpRequestData req,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("CreateAnimal");

        try
        {
            // Read the request body
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var animalToCreate = JsonSerializer.Deserialize<Animal>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (animalToCreate == null)
            {
                return new BadRequestObjectResult("Invalid animal data.");
            }

            // Ensure DateTime values are UTC
            if (animalToCreate.dateofbirth.HasValue)
            {
                animalToCreate.dateofbirth = DateTime.SpecifyKind(animalToCreate.dateofbirth.Value, DateTimeKind.Utc);
            }
            animalToCreate.dateadded = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            animalToCreate.dateupdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

            // Add the animal to the database
            _dbContext.Animals.Add(animalToCreate);
            await _dbContext.SaveChangesAsync();

            // Return the created animal with a 201 Created status code
            return new CreatedResult($"/api/animals/{animalToCreate.id}", animalToCreate);
        }
        catch (Exception ex)
        {
            logger.LogError($"Error creating animal: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}