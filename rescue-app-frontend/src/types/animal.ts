import { AnimalImage } from './animalImage'; // Import the image type

export interface Animal {
	id: number;
	animalType?: string | null;
	name?: string | null;
	species?: string | null;
	breed?: string | null;
	dateOfBirth?: string | null;
	gender?: string | null;
	weight?: number | null;
	story?: string | null;
	adoptionStatus?: string | null;
	dateCreated: string;
	dateUpdated: string;
	createdByUserId?: string | null;
	updatedByUserId?: string | null;
	animalImages?: AnimalImage[] | null;
	currentFosterUserId?: string | null;
	currentFosterName?: string | null;
}
