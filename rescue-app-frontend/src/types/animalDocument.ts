export interface AnimalDocument {
    id: number;
    animalId: number;
    documentType: string; // e.g., "Vaccination Record"
    fileName: string;     // Original file_name
    blobName: string;     // Name in Azure blob storage
    blobUrl: string;      // URL to display/use
    description?: string | null;
    dateUploaded: string;
    uploadedByUserId?: string | null;
    uploaderEmail?: string | null;
    uploaderFirstName?: string | null;
    uploaderLastName?: string | null;
}
