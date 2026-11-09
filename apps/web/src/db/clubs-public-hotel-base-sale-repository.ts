import "server-only";
import {publicHotelBaseSaleInputSchema,checkedPublicHotelBaseSale,unavailablePublicHotelBaseSale,type PublicHotelBaseSale} from "@/lib/member-commerce/clubs-public-hotel-base-sale-contract";
export const PUBLIC_HOTEL_BASE_SALE_SQL="SELECT crays_core_rpc.club_public_hotel_planning_base_sale_prod_v1($1::text,$2::date) AS data";
export type PublicSaleQuery=(sql:string,values:readonly unknown[])=>Promise<{rows:unknown[]}>;
/** Restricted technical Core RPC only: no private principal/session/Finance arguments. */
export function createPublicHotelBaseSaleReader(query:PublicSaleQuery){return async(input:unknown):Promise<PublicHotelBaseSale>=>{const q=publicHotelBaseSaleInputSchema.parse(input);let result;try{result=await query(PUBLIC_HOTEL_BASE_SALE_SQL,[q.propertyId,q.asOf]);}catch{return unavailablePublicHotelBaseSale(q);}if(!result||!Array.isArray(result.rows)||result.rows.length!==1)throw Error("PUBLIC_SALE_CORE_ENVELOPE_INVALID");const row=result.rows[0];if(!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).join("|")!=="data")throw Error("PUBLIC_SALE_CORE_ENVELOPE_INVALID");return checkedPublicHotelBaseSale((row as {data:unknown}).data,q);};}
