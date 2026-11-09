import "server-only";

import type { KdsDatabase } from "@/store-operations/kds";
import { applyCanonicalVendureCustomerProjectionTransition,
  customerProjectionTransitionPayloadSha256 } from
  "./canonical-vendure-customer-projection-command";
import { CustomerProjectionAuthorityError,
  loadCanonicalVendureCustomerProjection } from
  "./canonical-vendure-customer-projection-repository";
import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";

export interface CustomerProjectionDisableProvider {
  disableProjection(input: Readonly<{
    idempotencyKey: string; bindingId: string; bindingVersion: number;
    deploymentCellId: string; vendureChannelId: string; channelTokenSecretRef: string;
    verticalRoot: CommerceVerticalRoot; externalAuthStrategy: string;
    externalIdentifier: string; projectionId: string; expectedProjectionVersion: number;
  }>): Promise<Readonly<{ actionReceiptId: string; vendureCustomerId: string;
    vendureUserId: string; providerVersion: string; state: "APPLIED" }>>;
}

export class CustomerProjectionDisableError extends Error {
  constructor(readonly code: "CUSTOMER_PROJECTION_DISABLE_PROVIDER_MISMATCH") {
    super(code); this.name = "CustomerProjectionDisableError";
  }
}

export async function disableCanonicalVendureCustomerProjection(
  database: KdsDatabase, provider: CustomerProjectionDisableProvider,
  input: Readonly<{ canonicalAccountId: string; verticalRoot: CommerceVerticalRoot;
    storeId: string; expectedAssignmentVersion?: number; expectedProjectionVersion: number;
    externalAuthStrategy: string; externalIdentifier: string;
    authIdentityReferenceSha256: string; idempotencyKey: string }>,
) {
  const projection = await loadCanonicalVendureCustomerProjection(database, {
    canonicalAccountId: input.canonicalAccountId, verticalRoot: input.verticalRoot,
    storeId: input.storeId, purpose: "order", use: "historical_order_recovery",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
  });
  if (projection.projectionLifecycleState !== "active" ||
      projection.projectionVersion !== input.expectedProjectionVersion) {
    const replay = await database.transaction(async ({ query }) => {
      await query("set transaction isolation level repeatable read");
      await query("set transaction read only");
      await query("select set_config('crays.app_role','core_service',true)");
      return query<{ count: string | number }>(
        `select count(*) count from crays_core.commerce_customer_identity_events
          where idempotency_key=$1 and vendure_customer_projection_id=$2
            and event_type='account_disabled'`,
        [input.idempotencyKey, projection.vendureCustomerProjectionId],
      );
    });
    if (Number(replay.rows[0]?.count) !== 1) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_STALE");
    }
  }
  const providerReceipt = await provider.disableProjection({
    idempotencyKey: input.idempotencyKey,
    bindingId: projection.context.providerBindingId,
    bindingVersion: projection.context.providerBindingVersion,
    deploymentCellId: projection.context.vendure.deploymentCellId,
    vendureChannelId: projection.context.vendure.channelId,
    channelTokenSecretRef: projection.context.vendure.channelTokenSecretRef,
    verticalRoot: projection.context.verticalRoot,
    externalAuthStrategy: input.externalAuthStrategy,
    externalIdentifier: input.externalIdentifier,
    projectionId: projection.vendureCustomerProjectionId,
    expectedProjectionVersion: input.expectedProjectionVersion,
  });
  if (providerReceipt.vendureCustomerId !== projection.vendureCustomerId ||
      providerReceipt.vendureUserId !== projection.vendureUserId) {
    throw new CustomerProjectionDisableError("CUSTOMER_PROJECTION_DISABLE_PROVIDER_MISMATCH");
  }
  const expectedPayloadSha256 = customerProjectionTransitionPayloadSha256({
    canonicalPersonId: projection.canonicalPersonId,
    relationshipId: projection.commerceCustomerRelationshipId,
    projectionId: projection.vendureCustomerProjectionId,
    projectionVersion: input.expectedProjectionVersion,
    eventType: "account_disabled", targetLifecycleState: "disabled",
    providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    emailSnapshotSha256: null, guestBindingSha256: null,
  });
  const coreReceipt = await applyCanonicalVendureCustomerProjectionTransition(database, {
    canonicalAccountId: input.canonicalAccountId, verticalRoot: input.verticalRoot,
    storeId: input.storeId, expectedAssignmentVersion: input.expectedAssignmentVersion,
    expectedProjectionVersion: input.expectedProjectionVersion,
    eventType: "account_disabled", providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    idempotencyKey: input.idempotencyKey, expectedPayloadSha256,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
  });
  return Object.freeze({ providerReceipt, coreReceipt });
}
