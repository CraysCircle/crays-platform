import {createHash} from "node:crypto";
import {
  freezeOrderSellerSnapshot,
  verifyFrozenOrderSellerSnapshot,
  type ErpCostCenterMapping,
  type OrderLineErpMapping,
} from "./checkout-order-transition-contract";
import type {ServerCommerceContext} from "./server-commerce-context-resolver";
import type {SellerBoundCart} from "./seller-bound-cart-lifecycle";
import type {SellerScope} from "./seller-shipping-tax-calculator";

export const STOREFRONT_ORDER_CONVERSION_PLAN_VERSION = "ncrv2-134.order-plan.v1" as const;
const HASH = /^[a-f0-9]{64}$/;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("ORDER_CONVERSION_CANONICAL_VALUE_INVALID");
  return serialized;
}
const digest = (value: object) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
const nonempty = (value: string) => value.trim().length > 0;
function deepFreeze(value: unknown): unknown {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const cloneObject = (value: Readonly<Record<string, unknown>>) =>
  deepFreeze(JSON.parse(canonicalJson(value))) as Readonly<Record<string, unknown>>;

export type PersistedShippingTaxPreflightProjection = Readonly<{
  tenantId: string;
  partnerTenantId: string;
  preflightId: string;
  cartId: string;
  cartVersion: number;
  state: "PERSISTED_PENDING_PROVIDER_PARITY";
  requestSha256: string;
  resultSha256: string;
  seller: SellerScope;
}>;

export type ServerSellerDisclosure = Readonly<{
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  sellerLegalName: string;
  sellerDisplayName: string;
  sellerRegisteredAddress: Readonly<Record<string, unknown>>;
  sellerTaxRegistrationRef: string;
  disclosurePolicyVersion: string;
}>;

export function digestStorefrontSellerDisclosure(
  input:Readonly<{orderSnapshotId:string;sellerRegisteredAddress:object}&Omit<ServerSellerDisclosure,"sellerRegisteredAddress">>,
){
  return digest({...input,operatorKind:"independent_franchise_operator" as const});
}

export type StorefrontOrderConversionPlanInput = Readonly<{
  tenantId: string;
  orderSnapshotId: string;
  orderId: string;
  orderCode: string;
  idempotencyKey: string;
  expectedCurrency: string;
  context: ServerCommerceContext;
  cart: SellerBoundCart;
  preflight: PersistedShippingTaxPreflightProjection;
  sellerDisclosure: ServerSellerDisclosure;
  orderLineErpMappings?: readonly OrderLineErpMapping[];
  erpCostCenterMapping: ErpCostCenterMapping;
}>;

export function prepareStorefrontOrderConversionPlan(
  candidate: StorefrontOrderConversionPlanInput,
) {
  const untrusted = candidate as unknown as Record<string, unknown>;
  for (const key of [
    "browserClaimedTotalMinor",
    "browserClaimedTaxMinor",
    "browserClaimedPriceMinor",
    "vendureSellerId",
    "vendureChannelId",
    "stripeConnectedAccountId",
  ]) {
    if (Object.hasOwn(untrusted, key)) {
      throw new Error("ORDER_CONVERSION_BROWSER_AUTHORITY_DENIED");
    }
  }
  const {context, cart, preflight, sellerDisclosure} = candidate;
  if ([candidate.tenantId, candidate.orderSnapshotId, candidate.orderId,
    candidate.orderCode, candidate.idempotencyKey, candidate.expectedCurrency]
    .some((value) => !nonempty(value))) {
    throw new Error("ORDER_CONVERSION_INPUT_INVALID");
  }
  if (preflight.tenantId !== candidate.tenantId ||
      preflight.partnerTenantId !== context.partnerTenantId ||
      preflight.preflightId.trim().length === 0 ||
      preflight.cartId !== cart.cartId ||
      preflight.cartVersion !== cart.version ||
      preflight.state !== "PERSISTED_PENDING_PROVIDER_PARITY" ||
      !HASH.test(preflight.requestSha256) ||
      !HASH.test(preflight.resultSha256)) {
    throw new Error("ORDER_CONVERSION_PREFLIGHT_CONFLICT");
  }
  if (preflight.seller.storeId !== context.storeId ||
      preflight.seller.operatorLegalEntityId !== context.operatorLegalEntityId ||
      preflight.seller.vendureSellerId !== context.vendure.sellerId ||
      preflight.seller.vendureChannelId !== context.vendure.channelId ||
      preflight.seller.currency !== candidate.expectedCurrency) {
    throw new Error("ORDER_CONVERSION_PREFLIGHT_SCOPE_MISMATCH");
  }
  if (sellerDisclosure.partnerTenantId !== context.partnerTenantId ||
      sellerDisclosure.operatorLegalEntityId !== context.operatorLegalEntityId ||
      sellerDisclosure.storeId !== context.storeId ||
      sellerDisclosure.sellerLegalName.trim() !== context.operatorLegalName.trim() ||
      !context.taxRegistrationRef?.trim() ||
      sellerDisclosure.sellerTaxRegistrationRef.trim() !== context.taxRegistrationRef.trim() ||
      !sellerDisclosure.sellerDisplayName.trim() ||
      !sellerDisclosure.disclosurePolicyVersion.trim() ||
      typeof sellerDisclosure.sellerRegisteredAddress !== "object" ||
      sellerDisclosure.sellerRegisteredAddress === null ||
      Array.isArray(sellerDisclosure.sellerRegisteredAddress) ||
      Object.keys(sellerDisclosure.sellerRegisteredAddress).length === 0) {
    throw new Error("ORDER_CONVERSION_SELLER_DISCLOSURE_CONFLICT");
  }
  const snapshot = freezeOrderSellerSnapshot(context, {
    orderId: candidate.orderId,
    orderCode: candidate.orderCode,
    checkoutPreflightId: preflight.preflightId,
    cart,
    orderLineErpMappings: candidate.orderLineErpMappings,
    erpCostCenterMapping: candidate.erpCostCenterMapping,
  });
  const disclosure = Object.freeze({
    ...sellerDisclosure,
    sellerLegalName: sellerDisclosure.sellerLegalName.trim(),
    sellerDisplayName: sellerDisclosure.sellerDisplayName.trim(),
    sellerRegisteredAddress: cloneObject(sellerDisclosure.sellerRegisteredAddress),
    sellerTaxRegistrationRef: sellerDisclosure.sellerTaxRegistrationRef.trim(),
    disclosurePolicyVersion: sellerDisclosure.disclosurePolicyVersion.trim(),
  });
  const preflightAuthority = Object.freeze({
    ...preflight,
    seller: Object.freeze({...preflight.seller}),
  });
  const disclosureSha256 = digestStorefrontSellerDisclosure({orderSnapshotId:candidate.orderSnapshotId,...disclosure});
  const body = {
    contractVersion: STOREFRONT_ORDER_CONVERSION_PLAN_VERSION,
    state: "READY_FOR_ATOMIC_PERSISTENCE" as const,
    tenantId: candidate.tenantId,
    orderSnapshotId: candidate.orderSnapshotId,
    orderId: snapshot.orderId,
    orderCode: snapshot.orderCode,
    idempotencyKey: candidate.idempotencyKey,
    cartId: snapshot.cartId,
    cartVersion: snapshot.cartVersion,
    expectedCurrency: candidate.expectedCurrency,
    preflight: preflightAuthority,
    preflightResultSha256: preflight.resultSha256,
    sellerDisclosure: disclosure,
    sellerDisclosureSha256: disclosureSha256,
    snapshot,
    snapshotSha256: snapshot.snapshotSha256,
    performsMutation: false as const,
    acceptsBrowserAuthority: false as const,
  };
  return Object.freeze({...body, planSha256: digest(body)});
}

export type StorefrontOrderConversionPlan = ReturnType<typeof prepareStorefrontOrderConversionPlan>;
export function verifyStorefrontOrderConversionPlan(
  candidate: StorefrontOrderConversionPlan,
) {
  const clone=deepFreeze(JSON.parse(canonicalJson(candidate))) as StorefrontOrderConversionPlan;
  const {planSha256,...body}=clone;
  if(!HASH.test(planSha256)||digest(body)!==planSha256||
    clone.state!=="READY_FOR_ATOMIC_PERSISTENCE"||
    clone.performsMutation!==false||clone.acceptsBrowserAuthority!==false||
    clone.preflightResultSha256!==clone.preflight.resultSha256||
    clone.preflight.preflightId!==clone.snapshot.checkoutPreflightId||
    clone.cartId!==clone.snapshot.cartId||clone.cartVersion!==clone.snapshot.cartVersion||
    clone.orderId!==clone.snapshot.orderId||clone.orderCode!==clone.snapshot.orderCode||
    clone.snapshotSha256!==clone.snapshot.snapshotSha256||
    digestStorefrontSellerDisclosure({orderSnapshotId:clone.orderSnapshotId,
      ...clone.sellerDisclosure})!==clone.sellerDisclosureSha256) {
    throw new Error("ORDER_CONVERSION_PLAN_HASH_OR_BINDING_INVALID");
  }
  const snapshot=verifyFrozenOrderSellerSnapshot(clone.snapshot);
  return Object.freeze({...clone,snapshot});
}
