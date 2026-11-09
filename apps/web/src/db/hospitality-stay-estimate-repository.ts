import "server-only";
import {createPublicHotelBaseSaleReader,type PublicSaleQuery} from "./clubs-public-hotel-base-sale-repository";
import {calculateHospitalityStayEstimate,hospitalityStayEstimateInputSchema} from "@/lib/member-commerce/hospitality-stay-estimate";
import {parseStayDay} from "@/lib/member-commerce/clubs-calendar-month-stay";
/** Uses only admitted, readonly Core RPCs. No direct private-table or provider access. */
export function createHospitalityStayEstimateReader(query:PublicSaleQuery){
 const readBase=createPublicHotelBaseSaleReader(query);
 return async(input:unknown)=>{
  const selection=hospitalityStayEstimateInputSchema.parse(input);
  const departure=parseStayDay(selection.departureDate);departure.setUTCDate(departure.getUTCDate()-1);
  const lastNight=departure.toISOString().slice(0,10);
  const start=await readBase({propertyId:selection.propertyId,asOf:selection.arrivalDate});
  const end=await readBase({propertyId:selection.propertyId,asOf:lastNight});
  if(start.status!=="ready"||end.status!=="ready"||start.sourcePublicationId!==end.sourcePublicationId||start.sourceAdmissionSha256!==end.sourceAdmissionSha256)throw Error("HOSPITALITY_ESTIMATE_SOURCE_REVISION_UNAVAILABLE");
  const result=await query("SELECT crays_core_rpc.hospitality_public_planning_policy_prod_v1($1::text) AS data",[selection.propertyId]);
  const row=result.rows[0];if(result.rows.length!==1||!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).join("|")!=="data")throw Error("HOSPITALITY_ESTIMATE_POLICY_UNAVAILABLE");
  const estimate=calculateHospitalityStayEstimate((row as {data:unknown}).data,selection);
  if(estimate.sourcePublicationId!==start.sourcePublicationId||estimate.sourceAdmissionSha256!==start.sourceAdmissionSha256)throw Error("HOSPITALITY_ESTIMATE_SOURCE_REVISION_CHANGED");
  return {...estimate,priceValidityVerified:false as const};
 };
}
