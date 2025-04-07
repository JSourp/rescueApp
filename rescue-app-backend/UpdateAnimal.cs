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

public class UpdateAnimal
{
    private readonly AppDbContext _dbContext;

    public UpdateAnimal(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("UpdateAnimal")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "animals/{id}")] HttpRequestData req,
        int id,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("UpdateAnimal");

        try
        {
            // Read the request body
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var animalToUpdate = JsonSerializer.Deserialize<Animal>(requestBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (animalToUpdate == null)
            {
                return new BadRequestObjectResult("Invalid animal data.");
            }

            // Find the existing animal
            var existingAnimal = await _dbContext.Animals.FindAsync(id);

            if (existingAnimal == null)
            {
                return new NotFoundResult();
            }

            // Update the animal's properties
            existingAnimal.animaltype = animalToUpdate.animaltype ?? existingAnimal.animaltype;
            existingAnimal.name = animalToUpdate.name ?? existingAnimal.name;
            existingAnimal.breed = animalToUpdate.breed ?? existingAnimal.breed;
            existingAnimal.dateofbirth = animalToUpdate.dateofbirth ?? existingAnimal.dateofbirth;
            existingAnimal.gender = animalToUpdate.gender ?? existingAnimal.gender;
            existingAnimal.weight = animalToUpdate.weight ?? existingAnimal.weight;
            existingAnimal.story = animalToUpdate.story ?? existingAnimal.story;
            existingAnimal.adoptionstatus = animalToUpdate.adoptionstatus ?? existingAnimal.adoptionstatus;
            existingAnimal.imageurl = animalToUpdate.imageurl ?? existingAnimal.imageurl;
            existingAnimal.dateupdated = DateTime.UtcNow;

            // Save the changes to the database
            await _dbContext.SaveChangesAsync();

            return new OkObjectResult(existingAnimal);
        }
        catch (Exception ex)
        {
            logger.LogError($"Error updating animal: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}