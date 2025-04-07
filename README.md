#   Second Chance Animal Rescue and Sanctuary Web Application

This repository contains the code for a web application designed to support the operations of an animal rescue and sanctuary.

##   Phases

###   Phase 1: Frontend Setup (Next.js)

This phase focuses on the initial setup of the frontend application using Next.js. The goal is to establish the basic structure and navigation for the site.

Key Accomplishments:

-   Creation of a new Next.js project using the App Router.
-   Implementation of core static pages:
    -   About Us
    -   Available Animals
    -   Get Involved
    -   Donating
    -   Home Page
-   Establishment of basic navigation to allow users to move between pages.
-   Initial configuration of the project with TypeScript, ESLint, and Tailwind CSS.

This phase lays the foundation for the user interface and overall site structure.

###   Phase 2: Backend API Development (Azure Functions)

This phase centers on the development of the backend API using Azure Functions and .NET. The API is responsible for managing animal data and providing endpoints for the frontend to interact with.

Key Accomplishments:

-   Implementation of CRUD (Create, Read, Update, Delete) operations for the `Animals` entity.
-   Connection to and interaction with an Azure PostgreSQL database for persistent data storage.
-   Creation of Azure Functions to handle HTTP requests for:
    -   Retrieving all animals
    -   Retrieving a specific animal by ID
    -   Creating a new animal record
    -   Updating an existing animal record
    -   Deleting an animal record

This API forms the foundation for the application's data management capabilities.

##   Future Development

Frontend Development (Next.js) - API Integration

##   Technologies Used

This project utilizes the following technologies:

**Frontend**

* Next.js
* React
* TypeScript
* Tailwind CSS
* npm (or yarn)

**Backend**

* Azure Functions
* .NET
* C#
* Entity Framework Core
* Npgsql

**Database**

* Azure Database for PostgreSQL Flexible Server
* PostgreSQL

**Tools and Other**

* Git
* VS Code (or other editor)
* Postman (or similar)

##   Setup Instructions

##   Setup Instructions

To set up and run this project, follow these steps:

###   Prerequisites

Before you begin, ensure you have the following software installed:

* **Node.js:** (Latest LTS version recommended) Download from [https://nodejs.org/](https://nodejs.org/)
* **.NET 8.0 SDK:** Download from [https://dotnet.microsoft.com/en-us/download/dotnet/8.0](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
* **Azure Functions Core Tools:** Follow the installation instructions here: [https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Cwindows%2Ccsharp%2Cportal%2Cbash](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Cwindows%2Ccsharp%2Cportal%2Cbash)
* **PostgreSQL Client Tools:** (e.g., `psql` or pgAdmin) Install these to connect to your PostgreSQL database.
* **Azure Account:** You'll need an Azure account to set up the PostgreSQL database.
* **VS Code (or other code editor):** For editing the code.

###   Configuration

1.  **Azure Database for PostgreSQL Flexible Server:**

    * Create an Azure Database for PostgreSQL Flexible Server instance in the Azure portal.
    * Note down the following connection details:
        * Server name
        * Database name
        * Username
        * Password
    * Configure the server's firewall settings to allow access from your local machine.

2.  **Clone the Repository:**

    * Clone the repository to your local machine:

        ```bash
        git clone <your-repository-url>
        ```

3.  **Frontend Setup (Next.js):**

    * Navigate to the frontend directory:

        ```bash
        cd rescue-app-frontend
        ```

    * Install dependencies:

        ```bash
        npm install
        #   or
        yarn install
        ```

    * Create a `.env.local` file in the root of the `rescue-app-frontend` directory.
    * Add the following line to `.env.local`, replacing `<your-api-url>` with the URL of your backend API (e.g., `http://localhost:7071/api` for local development):

        ```
        NEXT_PUBLIC_API_BASE_URL=<your-api-url>
        ```

    * Run the Next.js development server:

        ```bash
        npm run dev
        #   or
        yarn dev
        ```

    * Open your browser and go to `http://localhost:3000` to view the frontend application.

4.  **Backend Setup (Azure Functions):**

    * Navigate to the backend directory:

        ```bash
        cd rescue-app-backend
        ```

    * Create a `local.settings.json` file in the root of the `rescue-app-backend` directory if it doesn't exist.
    * Add the following content to `local.settings.json`, replacing the placeholders with your actual PostgreSQL connection details:

        ```json
        {
          "IsEncrypted": false,
          "Values": {
            "AzureWebJobsStorage": "UseDevelopmentStorage=true",
            "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
            "PostgreSQLConnection": "Host=<your-server-name>[.postgres.database.azure.com](https://www.google.com/search?q=.postgres.database.azure.com);Database=postgres;Username=<your-username>;Password=<your-password>;SSL Mode=Require"
          }
        }
        ```

    * Install .NET dependencies:

        ```bash
        dotnet restore
        ```

    * Create the database tables:

        * Connect to your PostgreSQL server using `psql` or pgAdmin.
        * Execute the SQL script provided in the `Data` directory (or similar) to create the `Animals` and `AdoptionHistory` tables.

    * Run the Azure Functions project:

        ```bash
        func start
        ```

    * The API will be available at the URL specified in your `.env.local` file (e.g., `http://localhost:7071/api`).

###   Testing the API

You can use a tool like Postman to test the API endpoints:

* **GET /api/animals:** Retrieve a list of animals.
* **GET /api/animals/{id}:** Retrieve details of a specific animal.
* **POST /api/animals:** Create a new animal.
* **PUT /api/animals/{id}:** Update an existing animal.
* **DELETE /api/animals/{id}:** Delete an animal.

Refer to the API documentation (if available) or the function code for the expected request bodies and response formats.

###   Next Steps

UI features, Authentication, etc.

##   Contributing

Fork it, we ball

##   License

MIT License