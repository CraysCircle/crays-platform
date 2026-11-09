import type {
  ServerCommerceContext,
} from "./server-commerce-context-resolver";

export const RETAIL_CAPABILITY_PACK_VERSION = "ncrv2-126.v1" as const;

export const RETAIL_CAPABILITY_STATUS = Object.freeze({
  assortment: "TBD",
  automation: "TBD",
  economics: "TBD",
  fulfillment: "TBD",
  customerCommerceReleased: false,
} as const);

export function assertRetailCapabilityContext(
  context: ServerCommerceContext,
) {
  if (
    context.verticalRoot !== "retail" ||
    context.vendure.stockLocationIds.length < 1 ||
    context.erp.warehouseIds.length < 1 ||
    context.nextcloud.teamFolderIds.length < 1
  ) throw new Error("RETAIL_CAPABILITY_CONTEXT_INCOMPLETE");

  return Object.freeze({
    packVersion: RETAIL_CAPABILITY_PACK_VERSION,
    status: RETAIL_CAPABILITY_STATUS,
    storeId: context.storeId,
    partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    sellerId: context.vendure.sellerId,
    channelId: context.vendure.channelId,
    stripeConnectedAccountId: context.stripe.connectedAccountId,
    erpSiteId: context.erp.siteId,
    erpCompanyId: context.erp.companyId,
    erpWarehouseIds: [...context.erp.warehouseIds],
    nextcloudTenantGroupId: context.nextcloud.tenantGroupId,
    nextcloudTeamFolderIds: [...context.nextcloud.teamFolderIds],
  });
}

export function denyUnreleasedRetailCapability(_input: Readonly<{
  operation: string;
  productType?: string;
  fulfillmentMode?: string;
}>): never {
  void _input;
  throw new Error("RETAIL_CAPABILITY_NOT_RELEASED");
}
