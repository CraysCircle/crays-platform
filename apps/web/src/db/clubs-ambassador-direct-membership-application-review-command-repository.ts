import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import type {
  ClubsAmbassadorB2bBootstrapEvidence,
  ClubsAmbassadorEntitlementKey,
} from "@/lib/clubs/ambassador-b2b-entitlement-contract";
import {
  CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT,
  resolveClubsAmbassadorReviewTransition,
  type ClubsAmbassadorReviewApplicationStatus,
  type ClubsAmbassadorReviewCommand,
  type ClubsAmbassadorReviewCommandResult,
} from "@/lib/clubs/ambassador-direct-membership-application-review-command-contract";

export type ClubsAmbassadorReviewCommandClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

export type ClubsAmbassadorReviewCommandPool = {
  connect(): Promise<ClubsAmbassadorReviewCommandClient & { release(): void }>;
};

type ActiveBinding = {
  account_binding_receipt_id: string;
  entitlement_key: ClubsAmbassadorEntitlementKey;
  ambassador_profile_id: string;
};

type ApplicationRow = {
  application_id: string;
  application_status: ClubsAmbassadorReviewApplicationStatus;
  application_version: number;
  own_assignment: boolean;
  ownership_match: boolean;
};

type ReplayRow = {
  account_binding_receipt_id: string;
  command_type: ClubsAmbassadorReviewCommand["type"];
  request_sha256: string;
  response_payload: ClubsAmbassadorReviewCommandResult;
};

export class ClubsAmbassadorReviewCommandAuthorityError extends Error {
  constructor() {
    super("Ambassador review command denied");
    this.name = "ClubsAmbassadorReviewCommandAuthorityError";
  }
}

export class ClubsAmbassadorReviewCommandCrossAmbassadorError extends Error {
  constructor() {
    super("Ambassador review command targets another profile");
    this.name = "ClubsAmbassadorReviewCommandCrossAmbassadorError";
  }
}

export class ClubsAmbassadorReviewCommandNotFoundError extends Error {
  constructor() {
    super("Ambassador review command target not found");
    this.name = "ClubsAmbassadorReviewCommandNotFoundError";
  }
}

export class ClubsAmbassadorReviewCommandConflictError extends Error {
  constructor() {
    super("Ambassador review command conflict");
    this.name = "ClubsAmbassadorReviewCommandConflictError";
  }
}

export class ClubsAmbassadorReviewCommandValidationError extends Error {
  constructor() {
    super("Ambassador review command invalid");
    this.name = "ClubsAmbassadorReviewCommandValidationError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateEvidence(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  now: Date,
) {
  const authenticatedAt = new Date(evidence.authenticatedAt);
  const ageMs = now.getTime() - authenticatedAt.getTime();
  if (
    evidence.proofSchema !== "crays.clubs.b2b-entitlement-bootstrap.v1" ||
    evidence.authoritySource !== "exact_crays_pro_b2b_bootstrap" ||
    evidence.exactVerifiedCraysProB2bLogin !== true ||
    evidence.b2cRejected !== true ||
    !/^[0-9a-f]{64}$/.test(evidence.subjectSha256) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(evidence.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(evidence.organizationId) ||
    !/^tenant_session_[A-Za-z0-9_-]{16,180}$/.test(
      evidence.tenantSessionId,
    ) ||
    !Number.isFinite(authenticatedAt.getTime()) ||
    ageMs < -5_000 ||
    ageMs > 300_000
  ) {
    throw new ClubsAmbassadorReviewCommandAuthorityError();
  }
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new ClubsAmbassadorReviewCommandValidationError();
  }
}

function validateCommand(command: ClubsAmbassadorReviewCommand) {
  if (
    !CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.commands.includes(
      command.type,
    ) ||
    !/^cclub-review-[a-f0-9]{32}$/.test(command.reviewReference) ||
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 1
  ) {
    throw new ClubsAmbassadorReviewCommandValidationError();
  }
}

async function setCoreTenantRole(
  client: ClubsAmbassadorReviewCommandClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function resolveActiveBinding(
  client: ClubsAmbassadorReviewCommandClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
) {
  const result = await client.query<ActiveBinding>(
    `select binding.account_binding_receipt_id,binding.entitlement_key,
            binding.ambassador_profile_id
       from crays_core.clubs_ambassador_b2b_entitlement_account_receipts binding
       join crays_core.clubs_ambassador_entitlement_issue_receipts issue
         on issue.entitlement_issue_receipt_id=binding.entitlement_issue_receipt_id
        and issue.entitlement_active=true
       join crays_core.clubs_ambassador_activation_pass_receipts activation
         on activation.activation_pass_receipt_id=binding.activation_pass_receipt_id
        and activation.subject_sha256=$4
        and activation.exact_match=true
        and activation.b2c_rejected=true
       join crays_core.crays_accounts account
         on account.account_id=binding.account_id
        and account.status='active'
       join crays_core.tenant_sessions session
         on session.session_id=$3
        and session.account_id=binding.account_id
        and session.organization_id=binding.organization_id
        and session.status='active'
        and session.expires_at>now()
        and session.account_security_version=account.security_version
       join crays_core.organization_memberships membership
         on membership.account_id=session.account_id
        and membership.organization_id=session.organization_id
        and membership.role_key=session.role_key
        and membership.status='active'
       join crays_core.role_assignments role_assignment
         on role_assignment.account_id=membership.account_id
        and role_assignment.organization_id=membership.organization_id
        and role_assignment.role_key=membership.role_key
        and role_assignment.status='active'
        and role_assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.clubs_ambassador_registry_current registry
         on registry.ambassador_profile_id=binding.ambassador_profile_id
        and registry.organization_id=binding.organization_id
        and registry.status='active'
      where binding.account_id=$1
        and binding.organization_id=$2
        and binding.subject_sha256=$4
        and binding.entitlement_active=true
        and binding.exact_subject_binding=true
        and binding.exact_active_account_binding=true
      limit 2`,
    [
      evidence.accountId,
      evidence.organizationId,
      evidence.tenantSessionId,
      evidence.subjectSha256,
    ],
  );
  if (result.rows.length !== 1) {
    throw new ClubsAmbassadorReviewCommandAuthorityError();
  }
  return result.rows[0];
}

async function resolveApplicationForUpdate(
  client: ClubsAmbassadorReviewCommandClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  binding: ActiveBinding,
  reviewReference: string,
) {
  const digestPrefix = reviewReference.slice("cclub-review-".length);
  const result = await client.query<ApplicationRow>(
    `select application.application_id,
            application.status application_status,
            application.version application_version,
            assignment.ambassador_profile_id=$3 own_assignment,
            exists (
              select 1
                from crays_core.clubs_ambassador_scoped_resource_ownership_receipts ownership
               where ownership.organization_id=$2
                 and ownership.account_binding_receipt_id=$4
                 and ownership.account_id=$1
                 and ownership.ambassador_profile_id=$3
                 and ownership.entitlement_key='AMBASSADOR_SCOPED_ACCESS'
                 and ownership.resource_kind='application'
                 and ownership.resource_reference_sha256=
                     encode(sha256(convert_to(application.application_id,'UTF8')),'hex')
                 and ownership.attribution_receipt_verified=true
                 and ownership.ownership_state='confirmed'
            ) ownership_match
       from crays_core.clubs_application_assignments_current assignment
       join crays_core.clubs_booking_membership_direct_applications application
         on application.application_id=assignment.application_id
        and application.assigned_reviewer_binding_id=
            assignment.reviewer_binding_id
       join crays_core.clubs_ambassador_registry_current registry
         on registry.ambassador_profile_id=assignment.ambassador_profile_id
        and registry.organization_id=assignment.organization_id
        and registry.status='active'
      where assignment.organization_id=$2
        and assignment.status='assigned'
        and left(encode(sha256(convert_to(concat(
              'crays.clubs.team-direct-review.v1',chr(31),
              application.application_id
            ),'UTF8')),'hex'),32)=$5
      limit 2
      for update of application`,
    [
      evidence.accountId,
      evidence.organizationId,
      binding.ambassador_profile_id,
      binding.account_binding_receipt_id,
      digestPrefix,
    ],
  );
  if (result.rows.length !== 1) {
    throw new ClubsAmbassadorReviewCommandNotFoundError();
  }
  const application = result.rows[0];
  if (!application.own_assignment) {
    throw new ClubsAmbassadorReviewCommandCrossAmbassadorError();
  }
  if (
    binding.entitlement_key === "AMBASSADOR_SCOPED_ACCESS" &&
    !application.ownership_match
  ) {
    throw new ClubsAmbassadorReviewCommandNotFoundError();
  }
  return application;
}

function requestSha256(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  binding: ActiveBinding,
  idempotencyKey: string,
  command: ClubsAmbassadorReviewCommand,
) {
  return sha256(
    JSON.stringify({
      schema:
        CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.schema,
      accountId: evidence.accountId,
      organizationId: evidence.organizationId,
      subjectSha256: evidence.subjectSha256,
      accountBindingReceiptId: binding.account_binding_receipt_id,
      ambassadorProfileId: binding.ambassador_profile_id,
      idempotencyKey,
      command,
    }),
  );
}

async function findReplay(
  client: ClubsAmbassadorReviewCommandClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
) {
  return client.query<ReplayRow>(
    `select account_binding_receipt_id,command_type,request_sha256,response_payload
       from crays_core.clubs_ambassador_application_review_recommendation_receipts
      where account_id=$1
        and idempotency_key=$2
      limit 2`,
    [evidence.accountId, idempotencyKey],
  );
}

export async function executeClubsAmbassadorReviewCommandWithClient(
  client: ClubsAmbassadorReviewCommandClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  command: ClubsAmbassadorReviewCommand,
  now = new Date(),
) {
  validateEvidence(evidence, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await setCoreTenantRole(client, evidence.organizationId);
  const binding = await resolveActiveBinding(client, evidence);
  const requestHash = requestSha256(
    evidence,
    binding,
    idempotencyKey,
    command,
  );
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-ambassador-review:${evidence.organizationId}:${command.reviewReference}`,
  ]);
  const replay = await findReplay(client, evidence, idempotencyKey);
  if (replay.rows.length > 1) {
    throw new ClubsAmbassadorReviewCommandConflictError();
  }
  if (replay.rows[0]) {
    if (
      replay.rows[0].account_binding_receipt_id !==
        binding.account_binding_receipt_id ||
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].request_sha256 !== requestHash
    ) {
      throw new ClubsAmbassadorReviewCommandConflictError();
    }
    return replay.rows[0].response_payload;
  }

  const application = await resolveApplicationForUpdate(
    client,
    evidence,
    binding,
    command.reviewReference,
  );
  if (application.application_version !== command.expectedVersion) {
    throw new ClubsAmbassadorReviewCommandConflictError();
  }
  let transition;
  try {
    transition = resolveClubsAmbassadorReviewTransition(
      command,
      application.application_status,
    );
  } catch {
    throw new ClubsAmbassadorReviewCommandConflictError();
  }
  const recordedAt = now.toISOString();
  const recommendationReceiptId =
    `clubs-ambassador-review-recommendation_${randomUUID()}`;
  const versionAfter = application.application_version + 1;
  const response: ClubsAmbassadorReviewCommandResult = {
    schema:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.schema,
    version:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.version,
    status: "persisted",
    outcome: transition.outcome,
    reviewReference: command.reviewReference,
    applicationStatus: transition.statusAfter,
    applicationVersion: versionAfter,
    reconcileState: "recommendation_receipt_persisted",
    reviewerAuthorityGranted: false,
    teamGoGranted: false,
    membershipCreated: false,
    paymentAuthorityGranted: false,
    commissionAuthorityGranted: false,
  };
  const receiptHash = sha256(
    JSON.stringify({
      recommendationReceiptId,
      requestHash,
      applicationId: application.application_id,
      applicationVersionBefore: application.application_version,
      applicationVersionAfter: versionAfter,
      statusBefore: application.application_status,
      statusAfter: transition.statusAfter,
      recordedAt,
    }),
  );

  await client.query(
    `insert into crays_core.clubs_ambassador_application_review_recommendation_receipts (
       recommendation_receipt_id,account_binding_receipt_id,application_id,
       organization_id,account_id,ambassador_profile_id,entitlement_key,
       command_type,application_status_before,application_status_after,
       application_version_before,application_version_after,reason_code,
       idempotency_key,request_sha256,response_payload,proof_subject_sha256,
       exact_b2b_bootstrap_verified,strong_auth_verified,authenticated_at,
       recorded_at,recommendation_receipt_sha256
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
       $16::jsonb,$17,true,true,$18,$19,$20)`,
    [
      recommendationReceiptId,
      binding.account_binding_receipt_id,
      application.application_id,
      evidence.organizationId,
      evidence.accountId,
      binding.ambassador_profile_id,
      binding.entitlement_key,
      command.type,
      application.application_status,
      transition.statusAfter,
      application.application_version,
      versionAfter,
      transition.reasonCode,
      idempotencyKey,
      requestHash,
      JSON.stringify(response),
      evidence.subjectSha256,
      evidence.authenticatedAt,
      recordedAt,
      receiptHash,
    ],
  );
  const update = await client.query(
    `update crays_core.clubs_booking_membership_direct_applications
        set status=$2,version=$3,updated_at=$4
      where application_id=$1
        and status=$5
        and version=$6`,
    [
      application.application_id,
      transition.statusAfter,
      versionAfter,
      recordedAt,
      application.application_status,
      application.application_version,
    ],
  );
  if (update.rowCount !== 1) {
    throw new ClubsAmbassadorReviewCommandConflictError();
  }
  return response;
}

export async function readClubsAmbassadorReviewCommandReconciliationWithClient(
  client: ClubsAmbassadorReviewCommandClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  now = new Date(),
) {
  validateEvidence(evidence, now);
  validateIdempotencyKey(idempotencyKey);
  await setCoreTenantRole(client, evidence.organizationId);
  const binding = await resolveActiveBinding(client, evidence);
  const replay = await findReplay(client, evidence, idempotencyKey);
  if (replay.rows.length === 0) {
    throw new ClubsAmbassadorReviewCommandNotFoundError();
  }
  if (replay.rows.length !== 1) {
    throw new ClubsAmbassadorReviewCommandConflictError();
  }
  if (
    replay.rows[0].account_binding_receipt_id !==
    binding.account_binding_receipt_id
  ) {
    throw new ClubsAmbassadorReviewCommandAuthorityError();
  }
  return replay.rows[0].response_payload;
}

async function inTransaction<Result>(
  pool: ClubsAmbassadorReviewCommandPool,
  readOnly: boolean,
  operation: (client: ClubsAmbassadorReviewCommandClient) => Promise<Result>,
) {
  const client = await pool.connect();
  try {
    await client.query(readOnly ? "begin read only" : "begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function executeClubsAmbassadorReviewCommand(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  command: ClubsAmbassadorReviewCommand,
) {
  return inTransaction(getCorePgPool(), false, (client) =>
    executeClubsAmbassadorReviewCommandWithClient(
      client,
      evidence,
      idempotencyKey,
      command,
    ),
  );
}

export async function readClubsAmbassadorReviewCommandReconciliation(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
) {
  return inTransaction(getCorePgPool(), true, (client) =>
    readClubsAmbassadorReviewCommandReconciliationWithClient(
      client,
      evidence,
      idempotencyKey,
    ),
  );
}
