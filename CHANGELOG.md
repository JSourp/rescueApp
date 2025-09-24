Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[Unreleased]
### Added
*
### Changed
*
### Deprecated
### Removed
### Fixed
### Security

[0.1.0] - 2025-05-26
### Added
* Initial project setup for Second Chance Animal Rescue & Sanctuary platform.
* Core features for animal management (create, view list, view detail, edit, delete).
* User authentication and role management via Auth0 (Admin, Staff, Foster, Volunteer, Guest).
* Image upload functionality for animals using Azure Blob Storage (single primary image and multiple additional images).
* Document upload functionality for animals using Azure Blob Storage (e.g., vet records, waivers).
* Foster application submission process with database storage and email notifications.
* Admin review and approval system for foster applications, including local user record creation and foster profile management.
* Functionality to assign animals to approved fosters and return them from foster care.
* Volunteer application submission process with database storage and email notifications (admin viewing to be built).
* Partnership/Sponsorship application submission process with database storage and email notifications (admin viewing to be built).
* Adoption application submission process with database storage and email notifications (admin viewing and finalization to be built).
* Waiver and e-signature capture for Foster, Volunteer, and Adoption application forms.
* Public-facing pages: Homepage (with spotlight placeholders), Available Animals (placeholder message), Graduates (placeholder message), Get Involved, About Us, Donate (placeholder).
* Admin pages: Manage Animals, Animal Detail (with image/doc/foster management), Fosters List, Foster Detail, Foster Applications List, Foster Application Review, Volunteer Applications List (placeholder for review page).
* Role-based navigation in the main navbar.
* Dark mode theme changer.

### Changed
* Refactored C# models and DTOs to use `PascalCase` for properties.
* Configured EF Core to map `PascalCase` C# properties to `snake_case` database columns using `EFCore.NamingConventions`.
* Standardized backend API JSON responses to use `camelCase` property names.
* Aligned frontend TypeScript types to expect `camelCase` JSON from APIs.

### Fixed
* Resolved various 401 (Unauthorized) errors related to token validation and header passing.
* Fixed 400 (Bad Request) errors due to DTO deserialization mismatches (casing, expected fields).
* Corrected 500 (Internal Server Error) issues caused by JSON serialization cycles and incorrect EF Core query translations.
* Addressed "Missing state cookie" error after domain changes by correcting `AUTH0_COOKIE_DOMAIN`.
* Fixed database connection timeouts for local development by updating Azure PostgreSQL firewall rules.
* Resolved issues with images not displaying due to incorrect `next.config.js` setup or property name mismatches.
* Corrected UI layout issues on various pages.
* Ensured blobs are deleted from Azure Storage when corresponding database records (animal images, documents, animal profile images) are deleted.

### Security
* Implemented Auth0 token validation and role-based authorization for all protected backend API endpoints.
* Using SAS URLs for secure direct uploads/downloads to/from Azure Blob Storage.
* Disabled public sign-ups in Auth0, moving towards an admin-initiated or application-approved user creation model.

[0.0.0] - 2025-04-07
