import type {StorefrontVerticalRoot} from "./storefront-bff-contract";
import {STOREFRONT_VERTICAL_ROOTS} from "./storefront-bff-contract";

export const STOREFRONT_PREFLIGHT_BFF_VERSION="ncrv2-132.preflight-bff.v1" as const;
export type StorefrontPreflightBffRequest=Readonly<{
  verticalRoot:StorefrontVerticalRoot;storeSlug:string;
  operation:"checkout.persisted-preflight";expectedCartVersion:number;
  deliveryCountryCode:string;deliveryPostalCode:string;shippingMethod:string;
  idempotencyKey:string;
}>;
export type StorefrontPreflightBffResult=Readonly<{
  state:"ready_for_order";storeSlug:string;storeDisplayName:string;
  cartVersion:number;checkoutPreflightReference:string;replayed:boolean;
}>;
const ALLOWED=new Set(["verticalRoot","storeSlug","operation","expectedCartVersion",
  "deliveryCountryCode","deliveryPostalCode","shippingMethod","idempotencyKey"]);
const FORBIDDEN=new Set(["tenantId","cartId","customerRelationshipId","partnerTenantId",
  "operatorLegalEntityId","vendureSellerId","vendureChannelId","currency",
  "preflightId","outboxEventId","shippingMinor","taxMinor","totalMinor",
  "priceMinor","providerId","adminSecret"]);
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REFERENCE=/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const POSTAL=/^[A-Za-z0-9][A-Za-z0-9 -]{0,19}$/;
export function parseStorefrontPreflightBffRequest(raw:Readonly<Record<string,unknown>>):
StorefrontPreflightBffRequest{
  for(const key of Object.keys(raw)){
    if(FORBIDDEN.has(key))throw new Error("STOREFRONT_PREFLIGHT_BROWSER_AUTHORITY_DENIED");
    if(!ALLOWED.has(key))throw new Error("STOREFRONT_PREFLIGHT_BROWSER_FIELD_DENIED");
  }
  if(typeof raw.verticalRoot!=="string"||
    !STOREFRONT_VERTICAL_ROOTS.includes(raw.verticalRoot as StorefrontVerticalRoot)||
    typeof raw.storeSlug!=="string"||!SLUG.test(raw.storeSlug)){
    throw new Error("STOREFRONT_PREFLIGHT_CONTEXT_INVALID");
  }
  if(raw.operation!=="checkout.persisted-preflight"){
    throw new Error("STOREFRONT_PREFLIGHT_OPERATION_INVALID");
  }
  if(!Number.isSafeInteger(raw.expectedCartVersion)||Number(raw.expectedCartVersion)<1){
    throw new Error("STOREFRONT_PREFLIGHT_CART_VERSION_INVALID");
  }
  if(typeof raw.deliveryCountryCode!=="string"||
    !/^[A-Z]{2}$/.test(raw.deliveryCountryCode)||
    typeof raw.deliveryPostalCode!=="string"||!POSTAL.test(raw.deliveryPostalCode)){
    throw new Error("STOREFRONT_PREFLIGHT_ADDRESS_INVALID");
  }
  if(typeof raw.shippingMethod!=="string"||!REFERENCE.test(raw.shippingMethod)){
    throw new Error("STOREFRONT_PREFLIGHT_SHIPPING_METHOD_INVALID");
  }
  if(typeof raw.idempotencyKey!=="string"||!REFERENCE.test(raw.idempotencyKey)){
    throw new Error("STOREFRONT_PREFLIGHT_IDEMPOTENCY_REQUIRED");
  }
  return Object.freeze({
    verticalRoot:raw.verticalRoot as StorefrontVerticalRoot,storeSlug:raw.storeSlug,
    operation:"checkout.persisted-preflight",
    expectedCartVersion:raw.expectedCartVersion as number,
    deliveryCountryCode:raw.deliveryCountryCode,
    deliveryPostalCode:raw.deliveryPostalCode,
    shippingMethod:raw.shippingMethod,idempotencyKey:raw.idempotencyKey,
  });
}
