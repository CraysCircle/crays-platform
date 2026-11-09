import "server-only";
import {getProductionPublicPool} from "@/db/clubs-production-public-pool";
import {createHospitalityStayEstimateReader} from "@/db/hospitality-stay-estimate-repository";
import {hospitalityStayEstimateInputSchema} from "@/lib/member-commerce/hospitality-stay-estimate";
import {parseStayDay,resolveStayCalendarMonths} from "@/lib/member-commerce/clubs-calendar-month-stay";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};
const read=createHospitalityStayEstimateReader((sql,values)=>getProductionPublicPool().query(sql,values));
/** Production planning estimate only, never a checkout quote or payment amount. Client prices rejected. */
export async function POST(request:Request,context:{params:Promise<{propertyId:string}>}){
 const {propertyId}=await context.params;
 let selection;
 try{
  if(Number(request.headers.get("content-length")??0)>4096)throw Error("INPUT_TOO_LARGE");
  const text=await request.text();if(new TextEncoder().encode(text).length>4096)throw Error("INPUT_TOO_LARGE");
  selection=hospitalityStayEstimateInputSchema.parse(JSON.parse(text));
  if(selection.propertyId!==propertyId)throw Error("PROPERTY_MISMATCH");
  const nights=(parseStayDay(selection.departureDate).getTime()-parseStayDay(selection.arrivalDate).getTime())/86400000;
  if(nights<1||nights>366)throw Error("DATE_RANGE_INVALID");
  resolveStayCalendarMonths(selection.arrivalDate,selection.departureDate);
 }catch{return new Response(JSON.stringify({code:"HOSPITALITY_ESTIMATE_INPUT_INVALID"}),{status:400,headers});}
 try{return new Response(JSON.stringify(await read(selection)),{status:200,headers});}
 catch{return new Response(JSON.stringify({code:"HOSPITALITY_ESTIMATE_UNAVAILABLE",quote:null,bookable:false,bookingGranted:false,paymentGranted:false}),{status:503,headers});}
}
