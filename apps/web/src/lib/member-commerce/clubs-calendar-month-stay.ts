export const CALENDAR_MONTH_POLICY = "calendar-month-anchor-clamp-v1" as const;
export function parseStayDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("STAY_DATE_INVALID");
  const result = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(result.getTime()) || result.getUTCFullYear() < 1900 || result.toISOString().slice(0,10) !== value) throw new Error("STAY_DATE_INVALID");
  return result;
}
export function addStayCalendarMonths(arrivalDate: string, months: number): string {
  const arrival = parseStayDay(arrivalDate);
  if (!Number.isSafeInteger(months) || months < 1 || months > 1200) throw new Error("STAY_MONTH_COUNT_INVALID");
  const absoluteMonth = arrival.getUTCFullYear()*12 + arrival.getUTCMonth() + months;
  const year = Math.floor(absoluteMonth/12), month = absoluteMonth%12;
  if (year > 9999) throw new Error("STAY_DATE_INVALID");
  const first = new Date(0);first.setUTCFullYear(year,month+1,1);first.setUTCDate(0);
  const lastDay = first.getUTCDate();
  const departure = new Date(0);departure.setUTCFullYear(year,month,Math.min(arrival.getUTCDate(),lastDay));
  return departure.toISOString().slice(0,10);
}
export function resolveStayCalendarMonths(arrivalDate: string, departureDate: string): number {
  const arrival = parseStayDay(arrivalDate), departure = parseStayDay(departureDate);
  const months=(departure.getUTCFullYear()-arrival.getUTCFullYear())*12+departure.getUTCMonth()-arrival.getUTCMonth();
  if (months < 1 || addStayCalendarMonths(arrivalDate,months) !== departureDate) throw new Error("STAY_CALENDAR_MONTH_RANGE_INVALID");
  return months;
}
