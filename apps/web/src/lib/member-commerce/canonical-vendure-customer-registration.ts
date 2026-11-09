import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  createCanonicalVendureCustomerProjectionFromReceipt,
  CustomerProjectionCommandError,
  customerProjectionRegistrationPayloadSha256,
} from "./canonical-vendure-customer-projection-command";
import {
  resolveServerCommerceContextSnapshot,
  type CommerceVerticalRoot,
  type ServerCommerceContext,
} from "./server-commerce-context-resolver";
import type { CustomerProjectionProviderReceipt } from
  "./vendure-customer-projection-provider";
import {
  acquireVendureCustomerRegistrationClaim,
  completeVendureCustomerRegistrationClaim,
  recordVendureCustomerRegistrationObservation,
  type RegistrationClaimDatabase,
} from "./vendure-customer-registration-claim-repository";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const EXTERNAL_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:@|\/-]{2,255}$/;
const HASH = /^[a-f0-9]{64}$/;
type Purpose = "account" | "order" | "support" | "loyalty" | "marketing";

export interface CustomerProjectionRegistrationProvider {
  ensureProjection(input: Readonly<{
    idempotencyKey: string;
    bindingId: string;
    bindingVersion: number;
    deploymentCellId: string;
    vendureChannelId: string;
    channelTokenSecretRef: string;
    verticalRoot: CommerceVerticalRoot;
    externalAuthStrategy: string;
    externalIdentifier: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
    profileSha256: string;
    sourceVersion: string;
  }>): Promise<CustomerProjectionProviderReceipt>;
}

export class CustomerProjectionRegistrationError extends Error {
  constructor(readonly code:
    | "CUSTOMER_PROJECTION_REGISTRATION_INPUT_INVALID"
    | "CUSTOMER_PROJECTION_REGISTRATION_NOT_ACTIVE"
    | "CUSTOMER_PROJECTION_REGISTRATION_ALREADY_EXISTS"
    | "CUSTOMER_PROJECTION_PROVIDER_RECEIPT_MISMATCH"
    | "CUSTOMER_PROJECTION_REGISTRATION_IN_FLIGHT"
    | "CUSTOMER_PROJECTION_REGISTRATION_RECONCILIATION_REQUIRED"
    | "CUSTOMER_PROJECTION_REGISTRATION_RETRY_AUTHORITY_REQUIRED") {
    super(code);
    this.name = "CustomerProjectionRegistrationError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function preflight(database: KdsDatabase, input: Readonly<{
  canonicalAccountId: string;
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  expectedAssignmentVersion?: number;
  idempotencyKey: string;
}>) {
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read");
    await query("set transaction read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now);
    const context = await resolveServerCommerceContextSnapshot(query, {
      verticalRoot: input.verticalRoot, storeId: input.storeId,
      expectedAssignmentVersion: input.expectedAssignmentVersion,
    }, authorityNow);
    const people = await query<{ canonical_person_id: string }>(
      `select canonical_person_id from crays_core.canonical_people
        where account_id=$1 and lifecycle_state='active'`,
      [input.canonicalAccountId],
    );
    if (people.rows.length !== 1) {
      throw new CustomerProjectionRegistrationError(
        "CUSTOMER_PROJECTION_REGISTRATION_NOT_ACTIVE",
      );
    }
    const canonicalPersonId = people.rows[0].canonical_person_id;
    const existing = await query<{ relationship_count: string | number;
      replay_count: string | number }>(
      `select
        (select count(*) from crays_core.commerce_customer_relationships
          where canonical_person_id=$1 and vertical_root=$2 and partner_tenant_id=$3
            and operator_legal_entity_id=$4) relationship_count,
        (select count(*) from crays_core.commerce_customer_identity_events
          where canonical_person_id=$1 and idempotency_key=$5) replay_count`,
      [canonicalPersonId, context.verticalRoot, context.partnerTenantId,
        context.operatorLegalEntityId, input.idempotencyKey],
    );
    if (Number(existing.rows[0]?.relationship_count) > 0 &&
        Number(existing.rows[0]?.replay_count) === 0) {
      throw new CustomerProjectionRegistrationError(
        "CUSTOMER_PROJECTION_REGISTRATION_ALREADY_EXISTS",
      );
    }
    return Object.freeze({ canonicalPersonId, context });
  });
}

type RegistrationClaimDependencies = Readonly<{
  acquire: typeof acquireVendureCustomerRegistrationClaim;
  observe: typeof recordVendureCustomerRegistrationObservation;
  complete: typeof completeVendureCustomerRegistrationClaim;
  runPreflight: typeof preflight;
  createCore: typeof createCanonicalVendureCustomerProjectionFromReceipt;
  now(): Date;
  nonce(): string;
}>;

export async function registerCanonicalVendureCustomerProjection(
  database: KdsDatabase,
  provider: CustomerProjectionRegistrationProvider,
  input: Readonly<{
    canonicalAccountId: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
    purposes: readonly Purpose[];
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
  overrides: Partial<RegistrationClaimDependencies> = {},
) {
  const purposes = [...new Set(input.purposes)].sort() as Purpose[];
  const emailAddress = input.emailAddress.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
      !ID.test(input.externalAuthStrategy) ||
      !EXTERNAL_IDENTIFIER.test(input.externalIdentifier) ||
      purposes.length < 1 || purposes.length !== input.purposes.length ||
      purposes.some((purpose) =>
        !["account", "order", "support", "loyalty", "marketing"].includes(purpose)) ||
      emailAddress.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ||
      !firstName || firstName.length > 100 || !lastName || lastName.length > 100 ||
      !HASH.test(input.profileSha256) || !ID.test(input.sourceVersion) ||
      !HASH.test(input.authIdentityReferenceSha256) ||
      input.idempotencyKey.length < 8 || !ID.test(input.idempotencyKey)) {
    throw new CustomerProjectionRegistrationError(
      "CUSTOMER_PROJECTION_REGISTRATION_INPUT_INVALID",
    );
  }
  const dependencies: RegistrationClaimDependencies = {
    acquire: acquireVendureCustomerRegistrationClaim,
    observe: recordVendureCustomerRegistrationObservation,
    complete: completeVendureCustomerRegistrationClaim,
    runPreflight: preflight,
    createCore: createCanonicalVendureCustomerProjectionFromReceipt,
    now: () => new Date(),
    nonce: randomUUID,
    ...overrides,
  };
  const prepared = await dependencies.runPreflight(database, input);
  const context: ServerCommerceContext = prepared.context;
  const externalIdentifierSha256 = sha256(input.externalIdentifier);
  const emailSnapshotSha256 = sha256(emailAddress);
  const providerInput = {
    idempotencyKey: input.idempotencyKey,
    bindingId: context.providerBindingId,
    bindingVersion: context.providerBindingVersion,
    deploymentCellId: context.vendure.deploymentCellId,
    vendureChannelId: context.vendure.channelId,
    channelTokenSecretRef: context.vendure.channelTokenSecretRef,
    verticalRoot: context.verticalRoot,
    externalAuthStrategy: input.externalAuthStrategy,
    externalIdentifier: input.externalIdentifier,
    emailAddress, firstName, lastName,
    profileSha256: input.profileSha256,
    sourceVersion: input.sourceVersion,
  } as const;
  let providerReceipt: CustomerProjectionProviderReceipt;
  let registrationClaimId: string | null = null;
  let registrationClaimState: string | null = null;
  if (context.verticalRoot === "clubs") {
    const acquired = await dependencies.acquire(
      database as unknown as RegistrationClaimDatabase,
      {
        command: {
          canonicalAccountId: input.canonicalAccountId,
          canonicalPersonId: prepared.canonicalPersonId,
          verticalRoot: "clubs",
          partnerTenantId: context.partnerTenantId,
          operatorLegalEntityId: context.operatorLegalEntityId,
          deploymentCellId: context.vendure.deploymentCellId,
          providerBindingId: context.providerBindingId,
          providerBindingVersion: context.providerBindingVersion,
          externalIdentifierSha256,
          emailSnapshotSha256,
          idempotencyKey: input.idempotencyKey,
        },
        claimNonce: dependencies.nonce(),
        now: dependencies.now(),
      },
    );
    registrationClaimId = acquired.claim.claimId;
    registrationClaimState = acquired.claim.state;
    if (!acquired.providerCallRequired) {
      if (acquired.reconciliationRequired) {
        throw new CustomerProjectionRegistrationError(
          "CUSTOMER_PROJECTION_REGISTRATION_RECONCILIATION_REQUIRED",
        );
      }
      if (acquired.claim.state === "CLAIMED") {
        throw new CustomerProjectionRegistrationError(
          "CUSTOMER_PROJECTION_REGISTRATION_IN_FLIGHT",
        );
      }
      if (acquired.claim.state === "FAILED_RETRYABLE" ||
          acquired.claim.state === "PROVEN_NOT_APPLIED") {
        throw new CustomerProjectionRegistrationError(
          "CUSTOMER_PROJECTION_REGISTRATION_RETRY_AUTHORITY_REQUIRED",
        );
      }
      if (!acquired.claim.vendureCustomerId ||
          !acquired.claim.vendureUserId ||
          !acquired.claim.providerVersion ||
          !acquired.claim.providerActionReceiptId) {
        throw new CustomerProjectionRegistrationError(
          "CUSTOMER_PROJECTION_REGISTRATION_RECONCILIATION_REQUIRED",
        );
      }
      providerReceipt = Object.freeze({
        actionReceiptId: acquired.claim.providerActionReceiptId,
        vendureCustomerId: acquired.claim.vendureCustomerId,
        vendureUserId: acquired.claim.vendureUserId,
        externalIdentifierSha256,
        emailSnapshotSha256,
        providerVersion: acquired.claim.providerVersion,
        state: "APPLIED" as const,
      });
    } else {
      try {
        providerReceipt = await provider.ensureProjection(providerInput);
      } catch {
        await dependencies.observe(
          database as unknown as RegistrationClaimDatabase,
          { tenantId: context.partnerTenantId, claimId: acquired.claim.claimId,
            now: dependencies.now(), observation: { result: "UNKNOWN" } },
        );
        throw new CustomerProjectionRegistrationError(
          "CUSTOMER_PROJECTION_REGISTRATION_RECONCILIATION_REQUIRED",
        );
      }
      if (providerReceipt.externalIdentifierSha256 !== externalIdentifierSha256 ||
          providerReceipt.emailSnapshotSha256 !== emailSnapshotSha256) {
        await dependencies.observe(
          database as unknown as RegistrationClaimDatabase,
          { tenantId: context.partnerTenantId, claimId: acquired.claim.claimId,
            now: dependencies.now(), observation: { result: "UNKNOWN" } },
        );
        throw new CustomerProjectionRegistrationError(
          "CUSTOMER_PROJECTION_PROVIDER_RECEIPT_MISMATCH",
        );
      }
      const providerReceiptSha256 = sha256(JSON.stringify(providerReceipt));
      const proven = await dependencies.observe(
        database as unknown as RegistrationClaimDatabase,
        { tenantId: context.partnerTenantId, claimId: acquired.claim.claimId,
          now: dependencies.now(), observation: {
            result: "APPLIED",
            vendureCustomerId: providerReceipt.vendureCustomerId,
            vendureUserId: providerReceipt.vendureUserId,
            providerVersion: providerReceipt.providerVersion,
            providerActionReceiptId: providerReceipt.actionReceiptId,
            providerReceiptSha256,
          } },
      );
      registrationClaimState = proven.state;
    }
  } else {
    providerReceipt = await provider.ensureProjection(providerInput);
  }
  if (providerReceipt.externalIdentifierSha256 !== externalIdentifierSha256 ||
      providerReceipt.emailSnapshotSha256 !== emailSnapshotSha256) {
    throw new CustomerProjectionRegistrationError(
      "CUSTOMER_PROJECTION_PROVIDER_RECEIPT_MISMATCH",
    );
  }
  const expectedPayloadSha256 = customerProjectionRegistrationPayloadSha256({
    canonicalPersonId: prepared.canonicalPersonId,
    verticalRoot: context.verticalRoot, partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    deploymentCellId: context.vendure.deploymentCellId,
    providerBindingId: context.providerBindingId,
    providerBindingVersion: context.providerBindingVersion,
    vendureCustomerId: providerReceipt.vendureCustomerId,
    vendureUserId: providerReceipt.vendureUserId,
    externalIdentifierSha256, emailSnapshotSha256,
    authIdentityReferenceSha256: input.authIdentityReferenceSha256,
    purposes, providerVersion: providerReceipt.providerVersion,
    actionReceiptId: providerReceipt.actionReceiptId,
  });
  try {
    const coreReceipt = await dependencies.createCore(database, {
      canonicalAccountId: input.canonicalAccountId,
      verticalRoot: input.verticalRoot, storeId: input.storeId,
      expectedAssignmentVersion: input.expectedAssignmentVersion,
      purposes, vendureCustomerId: providerReceipt.vendureCustomerId,
      vendureUserId: providerReceipt.vendureUserId,
      externalIdentifierSha256, emailSnapshotSha256,
      authIdentityReferenceSha256: input.authIdentityReferenceSha256,
      providerVersion: providerReceipt.providerVersion,
      actionReceiptId: providerReceipt.actionReceiptId,
      idempotencyKey: input.idempotencyKey, expectedPayloadSha256,
    });
    if (context.verticalRoot === "clubs" && registrationClaimId &&
        registrationClaimState !== "COMPLETED") {
      await dependencies.complete(
        database as unknown as RegistrationClaimDatabase,
        { tenantId: context.partnerTenantId, claimId: registrationClaimId,
          now: dependencies.now() },
      );
    }
    return Object.freeze({ providerReceipt, coreReceipt });
  } catch (error) {
    if (error instanceof CustomerProjectionCommandError) throw error;
    throw error;
  }
}
