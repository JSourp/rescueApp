export interface FinalizeAdoptionFormDetail {
		// Adopter Info
		adopterFirstName: string;
		adopterLastName: string;
		adopterEmail: string;
		adopterPrimaryPhone: string;
		adopterPrimaryPhoneType: 'Cell' | 'Home' | 'Work' | '';
		adopterSecondaryPhone?: string;
		adopterSecondaryPhoneType?: 'Cell' | 'Home' | 'Work' | '';
		adopterStreetAddress: string;
		adopterAptUnit?: string;
		adopterCity: string;
		adopterStateProvince: string;
		adopterZipPostalCode: string;
		spousePartnerRoommate?: string;

		// Adoption Info
		adoptionDate: string; // Input type="date" provides YYYY-MM-DD string
		notes?: string;
}
