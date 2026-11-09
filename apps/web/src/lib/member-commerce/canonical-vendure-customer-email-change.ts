import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import { applyCanonicalVendureCustomerProjectionTransition,
  customerProjectionTransitionPayloadSha256 } from
  "./canonical-vendure-customer-projection-command";
import { CustomerProjectionAuthorityError,
  loadCanonicalVendureCustomerProjection } from
  "./canonical-vendure-customer-projection-repository";
import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";
import type { CustomerProjectionProviderReceipt } from
  "./vendure-customer-projection-provider";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const SUBJECT = /^[A-Za-z0-9][A-Za-z0-9_.:@|\/-]{2,255}$/;
const HASH = /^[a-f0-9]{64}$/;
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export interface CustomerProjectionEmailChangeProvider {
  updateProjectionEmail(input: Readonly<{ idempotencyKey: string; bindingId: string;
    bindingVersion: number; deploymentCellId: string; vendureChannelId: string;
    channelTokenSecretRef: string; verticalRoot: CommerceVerticalRoot;
    externalAuthStrategy: string; externalIdentifier: string;
    projectionId: string; expectedProjectionVersion: number;
    vendureCustomerId: string; vendureUserId: string;
    emailAddress: string; sourceVersion: string }>): Promise<CustomerProjectionProviderReceipt>;
}

export class CustomerProjectionEmailChangeError extends Error {
  constructor(readonly code:
    | "CUSTOMER_PROJECTION_EMAIL_CHANGE_INPUT_INVALID"
    | "CUSTOMER_PROJECTION_EMAIL_CHANGE_NO_CHANGE"
    | "CUSTOMER_PROJECTION_EMAIL_CHANGE_PROVIDER_MISMATCH") {
    super(code); this.name = "CustomerProjectionEmailChangeError";
  }
}

export async function changeCanonicalVendureCustomerEmail(
  database: KdsDatabase, provider: CustomerProjectionEmailChangeProvider,
  input: Readonly<{ canonicalAccountId: string; verticalRoot: CommerceVerticalRoot;
    storeId: string; expectedAssignmentVersion?: number; expectedProjectionVersion: number;
    externalAuthStrategy: string; externalIdentifier: string; emailAddress: string;
    sourceVersion: string; authIdentityReferenceSha256: string; idempotencyKey: string }>,
) {
  const emailAddress = input.emailAddress.trim().toLowerCase();
  if (!ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
      !Number.isSafeInteger(input.expectedProjectionVersion) ||
      input.expectedProjectionVersion < 1 || !ID.test(input.externalAuthStrategy) ||
      !SUBJECT.test(input.externalIdentifier) || !ID.test(input.sourceVersion) ||
      !HASH.test(input.authIdentityReferenceSha256) ||
      input.idempotencyKey.length < 8 || !ID.test(input.idempotencyKey) ||
      emailAddress.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
    throw new CustomerProjectionEmailChangeError(
      "CUSTOMER_PROJECTION_EMAIL_CHANGE_INPUT_INVALID");
  }
  const projection = await loadCanonicalVendureCustomerProjection(database, {
    canonicalAccountId: input.canonicalAccountId, verticalRoot: input.verticalRoot,
    storeId: input.storeId, purpose: "account", use: "active_session",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
  });
  if (projection.projectionVersion !== input.expectedProjectionVersion) {
    const replay = await database.transaction(async ({ query }) => {
      await query("set transaction isolation level repeatable read");
      await query("set transaction read only");
      await query("select set_config('crays.app_role','core_service',true)");
      return query<{ count: string | number }>(
        `select count(*) count from crays_core.commerce_customer_identity_events
          where idempotency_key=$1 and vendure_customer_projection_id=$2
            and event_type='email_changed'`,
        [input.idempotencyKey, projection.vendureCustomerProjectionId]);
    });
    if (Number(replay.rows[0]?.count) !== 1) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_STALE");
    }
  }
  const targetEmailSnapshotSha256 = sha256(emailAddress);
  if (projection.projectionVersion === input.expectedProjectionVersion) {
    const current = await database.transaction(async ({ query }) => {
      await query("set transaction isolation level repeatable read");
      await query("set transaction read only");
      await query("select set_config('crays.app_role','core_service',true)");
      return query<{ email_snapshot_sha256: string | null }>(
        `select email_snapshot_sha256
           from crays_core.vendure_customer_projections
          where vendure_customer_projection_id=$1 and projection_version=$2
            and lifecycle_state='active'`,
        [projection.vendureCustomerProjectionId, input.expectedProjectionVersion]);
    });
    if (current.rows.length !== 1) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_STALE");
    }
    if (current.rows[0].email_snapshot_sha256 === targetEmailSnapshotSha256) {
      throw new CustomerProjectionEmailChangeError(
        "CUSTOMER_PROJECTION_EMAIL_CHANGE_NO_CHANGE");
    }
  }
  const providerReceipt = await provider.updateProjectionEmail({
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
    vendureCustomerId: projection.vendureCustomerId,
    vendureUserId: projection.vendureUserId,
    emailAddress, sourceVersion: input.sourceVersion,
  });
  const emailSnapshotSha256 = targetEmailSnapshotSha256;
  if (providerReceipt.vendureCustomerId !== projection.vendureCustomerId ||
      providerReceipt.vendureUserId !== projection.vendureUserId ||
      providerReceipt.externalIdentifierSha256 !== sha256(input.externalIdentifier) ||
      providerReceipt.emailSnapshotSha256 !== emailSnapshotSha256) {
    throw new CustomerProjectionEmailChangeError(
      "CUSTOMER_PROJECTION_EMAIL_CHANGE_PROVIDER_MISMATCH");
  }
  const expectedPayloadSha256 = customerProjectionTransitionPayloadSha256({
    canonicalPersonId: projection.canonicalPersonId,
    relationshipId: projection.commerceCustomerRelationshipId,
    projectionId: projection.vendureCustomerProjectionId,
    projectionVersion: input.expectedProjectionVersion,
    eventType: "email_changed", targetLifecycleState: "active",
    providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    emailSnapshotSha256, guestBindingSha256: null,
  });
  const coreReceipt = await applyCanonicalVendureCustomerProjectionTransition(database, {
    canonicalAccountId: input.canonicalAccountId, verticalRoot: input.verticalRoot,
    storeId: input.storeId, expectedAssignmentVersion: input.expectedAssignmentVersion,
    expectedProjectionVersion: input.expectedProjectionVersion,
    eventType: "email_changed", providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    idempotencyKey: input.idempotencyKey, expectedPayloadSha256,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    emailSnapshotSha256,
  });
  return Object.freeze({ providerReceipt, coreReceipt });
}
