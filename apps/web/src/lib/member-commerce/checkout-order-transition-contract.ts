import {createHash} from "node:crypto";
import type {ServerCommerceContext} from "./server-commerce-context-resolver";
import type {SellerBoundCart} from "./seller-bound-cart-lifecycle";

export const CHECKOUT_ORDER_TRANSITION_VERSION = "ncrv2-134.v3" as const;
export type ErpCostCenterMapping = Readonly<{
  erpCostCenterMappingId: string;
  erpCostCenterMappingVersion: string;
  erpCostCenterId: string;
  approvalReceiptId: string;
  approvalReceiptSha256: string;
}>;
export type OrderLineErpMapping = Readonly<{
  variantRef: string;
  erpItemMappingId: string;
  erpItemMappingVersion: string;
  erpItemCode: string;
  warehouseMappingId: string;
  warehouseMappingVersion: string;
  erpWarehouseId: string;
}>;
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([left],[right]) => left.localeCompare(right))
      .map(([key,entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  const serialized=JSON.stringify(value);
  if (serialized === undefined) throw new Error("ORDER_SNAPSHOT_CANONICAL_VALUE_INVALID");
  return serialized;
}
const hash = (value: object) => createHash("sha256").update(canonicalJson(value)).digest("hex");

function requireOrderInput(value: string, field: string) {
  if (!value.trim()) throw new Error(`ORDER_SNAPSHOT_${field}_INVALID`);
  return value.trim();
}

export function freezeOrderSellerSnapshot(context: ServerCommerceContext, input: Readonly<{
  orderId: string; orderCode: string; checkoutPreflightId: string; cart: SellerBoundCart;
  orderLineErpMappings?: readonly OrderLineErpMapping[];
  erpCostCenterMapping: ErpCostCenterMapping;
}>) {
  const cart = input.cart;
  if (cart.state !== "active" || cart.lines.length === 0) {
    throw new Error("ORDER_SNAPSHOT_CART_NOT_CONVERTIBLE");
  }
  if (cart.seller.verticalRoot !== context.verticalRoot ||
      cart.seller.storeId !== context.storeId ||
      cart.seller.partnerTenantId !== context.partnerTenantId ||
      cart.seller.operatorLegalEntityId !== context.operatorLegalEntityId ||
      cart.seller.vendureSellerId !== context.vendure.sellerId ||
      cart.seller.vendureChannelId !== context.vendure.channelId ||
      cart.seller.contextFingerprint !== context.contextFingerprint) {
    throw new Error("ORDER_SNAPSHOT_CART_SCOPE_MISMATCH");
  }
  const mappings=input.orderLineErpMappings??[];
  if (mappings.some((mapping,index) => !mapping.variantRef.trim() ||
      mappings.findIndex((candidate) => candidate.variantRef===mapping.variantRef)!==index ||
      !cart.lines.some((line) => line.variantRef===mapping.variantRef && line.productType==="physical"))) {
    throw new Error("ORDER_SNAPSHOT_ERP_MAPPING_SCOPE_INVALID");
  }
  const costCenter=input.erpCostCenterMapping;
  if ([costCenter.erpCostCenterMappingId,costCenter.erpCostCenterMappingVersion,
    costCenter.erpCostCenterId,costCenter.approvalReceiptId].some((value)=>!value.trim()) ||
    !/^[a-f0-9]{64}$/.test(costCenter.approvalReceiptSha256)) {
    throw new Error("ORDER_SNAPSHOT_ERP_COST_CENTER_AUTHORITY_INVALID");
  }
  const lines = Object.freeze([...cart.lines]
    .sort((left, right) => left.variantRef.localeCompare(right.variantRef))
    .map((line) => {
      const mapping=mappings.find((candidate) => candidate.variantRef===line.variantRef);
      if (line.productType==="physical" && (!mapping ||
          [mapping.erpItemMappingId,mapping.erpItemMappingVersion,mapping.erpItemCode,
            mapping.warehouseMappingId,mapping.warehouseMappingVersion,mapping.erpWarehouseId]
            .some((value) => !value.trim()) || !context.erp.warehouseIds.includes(mapping.erpWarehouseId))) {
        throw new Error("ORDER_SNAPSHOT_ERP_MAPPING_UNRESOLVED");
      }
      return Object.freeze({
      variantRef: line.variantRef,
      quantity: line.quantity,
      sellableAssignmentId: line.sellableAssignmentId,
      sellableAssignmentVersion: line.sellableAssignmentVersion,
      sellableProductClassificationId: line.sellableProductClassificationId,
      classificationVersion: line.classificationVersion,
      taxonomyVersion: line.taxonomyVersion,
      productType: line.productType,
      verticalProductClass: line.verticalProductClass,
      routingPolicyVersion: line.routingPolicyVersion,
      erpItemMappingId: mapping?.erpItemMappingId??null,
      erpItemMappingVersion: mapping?.erpItemMappingVersion??null,
      erpItemCode: mapping?.erpItemCode??null,
      warehouseMappingId: mapping?.warehouseMappingId??null,
      warehouseMappingVersion: mapping?.warehouseMappingVersion??null,
      erpWarehouseId: mapping?.erpWarehouseId??null,
      mixedTypeCompatibilityReceipts: Object.freeze([...line.mixedTypeCompatibilityReceipts]
        .sort((left, right) => left.decisionReceiptSha256.localeCompare(right.decisionReceiptSha256))
        .map((receipt) => Object.freeze({...receipt}))),
      });
    }));
  const body = {
    version: 3,
    orderId: requireOrderInput(input.orderId, "ORDER_ID"),
    orderCode: requireOrderInput(input.orderCode, "ORDER_CODE"),
    cartId: requireOrderInput(cart.cartId, "CART_ID"),
    cartVersion: cart.version,
    checkoutPreflightId: requireOrderInput(input.checkoutPreflightId, "PREFLIGHT_ID"),
    verticalRoot: context.verticalRoot, storeId: context.storeId,
    storeVersion: context.storeVersion, partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    storeOperatorAssignmentId: context.storeOperatorAssignmentId,
    storeOperatorAssignmentVersion: context.storeOperatorAssignmentVersion,
    vendureDeploymentCellId: context.vendure.deploymentCellId,
    vendureSellerId: context.vendure.sellerId,
    vendureChannelId: context.vendure.channelId,
    stripeConnectedAccountId: context.stripe.connectedAccountId,
    stripeEnvironment: context.stripe.environment,
    erpSiteId: context.erp.siteId, erpCompanyId: context.erp.companyId,
    erpWarehouseIds: Object.freeze([...context.erp.warehouseIds]),
    erpBindingVersion: context.erp.bindingVersion,
    erpCostCenterMappingId: costCenter.erpCostCenterMappingId,
    erpCostCenterMappingVersion: costCenter.erpCostCenterMappingVersion,
    erpCostCenterId: costCenter.erpCostCenterId,
    erpCostCenterApprovalReceiptId: costCenter.approvalReceiptId,
    erpCostCenterApprovalReceiptSha256: costCenter.approvalReceiptSha256,
    providerBindingId: context.providerBindingId,
    providerBindingVersion: context.providerBindingVersion,
    cartContextFingerprint: cart.seller.contextFingerprint,
    lines,
  };
  return Object.freeze({...body, snapshotSha256: hash(body)});
}

export type FrozenOrderSellerSnapshot = ReturnType<typeof freezeOrderSellerSnapshot>;

export function verifyFrozenOrderSellerSnapshot(snapshot: FrozenOrderSellerSnapshot) {
  const {snapshotSha256, ...body} = snapshot;
  if (!/^[a-f0-9]{64}$/.test(snapshotSha256) || hash(body) !== snapshotSha256) {
    throw new Error("ORDER_SNAPSHOT_HASH_INVALID");
  }
  return Object.freeze({
    ...snapshot,
    erpWarehouseIds: Object.freeze([...snapshot.erpWarehouseIds]),
    lines: Object.freeze(snapshot.lines.map((line) => Object.freeze({
      ...line,
      mixedTypeCompatibilityReceipts: Object.freeze(
        line.mixedTypeCompatibilityReceipts.map((receipt) => Object.freeze({...receipt})),
      ),
    }))),
  });
}

export function acceptProviderOrderEvent(snapshot: FrozenOrderSellerSnapshot, event: Readonly<{
  providerEventId: string; orderId: string; snapshotSha256: string;
  connectedAccountId: string; type: string;
}>) {
  if (event.orderId !== snapshot.orderId || event.snapshotSha256 !== snapshot.snapshotSha256 ||
      event.connectedAccountId !== snapshot.stripeConnectedAccountId) {
    throw new Error("ORDER_PROVIDER_EVENT_SCOPE_MISMATCH");
  }
  const transitions: Record<string,string> = {
    "payment_intent.requires_action": "PAYMENT_ACTION_REQUIRED",
    "payment_intent.processing": "PAYMENT_PROCESSING",
    "payment_intent.succeeded": "PAYMENT_SETTLED",
    "payment_intent.payment_failed": "PAYMENT_FAILED",
    "payment_intent.canceled": "PAYMENT_CANCELED",
  };
  const toState=transitions[event.type];
  if(!toState) throw new Error("ORDER_PROVIDER_EVENT_NOT_ACCEPTED");
  return {source:"stripe_provider_event" as const,providerEventId:event.providerEventId,toState,
    orderId:snapshot.orderId,snapshotSha256:snapshot.snapshotSha256};
}

export function browserCheckoutReturn(input: Readonly<{
  orderId: string; returnToken: string; browserClaimedPaymentState?: string;
}>) {
  if(!input.orderId.trim()||!input.returnToken.trim()) throw new Error("CHECKOUT_RETURN_INVALID");
  return Object.freeze({action:"READ_RECONCILED_ORDER_STATUS" as const,orderId:input.orderId,
    returnToken:input.returnToken,browserStateAccepted:false});
}
