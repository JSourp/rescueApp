using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net.Http;

namespace rescueApp_backend;

public class SendEmail
{
    private readonly ILogger _logger;
    private readonly HttpClient _httpClient;

    public SendEmail(ILoggerFactory loggerFactory, IHttpClientFactory httpClientFactory)
    {
        _logger = loggerFactory.CreateLogger<SendEmail>();
        _httpClient = httpClientFactory.CreateClient();
    }

    [Function("SendEmail")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "send-email")] HttpRequestData req,
        FunctionContext executionContext)
    {
        _logger.LogInformation("C# HTTP trigger function processed a request.");

        try
        {
            // 1. Read and Deserialize the Request Body
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var data = JsonSerializer.Deserialize<EmailRequest>(requestBody);

            if (data == null || string.IsNullOrEmpty(data.toEmail) || string.IsNullOrEmpty(data.subject) || string.IsNullOrEmpty(data.body))
            {
                return new BadRequestObjectResult("Please provide toEmail, subject, and body.");
            }

            // 2. Send the Data to Web3Forms
            var web3FormsResponse = await SendToWeb3Forms(data);

            if (!web3FormsResponse.IsSuccessStatusCode)
            {
                var errorContent = await web3FormsResponse.Content.ReadAsStringAsync();
                throw new Exception($"Web3Forms API failed: {web3FormsResponse.StatusCode}, {errorContent}");
            }

            // 3. Return a Success Response
            return new OkObjectResult("Email sent successfully!");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing email request: {ex.Message}");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }

    private async Task<HttpResponseMessage> SendToWeb3Forms(EmailRequest data)
    {
        var apiKey = Environment.GetEnvironmentVariable("WEB3FORMS_API_KEY");
        var web3FormsUrl = Environment.GetEnvironmentVariable("WEB3FORMS_ENDPOINT") ?? "https://api.web3forms.com/submit"; //Default

        var web3FormsData = new Dictionary<string, string>
        {
            { "apikey", apiKey },
            { "subject", data.subject },
            { "email", data.toEmail },
            { "message", data.body }
        };

        var content = new FormUrlEncodedContent(web3FormsData);
        return await _httpClient.PostAsync(web3FormsUrl, content);
    }

    // Define a class to represent the expected request body
    public class EmailRequest
    {
        public string toEmail { get; set; }
        public string subject { get; set; }
        public string body { get; set; }
    }
}