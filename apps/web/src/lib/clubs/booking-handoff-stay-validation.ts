import { parseStayDay, resolveStayCalendarMonths } from "../member-commerce/clubs-calendar-month-stay";

type HandoffStay = Readonly<{
  propertyId: string;
  dateMode: "exact" | "flexible";
  checkIn: string | null;
  checkOut: string | null;
  flexibleMonth: string | null;
  stayUnit: "night" | "week" | "month";
  nights: number | null;
}>;

/** Validate dates before storing a handoff; this grants no booking authority. */
export function bookingHandoffStayError(stay: HandoffStay): string | null {
  const marina = stay.propertyId === "property-clubs-forest-city-marina";
  if (marina && (stay.stayUnit !== "month" || stay.dateMode !== "exact"))
    return "Marina requires full calendar months";
  if (stay.dateMode === "flexible") {
    if (!stay.flexibleMonth) return "Flexible month is required";
    try { parseStayDay(`${stay.flexibleMonth}-01`); }
    catch { return "Flexible month is invalid"; }
    return null;
  }
  if (!stay.checkIn || !stay.checkOut) return "Exact dates are required";
  let arrival: Date, departure: Date;
  try {
    arrival = parseStayDay(stay.checkIn);
    departure = parseStayDay(stay.checkOut);
  } catch { return "Exact dates are invalid"; }
  const nights = (departure.getTime() - arrival.getTime()) / 86_400_000;
  if (!Number.isSafeInteger(nights) || nights < 1 || nights > 366)
    return "Stay must contain 1–366 nights";
  if (stay.nights !== null && stay.nights !== nights)
    return "Duration does not match the selected dates";
  if (marina) {
    if (stay.checkIn < "2027-02-01" || arrival.getUTCDate() !== 1 || departure.getUTCDate() !== 1)
      return "Marina starts on the first of a month from February 2027";
    try {
      const months = resolveStayCalendarMonths(stay.checkIn, stay.checkOut);
      if (months > 12) return "Marina permits 1–12 calendar months";
    } catch { return "Marina requires full calendar months"; }
  }
  return null;
}
