import "server-only";
import {z} from "zod";
import {getProductionPublicPool} from "./clubs-production-public-pool";
import {publicHotelBaseSaleInputSchema} from "@/lib/member-commerce/clubs-public-hotel-base-sale-contract";
import {PUBLIC_HOTEL_BASE_SALE_SQL} from "./clubs-public-hotel-base-sale-repository";
const CONTENT="select crays_core_rpc.hospitality_public_content_prod_v1($1) result";
const MEDIA="select crays_core_rpc.hospitality_public_media_manifest_prod_v1($1::text) result";
const POLICY="SELECT crays_core_rpc.hospitality_public_planning_policy_prod_v1($1::text) AS data";
const SEARCH_SQL="SELECT crays_core_rpc.hospitality_public_content_prod_v1($1::text) AS content_data, crays_core_rpc.hospitality_public_media_manifest_prod_v1($1::text) AS media_data, crays_core_rpc.club_public_hotel_planning_base_sale_prod_v1($1::text,$2::date) AS rate_data";
const DETAIL_SQL=SEARCH_SQL+", crays_core_rpc.hospitality_public_planning_policy_prod_v1($1::text) AS policy_data";
const searchRow=z.object({content_data:z.unknown(),media_data:z.unknown(),rate_data:z.unknown()}).strict();
const detailRow=searchRow.extend({policy_data:z.unknown()}).strict();
/** Exactly one current request and property/date. Existing restricted pool
 * verifies roles/TLS/read-only authority. Every consumer still runs its full
 * original receipt/hash/publication/DTO validator. No shared data cache. */
export function createPublicHospitalityRequestBatch(propertyId:string,asOf:string,includePolicy:boolean){
 const input=publicHotelBaseSaleInputSchema.parse({propertyId,asOf});
 let batch: Promise<Record<string,unknown>> | undefined;
 const getBatch=()=>batch??=getProductionPublicPool().query(includePolicy?DETAIL_SQL:SEARCH_SQL,[input.propertyId,input.asOf]).then(result=>{
  if(result.rows.length!==1)throw Error("PUBLIC_HOSPITALITY_BATCH_INVALID");
  return includePolicy?detailRow.parse(result.rows[0]):searchRow.parse(result.rows[0]);
 });
 return {query:async(sql:string,values:readonly unknown[]):Promise<{rows:unknown[]}>=>{
  const field=sql===CONTENT?"content_data":sql===MEDIA?"media_data":sql===PUBLIC_HOTEL_BASE_SALE_SQL?"rate_data":includePolicy&&sql===POLICY?"policy_data":null;
  if(!field||values[0]!==input.propertyId||values.length!==(sql===PUBLIC_HOTEL_BASE_SALE_SQL?2:1)||(sql===PUBLIC_HOTEL_BASE_SALE_SQL&&values[1]!==input.asOf))throw Error("PUBLIC_HOSPITALITY_BATCH_SCOPE_INVALID");
  let data;
  try {data=await getBatch();} catch {
   // An optional function outage must retain previous independent readers.
   // This error-only path rechecks the same restricted pool; no fixtures.
   return getProductionPublicPool().query(sql,values);
  }
  return {rows:[{[sql===CONTENT||sql===MEDIA?"result":"data"]:(data as Record<string,unknown>)[field]}]};
 }};
}
