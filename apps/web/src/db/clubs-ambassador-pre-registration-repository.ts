import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT,
  CLUBS_AMBASSADOR_PENDING_ENTITLEMENT_BY_SLUG,
  CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT,
  type ClubsAmbassadorActivationPassResult,
  type ClubsAmbassadorPreRegistrationActor,
  type ClubsAmbassadorPreRegistrationCommand,
  type ClubsAmbassadorPreRegistrationItem,
  type ClubsAmbassadorPreRegistrationMutationResult,
  type ClubsAmbassadorPreRegistrationReadModel,
  type ClubsExactB2bSessionProof,
  type ClubsPublicAmbassadorSlug,
} from "@/lib/clubs/ambassador-pre-registration-contract";

export type ClubsAmbassadorPreRegistrationClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
  release(): void;
};

export type ClubsAmbassadorPreRegistrationPool = {
  connect(): Promise<ClubsAmbassadorPreRegistrationClient>;
};

type SafePreRegistrationRow = {
  pre_registration_event_id: string;
  public_ambassador_slug: ClubsPublicAmbassadorSlug;
  event_version: number | string;
  lifecycle_state: "pending_contact_not_supplied" | "pre_registered";
  invite_state: "not_sent";
  password_state: "not_created";
  account_state: "not_active";
  account_active: false;
  occurred_at: Date | string;
};

type LedgerPreRegistrationRow = SafePreRegistrationRow & {
  organization_id: string;
  normalized_email_sha256: string | null;
  expected_issuer_sha256: string;
  expected_client_id_sha256: string;
  pending_entitlement_plan:
    | "CLUBS_SAAS_FULL_ACCESS"
    | "AMBASSADOR_SCOPED_ACCESS";
  actor_account_id: string;
  idempotency_key: string;
  request_sha256: string;
};

type ActivationPassRow = {
  activation_pass_receipt_id: string;
  pre_registration_event_id: string;
  public_ambassador_slug: ClubsPublicAmbassadorSlug;
  request_sha256: string;
  matched_at: Date | string;
};

export class ClubsAmbassadorPreRegistrationValidationError extends Error {
  constructor(message = "invalid_pre_registration_request") {
    super(message);
    this.name = "ClubsAmbassadorPreRegistrationValidationError";
  }
}

export class ClubsAmbassadorPreRegistrationAuthorityError extends Error {
  constructor(message = "pre_registration_authority_denied") {
    super(message);
    this.name = "ClubsAmbassadorPreRegistrationAuthorityError";
  }
}

export class ClubsAmbassadorPreRegistrationNotFoundError extends Error {
  constructor(message = "pre_registration_not_found") {
    super(message);
    this.name = "ClubsAmbassadorPreRegistrationNotFoundError";
  }
}

export class ClubsAmbassadorPreRegistrationReplayConflictError extends Error {
  constructor(message = "pre_registration_idempotency_conflict") {
    super(message);
    this.name = "ClubsAmbassadorPreRegistrationReplayConflictError";
  }
}

export class ClubsAmbassadorPreRegistrationStateConflictError extends Error {
  constructor(message = "pre_registration_state_conflict") {
    super(message);
    this.name = "ClubsAmbassadorPreRegistrationStateConflictError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function validSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function validateIdempotencyKey(value: string) {
  if (
    value.length < 16 ||
    value.length > 200 ||
    !/^[A-Za-z0-9:_.-]+$/.test(value)
  ) {
    throw new ClubsAmbassadorPreRegistrationValidationError(
      "invalid_idempotency_key",
    );
  }
}

function validateActor(
  actor: ClubsAmbassadorPreRegistrationActor,
  now: Date,
) {
  if (
    !CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.allowedActorRoles.includes(
      actor.role,
    ) ||
    !CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.assurance.allowed.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session"
  ) {
    throw new ClubsAmbassadorPreRegistrationAuthorityError();
  }
  const authenticatedAt = new Date(actor.authenticatedAt);
  const age = now.getTime() - authenticatedAt.getTime();
  if (
    Number.isNaN(authenticatedAt.getTime()) ||
    age < -5_000 ||
    age >
      CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.assurance
        .maximumAgeSeconds *
        1_000
  ) {
    throw new ClubsAmbassadorPreRegistrationAuthorityError(
      "fresh_strong_auth_required",
    );
  }
}

function validateCommand(command: ClubsAmbassadorPreRegistrationCommand) {
  if (
    !CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.publicAmbassadorSlugs.includes(
      command.publicAmbassadorSlug,
    ) ||
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 0 ||
    !/^owner-provenance_[A-Za-z0-9:_.-]{16,180}$/.test(
      command.ownerProvenanceReceiptId,
    ) ||
    !validSha256(command.expectedIssuerSha256) ||
    !validSha256(command.expectedClientIdSha256)
  ) {
    throw new ClubsAmbassadorPreRegistrationValidationError();
  }
  if (
    command.type === "record_pending_contact_not_supplied" &&
    command.publicAmbassadorSlug !== "aiana-lopes-bezerra"
  ) {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "owner_matrix_requires_pre_registered_state",
    );
  }
  if (
    command.type === "pre_register_digest" &&
    !validSha256(command.normalizedEmailSha256)
  ) {
    throw new ClubsAmbassadorPreRegistrationValidationError(
      "invalid_normalized_digest",
    );
  }
}

function validateExactProof(proof: ClubsExactB2bSessionProof, now: Date) {
  if (
    proof.proofSchema !== "crays.clubs.exact-b2b-session-proof.v1" ||
    proof.authoritySource !== "exact_b2b_session" ||
    proof.emailVerified !== true ||
    proof.b2cRejected !== true ||
    !validSha256(proof.issuerSha256) ||
    !validSha256(proof.clientIdSha256) ||
    !validSha256(proof.subjectSha256) ||
    !validSha256(proof.verifiedEmailSha256)
  ) {
    throw new ClubsAmbassadorPreRegistrationAuthorityError(
      "exact_b2b_proof_required",
    );
  }
  const authenticatedAt = new Date(proof.authenticatedAt);
  const age = now.getTime() - authenticatedAt.getTime();
  if (
    Number.isNaN(authenticatedAt.getTime()) ||
    age < -5_000 ||
    age >
      CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.activationPass
        .maximumAuthenticationAgeSeconds *
        1_000
  ) {
    throw new ClubsAmbassadorPreRegistrationAuthorityError(
      "fresh_exact_b2b_proof_required",
    );
  }
}

function toSafeItem(row: SafePreRegistrationRow): ClubsAmbassadorPreRegistrationItem {
  return {
    preRegistrationEventId: row.pre_registration_event_id,
    publicAmbassadorSlug: row.public_ambassador_slug,
    version: Number(row.event_version),
    lifecycleState: row.lifecycle_state,
    inviteState: row.invite_state,
    passwordState: row.password_state,
    accountState: row.account_state,
    accountActive: false,
    updatedAt: iso(row.occurred_at),
  };
}

async function setCoreServiceRole(
  client: ClubsAmbassadorPreRegistrationClient,
) {
  await client.query("select set_config('crays.app_role','core_service',true)");
}

async function assertActorAuthority(
  client: ClubsAmbassadorPreRegistrationClient,
  actor: ClubsAmbassadorPreRegistrationActor,
) {
  const result = await client.query<{ allowed: boolean }>(
    `select true allowed
       from crays_core.crays_accounts account
       join crays_core.organization_memberships membership
         on membership.account_id=account.account_id
        and membership.organization_id=$2
        and membership.role_key=$3
        and membership.status='active'
       join crays_core.role_assignments assignment
         on assignment.account_id=account.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.organizations organization
         on organization.organization_id=membership.organization_id
        and organization.organization_type='crays'
        and organization.status='active'
      where account.account_id=$1 and account.status='active'
      limit 1`,
    [actor.accountId, actor.organizationId, actor.role],
  );
  if (!result.rows[0]?.allowed) {
    throw new ClubsAmbassadorPreRegistrationAuthorityError();
  }
}

export async function readClubsAmbassadorPreRegistrationsWithClient(
  client: ClubsAmbassadorPreRegistrationClient,
  actor: ClubsAmbassadorPreRegistrationActor,
  now = new Date(),
): Promise<ClubsAmbassadorPreRegistrationReadModel> {
  validateActor(actor, now);
  await assertActorAuthority(client, actor);
  const result = await client.query<SafePreRegistrationRow>(
    `select pre_registration_event_id, public_ambassador_slug, event_version,
            lifecycle_state, invite_state, password_state, account_state,
            account_active, occurred_at
       from crays_core.clubs_ambassador_pre_registrations_current
      where organization_id=$1
      order by public_ambassador_slug`,
    [actor.organizationId],
  );
  return {
    schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version,
    status: "ready",
    preRegistrations: result.rows.map(toSafeItem),
    publicRedaction: {
      digestsExposed: false,
      provenanceExposed: false,
      identityClaimsExposed: false,
    },
    authorities: CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT,
  };
}

function preRegistrationRequestSha256(
  actor: ClubsAmbassadorPreRegistrationActor,
  idempotencyKey: string,
  command: ClubsAmbassadorPreRegistrationCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
      actorAccountId: actor.accountId,
      organizationId: actor.organizationId,
      idempotencyKey,
      command,
    }),
  );
}

function safeResponseSha256(item: ClubsAmbassadorPreRegistrationItem) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
      version: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version,
      preRegistration: item,
      authorities: CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT,
    }),
  );
}

export async function executeClubsAmbassadorPreRegistrationWithClient(
  client: ClubsAmbassadorPreRegistrationClient,
  actor: ClubsAmbassadorPreRegistrationActor,
  idempotencyKey: string,
  command: ClubsAmbassadorPreRegistrationCommand,
  now = new Date(),
): Promise<ClubsAmbassadorPreRegistrationMutationResult> {
  validateIdempotencyKey(idempotencyKey);
  validateActor(actor, now);
  validateCommand(command);
  await assertActorAuthority(client, actor);
  const requestSha = preRegistrationRequestSha256(actor, idempotencyKey, command);

  await client.query("select pg_advisory_xact_lock(hashtext($1))", [
    `clubs-prereg:${command.publicAmbassadorSlug}`,
  ]);

  const replay = await client.query<LedgerPreRegistrationRow>(
    `select pre_registration_event_id, public_ambassador_slug, organization_id,
            event_version, lifecycle_state, normalized_email_sha256,
            expected_issuer_sha256, expected_client_id_sha256,
            pending_entitlement_plan, invite_state, password_state,
            account_state, account_active, actor_account_id, idempotency_key,
            request_sha256, occurred_at
       from crays_core.clubs_ambassador_pre_registration_events
      where actor_account_id=$1 and idempotency_key=$2
      limit 1`,
    [actor.accountId, idempotencyKey],
  );
  const replayRow = replay.rows[0];
  if (replayRow) {
    if (replayRow.request_sha256 !== requestSha) {
      throw new ClubsAmbassadorPreRegistrationReplayConflictError();
    }
    return {
      schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
      version: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version,
      status: "replayed",
      preRegistration: toSafeItem(replayRow),
      authorities: CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT,
    };
  }

  const current = await client.query<LedgerPreRegistrationRow>(
    `select pre_registration_event_id, public_ambassador_slug, organization_id,
            event_version, lifecycle_state, normalized_email_sha256,
            expected_issuer_sha256, expected_client_id_sha256,
            pending_entitlement_plan, invite_state, password_state,
            account_state, account_active, actor_account_id, idempotency_key,
            request_sha256, occurred_at
       from crays_core.clubs_ambassador_pre_registration_events
      where public_ambassador_slug=$1
      order by event_version desc
      limit 1
      for update`,
    [command.publicAmbassadorSlug],
  );
  const currentRow = current.rows[0];
  const currentVersion = currentRow ? Number(currentRow.event_version) : 0;
  if (currentVersion !== command.expectedVersion) {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "expected_version_mismatch",
    );
  }
  if (currentRow?.organization_id !== undefined && currentRow.organization_id !== actor.organizationId) {
    throw new ClubsAmbassadorPreRegistrationNotFoundError();
  }
  if (command.type === "record_pending_contact_not_supplied" && currentRow) {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "pending_state_already_recorded",
    );
  }
  if (
    command.type === "pre_register_digest" &&
    currentRow &&
    currentRow.lifecycle_state !== "pending_contact_not_supplied"
  ) {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "pre_registration_already_recorded",
    );
  }
  if (
    currentRow &&
    (currentRow.expected_issuer_sha256 !== command.expectedIssuerSha256 ||
      currentRow.expected_client_id_sha256 !== command.expectedClientIdSha256)
  ) {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "identity_authority_drift",
    );
  }

  const eventId = `clubs-ambassador-prereg_${randomUUID()}`;
  const lifecycleState =
    command.type === "pre_register_digest"
      ? "pre_registered"
      : "pending_contact_not_supplied";
  const item: ClubsAmbassadorPreRegistrationItem = {
    preRegistrationEventId: eventId,
    publicAmbassadorSlug: command.publicAmbassadorSlug,
    version: currentVersion + 1,
    lifecycleState,
    inviteState: "not_sent",
    passwordState: "not_created",
    accountState: "not_active",
    accountActive: false,
    updatedAt: now.toISOString(),
  };
  const entitlementPlan =
    CLUBS_AMBASSADOR_PENDING_ENTITLEMENT_BY_SLUG[
      command.publicAmbassadorSlug
    ];

  await client.query(
    `insert into crays_core.clubs_ambassador_pre_registration_events (
       pre_registration_event_id, public_ambassador_slug, organization_id,
       event_version, previous_event_id, lifecycle_state,
       normalized_email_sha256, owner_provenance_receipt_id,
       expected_issuer_sha256, expected_client_id_sha256,
       pending_entitlement_plan, actor_account_id, actor_role,
       actor_assurance_level, actor_authenticated_at, authority_source,
       command_type, reason_code, idempotency_key, request_sha256,
       response_sha256, occurred_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
     )`,
    [
      eventId,
      command.publicAmbassadorSlug,
      actor.organizationId,
      item.version,
      currentRow?.pre_registration_event_id ?? null,
      lifecycleState,
      command.type === "pre_register_digest"
        ? command.normalizedEmailSha256
        : null,
      command.ownerProvenanceReceiptId,
      command.expectedIssuerSha256,
      command.expectedClientIdSha256,
      entitlementPlan,
      actor.accountId,
      actor.role,
      actor.assuranceLevel,
      actor.authenticatedAt,
      actor.authoritySource,
      command.type,
      command.reasonCode,
      idempotencyKey,
      requestSha,
      safeResponseSha256(item),
      now.toISOString(),
    ],
  );

  return {
    schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version,
    status: "recorded",
    preRegistration: item,
    authorities: CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT,
  };
}

function activationRequestSha256(
  idempotencyKey: string,
  preRegistrationContext: string,
  proof: ClubsExactB2bSessionProof,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
      idempotencyKey,
      preRegistrationContext,
      proof,
    }),
  );
}

export async function executeClubsAmbassadorActivationPassWithClient(
  client: ClubsAmbassadorPreRegistrationClient,
  idempotencyKey: string,
  preRegistrationContext: string,
  proof: ClubsExactB2bSessionProof,
  now = new Date(),
): Promise<ClubsAmbassadorActivationPassResult> {
  validateIdempotencyKey(idempotencyKey);
  if (
    !/^clubs-ambassador-prereg_[0-9a-f-]{36}$/.test(preRegistrationContext)
  ) {
    throw new ClubsAmbassadorPreRegistrationValidationError(
      "invalid_pre_registration_context",
    );
  }
  validateExactProof(proof, now);
  const requestSha = activationRequestSha256(
    idempotencyKey,
    preRegistrationContext,
    proof,
  );
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [
    `clubs-activation:${preRegistrationContext}`,
  ]);

  const replay = await client.query<ActivationPassRow>(
    `select activation_pass_receipt_id, pre_registration_event_id,
            public_ambassador_slug, request_sha256, matched_at
       from crays_core.clubs_ambassador_activation_pass_receipts
      where idempotency_key=$1
      limit 1`,
    [idempotencyKey],
  );
  if (replay.rows[0]) {
    if (replay.rows[0].request_sha256 !== requestSha) {
      throw new ClubsAmbassadorPreRegistrationReplayConflictError();
    }
    return activationResult(replay.rows[0], "replayed");
  }

  const preregResult = await client.query<LedgerPreRegistrationRow>(
    `select pre_registration_event_id, public_ambassador_slug, organization_id,
            event_version, lifecycle_state, normalized_email_sha256,
            expected_issuer_sha256, expected_client_id_sha256,
            pending_entitlement_plan, invite_state, password_state,
            account_state, account_active, actor_account_id, idempotency_key,
            request_sha256, occurred_at
       from crays_core.clubs_ambassador_pre_registration_events
      where pre_registration_event_id=$1
      for update`,
    [preRegistrationContext],
  );
  const prereg = preregResult.rows[0];
  if (!prereg) {
    throw new ClubsAmbassadorPreRegistrationNotFoundError();
  }
  if (prereg.lifecycle_state !== "pre_registered") {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "verified_digest_not_pre_registered",
    );
  }
  if (
    prereg.expected_issuer_sha256 !== proof.issuerSha256 ||
    prereg.expected_client_id_sha256 !== proof.clientIdSha256 ||
    prereg.normalized_email_sha256 !== proof.verifiedEmailSha256
  ) {
    throw new ClubsAmbassadorPreRegistrationAuthorityError(
      "exact_b2b_binding_mismatch",
    );
  }

  const existing = await client.query<{ exists: boolean }>(
    `select true exists
       from crays_core.clubs_ambassador_activation_pass_receipts
      where pre_registration_event_id=$1 or subject_sha256=$2
      limit 1`,
    [preRegistrationContext, proof.subjectSha256],
  );
  if (existing.rows[0]?.exists) {
    throw new ClubsAmbassadorPreRegistrationStateConflictError(
      "activation_binding_already_consumed",
    );
  }

  const row: ActivationPassRow = {
    activation_pass_receipt_id: `clubs-ambassador-activation-pass_${randomUUID()}`,
    pre_registration_event_id: preRegistrationContext,
    public_ambassador_slug: prereg.public_ambassador_slug,
    request_sha256: requestSha,
    matched_at: now,
  };
  const responseSha = sha256(
    JSON.stringify({
      receipt: row.activation_pass_receipt_id,
      preRegistration: row.pre_registration_event_id,
      slug: row.public_ambassador_slug,
      exactMatch: true,
      accountActive: false,
      fullAccessActive: false,
      scopedAccessActive: false,
      matchedAt: now.toISOString(),
    }),
  );

  await client.query(
    `insert into crays_core.clubs_ambassador_activation_pass_receipts (
       activation_pass_receipt_id, pre_registration_event_id,
       public_ambassador_slug, pending_entitlement_plan, proof_schema,
       issuer_sha256, client_id_sha256, subject_sha256,
       verified_email_sha256, email_verified, exact_match, b2c_rejected,
       authority_source, result, idempotency_key, request_sha256,
       response_sha256, authenticated_at, matched_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,true,true,true,$10,
       'activation_match_passed',$11,$12,$13,$14,$15
     )`,
    [
      row.activation_pass_receipt_id,
      preRegistrationContext,
      prereg.public_ambassador_slug,
      prereg.pending_entitlement_plan,
      proof.proofSchema,
      proof.issuerSha256,
      proof.clientIdSha256,
      proof.subjectSha256,
      proof.verifiedEmailSha256,
      proof.authoritySource,
      idempotencyKey,
      requestSha,
      responseSha,
      proof.authenticatedAt,
      now.toISOString(),
    ],
  );

  return activationResult(row, "activation_match_passed");
}

function activationResult(
  row: ActivationPassRow,
  status: "activation_match_passed" | "replayed",
): ClubsAmbassadorActivationPassResult {
  return {
    schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version,
    status,
    activationPassReceiptId: row.activation_pass_receipt_id,
    preRegistrationEventId: row.pre_registration_event_id,
    publicAmbassadorSlug: row.public_ambassador_slug,
    exactMatch: true,
    accountActive: false,
    fullAccessActive: false,
    scopedAccessActive: false,
    authorities: CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT,
    matchedAt: iso(row.matched_at),
  };
}

async function withTransaction<T>(
  pool: ClubsAmbassadorPreRegistrationPool,
  operation: (client: ClubsAmbassadorPreRegistrationClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setCoreServiceRole(client);
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

export async function readClubsAmbassadorPreRegistrationsWithPool(
  pool: ClubsAmbassadorPreRegistrationPool,
  actor: ClubsAmbassadorPreRegistrationActor,
) {
  return withTransaction(pool, (client) =>
    readClubsAmbassadorPreRegistrationsWithClient(client, actor),
  );
}

export async function executeClubsAmbassadorPreRegistrationWithPool(
  pool: ClubsAmbassadorPreRegistrationPool,
  actor: ClubsAmbassadorPreRegistrationActor,
  idempotencyKey: string,
  command: ClubsAmbassadorPreRegistrationCommand,
) {
  return withTransaction(pool, (client) =>
    executeClubsAmbassadorPreRegistrationWithClient(
      client,
      actor,
      idempotencyKey,
      command,
    ),
  );
}

export async function executeClubsAmbassadorActivationPassWithPool(
  pool: ClubsAmbassadorPreRegistrationPool,
  idempotencyKey: string,
  preRegistrationContext: string,
  proof: ClubsExactB2bSessionProof,
) {
  return withTransaction(pool, (client) =>
    executeClubsAmbassadorActivationPassWithClient(
      client,
      idempotencyKey,
      preRegistrationContext,
      proof,
    ),
  );
}

export async function readClubsAmbassadorPreRegistrations(
  actor: ClubsAmbassadorPreRegistrationActor,
) {
  return readClubsAmbassadorPreRegistrationsWithPool(
    getCorePgPool(),
    actor,
  );
}

export async function executeClubsAmbassadorPreRegistration(
  actor: ClubsAmbassadorPreRegistrationActor,
  idempotencyKey: string,
  command: ClubsAmbassadorPreRegistrationCommand,
) {
  return executeClubsAmbassadorPreRegistrationWithPool(
    getCorePgPool(),
    actor,
    idempotencyKey,
    command,
  );
}

export async function executeClubsAmbassadorActivationPass(
  idempotencyKey: string,
  preRegistrationContext: string,
  proof: ClubsExactB2bSessionProof,
) {
  return executeClubsAmbassadorActivationPassWithPool(
    getCorePgPool(),
    idempotencyKey,
    preRegistrationContext,
    proof,
  );
}
