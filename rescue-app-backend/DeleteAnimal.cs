using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using rescueApp.Data;

namespace rescueApp;

public class DeleteAnimal
{
    private readonly AppDbContext _dbContext;

    public DeleteAnimal(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [Function("DeleteAnimal")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "animals/{id}")] HttpRequestData req,
        int id,
        FunctionContext executionContext)
    {
        var logger = executionContext.GetLogger("DeleteAnimal");

        try
        {
            // Find the animal to delete
            var animalToDelete = await _dbContext.Animals.FindAsync(id);

            if (animalToDelete == null)
            {
                return new NotFoundResult();
            }

            // Remove the animal from the database
            _dbContext.Animals.Remove(animalToDelete);
            await _dbContext.SaveChangesAsync();

            return new NoContentResult(); // 204 No Content
        }
        catch (Exception ex)
        {
            logger.LogError($"Error deleting animal: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}
