export interface AnimalDocument {
    id: number;
    animalId: number;
    documentType: string;
    fileName: string;
    blobName: string;
    blobUrl: string;
    description?: string | null;
    dateUploaded: string;
    uploadedByUserId?: string | null;
    uploaderEmail?: string | null;
    uploaderFirstName?: string | null;
    uploaderLastName?: string | null;
}
