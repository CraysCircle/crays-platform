import {memberCalendarDateValid} from "./clubs-member-home-model";
export type StayDepartureSemantics="inclusive_last_day"|"exclusive_checkout";
export type InterpretedStayDates={arrivalDate:string|null;departureDate:string|null;departureDateSemantics:StayDepartureSemantics|null};
/** The persisted record supplies date meaning; property IDs never infer it. */
export function memberInterpretedStayPeriod(stay:InterpretedStayDates,today:string|null):"upcoming"|"current"|"past"|null{
 if(!memberCalendarDateValid(today)||!memberCalendarDateValid(stay.arrivalDate)||!memberCalendarDateValid(stay.departureDate)||!stay.departureDateSemantics)return null;
 if(stay.departureDateSemantics!=="inclusive_last_day"&&stay.departureDateSemantics!=="exclusive_checkout")return null;
 if(stay.arrivalDate>stay.departureDate||stay.departureDateSemantics==="exclusive_checkout"&&stay.arrivalDate===stay.departureDate)return null;
 if(stay.departureDate<today||stay.departureDate===today&&stay.departureDateSemantics==="exclusive_checkout")return "past";
 return stay.arrivalDate>today?"upcoming":"current";
}

/** Hotel lifecycle uses the persisted location timezone, including midnight boundaries. */
export function memberStayLocalDate(now:Date,timezone:string):string|null{
 if(!Number.isFinite(now.getTime())||!timezone)return null;
 try{
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const value=["year","month","day"].map(kind=>parts.find(part=>part.type===kind)?.value??"").join("-");
  return memberCalendarDateValid(value)?value:null;
 }catch{return null;}
}
export function memberInterpretedStayPeriodAt(stay:InterpretedStayDates,now:Date,timezone:string){
 return memberInterpretedStayPeriod(stay,memberStayLocalDate(now,timezone));
}
