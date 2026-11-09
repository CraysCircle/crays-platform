import { createHash } from "node:crypto";

export const FOREST_CITY_SUNDAY_SANDBOX_SCHEMA =
  "crays.clubs.forest-city-sunday-sandbox-booking.v1" as const;
export const FOREST_CITY_SUNDAY_SANDBOX_SCENARIO =
  "cclub-sunday-fc-sandbox-v1" as const;

export const FOREST_CITY_GOLF_PROPERTY_ID =
  "property-clubs-forest-city-golf" as const;
export const FOREST_CITY_MARINA_PROPERTY_ID =
  "property-clubs-forest-city-marina" as const;

export type ForestCitySundaySandboxPropertyId =
  typeof FOREST_CITY_GOLF_PROPERTY_ID | typeof FOREST_CITY_MARINA_PROPERTY_ID;
export type ForestCitySundaySandboxStayUnit = "night" | "week" | "month";

export type ForestCitySundaySandboxOffer = Readonly<{
  offerId: string;
  propertyId: ForestCitySundaySandboxPropertyId;
  stayUnit: ForestCitySundaySandboxStayUnit;
  currency: "USD";
  unitAmountMinor: number;
  capacityUnits: 3;
  roomCategoryId: null;
  allocationScope: "sandbox_property_level_not_room_category";
}>;

const offer = (
  offerId: string,
  propertyId: ForestCitySundaySandboxPropertyId,
  stayUnit: ForestCitySundaySandboxStayUnit,
  unitAmountMinor: number,
): ForestCitySundaySandboxOffer => ({
  offerId,
  propertyId,
  stayUnit,
  currency: "USD",
  unitAmountMinor,
  capacityUnits: 3,
  roomCategoryId: null,
  allocationScope: "sandbox_property_level_not_room_category",
});

export const FOREST_CITY_SUNDAY_SANDBOX_OFFERS = [
  offer("fc-sunday-golf-night", FOREST_CITY_GOLF_PROPERTY_ID, "night", 26_000),
  offer("fc-sunday-golf-week", FOREST_CITY_GOLF_PROPERTY_ID, "week", 150_000),
  offer("fc-sunday-golf-month", FOREST_CITY_GOLF_PROPERTY_ID, "month", 520_000),
  offer(
    "fc-sunday-marina-month",
    FOREST_CITY_MARINA_PROPERTY_ID,
    "month",
    350_000,
  ),
] as const satisfies readonly ForestCitySundaySandboxOffer[];

export const FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY = Object.freeze({
  schema: FOREST_CITY_SUNDAY_SANDBOX_SCHEMA,
  version: "1.0.0",
  scenarioKey: FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
  environment: "sandbox",
  syntheticSource: true,
  providerAuthority: false,
  productionAuthority: false,
  paymentAuthority: false,
  roomRateAllocationReady: false,
  adapterState: "not_configured_sandbox_only",
} as const);

export class ForestCitySundaySandboxContractError extends Error {
  constructor(
    readonly code:
      | "SANDBOX_OFFER_NOT_FOUND"
      | "SANDBOX_INVALID_DATE"
      | "SANDBOX_INVALID_STAY"
      | "SANDBOX_PARTY_GO_REQUIRED"
      | "SANDBOX_MEMBERSHIP_REQUIRED"
      | "SANDBOX_PROPERTY_ADMISSION_REQUIRED",
  ) {
    super(code.toLowerCase());
    this.name = "ForestCitySundaySandboxContractError";
  }
}

function utcDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_INVALID_DATE");
  }
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  ) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_INVALID_DATE");
  }
  return timestamp;
}

export function getForestCitySundaySandboxOffer(input: {
  propertyId: ForestCitySundaySandboxPropertyId;
  stayUnit: ForestCitySundaySandboxStayUnit;
}) {
  const found = FOREST_CITY_SUNDAY_SANDBOX_OFFERS.find(
    (candidate) =>
      candidate.propertyId === input.propertyId &&
      candidate.stayUnit === input.stayUnit,
  );
  if (!found) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_OFFER_NOT_FOUND");
  }
  return found;
}

export function validateForestCitySundaySandboxStay(input: {
  propertyId: ForestCitySundaySandboxPropertyId;
  stayUnit: ForestCitySundaySandboxStayUnit;
  checkIn: string;
  checkOut: string;
}) {
  const start = utcDay(input.checkIn);
  const end = utcDay(input.checkOut);
  const nights = (end - start) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_INVALID_STAY");
  }

  const valid =
    input.propertyId === FOREST_CITY_GOLF_PROPERTY_ID
      ? (input.stayUnit === "night" && nights <= 30) ||
        (input.stayUnit === "week" && nights === 7) ||
        (input.stayUnit === "month" && nights === 30)
      : input.propertyId === FOREST_CITY_MARINA_PROPERTY_ID &&
        input.stayUnit === "month" &&
        nights === 30;

  if (!valid) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_INVALID_STAY");
  }

  const offer = getForestCitySundaySandboxOffer(input);
  return {
    ...input,
    nights,
    unitCount: input.stayUnit === "night" ? nights : 1,
    offer,
  } as const;
}

export function calculateForestCitySundaySandboxQuote(input: {
  propertyId: ForestCitySundaySandboxPropertyId;
  stayUnit: ForestCitySundaySandboxStayUnit;
  checkIn: string;
  checkOut: string;
  quantity?: number;
}) {
  const stay = validateForestCitySundaySandboxStay(input);
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_INVALID_STAY");
  }
  return {
    ...stay,
    quantity,
    currency: stay.offer.currency,
    subtotalMinor: stay.offer.unitAmountMinor * stay.unitCount * quantity,
    totalMinor: stay.offer.unitAmountMinor * stay.unitCount * quantity,
  } as const;
}

export type ForestCitySundaySandboxHoldEvidence = {
  partyGoReceiptId?: string | null;
  membershipId?: string | null;
  admissionGrantId?: string | null;
};

export function validateForestCitySundaySandboxHoldEvidence(
  propertyId: ForestCitySundaySandboxPropertyId,
  evidence: ForestCitySundaySandboxHoldEvidence,
) {
  if (!evidence.partyGoReceiptId?.trim()) {
    throw new ForestCitySundaySandboxContractError("SANDBOX_PARTY_GO_REQUIRED");
  }
  if (propertyId === FOREST_CITY_MARINA_PROPERTY_ID) {
    if (!evidence.membershipId?.trim()) {
      throw new ForestCitySundaySandboxContractError(
        "SANDBOX_MEMBERSHIP_REQUIRED",
      );
    }
    if (!evidence.admissionGrantId?.trim()) {
      throw new ForestCitySundaySandboxContractError(
        "SANDBOX_PROPERTY_ADMISSION_REQUIRED",
      );
    }
  }
  return {
    partyGoReceiptId: evidence.partyGoReceiptId,
    membershipId: evidence.membershipId ?? null,
    admissionGrantId: evidence.admissionGrantId ?? null,
  } as const;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function forestCitySundaySandboxRequestSha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}
