import { MARINA_EARLIEST_ARRIVAL } from "./hotel-stay-policy";
/** Untrusted visitor preferences only. Never a quote, reservation or access grant. */
export const HOTEL_MEMBER_PREFERENCE_SCHEMA = "crays.hotel.member-stay-preferences.v1";
export const HOTEL_ROOM_CATEGORY_IDS = {
  "property-clubs-forest-city-marina": ["fc-marina-deluxe-king", "fc-marina-deluxe-suite", "fc-marina-deluxe-twin", "fc-marina-presidential", "fc-marina-superior-king", "fc-marina-superior-suite", "fc-marina-superior-twin"],
  "property-clubs-forest-city-golf": ["fc-golf-accessible", "fc-golf-deluxe", "fc-golf-deluxe-suite", "fc-golf-family-suite", "fc-golf-presidential", "fc-golf-superior", "fc-golf-superior-suite"],
} as const;
const categoryIds = HOTEL_ROOM_CATEGORY_IDS;
export type HotelPreferencePropertyId = keyof typeof categoryIds;
export type HotelMemberStayPreferences = Readonly<{
  schema: typeof HOTEL_MEMBER_PREFERENCE_SCHEMA;
  propertyId: HotelPreferencePropertyId;
  publicRoomTypeId: string;
  arrivalDate: string;
  departureDateExclusive: string;
  calendarMonths: number | null;
  adults: number;
  childAges: readonly number[];
  ambassadorSlug: string | null;
  paymentSchedulePreference: "FULL_UPFRONT" | "MONTHLY" | null;
}>;
export type HotelPreferenceParseResult =
  | Readonly<{ status: "valid_preferences_only"; preferences: HotelMemberStayPreferences }>
  | Readonly<{ status: "invalid_preferences"; reason: string }>;
const keys = ["schema", "propertyId", "publicRoomTypeId", "arrivalDate", "departureDateExclusive", "calendarMonths", "adults", "childAges", "ambassadorSlug", "paymentSchedulePreference"];
function realDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** Strict parsing rejects money, account IDs, approvals and provider identifiers. */
export function parseHotelMemberStayPreferences(value: unknown): HotelPreferenceParseResult {
  const invalid = (reason: string): HotelPreferenceParseResult => ({ status: "invalid_preferences", reason });
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("object_required");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(input, key))) return invalid("unexpected_or_missing_fields");
  if (input.schema !== HOTEL_MEMBER_PREFERENCE_SCHEMA) return invalid("schema_mismatch");
  if (typeof input.propertyId !== "string" || !Object.hasOwn(categoryIds, input.propertyId)) return invalid("unknown_property");
  const propertyId = input.propertyId as HotelPreferencePropertyId;
  if (typeof input.publicRoomTypeId !== "string" || !(categoryIds[propertyId] as readonly string[]).includes(input.publicRoomTypeId)) return invalid("category_property_mismatch");
  if (!realDay(input.arrivalDate) || !realDay(input.departureDateExclusive)) return invalid("invalid_calendar_dates");
  const nights = (Date.parse(input.departureDateExclusive + "T00:00:00Z") - Date.parse(input.arrivalDate + "T00:00:00Z")) / 86400000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 366) return invalid("stay_length_invalid");
  const marina = propertyId === "property-clubs-forest-city-marina";
  if (!Number.isInteger(input.adults) || Number(input.adults) < 1 || Number(input.adults) > (marina ? 2 : 6)) return invalid("adults_invalid");
  if (!Array.isArray(input.childAges) || input.childAges.length > 2 || input.childAges.some(age => !Number.isInteger(age) || age < 0 || age > 17)) return invalid("child_ages_invalid");
  if (marina && input.childAges.some(age => age > 14)) return invalid("marina_older_child_requires_separate_review");
  if (input.ambassadorSlug !== null && (typeof input.ambassadorSlug !== "string" || !/^[a-z0-9][a-z0-9-]{0,159}$/.test(input.ambassadorSlug))) return invalid("ambassador_preference_invalid");
  if (![null, "FULL_UPFRONT", "MONTHLY"].includes(input.paymentSchedulePreference as null | string)) return invalid("payment_preference_invalid");
  if (marina) {
    if (input.arrivalDate < MARINA_EARLIEST_ARRIVAL) return invalid("marina_arrival_before_opening");
    if (!Number.isInteger(input.calendarMonths) || Number(input.calendarMonths) < 1 || Number(input.calendarMonths) > 12 || !input.arrivalDate.endsWith("-01")) return invalid("full_calendar_months_required");
    const start = new Date(input.arrivalDate + "T00:00:00Z");
    const expected = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + Number(input.calendarMonths), 1)).toISOString().slice(0, 10);
    if (input.departureDateExclusive !== expected) return invalid("calendar_month_end_mismatch");
    if (input.paymentSchedulePreference === "MONTHLY" && input.calendarMonths === 1) return invalid("monthly_schedule_requires_multiple_months");
  } else if (input.calendarMonths !== null || input.paymentSchedulePreference === "MONTHLY") return invalid("golf_schedule_not_supported");
  return { status: "valid_preferences_only", preferences: {
    schema: HOTEL_MEMBER_PREFERENCE_SCHEMA,
    propertyId,
    publicRoomTypeId: input.publicRoomTypeId,
    arrivalDate: input.arrivalDate,
    departureDateExclusive: input.departureDateExclusive,
    calendarMonths: input.calendarMonths as number | null,
    adults: Number(input.adults),
    childAges: [...input.childAges],
    ambassadorSlug: input.ambassadorSlug as string | null,
    paymentSchedulePreference: input.paymentSchedulePreference as "FULL_UPFRONT" | "MONTHLY" | null,
  } };
}
