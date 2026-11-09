import type {NextRequest} from "next/server";
import {getCorePgPool} from "@/db/client";
import {resolveCraysRouteContext} from "@/lib/dal/server-trust";
import {executeAuthenticatedStorefrontPreflight} from
  "@/lib/member-commerce/storefront-preflight-bff";
import {parseStorefrontPreflightBffRequest,STOREFRONT_PREFLIGHT_BFF_VERSION}
  from "@/lib/member-commerce/storefront-preflight-bff-contract";
import {requireStorefrontCustomerCartAuthority,type StorefrontCartAuthority}
  from "@/lib/member-commerce/storefront-cart-bff";
import type {ShippingTaxPool} from
  "@/lib/member-commerce/seller-shipping-tax-preflight-repository";
import type {KdsDatabase} from "@/store-operations/kds";
import {getKdsRuntimeDatabase} from "@/store-operations/kds-runtime";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Executor=typeof executeAuthenticatedStorefrontPreflight;
function body(value:unknown):Readonly<Record<string,unknown>>{
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("STOREFRONT_PREFLIGHT_REQUEST_INVALID");
  }
  return value as Readonly<Record<string,unknown>>;
}
function errorProjection(error:unknown){
  const code=error instanceof Error?error.message:"";
  if(code==="STOREFRONT_AUTHENTICATION_REQUIRED")return{
    status:401,state:"denied",recovery:"none",code:"STOREFRONT_SIGN_IN_REQUIRED"};
  if(code.includes("CUSTOMER_RELATIONSHIP"))return{
    status:403,state:"denied",recovery:"none",code:"STOREFRONT_CUSTOMER_ACCESS_DENIED"};
  if(code.includes("VERSION_CONFLICT")||code.includes("SCOPE_CONFLICT")||
    code.includes("REPLAY_CONFLICT"))return{
    status:409,state:"conflict",recovery:"reload_cart",code:"STOREFRONT_PREFLIGHT_CONFLICT"};
  if(code.includes("CART_UNAVAILABLE")||code.includes("CATALOG_UNRESOLVED")||
    code.includes("RULE_UNRESOLVED"))return{
    status:422,state:"denied",recovery:"reload_cart",code:"STOREFRONT_PREFLIGHT_NOT_READY"};
  if(code.includes("INVALID")||code.includes("DENIED")||code.includes("REQUIRED"))return{
    status:400,state:"denied",recovery:"none",code:"STOREFRONT_PREFLIGHT_REQUEST_INVALID"};
  return{status:503,state:"failed",recovery:"retry_after_backoff",
    code:"STOREFRONT_PREFLIGHT_TEMPORARILY_UNAVAILABLE"};
}
export async function handleAuthenticatedStorefrontPreflightRequest(
  request:Request,dependencies:Readonly<{database:KdsDatabase;pool:ShippingTaxPool;
    resolveAuthority:(request:Request)=>Promise<StorefrontCartAuthority>;
    executePreflight?:Executor}>,
){
  try{
    let json:unknown;try{json=await request.json();}catch{
      throw new Error("STOREFRONT_PREFLIGHT_REQUEST_INVALID");
    }
    const parsed=parseStorefrontPreflightBffRequest(body(json));
    const authority=requireStorefrontCustomerCartAuthority(
      await dependencies.resolveAuthority(request));
    const result=await(dependencies.executePreflight??
      executeAuthenticatedStorefrontPreflight)(
      dependencies.database,dependencies.pool,{request:parsed,authority});
    return Response.json({
      contractVersion:STOREFRONT_PREFLIGHT_BFF_VERSION,state:result.state,
      store:{slug:result.storeSlug,displayName:result.storeDisplayName},
      cartVersion:result.cartVersion,
      checkoutPreflightReference:result.checkoutPreflightReference,
      recovery:"none",data:{replayed:result.replayed},
    },{status:201,headers:{"cache-control":"private, no-store"}});
  }catch(error){
    const safe=errorProjection(error);
    return Response.json({contractVersion:STOREFRONT_PREFLIGHT_BFF_VERSION,
      state:safe.state,store:{slug:"",displayName:""},recovery:safe.recovery,
      data:{code:safe.code}},
    {status:safe.status,headers:{"cache-control":"private, no-store"}});
  }
}
export async function POST(request:NextRequest){
  return handleAuthenticatedStorefrontPreflightRequest(request,{
    database:getKdsRuntimeDatabase(),pool:getCorePgPool(),
    resolveAuthority:async(candidate)=>{
      const context=await resolveCraysRouteContext(candidate,{fallbackRole:"guest"});
      return{authoritySource:context.authoritySource,
        accountId:context.session.account?.id??null};
    },
  });
}
