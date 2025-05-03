export interface AnimalDocument {
    id: number;
    animal_id: number;
    document_type: string;
    file_name: string;
    blob_name: string; // Name in Azure Blob
    blob_url: string;  // Base URL in Azure Blob
    description?: string | null;
    date_uploaded: string; // Comes as ISO string
    uploaded_by_user_id?: string | null; // UUID as string
    // Add uploader name/email if joined in backend API
    // uploaderEmail?: string | null;
}
