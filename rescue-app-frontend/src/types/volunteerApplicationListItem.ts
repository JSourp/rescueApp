export interface VolunteerApplicationListItem {
    id: number;
    submissionDate: string; // ISO date string
    applicantName: string;
    primaryEmail: string;
    primaryPhone: string;
    status: string;
    areasOfInterest?: string | null; // Comma-separated string
    reviewedBy?: string | null;
    reviewDate?: string | null; // ISO date string
}
