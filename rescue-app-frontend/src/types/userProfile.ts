export interface UserProfile {
    id: string;
    externalProviderId?: string;
    firstName: string;
    lastName: string;
    email: string;
    primaryPhone: string;
    primaryPhoneType: string;
    role: string; // types and access levels listed below
    isActive: boolean;
    dateCreated: string;
    lastLoginDate?: string | null;
}
