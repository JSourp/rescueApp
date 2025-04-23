export interface UserProfile {
    id: string;
    externalProviderId?: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    dateCreated: string;
    lastLoginDate?: string | null;
}
