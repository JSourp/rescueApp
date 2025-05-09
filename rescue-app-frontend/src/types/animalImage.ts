export interface AnimalImage {
    id: number;
    animalId: number;
    documentType: string; // e.g., "Animal Photo"
    fileName: string;
    blobName: string;
    blobUrl: string;      // <-- URL for display
    caption?: string | null;
    isPrimary: boolean;
    displayOrder: number;
    dateUploaded: string; // ISO Date String
    uploadedByUserId?: string | null;
    uploaderEmail?: string | null; // Optional from join
    uploaderFirstName?: string | null; // Optional from join
    uploaderLastName?: string | null; // Optional from join
}
