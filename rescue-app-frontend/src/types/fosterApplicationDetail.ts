export interface FosterApplicationDetail {
    id: number;
    submissionDate: string;
    status: string;

    // Applicant Information
    firstName: string;
    lastName: string;
    spousePartnerRoommate?: | null;
    streetAddress: string;
    aptUnit?: | null;
    city: string;
    stateProvince: string;
    zipPostalCode: string;
    primaryPhone: string;
    primaryPhoneType: string;
    secondaryPhone?: | null;
    secondaryPhoneType?: | null;
    primaryEmail: string;
    secondaryEmail?: | null;
    howHeard?: | null;

    // Household & Home Environment
    adultsInHome: string;
    childrenInHome?: | null;
    hasAllergies?: | null;
    householdAwareFoster: string;
    dwellingType: string;
    rentOrOwn: string;
    landlordPermission?: | null;
    yardType?: | null;
    separationPlan: string;

    // Current Pet Information
    hasCurrentPets: string;
    currentPetsDetails?: | null;
    currentPetsSpayedNeutered?: | null;
    currentPetsVaccinations?: | null;
    vetClinicName?: | null;
    vetPhone?: | null;

    // Foster Experience & Preferences
    hasFosteredBefore: string;
    previousFosterDetails?: | null;
    whyFoster: string;
    fosterAnimalTypes?: | null;
    willingMedical: string;
    willingBehavioral: string;
    commitmentLength: string;
    canTransport: string;
    transportExplanation?: | null;
    previousPetsDetails?: | null;

    // Waiver
    waiverAgreed: boolean;
    eSignatureName: string;

    // Admin Review Fields
    reviewedByUserId?: | null;
    reviewedByName?: | null;
    reviewDate?: | null;
    internalNotes?: | null;
}
