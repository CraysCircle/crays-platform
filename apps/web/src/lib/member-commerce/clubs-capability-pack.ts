import type {
  ServerCommerceContext,
} from "./server-commerce-context-resolver";

export const CLUBS_CAPABILITY_PACK_VERSION = "ncrv2-128.v1" as const;
export const CLUBS_APPROVED_PRODUCT_TYPES = [
  "physical",
  "booking",
  "ticket",
  "fee",
  "deposit",
] as const;

type ClubsOffer = Readonly<{
  canonicalProductType: string;
  reservationAuthorityRef?: string;
  availabilityHoldVersion?: string;
  eventAuthorityRef?: string;
  entitlementVersion?: string;
  parentBookingRef?: string;
  outletCommerceRef?: string;
  accessEntitlementRef?: string;
}>;

export function assertClubsCapabilityContext(
  context: ServerCommerceContext,
) {
  if (
    context.verticalRoot !== "clubs" ||
    context.vendure.stockLocationIds.length < 1 ||
    context.erp.warehouseIds.length < 1 ||
    context.nextcloud.teamFolderIds.length < 1
  ) throw new Error("CLUBS_CAPABILITY_CONTEXT_INCOMPLETE");
  return Object.freeze({
    packVersion: CLUBS_CAPABILITY_PACK_VERSION,
    storeId: context.storeId,
    partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    merchantOfRecordLegalEntityId: context.operatorLegalEntityId,
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

export function assertClubsOffer(offer: ClubsOffer) {
  if (
    !CLUBS_APPROVED_PRODUCT_TYPES.includes(
      offer.canonicalProductType as (typeof CLUBS_APPROVED_PRODUCT_TYPES)[number],
    )
  ) throw new Error("CLUBS_PRODUCT_TYPE_NOT_APPROVED");
  if (offer.accessEntitlementRef) {
    throw new Error("CLUBS_ACCESS_AUTHORITY_OUTSIDE_COMMERCE");
  }
  if (
    offer.canonicalProductType === "physical" &&
    (!offer.outletCommerceRef ||
      offer.reservationAuthorityRef ||
      offer.eventAuthorityRef ||
      offer.parentBookingRef)
  ) throw new Error("CLUBS_OUTLET_PRODUCT_BOUNDARY_INVALID");
  if (
    offer.canonicalProductType === "booking" &&
    (!offer.reservationAuthorityRef || !offer.availabilityHoldVersion)
  ) throw new Error("CLUBS_RESERVATION_AUTHORITY_REQUIRED");
  if (
    offer.canonicalProductType === "ticket" &&
    (!offer.eventAuthorityRef || !offer.entitlementVersion)
  ) throw new Error("CLUBS_EVENT_AUTHORITY_REQUIRED");
  if (
    (offer.canonicalProductType === "fee" ||
      offer.canonicalProductType === "deposit") &&
    !offer.parentBookingRef
  ) throw new Error("CLUBS_PARENT_BOOKING_REQUIRED");
  return offer;
}
