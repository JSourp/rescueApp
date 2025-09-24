export interface AnimalImage {
    id: number;
    animalId: number;
    documentType: string; // e.g., "Animal Photo"
    fileName: string;     // Original file_name
    blobName: string;     // Name in Azure blob storage
    imageUrl: string;     // URL to display/use
    caption?: string | null;
    isPrimary: boolean;
    displayOrder: number;
    dateUploaded: string; // ISO Date String
    uploadedByUserId?: string | null;
    uploaderEmail?: string | null;
    uploaderFirstName?: string | null;
    uploaderLastName?: string | null;
}
