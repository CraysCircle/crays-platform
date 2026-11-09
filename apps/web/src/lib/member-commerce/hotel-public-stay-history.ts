import {isLocalizedPublicHotelPath} from "./hotel-public-locale-route";
import {HOTEL_STAY_DRAFT_SCHEMA, parseHotelStayDraft, type HotelStayDraft} from "@/lib/member-commerce/hotel-stay-draft";

const schema = "crays.hotel.public-unsaved-plan.v1";
export type PublicHotelDraft = HotelStayDraft & {bookingStep: 1 | 2 | 3};

export function publicHotelBackToSearch(initial: string, intent: {dateMode: "exact" | "flexible"; checkIn: string; checkOut: string; guests: number; guestsExplicit?: boolean; children: number; pets: number; flexibleMonth: string; range: number; calendarMonths?: number; nights: number}, variant: string): string {
  const url = new URL(initial, "https://www.craysclub.com");
  const q = url.searchParams;
  q.set("guests", String(intent.guests));q.set("children", String(intent.children));q.set("pets", String(intent.pets));
  if (intent.guestsExplicit) q.set("guest_selection", "explicit");else q.delete("guest_selection");
  q.set("date_mode", variant === "marina" ? "months" : intent.dateMode);
  if (intent.checkIn) q.set("date_from", intent.checkIn);else q.delete("date_from");
  if (intent.checkOut) q.set("date_to", intent.checkOut);else q.delete("date_to");
  if (intent.dateMode === "flexible" && intent.flexibleMonth && intent.flexibleMonth !== "Any month") q.set("flexible_month", intent.flexibleMonth);else q.delete("flexible_month");
  if (variant === "marina") {q.set("calendar_months", String(intent.calendarMonths ?? 1));q.delete("nights");q.delete("range");}
  else {q.set("nights", String(intent.nights));q.set("range", String(intent.range));q.delete("calendar_months");}
  return url.pathname + url.search;
}
export function parsePublicHotelDraft(value: unknown): PublicHotelDraft | null {
  const parsed = parseHotelStayDraft(value);
  if (parsed.status !== "valid_draft_only" || parsed.draft.bookingStep > 3 || parsed.draft.flexibleMonth !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(parsed.draft.flexibleMonth)) return null;
  return parsed.draft as PublicHotelDraft;
}
export function readPublicHotelHistory(state: unknown, propertyId: string): PublicHotelDraft | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const marker = (state as Record<string, unknown>).craysHotelPlanner;
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) return null;
  const m = marker as Record<string, unknown>;
  const keys = ["schema", "scope", "propertyId", "step", "draft"];
  if (Object.keys(m).length !== keys.length || keys.some(k => !Object.hasOwn(m, k)) || m.schema !== schema || m.scope !== "public-unsaved" || m.propertyId !== propertyId) return null;
  const draft = parsePublicHotelDraft(m.draft);
  return draft?.propertyId === propertyId && m.step === draft.bookingStep ? draft : null;
}
/** Merge only our marker; preserve Next's router tree and other history fields. */
export function publicHotelHistoryState(previous: unknown, draft: PublicHotelDraft): Record<string, unknown> {
  const base = previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {};
  return {...base, craysHotelPlanner: {schema, scope: "public-unsaved", propertyId: draft.propertyId, step: draft.bookingStep, draft}};
}
export function publicHotelDraftUrl(current: string, draft: PublicHotelDraft): string | null {
  const url = new URL(current);
  if (!isLocalizedPublicHotelPath(url.pathname, draft.propertyId)) return null;
  // Explicit public allowlist. No Core account/plan/command/admission IDs.
  const q = new URLSearchParams({stay_draft: "2", stay_step: String(draft.bookingStep), date_mode: draft.dateMode, guests: String(draft.adults), guest_selection: "explicit", children: String(draft.childAges.length), child_ages: JSON.stringify(draft.childAges), pets: String(draft.petRequests), range: String(draft.dateToleranceDays)});
  if (draft.arrivalDate) q.set("date_from", draft.arrivalDate);
  if (draft.departureDateExclusive) q.set("date_to", draft.departureDateExclusive);
  if (draft.calendarMonths !== null) q.set("calendar_months", String(draft.calendarMonths));
  if (draft.nights !== null) q.set("nights", String(draft.nights));
  if (draft.flexibleMonth) q.set("flexible_month", draft.flexibleMonth);
  if (draft.publicRoomTypeId) q.set("room_type", draft.publicRoomTypeId);
  if (draft.ambassadorSlug) q.set("ambassador_slug", draft.ambassadorSlug);
  if (draft.paymentSchedulePreference) q.set("payment_schedule", draft.paymentSchedulePreference);
  return url.pathname + "?" + q.toString() + url.hash;
}
export function readPublicHotelDraftUrl(current: string, propertyId: string): PublicHotelDraft | null {
  try {
    const url = new URL(current);
    if (!isLocalizedPublicHotelPath(url.pathname, propertyId) || url.search.length > 4096) return null;
    const q = url.searchParams;
    const keys = ["stay_draft", "stay_step", "date_mode", "guests", "guest_selection", "children", "child_ages", "pets", "range", "date_from", "date_to", "calendar_months", "nights", "flexible_month", "room_type", "ambassador_slug", "payment_schedule"];
    if (keys.some(k => q.getAll(k).length > 1) || q.get("stay_draft") !== "2") return null;
    const number = (name: string) => q.has(name) && /^\d+$/.test(q.get(name)!) ? Number(q.get(name)) : NaN;
    const childAges: unknown = JSON.parse(q.get("child_ages") ?? "[]");
    if (!Array.isArray(childAges) || number("children") !== childAges.length) return null;
    return parsePublicHotelDraft({schema: HOTEL_STAY_DRAFT_SCHEMA, propertyId, bookingStep: number("stay_step"), publicRoomTypeId: q.get("room_type"), dateMode: q.get("date_mode"), arrivalDate: q.get("date_from"), departureDateExclusive: q.get("date_to"), calendarMonths: q.has("calendar_months") ? number("calendar_months") : null, nights: q.has("nights") ? number("nights") : null, flexibleMonth: q.get("flexible_month"), dateToleranceDays: number("range"), adults: number("guests"), childAges, petRequests: number("pets"), ambassadorSlug: q.get("ambassador_slug"), paymentSchedulePreference: q.get("payment_schedule")});
  } catch {return null;}
}
export function readPublicHotelBootstrap(state: unknown, currentUrl: string, propertyId: string): PublicHotelDraft | null {
  try {
    if (!isLocalizedPublicHotelPath(new URL(currentUrl).pathname, propertyId)) return null;
    return readPublicHotelHistory(state, propertyId) ?? readPublicHotelDraftUrl(currentUrl, propertyId);
  } catch {return null;}
}
export function writePublicHotelHistory(history: Pick<History, "state" | "replaceState" | "pushState">, currentUrl: string, input: unknown, mode: "replace" | "push"): boolean {
  try {
    const draft = parsePublicHotelDraft(input);
    if (!draft) return false;
    const url = publicHotelDraftUrl(currentUrl, draft);
    if (!url) return false;
    history[mode === "push" ? "pushState" : "replaceState"](publicHotelHistoryState(history.state, draft), "", url);
    return true;
  } catch {return false;}
}
