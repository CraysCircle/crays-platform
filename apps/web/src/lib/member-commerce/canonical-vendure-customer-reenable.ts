import "server-only";

import type { KdsDatabase } from "@/store-operations/kds";
import { applyCanonicalVendureCustomerProjectionTransition,
  customerProjectionTransitionPayloadSha256 } from
  "./canonical-vendure-customer-projection-command";
import { CustomerProjectionAuthorityError,
  loadCanonicalVendureCustomerProjection } from
  "./canonical-vendure-customer-projection-repository";
import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";

export interface CustomerProjectionReenableProvider {
  reenableProjection(input: Readonly<{ idempotencyKey: string; bindingId: string;
    bindingVersion: number; deploymentCellId: string; vendureChannelId: string;
    channelTokenSecretRef: string; verticalRoot: CommerceVerticalRoot;
    projectionId: string; expectedProjectionVersion: number;
    vendureCustomerId: string; vendureUserId: string }>): Promise<Readonly<{
      actionReceiptId: string; vendureCustomerId: string; vendureUserId: string;
      providerVersion: string; state: "APPLIED" }>>;
}

export class CustomerProjectionReenableError extends Error {
  constructor(readonly code: "CUSTOMER_PROJECTION_REENABLE_PROVIDER_MISMATCH") {
    super(code); this.name = "CustomerProjectionReenableError";
  }
}

export async function reenableCanonicalVendureCustomerProjection(
  database: KdsDatabase, provider: CustomerProjectionReenableProvider,
  input: Readonly<{ canonicalAccountId: string; verticalRoot: CommerceVerticalRoot;
    storeId: string; expectedAssignmentVersion?: number; expectedProjectionVersion: number;
    authIdentityReferenceSha256: string; idempotencyKey: string }>,
) {
  const projection = await loadCanonicalVendureCustomerProjection(database, {
    canonicalAccountId: input.canonicalAccountId, verticalRoot: input.verticalRoot,
    storeId: input.storeId, purpose: "order", use: "historical_order_recovery",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
  });
  const firstApply = projection.projectionLifecycleState === "disabled" &&
    projection.projectionVersion === input.expectedProjectionVersion;
  if (!firstApply) {
    const replay = await database.transaction(async ({ query }) => {
      await query("set transaction isolation level repeatable read");
      await query("set transaction read only");
      await query("select set_config('crays.app_role','core_service',true)");
      return query<{ count: string | number }>(
        `select count(*) count from crays_core.commerce_customer_identity_events
          where idempotency_key=$1 and vendure_customer_projection_id=$2
            and event_type='account_reenabled'`,
        [input.idempotencyKey, projection.vendureCustomerProjectionId]);
    });
    if (Number(replay.rows[0]?.count) !== 1) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_STALE");
    }
  }
  const providerReceipt = await provider.reenableProjection({
    idempotencyKey: input.idempotencyKey,
    bindingId: projection.context.providerBindingId,
    bindingVersion: projection.context.providerBindingVersion,
    deploymentCellId: projection.context.vendure.deploymentCellId,
    vendureChannelId: projection.context.vendure.channelId,
    channelTokenSecretRef: projection.context.vendure.channelTokenSecretRef,
    verticalRoot: projection.context.verticalRoot,
    projectionId: projection.vendureCustomerProjectionId,
    expectedProjectionVersion: input.expectedProjectionVersion,
    vendureCustomerId: projection.vendureCustomerId,
    vendureUserId: projection.vendureUserId,
  });
  if (providerReceipt.vendureCustomerId !== projection.vendureCustomerId ||
      providerReceipt.vendureUserId !== projection.vendureUserId) {
    throw new CustomerProjectionReenableError("CUSTOMER_PROJECTION_REENABLE_PROVIDER_MISMATCH");
  }
  const expectedPayloadSha256 = customerProjectionTransitionPayloadSha256({
    canonicalPersonId: projection.canonicalPersonId,
    relationshipId: projection.commerceCustomerRelationshipId,
    projectionId: projection.vendureCustomerProjectionId,
    projectionVersion: input.expectedProjectionVersion,
    eventType: "account_reenabled", targetLifecycleState: "active",
    providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    emailSnapshotSha256: null, guestBindingSha256: null,
  });
  const coreReceipt = await applyCanonicalVendureCustomerProjectionTransition(database, {
    canonicalAccountId: input.canonicalAccountId, verticalRoot: input.verticalRoot,
    storeId: input.storeId, expectedAssignmentVersion: input.expectedAssignmentVersion,
    expectedProjectionVersion: input.expectedProjectionVersion,
    eventType: "account_reenabled", providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    idempotencyKey: input.idempotencyKey, expectedPayloadSha256,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
  });
  return Object.freeze({ providerReceipt, coreReceipt });
}
