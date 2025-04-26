export interface UserProfile {
    id: string;
    externalProviderId?: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string; // types and access levels listed below
    isActive: boolean;
    dateCreated: string;
    lastLoginDate?: string | null;
}

/* Role Types
 * Admin: Full access to all features and settings.
 * Staff: Can manage animals, and finalize adoptions.
 * Volunteer: Limited access, can edit animals (should they be able to though?)
 * Guest: Read-only access to public information.
*/
