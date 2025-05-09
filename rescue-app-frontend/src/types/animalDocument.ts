export interface AnimalDocument {
    id: number;
    animalId: number;
    document_type: string; // e.g., "Vaccination Record"
    file_name: string;     // Original file_name
    blob_name: string;     // Name in Azure blob storage
    blob_url: string;      // URL to display/use (the important one!)
    description?: string | null;
    date_uploaded: string; // ISO Date String
    uploaded_by_user_id?: string | null; // UUID as string
    uploader_email?: string | null;
    uploader_first_name?: string | null;
    uploader_last_name?: string | null;
}
