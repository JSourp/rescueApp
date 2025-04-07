using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace rescueApp
{
    public class rescue_app_function
    {
        private readonly ILogger<rescue_app_function> _logger;

        public rescue_app_function(ILogger<rescue_app_function> logger)
        {
            _logger = logger;
        }

        [Function("rescue_app_function")]
        public IActionResult Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequest req)
        {
            _logger.LogInformation("C# HTTP trigger function processed a request.");
            return new OkObjectResult("Welcome to Azure Functions!");
        }
    }
}
