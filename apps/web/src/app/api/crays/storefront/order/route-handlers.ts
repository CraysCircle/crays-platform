import type {NextRequest} from "next/server";
import {getCorePgPool} from "@/db/client";
import {resolveCraysRouteContext} from "@/lib/dal/server-trust";
import {
  executeAuthenticatedStorefrontOrder,
} from "@/lib/member-commerce/storefront-order-bff";
import {
  parseStorefrontOrderBffRequest,
  STOREFRONT_ORDER_BFF_CONTRACT_VERSION,
  storefrontOrderSafeResponse,
} from "@/lib/member-commerce/storefront-order-bff-contract";
import {
  requireStorefrontCustomerCartAuthority,
  type StorefrontCartAuthority,
} from "@/lib/member-commerce/storefront-cart-bff";
import type {OrderPlanAuthorityPool} from
  "@/lib/member-commerce/storefront-order-conversion-plan-repository";
import type {KdsDatabase} from "@/store-operations/kds";
import {getKdsRuntimeDatabase} from "@/store-operations/kds-runtime";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Executor=typeof executeAuthenticatedStorefrontOrder;

function objectBody(value:unknown):Readonly<Record<string,unknown>>{
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("STOREFRONT_ORDER_REQUEST_INVALID");
  }
  return value as Readonly<Record<string,unknown>>;
}
function safeError(error:unknown){
  const code=error instanceof Error?error.message:"";
  if(code==="STOREFRONT_AUTHENTICATION_REQUIRED")return{
    status:401,state:"denied",recovery:"none",publicCode:"STOREFRONT_SIGN_IN_REQUIRED"};
  if(code.includes("CUSTOMER_RELATIONSHIP"))return{
    status:403,state:"denied",recovery:"none",publicCode:"STOREFRONT_CUSTOMER_ACCESS_DENIED"};
  if(code.includes("REPLAY_CONFLICT")||code.includes("CART_OR_PREFLIGHT_CONFLICT")||
    code.includes("CART_CONFLICT")||code.includes("PREFLIGHT_AUTHORITY_CONFLICT")){
    return{status:409,state:"conflict",recovery:"reload_cart",
      publicCode:"STOREFRONT_ORDER_CONFLICT"};
  }
  if(code.includes("CART_UNAVAILABLE")||code.includes("PREFLIGHT_UNAVAILABLE")||
    code.includes("ERP_MAPPING_UNAVAILABLE")||code.includes("COST_CENTER_UNAVAILABLE")||
    code.includes("DISCLOSURE_UNAVAILABLE")){
    return{status:422,state:"denied",recovery:"reload_cart",
      publicCode:"STOREFRONT_ORDER_NOT_READY"};
  }
  if(code.includes("INVALID")||code.includes("DENIED")||code.includes("REQUIRED")){
    return{status:400,state:"denied",recovery:"none",
      publicCode:"STOREFRONT_ORDER_REQUEST_INVALID"};
  }
  return{status:503,state:"failed",recovery:"retry_after_backoff",
    publicCode:"STOREFRONT_ORDER_TEMPORARILY_UNAVAILABLE"};
}
function failure(safe:ReturnType<typeof safeError>){
  return Response.json({
    contractVersion:STOREFRONT_ORDER_BFF_CONTRACT_VERSION,
    state:safe.state,store:{slug:"",displayName:""},recovery:safe.recovery,
    data:{code:safe.publicCode},
  },{status:safe.status,headers:{"cache-control":"private, no-store"}});
}

export async function handleAuthenticatedStorefrontOrderRequest(
  request:Request,
  dependencies:Readonly<{
    database:KdsDatabase;
    pool:OrderPlanAuthorityPool;
    resolveAuthority:(request:Request)=>Promise<StorefrontCartAuthority>;
    executeOrder?:Executor;
  }>,
){
  try{
    let json:unknown;
    try{json=await request.json();}catch{
      throw new Error("STOREFRONT_ORDER_REQUEST_INVALID");
    }
    const parsed=parseStorefrontOrderBffRequest(objectBody(json));
    const authority=requireStorefrontCustomerCartAuthority(
      await dependencies.resolveAuthority(request));
    const result=await(dependencies.executeOrder??executeAuthenticatedStorefrontOrder)(
      dependencies.database,dependencies.pool,{request:parsed,authority});
    return Response.json(storefrontOrderSafeResponse(result),{
      status:202,headers:{"cache-control":"private, no-store"},
    });
  }catch(error){return failure(safeError(error));}
}

export async function POST(request:NextRequest){
  return handleAuthenticatedStorefrontOrderRequest(request,{
    database:getKdsRuntimeDatabase(),
    pool:getCorePgPool(),
    resolveAuthority:async(candidate)=>{
      const context=await resolveCraysRouteContext(candidate,{fallbackRole:"guest"});
      return{authoritySource:context.authoritySource,
        accountId:context.session.account?.id??null};
    },
  });
}
