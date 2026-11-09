import type {
  ServerCommerceContext,
} from "./server-commerce-context-resolver";

export const COFFEE_CAPABILITY_PACK_VERSION = "ncrv2-125.v1" as const;
export const COFFEE_VERTICAL_PRODUCT_CLASSES =
  ["beverage", "food", "bundle"] as const;
export const COFFEE_FULFILLMENT_MODES = ["pickup"] as const;
export const COFFEE_OPERATIONS = [
  "catalog.read",
  "cart.read",
  "cart.add",
  "cart.adjust",
  "cart.remove",
  "checkout.preflight",
  "payment.admit",
  "order.status.read",
  "pickup.slot.reserve",
  "preparation.status.read",
] as const;

export function assertCoffeeCapabilityContext(
  context: ServerCommerceContext,
) {
  if (
    context.verticalRoot !== "coffee" ||
    context.vendure.stockLocationIds.length < 1 ||
    context.erp.warehouseIds.length < 1 ||
    context.nextcloud.teamFolderIds.length < 1
  ) throw new Error("COFFEE_CAPABILITY_CONTEXT_INCOMPLETE");
  return {
    packVersion: COFFEE_CAPABILITY_PACK_VERSION,
    storeId: context.storeId,
    partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    sellerId: context.vendure.sellerId,
    channelId: context.vendure.channelId,
    stripeConnectedAccountId: context.stripe.connectedAccountId,
    erpSiteId: context.erp.siteId,
    erpCompanyId: context.erp.companyId,
    erpWarehouseIds: context.erp.warehouseIds,
    nextcloudTenantGroupId: context.nextcloud.tenantGroupId,
    nextcloudTeamFolderIds: context.nextcloud.teamFolderIds,
  };
}

export function assertCoffeeOffer(input: Readonly<{
  canonicalProductType: string;
  verticalProductClass: string;
  fulfillmentMode: string;
  operation: string;
}>) {
  if (input.canonicalProductType !== "physical") {
    throw new Error("COFFEE_CANONICAL_PRODUCT_TYPE_NOT_APPROVED");
  }
  if (
    !COFFEE_VERTICAL_PRODUCT_CLASSES.includes(
      input.verticalProductClass as
        (typeof COFFEE_VERTICAL_PRODUCT_CLASSES)[number],
    )
  ) throw new Error("COFFEE_VERTICAL_PRODUCT_CLASS_NOT_APPROVED");
  if (
    !COFFEE_FULFILLMENT_MODES.includes(
      input.fulfillmentMode as (typeof COFFEE_FULFILLMENT_MODES)[number],
    )
  ) throw new Error("COFFEE_FULFILLMENT_MODE_NOT_APPROVED");
  if (
    !COFFEE_OPERATIONS.includes(
      input.operation as (typeof COFFEE_OPERATIONS)[number],
    )
  ) throw new Error("COFFEE_OPERATION_NOT_APPROVED");
  return input;
}
