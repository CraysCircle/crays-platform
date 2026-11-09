import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  applyCanonicalVendureCustomerProjectionTransition,
  customerProjectionTransitionPayloadSha256,
} from "./canonical-vendure-customer-projection-command";
import {
  CustomerProjectionAuthorityError,
  loadCanonicalVendureCustomerProjection,
} from
  "./canonical-vendure-customer-projection-repository";
import type { CustomerProjectionRegistrationProvider } from
  "./canonical-vendure-customer-registration";
import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const EXTERNAL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:@|\/-]{2,255}$/;
const HASH = /^[a-f0-9]{64}$/;

export class CustomerProjectionReconciliationError extends Error {
  constructor(readonly code:
    | "CUSTOMER_PROJECTION_RECONCILIATION_INPUT_INVALID"
    | "CUSTOMER_PROJECTION_RECONCILIATION_PROVIDER_MISMATCH") {
    super(code);
    this.name = "CustomerProjectionReconciliationError";
  }
}

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

export async function reconcileCanonicalVendureCustomerLogin(
  database: KdsDatabase,
  provider: CustomerProjectionRegistrationProvider,
  input: Readonly<{
    canonicalAccountId: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
    expectedProjectionVersion: number;
    externalAuthStrategy: string;
    externalIdentifier: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
    profileSha256: string;
    sourceVersion: string;
    authIdentityReferenceSha256: string;
    idempotencyKey: string;
  }>,
) {
  const emailAddress = input.emailAddress.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
      !Number.isSafeInteger(input.expectedProjectionVersion) ||
      input.expectedProjectionVersion < 1 || !ID.test(input.externalAuthStrategy) ||
      !EXTERNAL_IDENTIFIER.test(input.externalIdentifier) ||
      emailAddress.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ||
      !firstName || firstName.length > 100 || !lastName || lastName.length > 100 ||
      !HASH.test(input.profileSha256) || !ID.test(input.sourceVersion) ||
      !HASH.test(input.authIdentityReferenceSha256) || input.idempotencyKey.length < 8 ||
      !ID.test(input.idempotencyKey)) {
    throw new CustomerProjectionReconciliationError(
      "CUSTOMER_PROJECTION_RECONCILIATION_INPUT_INVALID",
    );
  }
  const projection = await loadCanonicalVendureCustomerProjection(database, {
    canonicalAccountId: input.canonicalAccountId,
    verticalRoot: input.verticalRoot, storeId: input.storeId,
    purpose: "account", use: "active_session",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
  });
  if (projection.projectionVersion !== input.expectedProjectionVersion) {
    const replay = await database.transaction(async ({ query }) => {
      await query("set transaction isolation level repeatable read");
      await query("set transaction read only");
      await query("select set_config('crays.app_role','core_service',true)");
      return query<{ count: string | number }>(
        `select count(*) count from crays_core.commerce_customer_identity_events
          where idempotency_key=$1 and canonical_person_id=$2
            and commerce_customer_relationship_id=$3
            and vendure_customer_projection_id=$4 and event_type='login_reconciled'`,
        [input.idempotencyKey, projection.canonicalPersonId,
          projection.commerceCustomerRelationshipId,
          projection.vendureCustomerProjectionId],
      );
    });
    if (Number(replay.rows[0]?.count) !== 1) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_STALE");
    }
  }
  const providerReceipt = await provider.ensureProjection({
    idempotencyKey: input.idempotencyKey,
    bindingId: projection.context.providerBindingId,
    bindingVersion: projection.context.providerBindingVersion,
    deploymentCellId: projection.context.vendure.deploymentCellId,
    vendureChannelId: projection.context.vendure.channelId,
    channelTokenSecretRef: projection.context.vendure.channelTokenSecretRef,
    verticalRoot: projection.context.verticalRoot,
    externalAuthStrategy: input.externalAuthStrategy,
    externalIdentifier: input.externalIdentifier,
    emailAddress, firstName, lastName,
    profileSha256: input.profileSha256, sourceVersion: input.sourceVersion,
  });
  const externalIdentifierSha256 = sha256(input.externalIdentifier);
  const emailSnapshotSha256 = sha256(emailAddress);
  if (providerReceipt.vendureCustomerId !== projection.vendureCustomerId ||
      providerReceipt.vendureUserId !== projection.vendureUserId ||
      providerReceipt.externalIdentifierSha256 !== externalIdentifierSha256 ||
      providerReceipt.emailSnapshotSha256 !== emailSnapshotSha256) {
    throw new CustomerProjectionReconciliationError(
      "CUSTOMER_PROJECTION_RECONCILIATION_PROVIDER_MISMATCH",
    );
  }
  const expectedPayloadSha256 = customerProjectionTransitionPayloadSha256({
    canonicalPersonId: projection.canonicalPersonId,
    relationshipId: projection.commerceCustomerRelationshipId,
    projectionId: projection.vendureCustomerProjectionId,
    projectionVersion: input.expectedProjectionVersion,
    eventType: "login_reconciled", targetLifecycleState: "active",
    providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    emailSnapshotSha256, guestBindingSha256: null,
  });
  const coreReceipt = await applyCanonicalVendureCustomerProjectionTransition(database, {
    canonicalAccountId: input.canonicalAccountId,
    verticalRoot: input.verticalRoot, storeId: input.storeId,
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    eventType: "login_reconciled",
    expectedProjectionVersion: input.expectedProjectionVersion,
    providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
    idempotencyKey: input.idempotencyKey, expectedPayloadSha256,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    emailSnapshotSha256,
  });
  return Object.freeze({ providerReceipt, coreReceipt });
}
