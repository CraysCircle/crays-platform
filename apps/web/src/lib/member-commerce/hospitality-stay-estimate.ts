import {z} from "zod";
import {parseStayDay,resolveStayCalendarMonths} from "./clubs-calendar-month-stay";
import {parseHospitalityPublicPricingPolicy} from "./hospitality-public-pricing-policy";

export const hospitalityStayEstimateInputSchema=z.object({
 propertyId:z.literal("property-clubs-forest-city-marina"),
 publicRoomTypeId:z.string().regex(/^fc-marina-[a-z-]+$/),
 arrivalDate:z.string(),departureDate:z.string(),
 adults:z.number().int().min(1).max(2),
 childAges:z.array(z.number().int().min(0).max(14)).max(2)
}).strict().superRefine((selection,ctx)=>{
 try {
  const arrival=parseStayDay(selection.arrivalDate),departure=parseStayDay(selection.departureDate);
  const months=resolveStayCalendarMonths(selection.arrivalDate,selection.departureDate);
  if(selection.arrivalDate<"2027-02-01"||arrival.getUTCDate()!==1||departure.getUTCDate()!==1||months>12)throw Error("FULL_CALENDAR_MONTHS_REQUIRED");
 }catch{ctx.addIssue({code:"custom",message:"Choose 1–12 full calendar months, starting on the 1st, from February 2027."});}
});
export type HospitalityStayEstimateInput=z.infer<typeof hospitalityStayEstimateInputSchema>;
function safeMoney(value:bigint){if(value<0n||value>BigInt(Number.MAX_SAFE_INTEGER))throw Error("HOSPITALITY_ESTIMATE_AMOUNT_OUT_OF_RANGE");return value.toString();}
/** Core policy in; exact calendar dates and integer minor amounts out. No client prices,
 * native identity guesses, inventory confirmation or payment authorization are accepted.
 * This preparation feeds the canonical quote flow once its independent gates are met.
 */
export function calculateHospitalityStayEstimate(policyInput:unknown,input:unknown){
 const selection=hospitalityStayEstimateInputSchema.parse(input);
 const policy=parseHospitalityPublicPricingPolicy(policyInput,selection.propertyId);
 const arrival=parseStayDay(selection.arrivalDate),departure=parseStayDay(selection.departureDate);
 const nights=(departure.getTime()-arrival.getTime())/86400000;
 if(nights<1||nights>366)throw Error("HOSPITALITY_ESTIMATE_DATE_RANGE_INVALID");
 const months=resolveStayCalendarMonths(selection.arrivalDate,selection.departureDate);
 const category=policy.categories.find(item=>item.publicRoomTypeId===selection.publicRoomTypeId);
 if(!category||!policy.occupancy||policy.billingUnit!=="calendar-month")throw Error("HOSPITALITY_ESTIMATE_POLICY_UNAVAILABLE");
 const occupancy=policy.occupancy;
 const quantity=BigInt(months);
 const secondAdults=selection.adults-occupancy.includedAdults;
 const additionalRoomRequired=selection.childAges.length===2;
 const base=BigInt(category.baseUnitMinor)*quantity;
 const extraAdult=BigInt(occupancy.secondAdultUnitMinor)*quantity*BigInt(secondAdults);
 const extraRoom=additionalRoomRequired?BigInt(occupancy.additionalChildrenRoomUnitMinor)*quantity:0n;
 const lines=[{type:"accommodation" as const,quantity:months,unitAmountMinor:category.baseUnitMinor,totalMinor:safeMoney(base)}];
 const occupancyLines=[
 ...(secondAdults?[{type:"second-adult" as const,quantity:months,unitAmountMinor:occupancy.secondAdultUnitMinor,totalMinor:safeMoney(extraAdult)}]:[]),
 ...(additionalRoomRequired?[{type:"children-additional-room" as const,quantity:months,unitAmountMinor:occupancy.additionalChildrenRoomUnitMinor,totalMinor:safeMoney(extraRoom),servicesIncluded:false as const}]:[])
 ];
 return {schema:"crays.hospitality.production-stay-planning-estimate.v1" as const,status:"estimate" as const,pricingScope:"public-planning-only" as const,
 ...selection,currency:policy.currency,billingUnit:policy.billingUnit,calendarMonthPolicy:policy.calendarMonthPolicy,
 calendarMonths:months,nights,productionRevision:policy.productionRevision,policySha256:policy.policySha256,sourcePublicationId:policy.sourcePublicationId,sourceAdmissionSha256:policy.sourceAdmissionSha256,
 requiredRooms:additionalRoomRequired?2:1,additionalRoomRequired,lines:[...lines,...occupancyLines],
 accommodationAndServicesSubtotalMinor:safeMoney(base+extraAdult+extraRoom),
 paymentFeeMinor:null,finalTotalMinor:null,taxTreatmentVerified:false as const,
 availabilityVerified:false as const,additionalRoomAvailabilityVerified:false as const,
 quote:null,bookable:false as const,bookingGranted:false as const,paymentGranted:false as const};
}
