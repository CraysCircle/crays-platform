/** Current owner-approved sole operating company. */
export const CLUBS_OPERATING_ENTITY = {
  name: "Crays AG", displayName: "Crays AG",
  streetAddress: "Schindellegistrasse 73", locality: "Pfäffikon",
  postalCode: "CH-8808", country: "Switzerland", ceo: "Kai Thorben Biesenbach",
} as const;
export const CLUBS_OPERATING_ADDRESS = `${CLUBS_OPERATING_ENTITY.streetAddress}; ${CLUBS_OPERATING_ENTITY.postalCode} ${CLUBS_OPERATING_ENTITY.locality}, ${CLUBS_OPERATING_ENTITY.country}`;
export const CLUBS_OPERATING_DETAILS = `${CLUBS_OPERATING_ENTITY.name}; ${CLUBS_OPERATING_ADDRESS}`;
export const CLUBS_OPERATING_CEO = `CEO: ${CLUBS_OPERATING_ENTITY.ceo}`;
