import "server-only";
import {createHash} from "node:crypto";
import type {KdsDatabase} from "@/store-operations/kds";
import {requireStorefrontCustomerCartAuthority,
  resolveStorefrontCustomerRelationship,type StorefrontCartAuthority}
  from "./storefront-cart-bff";
import {resolveStorefrontRouteCommerceContextSnapshot,
  type StorefrontRouteCommerceContext} from "./storefront-route-commerce-context";
import {loadActiveSellerBoundCartSnapshot} from "./seller-bound-cart-repository";
import {persistSellerShippingTaxPreflight,
  type ShippingTaxPool} from "./seller-shipping-tax-preflight-repository";
import type {StorefrontPreflightBffRequest,StorefrontPreflightBffResult}
  from "./storefront-preflight-bff-contract";

type Snapshot=Readonly<{tenantId:string;customerRelationshipId:string;
  route:StorefrontRouteCommerceContext;storeDisplayName:string;
  cartId:string;cartVersion:number}>;
type Dependencies=Readonly<{
  resolveSnapshot?:(database:KdsDatabase,input:Readonly<{
    request:StorefrontPreflightBffRequest;accountId:string}>)=>Promise<Snapshot>;
  persist?:typeof persistSellerShippingTaxPreflight;
  now?:()=>Date;
}>;
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");

async function defaultSnapshot(database:KdsDatabase,input:Readonly<{
  request:StorefrontPreflightBffRequest;accountId:string}>):Promise<Snapshot>{
  return database.transaction(async({query})=>{
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock=await query<{authority_now:string|Date}>(
      "select transaction_timestamp() authority_now");
    const now=new Date(clock.rows[0]?.authority_now??"");
    if(!Number.isFinite(now.getTime()))throw new Error("STOREFRONT_PREFLIGHT_CLOCK_INVALID");
    const route=await resolveStorefrontRouteCommerceContextSnapshot(query,{
      verticalRoot:input.request.verticalRoot,storeSlug:input.request.storeSlug},now);
    const tenantId=route.context.partnerTenantId;
    await query("select set_config('crays.tenant_id',$1,true)",[tenantId]);
    const relationship=await resolveStorefrontCustomerRelationship(query,{
      accountId:input.accountId,route,authorityNow:now});
    const cart=await loadActiveSellerBoundCartSnapshot({query},{
      tenantId,customerRelationshipId:relationship,
      seller:{verticalRoot:route.context.verticalRoot,storeId:route.context.storeId,
        partnerTenantId:tenantId,
        operatorLegalEntityId:route.context.operatorLegalEntityId,
        vendureSellerId:route.context.vendure.sellerId,
        vendureChannelId:route.context.vendure.channelId,
        contextFingerprint:route.context.contextFingerprint},now});
    if(!cart||cart.lines.length===0)throw new Error("STOREFRONT_PREFLIGHT_CART_UNAVAILABLE");
    if(cart.version!==input.request.expectedCartVersion){
      throw new Error("STOREFRONT_PREFLIGHT_CART_VERSION_CONFLICT");
    }
    return Object.freeze({tenantId,customerRelationshipId:relationship,route,
      storeDisplayName:route.store.displayName,cartId:cart.cartId,cartVersion:cart.version});
  });
}

export async function executeAuthenticatedStorefrontPreflight(
  database:KdsDatabase,pool:ShippingTaxPool,
  input:Readonly<{request:StorefrontPreflightBffRequest;authority:StorefrontCartAuthority}>,
  dependencies:Dependencies={},
):Promise<StorefrontPreflightBffResult>{
  const customer=requireStorefrontCustomerCartAuthority(input.authority);
  const snapshot=await(dependencies.resolveSnapshot??defaultSnapshot)(database,{
    request:input.request,accountId:customer.accountId});
  const root=sha(["ncrv2-132.preflight-bff.ids.v1",snapshot.tenantId,
    snapshot.customerRelationshipId,snapshot.route.routeId,String(snapshot.cartVersion),
    input.request.deliveryCountryCode,input.request.deliveryPostalCode,
    input.request.shippingMethod,input.request.idempotencyKey].join("|"));
  const now=(dependencies.now??(()=>new Date()))();
  if(!Number.isFinite(now.getTime()))throw new Error("STOREFRONT_PREFLIGHT_CLOCK_INVALID");
  const result=await(dependencies.persist??persistSellerShippingTaxPreflight)(pool,{
    tenantId:snapshot.tenantId,preflightId:`preflight-${root}`,
    outboxEventId:`preflight-outbox-${root}`,cartId:snapshot.cartId,
    expectedCartVersion:snapshot.cartVersion,
    seller:{storeId:snapshot.route.context.storeId,
      operatorLegalEntityId:snapshot.route.context.operatorLegalEntityId,
      vendureSellerId:snapshot.route.context.vendure.sellerId,
      vendureChannelId:snapshot.route.context.vendure.channelId,
      currency:snapshot.route.currency},
    address:{countryCode:input.request.deliveryCountryCode,
      postalCode:input.request.deliveryPostalCode},
    shippingMethod:input.request.shippingMethod,
    idempotencyKey:input.request.idempotencyKey,calculatedAt:now.toISOString(),
  });
  if(result.preflightId!==`preflight-${root}`||
    result.state!=="PERSISTED_PENDING_PROVIDER_PARITY"){
    throw new Error("STOREFRONT_PREFLIGHT_PERSISTENCE_RESULT_INVALID");
  }
  return Object.freeze({state:"ready_for_order",storeSlug:input.request.storeSlug,
    storeDisplayName:snapshot.storeDisplayName,cartVersion:snapshot.cartVersion,
    checkoutPreflightReference:result.preflightId,replayed:result.replayed});
}
