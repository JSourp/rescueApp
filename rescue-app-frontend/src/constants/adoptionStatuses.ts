export const adoptionStatuses = [
	"Adopted",
	"Adoption Pending",
	"Available",
	"Available - In Foster",
	"Behavioral Hold",
	"Behavioral Hold - With Trainer",
	"Died in Care",
	"Euthanized",
	"Lost in Care",
	"Medical Hold",
	"Medical Hold - In Foster",
	"Not Yet Available",
	"Returned to Owner",
	"Stray Hold",
	"Transferred",
  ];

/* Adoption Statuses Details, should probably make this it's own page eventually.
 *
 *** This is the best status for new intake animals that are not available for adoption yet ***
 * "Not Yet Available" - Default status for new animals. This indicates that the animal is not yet ready for adoption. This status should be used when:
		○ The animal is not yet spayed/neutered, or is recovering from surgery.
		○ The animal is not yet up to date on vaccinations.
		○ The animal is not yet ready for a meet & greet.
		○ The animal is not yet ready for adoption for any other reason.
 *
 *
 *** These can be spotlight animals on the homepage, which is the top two results filtered by status sorted by longest stay with us ***
 * "Available" - The animal is healthy, ready for a home, and we are accepting applications. This is the primary status potential adopters will look for.
 * "Available - In Foster" - The animal is healthy, ready for a home, and we are accepting applications, while they are in foster care. This is the primary status potential adopters will look for.
 *
 *
 *** The below status is not able to be a spotlight animal on the homepage, they are listed on the Available Animals page ***
 * "Adoption Pending" - This indicates an adoption in progress. Use this when:
		○ An application has been approved, and we are finalizing details (meet & greet, home check).
		○ The animal is on a short hold for a specific potential adopter.
		○ Display: While they can still be found on our Available Animals page, they are clearly marked as "Adoption Pending" to prevent a flood of new applications while still showing the animal is in our care.
 *
 *
 *** This is the the goal for everyone in our care ***
 * "Adopted" - The animal has officially gone to its new home. Animals with this status can be found on our Graduates page.
 *
 *
 *** These are the best statuses for animals that are not available for adoption, but are still in our care ***
 * "Behavioral Hold" - Undergoing behavior assessment or modification, on site or in foster care.
 * "Behavioral Hold - With Trainer" - Undergoing behavior assessment or modification with a trainer, not on site.
 * "Medical Hold" - Recovering from illness, injury, or surgery (like spay/neuter), on site or in foster care.
 * "Medical Hold - In Foster" - Recovering from illness, injury, or surgery (like spay/neuter), not on site.
 * "Stray Hold" - Legally required holding period for stray animals before they can become available.
 *
 *
 *** These are the best statuses for animals that are not available for adoption, and are no longer in our care  ***
 * "Returned to Owner" - An outcome status for stray animals reunited with their owners.
 * "Transferred" - An outcome status when an animal is moved to another rescue or shelter partner.
 *
 *
 *** These are the worst statuses for animals that are no longer in our care. This is one way that we can provide full transparency. ***
 * "Lost in Care" -
 * "Died in Care" -
 * "Euthanized" -
*/
