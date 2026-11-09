import type {StorefrontVerticalRoot} from "./storefront-bff-contract";
import {STOREFRONT_VERTICAL_ROOTS} from "./storefront-bff-contract";

export const STOREFRONT_ORDER_BFF_CONTRACT_VERSION="ncrv2-134.order-bff.v1" as const;
export type StorefrontOrderBffRequest=Readonly<{
  verticalRoot:StorefrontVerticalRoot;
  storeSlug:string;
  operation:"order.create";
  expectedCartVersion:number;
  checkoutPreflightReference:string;
  idempotencyKey:string;
}>;
export type StorefrontOrderBffResult=Readonly<{
  state:"pending_provider";
  storeSlug:string;
  storeDisplayName:string;
  orderReference:string;
  replayed:boolean;
  recovery:"reconcile";
}>;

const ALLOWED=new Set(["verticalRoot","storeSlug","operation","expectedCartVersion",
  "checkoutPreflightReference","idempotencyKey"]);
const FORBIDDEN=new Set(["tenantId","customerRelationshipId","partnerTenantId",
  "operatorLegalEntityId","vendureSellerId","vendureChannelId","vendureChannelToken",
  "stripeConnectedAccountId","erpSiteId","erpCompanyId","erpWarehouseId",
  "orderId","orderCode","orderSnapshotId","transitionReceiptId","outboxEventId",
  "priceMinor","taxMinor","totalMinor","paymentState","providerOrderId","adminSecret"]);
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REFERENCE=/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;

export function parseStorefrontOrderBffRequest(raw:Readonly<Record<string,unknown>>):
StorefrontOrderBffRequest{
  for(const key of Object.keys(raw)){
    if(FORBIDDEN.has(key))throw new Error("STOREFRONT_ORDER_BROWSER_AUTHORITY_DENIED");
    if(!ALLOWED.has(key))throw new Error("STOREFRONT_ORDER_BROWSER_FIELD_DENIED");
  }
  if(typeof raw.verticalRoot!=="string"||
    !STOREFRONT_VERTICAL_ROOTS.includes(raw.verticalRoot as StorefrontVerticalRoot)||
    typeof raw.storeSlug!=="string"||!SLUG.test(raw.storeSlug)){
    throw new Error("STOREFRONT_ORDER_CONTEXT_INVALID");
  }
  if(raw.operation!=="order.create")throw new Error("STOREFRONT_ORDER_OPERATION_INVALID");
  if(!Number.isSafeInteger(raw.expectedCartVersion)||Number(raw.expectedCartVersion)<1){
    throw new Error("STOREFRONT_ORDER_CART_VERSION_INVALID");
  }
  if(typeof raw.checkoutPreflightReference!=="string"||
    !REFERENCE.test(raw.checkoutPreflightReference)){
    throw new Error("STOREFRONT_ORDER_PREFLIGHT_REFERENCE_INVALID");
  }
  if(typeof raw.idempotencyKey!=="string"||!REFERENCE.test(raw.idempotencyKey)){
    throw new Error("STOREFRONT_ORDER_IDEMPOTENCY_REQUIRED");
  }
  return Object.freeze({
    verticalRoot:raw.verticalRoot as StorefrontVerticalRoot,
    storeSlug:raw.storeSlug,
    operation:"order.create",
    expectedCartVersion:raw.expectedCartVersion as number,
    checkoutPreflightReference:raw.checkoutPreflightReference,
    idempotencyKey:raw.idempotencyKey,
  });
}

export function storefrontOrderSafeResponse(result:StorefrontOrderBffResult){
  return Object.freeze({
    contractVersion:STOREFRONT_ORDER_BFF_CONTRACT_VERSION,
    state:result.state,
    store:{slug:result.storeSlug,displayName:result.storeDisplayName},
    orderReference:result.orderReference,
    recovery:result.recovery,
    data:{replayed:result.replayed},
  });
}
