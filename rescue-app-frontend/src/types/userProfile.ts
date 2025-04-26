export interface UserProfile {
    id: string;
    externalProviderId?: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;  // e.g., 'Admin', 'Staff', 'Volunteer', 'Guest'
    isActive: boolean;
    dateCreated: string;
    lastLoginDate?: string | null;
}
