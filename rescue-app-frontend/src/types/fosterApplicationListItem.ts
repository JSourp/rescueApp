export interface FosterApplicationListItem {
    id: number;
    submissionDate: string; // ISO date string
    applicantName: string;
    primaryEmail: string;
    primaryPhone: string;
    status: string;
    reviewedBy?: string | null;
    reviewDate?: string | null; // ISO date string
}
