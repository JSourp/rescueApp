export interface AnimalDocument {
    id: number;
    animalId: number;
    documentType: string; // e.g., "Vaccination Record"
    fileName: string;     // Original filename
    blobName: string;     // Name in Azure blob storage
    blobUrl: string;      // URL to display/use (the important one!)
    description?: string | null;
    dateUploaded: string; // ISO Date String
    uploadedByUserId?: string | null; // UUID as string
    uploaderEmail?: string | null;
    uploaderFirstName?: string | null;
    uploaderLastName?: string | null;
}
