export interface AnimalImage {
    id: number;
    animalId: number;
    documentType: string; // e.g., "Animal Photo"
    fileName: string;     // Original filename
    blobName: string;     // Name in Azure blob storage
    blobUrl: string;      // URL to display/use (the important one!)
    caption?: string | null;
    isPrimary: boolean;
    displayOrder: number;
    dateUploaded: string; // ISO Date String
    uploadedByUserId?: string | null; // UUID as string
    uploaderEmail?: string | null;
    uploaderFirstName?: string | null;
    uploaderLastName?: string | null;
}
