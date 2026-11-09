import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  verifyCustomerGuestMergeReceipt,
  type SignedCustomerGuestMergeReceipt,
} from "./canonical-customer-guest-merge-receipt";
import type { KdsDatabase } from "@/store-operations/kds";
import {
  resolveServerCommerceContextSnapshot,
  type CommerceVerticalRoot,
} from "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VENDURE_PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const EVENTS = [
  "login_reconciled", "guest_merged", "email_changed",
  "account_disabled", "account_reenabled", "projection_anonymized",
] as const;
type EventType = (typeof EVENTS)[number];

type ProjectionRow = {
  canonical_person_id: string;
  commerce_customer_relationship_id: string;
  relationship_version: string | number;
  vendure_customer_projection_id: string;
  projection_version: string | number;
  lifecycle_state: string;
  vendure_customer_id: string;
  vendure_user_id: string;
};

type EventRow = {
  commerce_customer_identity_event_id: string;
  canonical_person_id: string;
  commerce_customer_relationship_id: string;
  vendure_customer_projection_id: string | null;
  event_type: string;
  auth_identity_reference_sha256: string | null;
  email_snapshot_sha256: string | null;
  guest_binding_sha256: string | null;
  action_receipt_id: string;
  payload_sha256: string;
};

export class CustomerProjectionCommandError extends Error {
  constructor(readonly code:
    | "CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID"
    | "CUSTOMER_PROJECTION_COMMAND_NOT_ACTIVE"
    | "CUSTOMER_PROJECTION_COMMAND_STALE"
    | "CUSTOMER_PROJECTION_COMMAND_TRANSITION_DENIED"
    | "CUSTOMER_PROJECTION_COMMAND_PAYLOAD_MISMATCH"
    | "CUSTOMER_PROJECTION_COMMAND_GUEST_RECEIPT_MISMATCH"
    | "CUSTOMER_PROJECTION_COMMAND_REPLAY_MISMATCH") {
    super(code);
    this.name = "CustomerProjectionCommandError";
  }
}

export function customerProjectionTransitionPayloadSha256(input: Readonly<{
  canonicalPersonId: string;
  relationshipId: string;
  projectionId: string;
  projectionVersion: number;
  eventType: EventType;
  targetLifecycleState: "active" | "disabled" | "anonymized";
  providerVersion: string;
  actionReceiptId: string;
  authIdentityReferenceSha256: string | null;
  emailSnapshotSha256: string | null;
  guestBindingSha256: string | null;
  guestMergeReceiptPayloadSha256?: string;
}>) {
  return createHash("sha256").update(JSON.stringify({ version: 1, ...input }), "utf8").digest("hex");
}

export function customerProjectionRegistrationPayloadSha256(input: Readonly<{
  canonicalPersonId: string;
  verticalRoot: CommerceVerticalRoot;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  deploymentCellId: string;
  providerBindingId: string;
  providerBindingVersion: number;
  vendureCustomerId: string;
  vendureUserId: string;
  externalIdentifierSha256: string;
  emailSnapshotSha256: string | null;
  authIdentityReferenceSha256: string;
  purposes: readonly string[];
  providerVersion: string;
  actionReceiptId: string;
}>) {
  return createHash("sha256").update(JSON.stringify({ version: 1, ...input }), "utf8").digest("hex");
}

function deterministicId(prefix: string, idempotencyKey: string) {
  return `${prefix}_${createHash("sha256").update(`${prefix}:${idempotencyKey}`).digest("hex").slice(0, 40)}`;
}

function hashesFor(eventType: EventType, input: Readonly<{
  authIdentityReferenceSha256?: string;
  emailSnapshotSha256?: string;
  guestBindingSha256?: string;
}>) {
  const values = {
    authIdentityReferenceSha256: input.authIdentityReferenceSha256 ?? null,
    emailSnapshotSha256: input.emailSnapshotSha256 ?? null,
    guestBindingSha256: input.guestBindingSha256 ?? null,
  };
  if (Object.values(values).some((value) => value !== null && !HASH.test(value))) {
    throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID");
  }
  if (
    (eventType === "guest_merged" && !values.guestBindingSha256) ||
    (eventType === "email_changed" && !values.emailSnapshotSha256) ||
    (eventType !== "guest_merged" && values.guestBindingSha256 !== null)
  ) throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID");
  return values;
}

const TRANSITIONS: Record<EventType,
  readonly [readonly string[], "active" | "disabled" | "anonymized"]> = {
  login_reconciled: [["active"], "active"],
  guest_merged: [["active"], "active"],
  email_changed: [["active"], "active"],
  account_disabled: [["active"], "disabled"],
  account_reenabled: [["disabled"], "active"],
  projection_anonymized: [["disabled", "superseded"], "anonymized"],
};

function transition(eventType: EventType, current: string) {
  const [from, target] = TRANSITIONS[eventType];
  if (!from.includes(current)) {
    throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_TRANSITION_DENIED");
  }
  return target;
}

export async function applyCanonicalVendureCustomerProjectionTransition(
  database: KdsDatabase,
  input: Readonly<{
    canonicalAccountId: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    eventType: EventType;
    expectedAssignmentVersion?: number;
    expectedProjectionVersion: number;
    providerVersion: string;
    actionReceiptId: string;
    idempotencyKey: string;
    expectedPayloadSha256: string;
    authIdentityReferenceSha256?: string;
    emailSnapshotSha256?: string;
    guestBindingSha256?: string;
    guestMergeReceipt?: SignedCustomerGuestMergeReceipt;
    guestMergeSecret?: string;
    guestMergeMaxLifetimeMs?: number;
    guestMergeReceiptPayloadSha256?: string;
    guestMergeSellerContextSha256?: string;
    guestMergeClassificationSnapshotSha256?: string;
    now?: Date;
  }>,
) {
  if (
    !ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
    !EVENTS.includes(input.eventType) ||
    !Number.isSafeInteger(input.expectedProjectionVersion) || input.expectedProjectionVersion < 1 ||
    !ID.test(input.providerVersion) || !ID.test(input.actionReceiptId) ||
    input.idempotencyKey.length < 8 || !ID.test(input.idempotencyKey) ||
    !HASH.test(input.expectedPayloadSha256)
  ) throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID");
  const guestReceiptFields = [
    input.guestMergeReceipt,
    input.guestMergeSecret,
    input.guestMergeMaxLifetimeMs,
    input.guestMergeReceiptPayloadSha256,
    input.guestMergeSellerContextSha256,
    input.guestMergeClassificationSnapshotSha256,
  ];
  const completeGuestReceipt = guestReceiptFields.every(
    (value) => value !== undefined,
  );
  if ((input.eventType === "guest_merged") !== completeGuestReceipt ||
      (input.eventType !== "guest_merged" &&
       guestReceiptFields.some((value) => value !== undefined))) {
    throw new CustomerProjectionCommandError(
      "CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID",
    );
  }
  if (completeGuestReceipt &&
      (!HASH.test(input.guestMergeReceiptPayloadSha256 as string) ||
       !HASH.test(input.guestMergeSellerContextSha256 as string) ||
       !HASH.test(
         input.guestMergeClassificationSnapshotSha256 as string))) {
    throw new CustomerProjectionCommandError(
      "CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID",
    );
  }
  const eventHashes = hashesFor(input.eventType, input);
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level serializable");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = input.now ?? new Date(clock.rows[0]?.authority_now);
    if (Number.isNaN(authorityNow.getTime())) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID");
    }
    const context = await resolveServerCommerceContextSnapshot(query, {
      verticalRoot: input.verticalRoot,
      storeId: input.storeId,
      expectedAssignmentVersion: input.expectedAssignmentVersion,
    }, authorityNow);
    const projectionResult = await query<ProjectionRow>(
      `select person.canonical_person_id,r.commerce_customer_relationship_id,
              r.relationship_version,p.vendure_customer_projection_id,
              p.projection_version,p.lifecycle_state,p.vendure_customer_id,
              p.vendure_user_id
         from crays_core.canonical_people person
         join crays_core.commerce_customer_relationships r
           on r.canonical_person_id=person.canonical_person_id
         join crays_core.vendure_customer_projections p
           on p.commerce_customer_relationship_id=r.commerce_customer_relationship_id
          and p.relationship_version=r.relationship_version
          and p.canonical_person_id=person.canonical_person_id
        where person.account_id=$1 and person.lifecycle_state='active'
          and r.vertical_root=$2 and r.partner_tenant_id=$3
          and r.operator_legal_entity_id=$4 and r.lifecycle_state='active'
          and r.effective_from<=$5 and (r.effective_until is null or r.effective_until>$5)
          and p.vendure_deployment_cell_id=$6 and p.provider_binding_id=$7
          and p.provider_binding_version=$8
        for update of p`,
      [input.canonicalAccountId, context.verticalRoot, context.partnerTenantId,
        context.operatorLegalEntityId, authorityNow.toISOString(),
        context.vendure.deploymentCellId, context.providerBindingId,
        context.providerBindingVersion],
    );
    if (projectionResult.rows.length !== 1) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_NOT_ACTIVE");
    }
    const row = projectionResult.rows[0];
    const projectionVersion = Number(row.projection_version);
    let verifiedGuestReceiptPayloadSha256: string | undefined;
    if (input.eventType === "guest_merged") {
      const signedReceipt =
        input.guestMergeReceipt as SignedCustomerGuestMergeReceipt;
      const receipt = verifyCustomerGuestMergeReceipt(
        signedReceipt,
        {
          secret: input.guestMergeSecret as string,
          maxLifetimeMs: input.guestMergeMaxLifetimeMs as number,
          authorityNow,
          expected: {
            verticalRoot: context.verticalRoot,
            partnerTenantId: context.partnerTenantId,
            operatorLegalEntityId: context.operatorLegalEntityId,
            storeId: context.storeId,
            canonicalPersonId: row.canonical_person_id,
            relationshipId: row.commerce_customer_relationship_id,
            relationshipVersion: Number(row.relationship_version),
            projectionId: row.vendure_customer_projection_id,
            projectionVersion: input.expectedProjectionVersion,
            providerVersion: input.providerVersion,
            sellerContextSha256:
              input.guestMergeSellerContextSha256 as string,
            classificationSnapshotSha256:
              input.guestMergeClassificationSnapshotSha256 as string,
          },
        },
      );
      if (receipt.receiptId !== input.actionReceiptId ||
          receipt.idempotencyKey !== input.idempotencyKey ||
          receipt.guestBindingSha256 !==
            eventHashes.guestBindingSha256 ||
          signedReceipt.payloadSha256 !==
            input.guestMergeReceiptPayloadSha256) {
        throw new CustomerProjectionCommandError(
          "CUSTOMER_PROJECTION_COMMAND_GUEST_RECEIPT_MISMATCH",
        );
      }
      verifiedGuestReceiptPayloadSha256 = signedReceipt.payloadSha256;
    }
    const replay = await query<EventRow>(
      `select * from crays_core.commerce_customer_identity_events
        where idempotency_key=$1`, [input.idempotencyKey],
    );
    if (replay.rows.length) {
      const event = replay.rows[0];
      if (
        replay.rows.length !== 1 || event.canonical_person_id !== row.canonical_person_id ||
        event.commerce_customer_relationship_id !== row.commerce_customer_relationship_id ||
        event.vendure_customer_projection_id !== row.vendure_customer_projection_id ||
        event.event_type !== input.eventType || event.action_receipt_id !== input.actionReceiptId ||
        event.payload_sha256 !== input.expectedPayloadSha256 ||
        event.auth_identity_reference_sha256 !== eventHashes.authIdentityReferenceSha256 ||
        event.email_snapshot_sha256 !== eventHashes.emailSnapshotSha256 ||
        event.guest_binding_sha256 !== eventHashes.guestBindingSha256
      ) throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_REPLAY_MISMATCH");
      return Object.freeze({ status: "replayed" as const,
        eventId: event.commerce_customer_identity_event_id,
        projectionId: row.vendure_customer_projection_id,
        projectionVersion: input.expectedProjectionVersion + 1,
        lifecycleState: TRANSITIONS[input.eventType][1],
        actionReceiptId: event.action_receipt_id,
        payloadSha256: event.payload_sha256 });
    }
    if (projectionVersion !== input.expectedProjectionVersion) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_STALE");
    }
    const targetLifecycleState = transition(input.eventType, row.lifecycle_state);
    const payloadSha256 = customerProjectionTransitionPayloadSha256({
      canonicalPersonId: row.canonical_person_id,
      relationshipId: row.commerce_customer_relationship_id,
      projectionId: row.vendure_customer_projection_id,
      projectionVersion,
      eventType: input.eventType,
      targetLifecycleState,
      providerVersion: input.providerVersion,
      actionReceiptId: input.actionReceiptId,
      ...eventHashes,
      guestMergeReceiptPayloadSha256:
        verifiedGuestReceiptPayloadSha256,
    });
    if (payloadSha256 !== input.expectedPayloadSha256) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_PAYLOAD_MISMATCH");
    }
    const nextVersion = projectionVersion + 1;
    const updated = await query<{ projection_version: string | number }>(
      `update crays_core.vendure_customer_projections
          set projection_version=$2,provider_version=$3,lifecycle_state=$4,
              email_snapshot_sha256=case
                when $7::text in ('login_reconciled','email_changed')
                  and $8::text is not null
                then $8::text else email_snapshot_sha256 end,
              last_reconciled_at=$5,updated_at=$5
        where vendure_customer_projection_id=$1 and projection_version=$6
        returning projection_version`,
      [row.vendure_customer_projection_id, nextVersion, input.providerVersion,
        targetLifecycleState, authorityNow.toISOString(), projectionVersion,
        input.eventType, eventHashes.emailSnapshotSha256],
    );
    if (updated.rows.length !== 1 || Number(updated.rows[0].projection_version) !== nextVersion) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_STALE");
    }
    const eventId = `identity_${randomUUID()}`;
    await query(
      `insert into crays_core.commerce_customer_identity_events
       (commerce_customer_identity_event_id,canonical_person_id,
        commerce_customer_relationship_id,vendure_customer_projection_id,
        event_type,auth_identity_reference_sha256,email_snapshot_sha256,
        guest_binding_sha256,idempotency_key,action_receipt_id,occurred_at,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [eventId,row.canonical_person_id,row.commerce_customer_relationship_id,
        row.vendure_customer_projection_id,input.eventType,
        eventHashes.authIdentityReferenceSha256,eventHashes.emailSnapshotSha256,
        eventHashes.guestBindingSha256,input.idempotencyKey,input.actionReceiptId,
        authorityNow.toISOString(),payloadSha256],
    );
    return Object.freeze({ status: "applied" as const, eventId,
      projectionId: row.vendure_customer_projection_id,
      projectionVersion: nextVersion, lifecycleState: targetLifecycleState,
      actionReceiptId: input.actionReceiptId, payloadSha256 });
  });
}

export async function createCanonicalVendureCustomerProjectionFromReceipt(
  database: KdsDatabase,
  input: Readonly<{
    canonicalAccountId: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
    purposes: readonly ("account" | "order" | "support" | "loyalty" | "marketing")[];
    vendureCustomerId: string;
    vendureUserId: string;
    externalIdentifierSha256: string;
    emailSnapshotSha256?: string;
    authIdentityReferenceSha256: string;
    providerVersion: string;
    actionReceiptId: string;
    idempotencyKey: string;
    expectedPayloadSha256: string;
    now?: Date;
  }>,
) {
  const purposes = [...new Set(input.purposes)].sort();
  if (
    !ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
    purposes.length < 1 || purposes.length !== input.purposes.length ||
    purposes.some((purpose) => !["account", "order", "support", "loyalty", "marketing"].includes(purpose)) ||
    !VENDURE_PROVIDER_ID.test(input.vendureCustomerId) ||
    !VENDURE_PROVIDER_ID.test(input.vendureUserId) ||
    !HASH.test(input.externalIdentifierSha256) ||
    (input.emailSnapshotSha256 !== undefined && !HASH.test(input.emailSnapshotSha256)) ||
    !HASH.test(input.authIdentityReferenceSha256) || !ID.test(input.providerVersion) ||
    !ID.test(input.actionReceiptId) || input.idempotencyKey.length < 8 ||
    !ID.test(input.idempotencyKey) || !HASH.test(input.expectedPayloadSha256)
  ) throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID");
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level serializable");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = input.now ?? new Date(clock.rows[0]?.authority_now);
    if (Number.isNaN(authorityNow.getTime())) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_INPUT_INVALID");
    }
    const context = await resolveServerCommerceContextSnapshot(query, {
      verticalRoot: input.verticalRoot, storeId: input.storeId,
      expectedAssignmentVersion: input.expectedAssignmentVersion,
    }, authorityNow);
    const people = await query<{ canonical_person_id: string }>(
      `select canonical_person_id from crays_core.canonical_people
        where account_id=$1 and lifecycle_state='active' for update`,
      [input.canonicalAccountId],
    );
    if (people.rows.length !== 1) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_NOT_ACTIVE");
    }
    const canonicalPersonId = people.rows[0].canonical_person_id;
    const payloadSha256 = customerProjectionRegistrationPayloadSha256({
      canonicalPersonId, verticalRoot: context.verticalRoot,
      partnerTenantId: context.partnerTenantId,
      operatorLegalEntityId: context.operatorLegalEntityId,
      deploymentCellId: context.vendure.deploymentCellId,
      providerBindingId: context.providerBindingId,
      providerBindingVersion: context.providerBindingVersion,
      vendureCustomerId: input.vendureCustomerId,
      vendureUserId: input.vendureUserId,
      externalIdentifierSha256: input.externalIdentifierSha256,
      emailSnapshotSha256: input.emailSnapshotSha256 ?? null,
      authIdentityReferenceSha256: input.authIdentityReferenceSha256,
      purposes, providerVersion: input.providerVersion,
      actionReceiptId: input.actionReceiptId,
    });
    if (payloadSha256 !== input.expectedPayloadSha256) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_PAYLOAD_MISMATCH");
    }
    const replay = await query<EventRow>(
      `select * from crays_core.commerce_customer_identity_events
        where idempotency_key=$1`, [input.idempotencyKey],
    );
    if (replay.rows.length) {
      const event = replay.rows[0];
      if (
        replay.rows.length !== 1 || event.event_type !== "registered" ||
        event.canonical_person_id !== canonicalPersonId ||
        event.action_receipt_id !== input.actionReceiptId ||
        event.payload_sha256 !== input.expectedPayloadSha256 ||
        event.auth_identity_reference_sha256 !== input.authIdentityReferenceSha256 ||
        event.email_snapshot_sha256 !== (input.emailSnapshotSha256 ?? null) ||
        !event.vendure_customer_projection_id
      ) throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_REPLAY_MISMATCH");
      return Object.freeze({ status: "replayed" as const,
        eventId: event.commerce_customer_identity_event_id,
        relationshipId: event.commerce_customer_relationship_id,
        projectionId: event.vendure_customer_projection_id,
        projectionVersion: 1, lifecycleState: "active" as const,
        actionReceiptId: event.action_receipt_id,
        payloadSha256: event.payload_sha256 });
    }
    const existing = await query<{ count: string | number }>(
      `select count(*) count from crays_core.commerce_customer_relationships
        where canonical_person_id=$1 and vertical_root=$2 and partner_tenant_id=$3
          and operator_legal_entity_id=$4`,
      [canonicalPersonId,context.verticalRoot,context.partnerTenantId,
        context.operatorLegalEntityId],
    );
    if (Number(existing.rows[0]?.count) !== 0) {
      throw new CustomerProjectionCommandError("CUSTOMER_PROJECTION_COMMAND_TRANSITION_DENIED");
    }
    const relationshipId = deterministicId("ccr", input.idempotencyKey);
    const projectionId = deterministicId("vcp", input.idempotencyKey);
    const eventId = deterministicId("identity", input.idempotencyKey);
    await query(
      `insert into crays_core.commerce_customer_relationships
       (commerce_customer_relationship_id,canonical_person_id,vertical_root,
        partner_tenant_id,operator_legal_entity_id,relationship_version,purposes,
        lifecycle_state,effective_from)
       values ($1,$2,$3,$4,$5,1,$6::jsonb,'active',$7)`,
      [relationshipId,canonicalPersonId,context.verticalRoot,
        context.partnerTenantId,context.operatorLegalEntityId,
        JSON.stringify(purposes),authorityNow.toISOString()],
    );
    await query(
      `insert into crays_core.vendure_customer_projections
       (vendure_customer_projection_id,commerce_customer_relationship_id,
        relationship_version,canonical_person_id,vertical_root,partner_tenant_id,
        operator_legal_entity_id,vendure_deployment_cell_id,provider_binding_id,
        provider_binding_version,vendure_customer_id,vendure_user_id,
        external_identifier_sha256,email_snapshot_sha256,projection_version,
        provider_version,lifecycle_state,last_reconciled_at)
       values ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,$14,'active',$15)`,
      [projectionId,relationshipId,canonicalPersonId,context.verticalRoot,
        context.partnerTenantId,context.operatorLegalEntityId,
        context.vendure.deploymentCellId,context.providerBindingId,
        context.providerBindingVersion,input.vendureCustomerId,input.vendureUserId,
        input.externalIdentifierSha256,input.emailSnapshotSha256 ?? null,
        input.providerVersion,authorityNow.toISOString()],
    );
    await query(
      `insert into crays_core.commerce_customer_identity_events
       (commerce_customer_identity_event_id,canonical_person_id,
        commerce_customer_relationship_id,vendure_customer_projection_id,
        event_type,auth_identity_reference_sha256,email_snapshot_sha256,
        idempotency_key,action_receipt_id,occurred_at,payload_sha256)
       values ($1,$2,$3,$4,'registered',$5,$6,$7,$8,$9,$10)`,
      [eventId,canonicalPersonId,relationshipId,projectionId,
        input.authIdentityReferenceSha256,input.emailSnapshotSha256 ?? null,
        input.idempotencyKey,input.actionReceiptId,authorityNow.toISOString(),payloadSha256],
    );
    return Object.freeze({ status: "applied" as const, eventId, relationshipId,
      projectionId, projectionVersion: 1, lifecycleState: "active" as const,
      actionReceiptId: input.actionReceiptId, payloadSha256 });
  });
}
