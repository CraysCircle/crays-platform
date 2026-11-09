import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import { loadCanonicalVendureCustomerProjection } from
  "./canonical-vendure-customer-projection-repository";
import { resolveServerCommerceContextSnapshot, type CommerceVerticalRoot } from
  "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const PURPOSES = ["account", "order", "support", "loyalty", "marketing"] as const;
const DECISIONS = ["granted", "denied", "withdrawn"] as const;
type Purpose = (typeof PURPOSES)[number];
type Decision = (typeof DECISIONS)[number];

export class CommerceCustomerConsentCommandError extends Error {
  constructor(readonly code:
    | "CUSTOMER_CONSENT_INPUT_INVALID"
    | "CUSTOMER_CONSENT_STALE"
    | "CUSTOMER_CONSENT_TRANSITION_DENIED"
    | "CUSTOMER_CONSENT_REPLAY_MISMATCH") {
    super(code);
    this.name = "CommerceCustomerConsentCommandError";
  }
}

const deterministicId = (prefix: string, key: string) =>
  `${prefix}_${createHash("sha256").update(`${prefix}:${key}`).digest("hex").slice(0, 40)}`;

export function commerceCustomerConsentPayloadSha256(input: Readonly<{
  canonicalPersonId: string;
  relationshipId: string;
  relationshipVersion: number;
  purpose: Purpose;
  decision: Decision;
  policyVersion: string;
  evidenceSha256: string;
  supersedesConsentId: string | null;
}>) {
  return createHash("sha256").update(JSON.stringify({ version: 1, ...input }), "utf8").digest("hex");
}

function transitionAllowed(current: Decision | null, next: Decision) {
  if (current === null) return next === "granted" || next === "denied";
  if (current === "granted") return next === "denied" || next === "withdrawn";
  return next === "granted" || (current === "withdrawn" && next === "denied");
}

export async function applyCommerceCustomerConsentDecision(
  database: KdsDatabase,
  input: Readonly<{
    canonicalAccountId: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
    expectedProjectionVersion: number;
    purpose: Purpose;
    decision: Decision;
    policyVersion: string;
    evidenceSha256: string;
    expectedSupersedesConsentId?: string;
    idempotencyKey: string;
    now?: Date;
  }>,
) {
  if (!ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
      !Number.isSafeInteger(input.expectedProjectionVersion) || input.expectedProjectionVersion < 1 ||
      !PURPOSES.includes(input.purpose) || !DECISIONS.includes(input.decision) ||
      !ID.test(input.policyVersion) || !HASH.test(input.evidenceSha256) ||
      (input.expectedSupersedesConsentId !== undefined &&
        !ID.test(input.expectedSupersedesConsentId)) ||
      input.idempotencyKey.length < 8 || !ID.test(input.idempotencyKey)) {
    throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_INPUT_INVALID");
  }
  const authority = await loadCanonicalVendureCustomerProjection(database, {
    canonicalAccountId: input.canonicalAccountId,
    verticalRoot: input.verticalRoot, storeId: input.storeId,
    purpose: "account", use: "active_session",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    expectedProjectionVersion: input.expectedProjectionVersion,
  });
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level serializable");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = input.now ?? new Date(clock.rows[0]?.authority_now);
    const context = await resolveServerCommerceContextSnapshot(query, {
      verticalRoot: input.verticalRoot, storeId: input.storeId,
      expectedAssignmentVersion: input.expectedAssignmentVersion,
    }, authorityNow);
    if (context.contextFingerprint !== authority.context.contextFingerprint) {
      throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_STALE");
    }
    const locked = await query<{ projection_version: string | number }>(
      `select p.projection_version from crays_core.commerce_customer_relationships r
        join crays_core.vendure_customer_projections p
          on p.commerce_customer_relationship_id=r.commerce_customer_relationship_id
         and p.relationship_version=r.relationship_version
       where r.commerce_customer_relationship_id=$1 and r.canonical_person_id=$2
         and r.relationship_version=$3 and r.lifecycle_state='active'
         and p.vendure_customer_projection_id=$4 and p.lifecycle_state='active'
       for update of r,p`,
      [authority.commerceCustomerRelationshipId, authority.canonicalPersonId,
        authority.relationshipVersion, authority.vendureCustomerProjectionId],
    );
    if (locked.rows.length !== 1 ||
        Number(locked.rows[0].projection_version) !== input.expectedProjectionVersion) {
      throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_STALE");
    }
    const replay = await query<{
      consent_command_receipt_id: string; commerce_customer_consent_id: string;
      canonical_person_id: string; commerce_customer_relationship_id: string;
      purpose: string; decision: string; payload_sha256: string;
      policy_version: string; evidence_sha256: string; supersedes_consent_id: string | null;
    }>(
      `select receipt.*,consent.policy_version,consent.evidence_sha256,
              consent.supersedes_consent_id
         from crays_core.commerce_customer_consent_command_receipts receipt
         join crays_core.commerce_customer_consents consent
           on consent.commerce_customer_consent_id=receipt.commerce_customer_consent_id
        where receipt.idempotency_key=$1`, [input.idempotencyKey],
    );
    const expectedSupersedes = input.expectedSupersedesConsentId ?? null;
    const payloadSha256 = commerceCustomerConsentPayloadSha256({
      canonicalPersonId: authority.canonicalPersonId,
      relationshipId: authority.commerceCustomerRelationshipId,
      relationshipVersion: authority.relationshipVersion,
      purpose: input.purpose, decision: input.decision,
      policyVersion: input.policyVersion, evidenceSha256: input.evidenceSha256,
      supersedesConsentId: expectedSupersedes,
    });
    if (replay.rows.length) {
      const row = replay.rows[0];
      if (replay.rows.length !== 1 || row.canonical_person_id !== authority.canonicalPersonId ||
          row.commerce_customer_relationship_id !== authority.commerceCustomerRelationshipId ||
          row.purpose !== input.purpose || row.decision !== input.decision ||
          row.policy_version !== input.policyVersion || row.evidence_sha256 !== input.evidenceSha256 ||
          row.supersedes_consent_id !== expectedSupersedes || row.payload_sha256 !== payloadSha256) {
        throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_REPLAY_MISMATCH");
      }
      return Object.freeze({ status: "replayed" as const,
        consentId: row.commerce_customer_consent_id,
        receiptId: row.consent_command_receipt_id, purpose: input.purpose,
        decision: input.decision, payloadSha256 });
    }
    const current = await query<{ commerce_customer_consent_id: string; decision: Decision }>(
      `select commerce_customer_consent_id,decision
         from crays_core.commerce_customer_consents
        where commerce_customer_relationship_id=$1 and purpose=$2
        order by decided_at desc,created_at desc,commerce_customer_consent_id desc
        for update`, [authority.commerceCustomerRelationshipId, input.purpose],
    );
    const latest = current.rows[0] ?? null;
    if ((latest?.commerce_customer_consent_id ?? null) !== expectedSupersedes) {
      throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_STALE");
    }
    if (!transitionAllowed(latest?.decision ?? null, input.decision)) {
      throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_TRANSITION_DENIED");
    }
    const consentId = deterministicId("consent", input.idempotencyKey);
    const receiptId = deterministicId("consent_receipt", input.idempotencyKey);
    await query(
      `insert into crays_core.commerce_customer_consents
       (commerce_customer_consent_id,commerce_customer_relationship_id,
        relationship_version,purpose,decision,policy_version,evidence_sha256,
        decided_at,supersedes_consent_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [consentId,authority.commerceCustomerRelationshipId,authority.relationshipVersion,
        input.purpose,input.decision,input.policyVersion,input.evidenceSha256,
        authorityNow.toISOString(),expectedSupersedes],
    );
    await query(
      `insert into crays_core.commerce_customer_consent_command_receipts
       (consent_command_receipt_id,commerce_customer_consent_id,canonical_person_id,
        commerce_customer_relationship_id,purpose,decision,idempotency_key,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [receiptId,consentId,authority.canonicalPersonId,
        authority.commerceCustomerRelationshipId,input.purpose,input.decision,
        input.idempotencyKey,payloadSha256],
    );
    return Object.freeze({ status: "applied" as const, consentId, receiptId,
      purpose: input.purpose, decision: input.decision, payloadSha256 });
  });
}

export async function loadCommerceCustomerConsentState(
  database: KdsDatabase,
  input: Readonly<{
    canonicalAccountId: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
    expectedProjectionVersion?: number;
    purpose: Purpose;
  }>,
) {
  if (!ID.test(input.canonicalAccountId) || !ID.test(input.storeId) ||
      !PURPOSES.includes(input.purpose) ||
      (input.expectedProjectionVersion !== undefined &&
        (!Number.isSafeInteger(input.expectedProjectionVersion) ||
          input.expectedProjectionVersion < 1))) {
    throw new CommerceCustomerConsentCommandError("CUSTOMER_CONSENT_INPUT_INVALID");
  }
  const authority = await loadCanonicalVendureCustomerProjection(database, {
    canonicalAccountId: input.canonicalAccountId,
    verticalRoot: input.verticalRoot, storeId: input.storeId,
    purpose: "account", use: "active_session",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    expectedProjectionVersion: input.expectedProjectionVersion,
  });
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read");
    await query("set transaction read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const result = await query<{
      commerce_customer_consent_id: string; decision: Decision;
      policy_version: string; decided_at: string | Date;
      supersedes_consent_id: string | null; consent_command_receipt_id: string;
    }>(
      `select consent.commerce_customer_consent_id,consent.decision,
              consent.policy_version,consent.decided_at,consent.supersedes_consent_id,
              receipt.consent_command_receipt_id
         from crays_core.commerce_customer_consents consent
         join crays_core.commerce_customer_consent_command_receipts receipt
           on receipt.commerce_customer_consent_id=consent.commerce_customer_consent_id
        where consent.commerce_customer_relationship_id=$1 and consent.purpose=$2
        order by consent.decided_at desc,consent.created_at desc,
                 consent.commerce_customer_consent_id desc limit 1`,
      [authority.commerceCustomerRelationshipId, input.purpose],
    );
    const current = result.rows[0];
    return Object.freeze({
      relationshipId: authority.commerceCustomerRelationshipId,
      relationshipVersion: authority.relationshipVersion,
      projectionId: authority.vendureCustomerProjectionId,
      projectionVersion: authority.projectionVersion,
      purpose: input.purpose,
      current: current ? Object.freeze({
        consentId: current.commerce_customer_consent_id,
        receiptId: current.consent_command_receipt_id,
        decision: current.decision, policyVersion: current.policy_version,
        decidedAt: new Date(current.decided_at).toISOString(),
        supersedesConsentId: current.supersedes_consent_id,
      }) : null,
      context: Object.freeze({
        verticalRoot: authority.context.verticalRoot,
        storeId: authority.context.storeId,
        assignmentVersion: authority.context.storeOperatorAssignmentVersion,
      }),
    });
  });
}
