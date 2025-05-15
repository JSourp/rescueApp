import { FosteredAnimal } from './fosteredAnimal';
export interface FosterDetailDto {
	userId: string;
	fosterProfileId: number;
	firstName: string;
	lastName: string;
	email: string;
	primaryPhone?: string | null;
	isUserActive: boolean;
	userRole: string;
	approvalDate: string;
	isActiveFoster: boolean;
	availabilityNotes?: string | null;
	capacityDetails?: string | null;
	homeVisitDate?: string | null;
	homeVisitNotes?: string | null;
	profileDateCreated: string;
	profileDateUpdated: string;
	fosterApplicationId?: number | null;
	currentlyFostering: FosteredAnimal[];
}
