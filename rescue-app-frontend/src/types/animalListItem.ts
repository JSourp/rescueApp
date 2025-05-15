export interface AnimalListItem {
    id: number;
    currentFosterUserId?: string | null; // Nullable for animals not currently in foster care
    name?: string | null;
    animalType?: string | null;
    breed?: string | null;
    gender?: string | null;
    adoptionStatus?: string | null;
    dateCreated: string;
    dateUpdated: string;
    // createdByUserId?: string | null; // Maybe not needed for list view?
    // updatedByUserId?: string | null; // Maybe not needed for list view?

    // Only the primary image URL
    primaryImageUrl?: string | null;
}
