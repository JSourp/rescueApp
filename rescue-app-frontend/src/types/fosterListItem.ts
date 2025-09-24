export interface FosterListItem {
    userId: string; // UUID as string
    fosterProfileId: number;
    firstName: string;
    lastName: string;
    email: string;
    primaryPhone?: string | null;
    approvalDate: string; // ISO date string
    isActiveFoster: boolean;
    availabilityNotes?: string | null;
    currentFosterCount: number;
}
