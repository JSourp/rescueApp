-- Connect to your PostgreSQL database

-- Drop table first if you are re-running this during testing
-- DROP TABLE IF EXISTS public.animal_documents;

CREATE TABLE public.animal_documents (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Foreign Key to link to the specific animal
    animal_id INTEGER NOT NULL,

    -- Metadata about the document
    document_type VARCHAR(100) NOT NULL, -- E.g., 'Vaccination Record', 'Spay/Neuter Cert', 'Microchip', 'Vet Record', 'Intake', 'Other'
    file_name VARCHAR(255) NOT NULL,     -- Original filename uploaded by the user
    blob_name VARCHAR(300) NOT NULL UNIQUE, -- The unique name used in Azure Blob Storage (e.g., guid-filename.pdf)
    blob_url TEXT NOT NULL,              -- The full base URL to the blob (e.g., https://account.blob.core.windows.net/container/blob_name)
    description TEXT NULL,               -- Optional description entered by admin/staff

    -- Audit Columns
    date_uploaded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by_user_id UUID NULL,       -- Foreign key to users table (UUID matches users.id type)

    -- Foreign Key Constraints
    CONSTRAINT fk_animal_documents_animal
        FOREIGN KEY (animal_id)
        REFERENCES public.animals (id)
        ON DELETE CASCADE, -- If an animal record is deleted, delete its documents too? Or SET NULL/RESTRICT? CASCADE is common.

    CONSTRAINT fk_animal_documents_user
        FOREIGN KEY (uploaded_by_user_id)
        REFERENCES public.users (id)
        ON DELETE SET NULL -- If uploading user is deleted, set FK to NULL
);

-- Add Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_animal_documents_animal_id ON public.animal_documents(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_documents_document_type ON public.animal_documents(document_type);