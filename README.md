# Second Chance Animal Rescue & Sanctuary - Management Platform (RescueApp)

Welcome to the RescueApp project! This platform is designed to help animal rescue organizations and sanctuaries manage their animals, adoptions, foster programs, volunteers, and more. It aims to provide a modern, efficient, and user-friendly solution to streamline rescue operations.

## Project Overview

RescueApp is a full-stack web application built with a modern technology set. It provides a public-facing side for viewing available animals and learning about the rescue, and an administrative backend for staff and volunteers to manage operations. The goal is to move away from manual or outdated systems (like "chalkboards") towards a reliable, centralized digital platform.

**Quick Links:**
* [1. Technology Stack](#1-technology-stack)
* [2. How Can I Use It? (Developer Setup Guide)](#2-how-can-i-use-it-developer-setup-guide)
* [3. How Can I Use the Site? (Admin User Guide)](#3-how-can-i-use-the-site-admin-user-guide)
* [Versioning](#versioning)
* [Contributing](#contributing-placeholder)
* [License](#license-placeholder)

## 1. Technology Stack

This project utilizes a combination of modern technologies to deliver a robust and scalable application:

* **Frontend (User Interface & Admin Dashboard):**
    * **Next.js (React Framework):** Provides server-side rendering (SSR) for public pages (good for SEO and initial load performance) and client-side rendering (CSR) for dynamic admin dashboards. It uses the App Router for modern routing.
    * **TypeScript:** For static typing, improving code quality and maintainability.
    * **Tailwind CSS:** A utility-first CSS framework for rapid UI development and consistent styling.
    * **Headless UI:** For accessible, unstyled UI components (like Modals, Disclosures, Menus) that can be easily themed with Tailwind CSS.
    * **React Hook Form:** For efficient and performant form handling and validation.

* **Backend (API & Business Logic):**
    * **Azure Functions (.NET Isolated Worker Model):** Provides a serverless architecture for the backend API. This means the backend scales automatically based on demand and you only pay for what you use. Functions are written in C#.
    * **C# with .NET:** The language and framework used for building the robust and performant backend API logic.
    * **Entity Framework Core (EF Core):** An Object-Relational Mapper (ORM) used to interact with the PostgreSQL database from C#, simplifying data access.
        * **EFCore.NamingConventions:** A library used to automatically map `PascalCase` C# model properties to `snake_case` database column names.

* **Database:**
    * **PostgreSQL:** A powerful, open-source object-relational database system used to store all application data (animals, users, applications, etc.).

* **Authentication & Authorization:**
    * **Auth0:** Used as the identity provider for secure user authentication (login, logout, user profiles) and to manage user roles (Admin, Staff, Foster, Volunteer, Guest). It integrates with the Next.js frontend and protects the Azure Functions backend API.

* **File Storage:**
    * **Azure Blob Storage:** Used for storing uploaded files, such as animal images (profile pictures, additional photos) and documents (vaccination records, waiver forms, etc.). Secure Access Signatures (SAS URLs) are used for direct, secure uploads and downloads from the frontend.

* **Deployment (Assumed/Typical):**
    * **Frontend (Next.js):** Typically deployed to a platform like Vercel (which is optimized for Next.js) or Azure Static Web Apps.
    * **Backend (Azure Functions):** Deployed to Azure as a Function App.
    * **Database (PostgreSQL):** Can be hosted on Azure Database for PostgreSQL or any other PostgreSQL hosting provider.
    * **Blob Storage:** Hosted on Azure.

**How they are used together:**

1.  A **public user** visits the Next.js frontend website (e.g., `www.scars-az.com`). They can view available animals, learn about the rescue, and submit applications (foster, volunteer, adoption, partnership). These public pages can be server-rendered by Next.js for speed and SEO.
2.  When a user wants to access protected areas or perform actions (admin logging in to add or make updates to exisitng animals), they are redirected to **Auth0** for authentication.
3.  Once authenticated, Auth0 returns them to the Next.js application with session information (including an ID token and an Access Token).
4.  The Next.js frontend (client-side components) uses the **Access Token** to make secure calls to the **Azure Functions backend API** (e.g., `https://rescue-app-api.azurewebsites.net/api/...`).
5.  The Azure Functions (written in C#) handle the business logic. They validate the Access Token from Auth0 to ensure the user is authenticated and authorized (based on roles) to perform the requested action.
6.  The Azure Functions use **Entity Framework Core** to interact with the **PostgreSQL database** to create, read, update, or delete data.
7.  For file uploads (images and documents), the frontend first requests a secure upload URL (SAS URL) from an Azure Function. The function generates this SAS URL for **Azure Blob Storage**. The frontend then uploads the file directly to Azure Blob Storage using this SAS URL. Metadata about the file (like its name and URL) is then saved to the PostgreSQL database by calling another Azure Function.
8.  The admin dashboard (part of the Next.js frontend) allows authorized users (Admin, Staff, etc.) to manage all aspects of the rescue operation by interacting with the secured Azure Functions API.

## 2. How Can I Use It? (Developer Setup Guide)

This guide assumes you are setting up the project for local development or preparing for your own deployment.

**Prerequisites:**

* **Node.js and npm/yarn:** For the Next.js frontend. (LTS version recommended)
* **.NET SDK:** For the Azure Functions backend (check project for required version, likely .NET 6, 7, or 8 for Isolated Worker).
* **Azure Functions Core Tools:** For running Azure Functions locally.
* **PostgreSQL:** A local instance or access to a cloud-hosted PostgreSQL database.
* **Azure CLI:** For interacting with Azure services (optional for local dev if not deploying, but useful).
* **Git:** For cloning the repository.
* **A Code Editor:** Like Visual Studio Code.
* **Auth0 Account:** You'll need to create a free Auth0 tenant.
* **Azure Account:** You'll need an Azure subscription to set up Blob Storage and (eventually) deploy Azure Functions and PostgreSQL if desired.

**Setup Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/JSourp/rescueApp.git](https://github.com/JSourp/rescueApp.git)
    cd rescueApp
    ```

2.  **Set up Auth0:**
    * Go to [Auth0](https://auth0.com/) and create a new tenant if you don't have one.
    * **Create an Application:**
        * Type: "Regular Web Application".
        * Note down the **Domain**, **Client ID**, and **Client Secret**.
        * Configure "Allowed Callback URLs": `http://localhost:3000/api/auth/callback` (for local frontend dev).
        * Configure "Allowed Logout URLs": `http://localhost:3000` (for local frontend dev).
        * Configure "Allowed Web Origins": `http://localhost:3000`.
    * **Create an API (Audience):**
        * Go to Applications > APIs > "+ Create API".
        * Name: e.g., "RescueApp API"
        * Identifier (Audience): e.g., `https://rescueapp/api` (this is crucial). Note this down.
        * Signing Algorithm: RS256 (default).
    * **Enable RBAC (Role-Based Access Control) for your API (Optional but Recommended):**
        * In your API settings in Auth0, go to the "RBAC Settings" tab.
        * Enable "Enable RBAC" and "Add Permissions in the Access Token".
    * **Define Roles:**
        * Go to User Management > Roles in Auth0.
        * Create roles like "Admin", "Staff", "Volunteer", "Foster".
        * (Permissions for roles can be defined if your API uses fine-grained permissions, but for now, the role name itself is used by the backend).
    * **Create an Auth0 Action to Add Roles to Token (Crucial for Backend AuthZ):**
        * Go to Actions > Library > Build Custom.
        * Name: e.g., "Add Roles to Token"
        * Trigger: "Login / Post Login"
        * Runtime: Node (latest)
        * Code (example):
            ```javascript
            exports.onExecutePostLogin = async (event, api) => {
              const namespace = 'https://rescueapp/'; // Use your API identifier or a custom namespace
              if (event.authorization && event.authorization.roles) {
                api.idToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
                api.accessToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
              }
            };
            ```
        * Deploy this Action.
        * Go to Actions > Flows > Login. Drag your "Add Roles to Token" Action into the flow.

3.  **Set up Azure Resources:**
    * **PostgreSQL Database:**
        * Create a PostgreSQL database (locally or on Azure Database for PostgreSQL).
        * Get the connection string.
    * **Azure Blob Storage:**
        * Create an Azure Storage Account.
        * Within the storage account, create two containers (use lowercase names):
            * `animal-images` (for public animal profile pictures - set public access level to "Blob" or "Container" if images are meant to be directly viewable without SAS for reading).
            * `animal-documents` (for private documents - set public access level to "Private (no anonymous access)").
        * Get the connection string for this storage account.

4.  **Configure Backend (`rescue-app-backend`):**
    * Navigate to the `rescue-app-backend` directory.
    * Create a `local.settings.json` file (copy from `local.settings.json.example` if one exists, or create new).
    * Add the following (replace placeholders with your actual values):
        ```json
        {
          "IsEncrypted": false,
          "Values": {
            "AzureWebJobsStorage": "UseDevelopmentStorage=true", // Or your actual Azure Storage connection string for Functions runtime
            "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
            "PostgreSQLConnection": "Host=localhost;Port=5432;Database=your_rescue_db;Username=your_user;Password=your_password;", // Your PostgreSQL connection string
            "AzureBlobStorageConnectionString": "DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=youraccountkey;EndpointSuffix=core.windows.net", // Your Azure Blob Storage connection string
            "AUTH0_ISSUER_BASE_URL": "[https://your-auth0-domain.us.auth0.com/](https://your-auth0-domain.us.auth0.com/)", // From Auth0 Application settings (ensure trailing slash)
            "AUTH0_AUDIENCE": "https://rescueapp/api" // From Auth0 API settings (Identifier)
            // "INTERNAL_API_KEY_FOR_SYNC": "a_very_strong_secret_if_sync_needs_key" // If you add API key auth to SyncUser
          },
          "Host": { // Optional: ensure API prefix
            "LocalHttpPort": 7071,
            "CORS": "*", // For local development; be more restrictive in production
            "CORSCredentials": false,
            "extensions": {
              "http": {
                "routePrefix": "api"
              }
            }
          }
        }
        ```
    * **Run Database Migrations:**
        * Ensure your C# models (`Animal.cs`, etc.) are defined with `PascalCase` properties.
        * Ensure `AppDbContext.cs` and `Program.cs` (or `DesignTimeDbContextFactory.cs`) have `.UseSnakeCaseNamingConvention()` chained after `.UseNpgsql()`.
        * If starting fresh or after major model changes, you might want to delete the existing `Migrations` folder and drop database tables.
        * Open a terminal in the `rescue-app-backend` directory:
            ```bash
            dotnet ef migrations add InitialCreate -s rescueApp.csproj -p rescueApp.csproj
            dotnet ef database update -s rescueApp.csproj -p rescueApp.csproj
            ```

5.  **Configure Frontend (`rescue-app-frontend`):**
    * Navigate to the `rescue-app-frontend` directory.
    * Create a `.env.local` file.
    * Add the following (replace placeholders):
        ```env
        AUTH0_SECRET='generate_a_strong_random_string_for_session_encryption_at_least_32_chars'
        AUTH0_BASE_URL='http://localhost:3000'
        AUTH0_ISSUER_BASE_URL='[https://your-auth0-domain.us.auth0.com](https://your-auth0-domain.us.auth0.com)' // From Auth0 Application settings
        AUTH0_CLIENT_ID='your_auth0_application_client_id'
        AUTH0_CLIENT_SECRET='your_auth0_application_client_secret'
        AUTH0_AUDIENCE='https://rescueapp/api' // From Auth0 API settings (Identifier)
        AUTH0_SCOPE='openid profile email offline_access read:messages' // Adjust scopes as needed; offline_access for refresh tokens
        NEXT_PUBLIC_API_BASE_URL='http://localhost:7071/api' // Points to your local Azure Functions backend
        NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY='your_web3forms_access_key' // If using web3forms for email
        ```
        * Generate `AUTH0_SECRET` using a command like `openssl rand -hex 32` in your terminal.

6.  **Install Dependencies:**
    * In `rescue-app-frontend`: `npm install` (or `yarn install`)
    * In `rescue-app-backend`: `dotnet restore` (usually happens with build)

7.  **Run the Applications:**
    * **Backend:** Open a terminal in `rescue-app-backend` and run:
        ```bash
        func start
        ```
        (Or run from your IDE). It should be listening on `http://localhost:7071`.
    * **Frontend:** Open another terminal in `rescue-app-frontend` and run:
        ```bash
        npm run dev
        ```
        (Or `yarn dev`). It should be available at `http://localhost:3000`.

8.  **Initial User Setup (Admin):**
    * Go to `http://localhost:3000`.
    * Click "Login" and sign up/log in with an email you want to be your first Admin.
    * After login, the `/api/users/sync` endpoint should create a record in your `public.users` table.
    * **Manually update this user's `role` in your PostgreSQL `users` table to "Admin"**.
    * Alternatively, create the first Admin user in the Auth0 dashboard and assign the "Admin" role there. Then log in.

You should now have the application running locally!

## 3. How Can I Use the Site? (Admin User Guide)

This guide assumes you are logged in as a user with the "Admin" or "Staff" role. Once logged in, the navigations mentioned below start in the dropdown with your name or email, at the top of each page.

**A. Intaking a New Animal:**

1.  Navigate to **Manage Animals**.
2.  Click the "**+ Add New Animal**" button.
3.  Fill out the animal's details:
    * **Species, Name, Breed:** Required.
    * **Date of Birth (Approx.):** Optional.
    * **Gender:** Required.
    * **Weight (lbs):** Optional.
    * **Animal Image:** Click "Choose File" to select the primary profile picture for the animal. A preview will appear.
    * **Story / Description:** Tell the animal's story.
    * **Initial Status:** Defaults to "Not Yet Available". Change as appropriate (e.g., "Available", "Needs Assessment").
4.  Click "**Add Animal**".
    * The image will be uploaded to Azure Blob Storage.
    * The animal's details and image metadata will be saved to the database.
    * You'll be returned to the "Manage Animals" list, which should refresh to show the new animal.

**B. Managing an Existing Animal (Status, Details, Images, Documents):**

1.  Navigate to **Manage Animals**.
2.  Find the animal in the list. Click on its **Name** to go to the Admin Animal Detail Page.
3.  **On the Admin Animal Detail Page:**
    * **View Details:** All current information about the animal is displayed.
    * **Edit Details:** Click the "**Edit Details**" button.
        * A modal will appear allowing you to change core information (name, breed, status, story, etc.).
        * **Manage Images:**
            * **Existing Images:** Thumbnails of current images are shown. Click the "Trash" icon to mark an image for deletion. Click the "Undo" icon (if it appears) to unmark.
            * **Add New Images:** Click "Choose File(s)" to select one or more new images. Previews will appear. Click the "Trash" icon next to a new preview to remove it before upload.
            * **Set Primary Image:** Click the "Star" icon next to an image to set it as the primary display image for the animal.
        * Click "**Save Changes**". Core details will be updated, marked images will be deleted (from DB and Azure), and new images will be uploaded and saved.
    * **Manage Documents:**
        * **Upload Document:** Click "**Upload Document**".
            * Select the file (PDF, image, Word doc).
            * Choose the "Document Type" (e.g., "Vaccination Record", "Vet Record").
            * Add an optional description.
            * Click "**Upload Document**". The file goes to Azure, and metadata is saved.
        * **View/Download Document:** Existing documents are listed. Click the "Download" icon next to a document to view/download it.
        * **Delete Document (Admin only):** Click the "Trash" icon next to a document to delete its record and the file from Azure.
    * **Foster Placement:**
        * **Place with Foster:** If the animal is available and not currently fostered, a "**Place with Foster**" button appears.
            * Clicking it opens a modal to select an active foster from a dropdown/search list.
            * Select the animal's new status (e.g., "Available - In Foster").
            * Confirm to update the animal's record with the foster's ID and new status.
        * **Return from Current Foster:** If the animal is currently fostered, a "**Return from Current Foster**" button appears.
            * Clicking it opens a modal to confirm the return.
            * Select the animal's new status after returning (e.g., "Available", "Needs Assessment").
            * Confirm to clear the foster ID and update the animal's status.
    * **Adoption Actions:**
        * **Finalize Adoption:** If the animal's status is "Available," "Available - In Foster," or "Adoption Pending," a "**Finalize Adoption**" button appears.
            * This opens a form to enter adopter details and the adoption date.
            * Submitting creates an `AdoptionHistory` record and changes the animal's status to "Adopted." It also clears any `CurrentFosterUserId`.
        * **Process Adoption Return:** If the animal's status is "Adopted," a "**Process Adoption Return**" button appears.
            * This opens a form to record the return date, reason, and set the animal's new status (e.g., "Available").
            * It updates the `AdoptionHistory` record and the animal's status.

**C. Managing Foster Applications:**

1.  Navigate to **Foster Applications**.
2.  You'll see a list of submitted foster applications.
3.  **Filter/Sort:** Use the dropdowns to filter by status (e.g., "Pending Review") or sort the list.
4.  **Review an Application:** Click the "**View/Review**" link for an application.
    * This will take you to the **Foster Application Review Page** (`/admin/foster-applications/review/[applicationId]`).
    * All details submitted by the applicant are displayed.
    * **Update Status:** Use the dropdown to change the application's status (e.g., to "Approved", "Rejected", "On Hold").
    * **Internal Notes:** Add any review notes. These are appended to existing notes with a timestamp and your email.
    * Click "**Save Status Update**".
    * **If "Approved":** The system attempts to find or create a local `User` record for the applicant (if one doesn't exist by email with `ExternalProviderId = null`, it creates one with role "Foster" and `ExternalProviderId = null`). It then creates or activates their `FosterProfile`. *Admin Action: You may need to manually create the user in Auth0 and assign the "Foster" role there if login is required.*

**D. Managing Fosters (Approved):**

1.  Navigate to **Fosters List**.
2.  You'll see a list of users who have approved and active foster profiles.
3.  **Filter/Sort:** Use the dropdown to sort the list.
4.  **View Foster Details:** Click on a foster's name or "View Details".
    * This takes you to the **Admin Foster Detail Page** (`/admin/fosters/[userId]`).
    * Displays their contact info, foster profile details (availability, capacity, etc.), and a list of animals currently in their care.
    * **Edit Foster Profile:** Click to open a modal to update their contact info, foster status, notes, etc.
    * **Assign Animal to This Foster:** Click to open a modal, search for an available animal, and assign it to this foster (updates animal's status and `CurrentFosterUserId`).
    * **Return Animal from This Foster:** In the list of animals they are fostering, click "Return from Foster" to open a modal, set the animal's new status, and clear its `CurrentFosterUserId`.

**E. Managing Volunteer Applications:**

1.  Navigate to **Volunteer Applications**.
2.  View the list of submitted volunteer applications.
3.  Filter and sort as needed.
4.  Click "**View/Review**" to see the full application details on the **Volunteer Application Review Page**.
    * (Status update functionality for volunteer applications can be added similarly to foster applications if needed in the future).

**F. User Profile:**
* Click your name in the navbar dropdown, then "**My Profile**".
* View your own profile details (name, email, role).
* Update your name if needed.

This guide covers the main administrative workflows. As new features are added, this section will be expanded!

## Versioning

This project aims to follow [Semantic Versioning (SemVer)](https://semver.org/) principles (e.g., vMAJOR.MINOR.PATCH).

* **MAJOR** version when you make incompatible API changes.
* **MINOR** version when you add functionality in a backward-compatible manner.
* **PATCH** version when you make backward-compatible bug fixes.

Releases are marked using **Git tags** (e.g., `v0.1.0`, `v1.0.0`).

A `CHANGELOG.md` file is maintained to document notable changes in each version.

## Contributing

Fork it, we ball. Feel free to fork the repository and submit pull requests for any improvements or bug fixes.

## License (Placeholder)

This project is currently under [MIT License]. Please see the `LICENSE` file for more details.
