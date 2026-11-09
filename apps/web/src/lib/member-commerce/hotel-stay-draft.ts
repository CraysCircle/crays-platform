import { HOTEL_ROOM_CATEGORY_IDS, type HotelPreferencePropertyId } from "./hotel-member-preferences";
import { MARINA_EARLIEST_ARRIVAL } from "./hotel-stay-policy";

/** Planning input only. Account ownership, admission, availability and prices are server-owned. */
export const HOTEL_STAY_DRAFT_SCHEMA = "crays.hotel.stay-draft.v2";
export type HotelStayDraft = Readonly<{
  schema: typeof HOTEL_STAY_DRAFT_SCHEMA;
  propertyId: HotelPreferencePropertyId;
  bookingStep: 1 | 2 | 3 | 4;
  publicRoomTypeId: string | null;
  dateMode: "months" | "exact" | "flexible";
  arrivalDate: string | null;
  departureDateExclusive: string | null;
  calendarMonths: number | null;
  nights: number | null;
  flexibleMonth: string | null;
  dateToleranceDays: number;
  adults: number;
  childAges: readonly (number | null)[];
  petRequests: number;
  ambassadorSlug: string | null;
  paymentSchedulePreference: "FULL_UPFRONT" | "MONTHLY" | null;
}>;
export type HotelStayDraftParseResult =
  | Readonly<{ status: "valid_draft_only"; draft: HotelStayDraft }>
  | Readonly<{ status: "invalid_draft"; reason: string }>;
const fields = ["schema", "propertyId", "bookingStep", "publicRoomTypeId", "dateMode", "arrivalDate", "departureDateExclusive", "calendarMonths", "nights", "flexibleMonth", "dateToleranceDays", "adults", "childAges", "petRequests", "ambassadorSlug", "paymentSchedulePreference"];
function day(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
export function parseHotelStayDraft(value: unknown): HotelStayDraftParseResult {
  const invalid = (reason: string): HotelStayDraftParseResult => ({ status: "invalid_draft", reason });
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("object_required");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !fields.includes(key)) || fields.some(key => !Object.hasOwn(input, key))) return invalid("unexpected_or_missing_fields");
  if (input.schema !== HOTEL_STAY_DRAFT_SCHEMA) return invalid("schema_mismatch");
  if (typeof input.propertyId !== "string" || !Object.hasOwn(HOTEL_ROOM_CATEGORY_IDS, input.propertyId)) return invalid("unknown_property");
  const propertyId = input.propertyId as HotelPreferencePropertyId;
  const marina = propertyId === "property-clubs-forest-city-marina";
  if (!integer(input.bookingStep, 1, 4)) return invalid("booking_step_invalid");
  if (input.publicRoomTypeId !== null && (typeof input.publicRoomTypeId !== "string" || !(HOTEL_ROOM_CATEGORY_IDS[propertyId] as readonly string[]).includes(input.publicRoomTypeId))) return invalid("category_property_mismatch");
  if (input.bookingStep >= 3 && input.publicRoomTypeId === null) return invalid("review_requires_selected_room");
  if (!integer(input.adults, 1, marina ? 2 : 6)) return invalid("adults_invalid");
  if (!Array.isArray(input.childAges) || input.childAges.length > 2 || input.childAges.some(age => age !== null && !integer(age, 0, marina ? 14 : 17))) return invalid("child_ages_invalid");
  if (input.bookingStep >= 2 && input.childAges.some(age => age === null)) return invalid("child_ages_required_to_continue");
  if (!integer(input.petRequests, 0, 12)) return invalid("pet_requests_invalid");
  if (input.ambassadorSlug !== null && (typeof input.ambassadorSlug !== "string" || !/^[a-z0-9][a-z0-9-]{0,159}$/.test(input.ambassadorSlug))) return invalid("ambassador_preference_invalid");
  if (![null, "FULL_UPFRONT", "MONTHLY"].includes(input.paymentSchedulePreference as string | null)) return invalid("payment_preference_invalid");
  if (!integer(input.dateToleranceDays, 0, 14)) return invalid("date_tolerance_invalid");
  if (input.flexibleMonth !== null && (typeof input.flexibleMonth !== "string" || input.flexibleMonth.length === 0 || input.flexibleMonth.length > 64 || /[\x00-\x1f\x7f]/.test(input.flexibleMonth))) return invalid("flexible_month_invalid");
  const undated = input.arrivalDate === null && input.departureDateExclusive === null;
  if (!undated && (!day(input.arrivalDate) || !day(input.departureDateExclusive))) return invalid("invalid_calendar_dates");
  if (undated && input.bookingStep > 1) return invalid("dated_stay_required_to_continue");
  if (marina) {
    if (input.dateMode !== "months" || input.nights !== null || input.flexibleMonth !== null || input.dateToleranceDays !== 0 || undated) return invalid("marina_full_calendar_months_required");
    if (!integer(input.calendarMonths, 1, 12) || !day(input.arrivalDate) || input.arrivalDate < MARINA_EARLIEST_ARRIVAL || !input.arrivalDate.endsWith("-01")) return invalid("marina_start_month_invalid");
    const start = new Date(input.arrivalDate + "T00:00:00Z");
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + input.calendarMonths, 1)).toISOString().slice(0, 10);
    if (input.departureDateExclusive !== end) return invalid("calendar_month_end_mismatch");
    if (input.paymentSchedulePreference === "MONTHLY" && input.calendarMonths === 1) return invalid("monthly_schedule_requires_multiple_months");
  } else {
    if (!["exact", "flexible"].includes(input.dateMode as string) || input.calendarMonths !== null || !integer(input.nights, 1, 366) || input.paymentSchedulePreference === "MONTHLY") return invalid("golf_stay_invalid");
    if (input.dateMode === "exact" && input.flexibleMonth !== null) return invalid("exact_dates_cannot_have_flexible_month");
    if (!undated && day(input.arrivalDate) && day(input.departureDateExclusive)) {
      const nights = (Date.parse(input.departureDateExclusive + "T00:00:00Z") - Date.parse(input.arrivalDate + "T00:00:00Z")) / 86400000;
      if (nights !== input.nights) return invalid("night_count_mismatch");
    }
  }
  return { status: "valid_draft_only", draft: {
    schema: HOTEL_STAY_DRAFT_SCHEMA, propertyId,
    bookingStep: input.bookingStep as HotelStayDraft["bookingStep"],
    publicRoomTypeId: input.publicRoomTypeId as string | null,
    dateMode: input.dateMode as HotelStayDraft["dateMode"],
    arrivalDate: input.arrivalDate as string | null,
    departureDateExclusive: input.departureDateExclusive as string | null,
    calendarMonths: input.calendarMonths as number | null,
    nights: input.nights as number | null,
    flexibleMonth: input.flexibleMonth as string | null,
    dateToleranceDays: input.dateToleranceDays,
    adults: input.adults, childAges: [...input.childAges], petRequests: input.petRequests,
    ambassadorSlug: input.ambassadorSlug as string | null,
    paymentSchedulePreference: input.paymentSchedulePreference as HotelStayDraft["paymentSchedulePreference"],
  } };
}
