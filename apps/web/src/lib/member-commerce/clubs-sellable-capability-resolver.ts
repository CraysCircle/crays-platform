import "server-only";

import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";
import { assertClubsOffer } from "./clubs-capability-pack";
import type { ServerCommerceContext } from
  "./server-commerce-context-resolver";

type ClubsClassificationRow = {
  sellable_assignment_id: string;
  sellable_assignment_version: string | number;
  store_operator_assignment_id: string;
  store_operator_assignment_version: string | number;
  vertical_root: string;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  store_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  product_type: string;
  vertical_product_class: string;
  taxonomy_version: string | number;
  routing_policy_version: string;
};

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;

export type ClubsSellableCapabilityInput = Readonly<{
  sellableAssignmentId: string;
  sellableAssignmentVersion: number;
  reservationAuthorityRef?: string;
  availabilityHoldVersion?: string;
  eventAuthorityRef?: string;
  entitlementVersion?: string;
  parentBookingRef?: string;
  outletCommerceRef?: string;
  accessEntitlementRef?: string;
}>;

export async function resolveClubsSellableCapabilitySnapshot(
  query: KdsQuery,
  context: ServerCommerceContext,
  input: ClubsSellableCapabilityInput,
) {
  if (
    context.verticalRoot !== "clubs" ||
    !ID.test(input.sellableAssignmentId) ||
    !Number.isSafeInteger(input.sellableAssignmentVersion) ||
    input.sellableAssignmentVersion < 1
  ) {
    throw new Error("CLUBS_SELLABLE_CAPABILITY_INPUT_INVALID");
  }
  const result = await query<ClubsClassificationRow>(
    `select s.sellable_assignment_id,s.sellable_assignment_version,
            s.store_operator_assignment_id,
            s.store_operator_assignment_version,s.vertical_root,
            s.partner_tenant_id,s.operator_legal_entity_id,s.store_id,
            s.vendure_seller_id,s.vendure_channel_id,c.product_type,
            c.vertical_product_class,c.taxonomy_version,
            c.routing_policy_version
       from crays_core.partner_sellable_assignments s
       join crays_core.sellable_product_classifications c
         on c.sellable_assignment_id=s.sellable_assignment_id
        and c.sellable_assignment_version=s.sellable_assignment_version
       join crays_core.product_type_routing_registry r
         on r.taxonomy_version=c.taxonomy_version
        and r.product_type=c.product_type
      where s.sellable_assignment_id=$1 and s.sellable_assignment_version=$2
        and s.lifecycle_state='active' and c.lifecycle_state='active'
        and r.lifecycle_state='active'
        and r.routing_policy_version=c.routing_policy_version
        and r.ordinary_vendure_checkout_allowed=true`,
    [input.sellableAssignmentId, input.sellableAssignmentVersion],
  );
  if (result.rows.length !== 1) {
    throw new Error(
      result.rows.length
        ? "CLUBS_SELLABLE_CAPABILITY_AMBIGUOUS"
        : "CLUBS_SELLABLE_CAPABILITY_UNRESOLVED",
    );
  }
  const row = result.rows[0];
  const sellableAssignmentVersion = Number(row.sellable_assignment_version);
  const taxonomyVersion = Number(row.taxonomy_version);
  if (
    row.sellable_assignment_id !== input.sellableAssignmentId ||
    sellableAssignmentVersion !== input.sellableAssignmentVersion ||
    !Number.isSafeInteger(sellableAssignmentVersion) ||
    sellableAssignmentVersion < 1 ||
    !Number.isSafeInteger(taxonomyVersion) ||
    taxonomyVersion < 1 ||
    !ID.test(row.routing_policy_version) ||
    row.vertical_root !== context.verticalRoot ||
    row.partner_tenant_id !== context.partnerTenantId ||
    row.operator_legal_entity_id !== context.operatorLegalEntityId ||
    row.store_id !== context.storeId ||
    row.store_operator_assignment_id !== context.storeOperatorAssignmentId ||
    Number(row.store_operator_assignment_version) !==
      context.storeOperatorAssignmentVersion ||
    row.vendure_seller_id !== context.vendure.sellerId ||
    row.vendure_channel_id !== context.vendure.channelId
  ) {
    throw new Error("CLUBS_SELLABLE_CAPABILITY_SCOPE_MISMATCH");
  }
  if (row.product_type === "booking") {
    throw new Error("CLUBS_BOOKING_OUTSIDE_ORDINARY_VENDURE");
  }
  const offer = assertClubsOffer({
    canonicalProductType: row.product_type,
    reservationAuthorityRef: input.reservationAuthorityRef,
    availabilityHoldVersion: input.availabilityHoldVersion,
    eventAuthorityRef: input.eventAuthorityRef,
    entitlementVersion: input.entitlementVersion,
    parentBookingRef: input.parentBookingRef,
    outletCommerceRef: input.outletCommerceRef,
    accessEntitlementRef: input.accessEntitlementRef,
  });
  return Object.freeze({
    ...offer,
    verticalProductClass: row.vertical_product_class,
    sellableAssignmentId: row.sellable_assignment_id,
    sellableAssignmentVersion,
    taxonomyVersion,
    routingPolicyVersion: row.routing_policy_version,
    contextFingerprint: context.contextFingerprint,
  });
}

export async function resolveClubsSellableCapability(
  database: KdsDatabase,
  context: ServerCommerceContext,
  input: ClubsSellableCapabilityInput,
) {
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    return resolveClubsSellableCapabilitySnapshot(query, context, input);
  });
}
