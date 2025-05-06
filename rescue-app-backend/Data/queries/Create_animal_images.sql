-- Connect to your PostgreSQL database

-- Drop table first if rerunning during testing
-- DROP TABLE IF EXISTS public.animal_images;

CREATE TABLE public.animal_images (
    id SERIAL PRIMARY KEY, -- Auto-incrementing primary key

    -- Foreign Key back to the animals table
    animal_id INTEGER NOT NULL,

    -- Image Details
    image_url TEXT NOT NULL,       -- The full, final URL of the image in Blob Storage
    blob_name TEXT NOT NULL UNIQUE, -- The unique name (e.g., GUID-filename.jpg) within the blob container
    caption TEXT NULL,           -- Optional caption for the image
    display_order INTEGER NOT NULL DEFAULT 0, -- For ordering images (e.g., 0 is default/main)
    is_primary BOOLEAN NOT NULL DEFAULT FALSE, -- Flag to mark the primary/thumbnail image

    -- Audit Columns
    date_uploaded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by_user_id UUID NULL, -- FK to users table

    -- Foreign Key Constraints
    CONSTRAINT fk_animal_images_animal
        FOREIGN KEY (animal_id) REFERENCES public.animals (id)
        ON DELETE CASCADE, -- Delete image records if animal is deleted

    CONSTRAINT fk_animal_images_user
        FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users (id)
        ON DELETE SET NULL -- Keep image record but remove user link if user deleted
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_animal_images_animal_id ON public.animal_images(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_images_display_order ON public.animal_images(display_order);