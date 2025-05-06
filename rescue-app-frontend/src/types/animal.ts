import { AnimalImage } from './animalImage';

export interface Animal {
	id: number;
	animal_type?: string | null;
	name?: string | null;
	breed?: string | null;
	date_of_birth?: string | null;
	gender?: string | null;
	weight?: number | null;
	story?: string | null;
	adoption_status?: string | null;
	date_created: string;
	date_updated: string;
	created_by_user_id: string;
	updated_by_user_id: string;
	primaryImageUrl?: string | null;
	animalImages?: AnimalImage[] | null;
}
