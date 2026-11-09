import { isSafeDirectMembershipReturnTo } from "@/lib/clubs/direct-membership-application-contract";

// Navigation context only. This does not create or approve an application or persist a stay plan.
export function hotelDirectApplicationHref(returnTo: string): string {
  const safeReturn = isSafeDirectMembershipReturnTo(returnTo) ? returnTo : "/en/search";
  const locale = safeReturn.split("/")[1];
  return `/${locale}/apply-directly?returnTo=${encodeURIComponent(safeReturn)}`;
}

export function hotelApplicationContext(returnTo: string): { preferredArrivalWindow?: string; preferredParticipationLength?: string } {
  if (!isSafeDirectMembershipReturnTo(returnTo)) return {};
  const query=new URL(returnTo,"https://www.craysclub.com").searchParams;
  const arrival=query.get("date_from")??"";
  const date=/^\d{4}-\d{2}-\d{2}$/.test(arrival)?new Date(`${arrival}T00:00:00Z`):null;
  const validArrival=date&&Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===arrival;
  const months=Number(query.get("calendar_months"));
  if(query.get("date_mode")==="months"&&validArrival&&arrival.endsWith("-01")&&arrival>="2027-02-01"&&Number.isInteger(months)&&months>=1&&months<=12) {
    return {preferredArrivalWindow:new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(date),preferredParticipationLength:`${months} calendar ${months===1?"month":"months"}`};
  }
  let nights=Number(query.get("nights"));
  const checkout=query.get("date_to")??"";
  if(validArrival&&/^\d{4}-\d{2}-\d{2}$/.test(checkout)){
    const end=new Date(`${checkout}T00:00:00Z`);
    if(Number.isFinite(end.valueOf())&&end.toISOString().slice(0,10)===checkout)nights=(end.valueOf()-date.valueOf())/86400000;
  }
  if(!Number.isInteger(nights)||nights<1||nights>366)return {};
  const flexibleMonth=query.get("flexible_month")??"";
  const monthLabel=/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(flexibleMonth)?flexibleMonth:undefined;
  return {preferredArrivalWindow:validArrival?new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(date):monthLabel,preferredParticipationLength:`${nights} ${nights===1?"night":"nights"}`};
}
