export interface AnimalListItem {
    id: number;
    name?: string | null;            // camelCase
    animalType?: string | null;      // camelCase
    breed?: string | null;           // camelCase
    gender?: string | null;          // camelCase
    adoptionStatus?: string | null;  // camelCase
    dateCreated: string;           // camelCase (ISO Date String)
    dateUpdated: string;           // camelCase (ISO Date String)
    // createdByUserId?: string | null; // Maybe not needed for list view?
    // updatedByUserId?: string | null; // Maybe not needed for list view?

    // Only the primary image URL
    primaryImageUrl?: string | null; // camelCase
}
