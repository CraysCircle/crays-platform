/** Owner-approved Club operating entity. Association identity is separate and unchanged. */
export const CLUBS_OPERATING_ENTITY = {
  name: "CRAYS CLUB SG PTE. LTD.",
  displayName: "Crays Club SG Pte. Ltd.",
  streetAddress: "68 Circular Road, #02-001",
  locality: "Singapore",
  postalCode: "049422",
  directors: ["Robin H. Karlsen", "Isabel-Maria Jewroski", "Stephanie Weyer", "Anouk Knuffmann"],
} as const;
export const CLUBS_OPERATING_ADDRESS = `${CLUBS_OPERATING_ENTITY.streetAddress}; ${CLUBS_OPERATING_ENTITY.locality} ${CLUBS_OPERATING_ENTITY.postalCode}`;
export const CLUBS_OPERATING_DETAILS = `${CLUBS_OPERATING_ENTITY.name}; ${CLUBS_OPERATING_ADDRESS}`;
export const CLUBS_OPERATING_BOARD = `Board of Directors: ${CLUBS_OPERATING_ENTITY.directors.join("; ")}`;
