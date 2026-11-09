import "server-only";
import {getProductionPublicPool} from "@/db/clubs-production-public-pool";
import {hospitalityPricingPropertySchema,parseHospitalityPublicPricingPolicy} from "@/lib/member-commerce/hospitality-public-pricing-policy";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};
/** Public admitted production planning policy only. Native IDs, credentials and writable commerce stay server-side. */
export async function GET(_request:Request,context:{params:Promise<{propertyId:string}>}){
 const {propertyId}=await context.params;const parsed=hospitalityPricingPropertySchema.safeParse(propertyId);
 if(!parsed.success)return new Response(JSON.stringify({code:"HOSPITALITY_PRICING_INPUT_INVALID"}),{status:400,headers});
 try{const result=await getProductionPublicPool().query("SELECT crays_core_rpc.hospitality_public_planning_policy_prod_v1($1::text) AS data",[parsed.data]);
 const row=result.rows[0];if(result.rows.length!==1||!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).join("|")!=="data")throw Error("HOSPITALITY_PRICING_UNAVAILABLE");const policy=parseHospitalityPublicPricingPolicy((row as {data:unknown}).data,parsed.data);
 return new Response(JSON.stringify(policy),{status:200,headers});
 }catch{return new Response(JSON.stringify({code:"HOSPITALITY_PRICING_UNAVAILABLE",bookingGranted:false,paymentGranted:false}),{status:503,headers});}
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
