export interface VolunteerApplicationDetail {
    id: number;
    submissionDate: string;
    status: string;

    // Applicant Information
    firstName: string;
    lastName: string;
    spousePartnerRoommate?: string | null;
    streetAddress: string;
    aptUnit?: string | null;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    primaryPhone: string;
    primaryPhoneType: string;
    secondaryPhone?: string | null;
    secondaryPhoneType?: string | null;
    primaryEmail: string;
    secondaryEmail?: string | null;
    howHeard?: string | null;

    // Volunteer Specific
    ageConfirmation: string; // "Yes" or "No"
    previousVolunteerExperience?: string | null; // "Yes" or "No"
    previousExperienceDetails?: string | null;
    comfortLevelSpecialNeeds?: string | null; // "Yes", "Maybe", "No"
    areasOfInterest?: string | null; // Comma-separated string
    otherSkills?: string | null;
    locationAcknowledgement: boolean;
    volunteerReason?: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
    crimeConvictionCheck: string; // "Yes" or "No"
    policyAcknowledgement: boolean;

    // Waiver Information
    waiverAgreed: boolean;
    eSignatureName?: string | null;
    waiverAgreementTimestamp?: string | null;

    // Admin Review Fields
    reviewedByUserId?: string | null;
    reviewedByName?: string | null;
    reviewDate?: string | null;
    internalNotes?: string | null;
}
