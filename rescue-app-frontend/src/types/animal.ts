import { AnimalImage } from './animalImage'; // Import the image type

export interface Animal {
	id: number;
	animalType?: string | null;
	name?: string | null;
	breed?: string | null;
	dateOfBirth?: string | null;
	gender?: string | null;
	weight?: number | null;
	story?: string | null;
	adoptionStatus?: string | null;
	dateCreated: string;             // (ISO Date String)
	dateUpdated: string;             // (ISO Date String)
	createdByUserId?: string | null; // (UUID as string)
	updatedByUserId?: string | null; // (UUID as string)

	// Collection of associated images - should be present for detail views
	animalImages?: AnimalImage[] | null;
}
