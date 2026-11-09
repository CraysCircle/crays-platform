import "server-only";
import {getProductionPublicPool} from "@/db/clubs-production-public-pool";
import {createPublicHotelBaseSaleReader} from "@/db/clubs-public-hotel-base-sale-repository";
import {publicHotelBaseSaleInputSchema,unavailablePublicHotelBaseSale} from "@/lib/member-commerce/clubs-public-hotel-base-sale-contract";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};
const read=createPublicHotelBaseSaleReader((sql,values)=>getProductionPublicPool().query(sql,values));
export async function GET(request:Request,context:{params:Promise<{propertyId:string}>}) {
 const {propertyId}=await context.params;
 const asOf=new URL(request.url).searchParams.get("asOf")??new Date().toISOString().slice(0,10);
 const parsed=publicHotelBaseSaleInputSchema.safeParse({propertyId,asOf});
 if(!parsed.success)return new Response(JSON.stringify({code:"PUBLIC_HOTEL_SALE_INPUT_INVALID"}),{status:400,headers});
 try { const sale=await read(parsed.data);return new Response(JSON.stringify(sale),{status:sale.status==="ready"?200:503,headers}); }
 catch { return new Response(JSON.stringify(unavailablePublicHotelBaseSale(parsed.data)),{status:503,headers}); }
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
