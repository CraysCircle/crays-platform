import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import {
  isApprovedAmbassadorSlug,
  getApprovedAmbassador,
} from "@/lib/clubs/public-ambassador-registry";
import {
  CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT,
  projectClubsOwnerApplicationInvitationItem,
  readyClubsOwnerApplicationInvitation,
  type ClubsOwnerApplicationInvitationAuthority,
  type ClubsOwnerApplicationInvitationCommand,
  type ClubsOwnerApplicationInvitationSignals,
  type ClubsOwnerApplicationInvitationState,
  type ClubsOwnerApplicationReviewData,
} from "@/lib/clubs/owner-application-invitation-contract";

export type ClubsOwnerApplicationInvitationClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

export type ClubsOwnerApplicationInvitationPool = {
  connect(): Promise<ClubsOwnerApplicationInvitationClient & { release(): void }>;
};

type ApplicationRow = {
  application_id: string;
  account_id: string;
  applicant_payload: unknown;
  account_email_snapshot_sha256: string;
  application_status: string;
  submitted_at: Date | string;
  application_updated_at: Date | string;
  attribution_receipt_id: string | null;
  public_ambassador_slug: string | null;
  ambassador_profile_id: string | null;
  ambassador_display_name: string | null;
  referral_binding_aligned: boolean;
  recipient_email_normalized: string | null;
  verified_email_bound: boolean;
  owner_state: string;
  owner_version: number;
  owner_updated_at: Date | string | null;
  invitation_delivery_intent_id: string | null;
  delivery_state: string | null;
};

type ReplayRow = {
  request_sha256: string;
  response_payload: unknown;
};

export class ClubsOwnerApplicationInvitationAuthorityError extends Error {
  constructor() {
    super("Owner application invitation authority denied");
    this.name = "ClubsOwnerApplicationInvitationAuthorityError";
  }
}

export class ClubsOwnerApplicationInvitationNotFoundError extends Error {
  constructor() {
    super("Owner application invitation target not found");
    this.name = "ClubsOwnerApplicationInvitationNotFoundError";
  }
}

export class ClubsOwnerApplicationInvitationReplayConflictError extends Error {
  constructor() {
    super("Owner application invitation idempotency conflict");
    this.name = "ClubsOwnerApplicationInvitationReplayConflictError";
  }
}

export class ClubsOwnerApplicationInvitationStateConflictError extends Error {
  constructor() {
    super("Owner application invitation state conflict");
    this.name = "ClubsOwnerApplicationInvitationStateConflictError";
  }
}

export class ClubsOwnerApplicationInvitationValidationError extends Error {
  constructor() {
    super("Owner application invitation request invalid");
    this.name = "ClubsOwnerApplicationInvitationValidationError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateAuthority(
  authority: ClubsOwnerApplicationInvitationAuthority,
  now: Date,
) {
  const { actor, proof } = authority;
  const actorAuthenticatedAt = new Date(actor.authenticatedAt);
  const proofAuthenticatedAt = new Date(proof.authenticatedAt);
  const ageMs = now.getTime() - proofAuthenticatedAt.getTime();
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.authentication.allowedRoles.includes(
      actor.role as "crays-management" | "admin",
    ) ||
    !CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.authentication.assurance.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session" ||
    proof.proofSchema !== "crays.clubs.exact-b2b-session-proof.v1" ||
    proof.authoritySource !== "exact_b2b_session" ||
    proof.emailVerified !== true ||
    proof.b2cRejected !== true ||
    !/^[0-9a-f]{64}$/.test(proof.issuerSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.clientIdSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.subjectSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.verifiedEmailSha256) ||
    !Number.isFinite(actorAuthenticatedAt.getTime()) ||
    !Number.isFinite(proofAuthenticatedAt.getTime()) ||
    Math.abs(actorAuthenticatedAt.getTime() - proofAuthenticatedAt.getTime()) >
      1_000 ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.authentication
        .maximumAuthenticationAgeSeconds *
        1_000
  ) {
    throw new ClubsOwnerApplicationInvitationAuthorityError();
  }
}

async function setCoreTenantRole(
  client: ClubsOwnerApplicationInvitationClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function assertActorAuthority(
  client: ClubsOwnerApplicationInvitationClient,
  authority: ClubsOwnerApplicationInvitationAuthority,
) {
  const result = await client.query<{ allowed: boolean }>(
    `select true allowed
       from crays_core.crays_accounts account
       join crays_core.auth_identities identity
         on identity.account_id=account.account_id
        and identity.provider_key='auth0'
        and identity.verified=true
        and encode(sha256(convert_to(identity.provider_subject,'UTF8')),'hex')=$4
       join crays_core.organization_memberships membership
         on membership.account_id=account.account_id
        and membership.organization_id=$2
        and membership.role_key=$3
        and membership.status='active'
       join crays_core.role_assignments assignment
         on assignment.account_id=membership.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.organizations organization
         on organization.organization_id=membership.organization_id
        and organization.organization_type='crays'
        and organization.status='active'
      where account.account_id=$1 and account.status='active'
      limit 2`,
    [
      authority.actor.accountId,
      authority.actor.organizationId,
      authority.actor.role,
      authority.proof.subjectSha256,
    ],
  );
  if (result.rows.length !== 1 || !result.rows[0]?.allowed) {
    throw new ClubsOwnerApplicationInvitationAuthorityError();
  }
}

function applicationReference(applicationId: string) {
  if (!/^clubs-direct-membership-application_[0-9a-f-]{36}$/.test(applicationId)) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  return `cclub-owner-application-${sha256(
    `${CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema}\u001f${applicationId}`,
  ).slice(0, 32)}`;
}

function applicationReferenceDigest(reference: string) {
  if (!/^cclub-owner-application-[a-f0-9]{32}$/.test(reference)) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  return reference.slice("cclub-owner-application-".length);
}

function stringField(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== "string") {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  return normalized;
}

function optionalUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("https_required");
    return parsed.toString();
  } catch {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
}

function reviewData(value: unknown): ClubsOwnerApplicationReviewData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  const payload = value as Record<string, unknown>;
  const applicantType = payload.applicantType;
  if (!['individual', 'family', 'team'].includes(String(applicantType))) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  return {
    applicantType: applicantType as "individual" | "family" | "team",
    fullName: stringField(payload.fullName, 2, 120),
    basedIn: stringField(payload.basedIn, 2, 120),
    interest: stringField(payload.interest, 2, 160),
    preferredArrivalWindow: stringField(
      payload.preferredArrivalWindow,
      2,
      160,
    ),
    preferredParticipationLength: stringField(
      payload.preferredParticipationLength,
      2,
      120,
    ),
    linkedInUrl: optionalUrl(payload.linkedinUrl),
    socialUrl: optionalUrl(payload.socialUrl),
    profileUrl: optionalUrl(payload.profileUrl),
    motivation: stringField(payload.motivation, 20, 2_000),
    contribution: stringField(payload.contribution, 20, 2_000),
  };
}

function maskEmail(value: string | null) {
  if (!value) return "unavailable";
  const separator = value.lastIndexOf("@");
  if (separator < 1 || separator === value.length - 1) return "unavailable";
  return `${value[0]}***${value.slice(separator)}`;
}

const rowsSql = `select
    application.application_id,application.account_id,
    application.applicant_payload,application.account_email_snapshot_sha256,
    application.status application_status,application.submitted_at,
    application.updated_at application_updated_at,
    attribution.attribution_receipt_id,attribution.public_ambassador_slug,
    attribution.ambassador_profile_id,registry.display_name ambassador_display_name,
    coalesce(
      attribution.attribution_receipt_id is null
      or (
        attribution.application_account_id=application.account_id
        and registry.ambassador_profile_id=attribution.ambassador_profile_id
        and registry.status='active'
      ),false
    ) referral_binding_aligned,
    lower(btrim(account.primary_contact)) recipient_email_normalized,
    coalesce(
      account.status in ('active','review')
      and account.primary_contact_type='contact'
      and account.primary_contact is not null
      and lower(btrim(account.primary_contact)) ~*
          '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      and encode(sha256(convert_to(lower(btrim(account.primary_contact)),'UTF8')),'hex')=
          application.account_email_snapshot_sha256
      and exists (
        select 1 from crays_core.auth_identities verified_identity
         where verified_identity.account_id=application.account_id
           and verified_identity.provider_key='auth0'
           and verified_identity.verified=true
      ),false
    ) verified_email_bound,
    coalesce(latest.owner_state_after,'submitted') owner_state,
    coalesce(latest.owner_version_after,0) owner_version,
    latest.recorded_at owner_updated_at,
    intent.invitation_delivery_intent_id,intent.delivery_state
  from crays_core.clubs_direct_membership_applications application
  join crays_core.clubs_direct_membership_application_reviewer_bindings reviewer
    on reviewer.binding_id=application.assigned_reviewer_binding_id
   and reviewer.route_key='direct-membership-application'
   and reviewer.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
  join crays_core.crays_accounts account
    on account.account_id=application.account_id
  left join crays_core.clubs_public_ambassador_referral_attribution_receipts attribution
    on attribution.application_id=application.application_id
   and attribution.application_account_id=application.account_id
  left join crays_core.clubs_ambassador_registry_current registry
    on registry.ambassador_profile_id=attribution.ambassador_profile_id
   and registry.organization_id=$1
  left join lateral (
    select receipt.owner_state_after,receipt.owner_version_after,receipt.recorded_at
      from crays_core.clubs_owner_application_invitation_decision_receipts receipt
     where receipt.application_id=application.application_id
       and receipt.organization_id=$1
     order by receipt.owner_version_after desc
     limit 1
  ) latest on true
  left join crays_core.clubs_owner_application_invitation_delivery_intents intent
    on intent.application_id=application.application_id
   and intent.organization_id=$1
 where exists (
   select 1 from crays_core.organization_memberships reviewer_membership
    where reviewer_membership.account_id=reviewer.canonical_account_id
      and reviewer_membership.organization_id=$1
      and reviewer_membership.status='active'
 )
 and ($2::text is null or left(encode(sha256(convert_to(concat(
       '${CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema}',chr(31),
       application.application_id
     ),'UTF8')),'hex'),32)=$2)
 order by greatest(application.updated_at,latest.recorded_at,intent.created_at) desc,
          application.application_id
 limit $3`;

async function readRows(
  client: ClubsOwnerApplicationInvitationClient,
  authority: ClubsOwnerApplicationInvitationAuthority,
  reference: string | null,
  limit: number,
) {
  return client.query<ApplicationRow>(rowsSql, [
    authority.actor.organizationId,
    reference ? applicationReferenceDigest(reference) : null,
    limit,
  ]);
}

function rowSignals(
  row: ApplicationRow,
  detail: boolean,
): ClubsOwnerApplicationInvitationSignals {
  const data = reviewData(row.applicant_payload);
  const sourceChannel = row.attribution_receipt_id
    ? "ambassador_referral"
    : "direct_web";
  let referral = null;
  if (sourceChannel === "ambassador_referral") {
    if (
      !row.public_ambassador_slug ||
      !isApprovedAmbassadorSlug(row.public_ambassador_slug)
    ) {
      throw new ClubsOwnerApplicationInvitationValidationError();
    }
    const profile = getApprovedAmbassador(row.public_ambassador_slug);
    referral = {
      ambassadorSlug: row.public_ambassador_slug,
      ambassadorDisplayName: profile.name,
    };
  }
  const admittedStates = [
    "submitted",
    "under_review",
    "more_information_required",
    "approved_for_invitation",
    "declined",
  ];
  if (!admittedStates.includes(row.owner_state)) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  const updatedAt = row.owner_updated_at ?? row.application_updated_at;
  return {
    applicationReference: applicationReference(row.application_id),
    sourceChannel,
    referral,
    referralBindingAligned: row.referral_binding_aligned,
    applicantSummary: {
      fullName: data.fullName,
      applicantType: data.applicantType,
      basedIn: data.basedIn,
      interest: data.interest,
    },
    reviewData: detail ? data : null,
    contactEmailMasked: maskEmail(row.recipient_email_normalized),
    verifiedEmailBound: row.verified_email_bound,
    state: row.owner_state as Exclude<
      ClubsOwnerApplicationInvitationState,
      "reconciliation_required"
    >,
    version: Number(row.owner_version),
    submittedAt: new Date(row.submitted_at).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
    invitationIntentStatus:
      row.invitation_delivery_intent_id && row.delivery_state === "unsent"
        ? "unsent"
        : "none",
    evidenceAmbiguous:
      (sourceChannel === "ambassador_referral" &&
        !row.referral_binding_aligned) ||
      (row.invitation_delivery_intent_id !== null &&
        row.delivery_state !== "unsent"),
  };
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
}

const reasonByCommand = {
  start_review: "owner_review_started",
  request_more_information: "owner_more_information_requested",
  approve_for_invitation: "owner_approved_invitation",
  decline: "owner_declined_application",
} as const;

function validateCommand(command: ClubsOwnerApplicationInvitationCommand) {
  if (
    !Object.hasOwn(reasonByCommand, command.type) ||
    reasonByCommand[command.type] !== command.reasonCode ||
    !/^cclub-owner-application-[a-f0-9]{32}$/.test(
      command.applicationReference,
    ) ||
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 0
  ) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
}

function requestHash(
  actorAccountId: string,
  command: ClubsOwnerApplicationInvitationCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema,
      actorAccountId,
      command,
    }),
  );
}

function canonicalReplay(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schema" in value) ||
    value.schema !== CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema ||
    !("version" in value) ||
    value.version !== CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.version ||
    !("status" in value) ||
    value.status !== "ready" ||
    !("view" in value) ||
    value.view !== "reconciliation" ||
    !("items" in value) ||
    !Array.isArray(value.items) ||
    value.items.length !== 1
  ) {
    throw new ClubsOwnerApplicationInvitationStateConflictError();
  }
  return value;
}

async function readReplay(
  client: ClubsOwnerApplicationInvitationClient,
  authority: ClubsOwnerApplicationInvitationAuthority,
  idempotencyKey: string,
) {
  const result = await client.query<ReplayRow>(
    `select request_sha256,response_payload
       from crays_core.clubs_owner_application_invitation_decision_receipts
      where organization_id=$1 and actor_account_id=$2 and idempotency_key=$3
      limit 1`,
    [authority.actor.organizationId, authority.actor.accountId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

export async function readClubsOwnerApplicationInvitationWithClient(
  client: ClubsOwnerApplicationInvitationClient,
  authority: ClubsOwnerApplicationInvitationAuthority,
  input: Readonly<{
    applicationReference?: string;
    idempotencyKey?: string;
  }> = {},
  now = new Date(),
) {
  validateAuthority(authority, now);
  if (input.applicationReference && input.idempotencyKey) {
    throw new ClubsOwnerApplicationInvitationValidationError();
  }
  await setCoreTenantRole(client, authority.actor.organizationId);
  await assertActorAuthority(client, authority);
  if (input.idempotencyKey) {
    validateIdempotencyKey(input.idempotencyKey);
    const replay = await readReplay(client, authority, input.idempotencyKey);
    if (!replay) throw new ClubsOwnerApplicationInvitationNotFoundError();
    return canonicalReplay(replay.response_payload);
  }
  const detail = Boolean(input.applicationReference);
  const result = await readRows(
    client,
    authority,
    input.applicationReference ?? null,
    detail
      ? 2
      : CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.maximumItems + 1,
  );
  if (detail && result.rows.length !== 1) {
    throw new ClubsOwnerApplicationInvitationNotFoundError();
  }
  const truncated =
    !detail &&
    result.rows.length > CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.maximumItems;
  const rows = result.rows.slice(
    0,
    detail ? 1 : CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.maximumItems,
  );
  const items = rows.map((row) =>
    projectClubsOwnerApplicationInvitationItem(rowSignals(row, detail)),
  );
  return readyClubsOwnerApplicationInvitation(
    detail ? "detail" : "queue",
    items,
    truncated,
  );
}

export async function executeClubsOwnerApplicationInvitationWithClient(
  client: ClubsOwnerApplicationInvitationClient,
  authority: ClubsOwnerApplicationInvitationAuthority,
  idempotencyKey: string,
  command: ClubsOwnerApplicationInvitationCommand,
  now = new Date(),
) {
  validateAuthority(authority, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await setCoreTenantRole(client, authority.actor.organizationId);
  await assertActorAuthority(client, authority);
  const commandRequestHash = requestHash(authority.actor.accountId, command);
  const replay = await readReplay(client, authority, idempotencyKey);
  if (replay) {
    if (replay.request_sha256 !== commandRequestHash) {
      throw new ClubsOwnerApplicationInvitationReplayConflictError();
    }
    return canonicalReplay(replay.response_payload);
  }

  const digest = applicationReferenceDigest(command.applicationReference);
  const target = await client.query<{ application_id: string }>(
    `select application.application_id
       from crays_core.clubs_direct_membership_applications application
       join crays_core.clubs_direct_membership_application_reviewer_bindings reviewer
         on reviewer.binding_id=application.assigned_reviewer_binding_id
        and reviewer.route_key='direct-membership-application'
      where left(encode(sha256(convert_to(concat(
              '${CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema}',chr(31),
              application.application_id
            ),'UTF8')),'hex'),32)=$1
        and exists (
          select 1 from crays_core.organization_memberships reviewer_membership
           where reviewer_membership.account_id=reviewer.canonical_account_id
             and reviewer_membership.organization_id=$2
             and reviewer_membership.status='active'
        )
      limit 2
      for update of application`,
    [digest, authority.actor.organizationId],
  );
  if (target.rows.length !== 1) {
    throw new ClubsOwnerApplicationInvitationNotFoundError();
  }
  const current = await readRows(
    client,
    authority,
    command.applicationReference,
    2,
  );
  if (current.rows.length !== 1) {
    throw new ClubsOwnerApplicationInvitationNotFoundError();
  }
  const row = current.rows[0];
  const currentItem = projectClubsOwnerApplicationInvitationItem(
    rowSignals(row, true),
  );
  if (
    currentItem.version !== command.expectedVersion ||
    !currentItem.availableActions.includes(command.type)
  ) {
    throw new ClubsOwnerApplicationInvitationStateConflictError();
  }
  if (
    command.type === "approve_for_invitation" &&
    (!row.verified_email_bound || !row.recipient_email_normalized)
  ) {
    throw new ClubsOwnerApplicationInvitationStateConflictError();
  }

  const stateAfter = {
    start_review: "under_review",
    request_more_information: "more_information_required",
    approve_for_invitation: "approved_for_invitation",
    decline: "declined",
  }[command.type] as Exclude<
    ClubsOwnerApplicationInvitationState,
    "submitted" | "reconciliation_required"
  >;
  const recordedAt = now.toISOString();
  const emailHash = row.verified_email_bound && row.recipient_email_normalized
    ? sha256(row.recipient_email_normalized)
    : null;
  const responseItem = projectClubsOwnerApplicationInvitationItem({
    ...rowSignals(row, true),
    state: stateAfter,
    version: currentItem.version + 1,
    updatedAt: recordedAt,
    invitationIntentStatus:
      command.type === "approve_for_invitation" ? "unsent" : "none",
  });
  const response = readyClubsOwnerApplicationInvitation(
    "reconciliation",
    [responseItem],
    false,
  );
  const sourceChannel = row.attribution_receipt_id
    ? "ambassador_referral"
    : "direct_web";
  const decisionReceiptId =
    `clubs-owner-application-invitation-decision_${randomUUID()}`;
  const decisionReceiptHash = sha256(
    JSON.stringify({
      decisionReceiptId,
      applicationId: row.application_id,
      organizationId: authority.actor.organizationId,
      actorAccountId: authority.actor.accountId,
      command,
      stateBefore: currentItem.state,
      stateAfter,
      sourceChannel,
      emailHash:
        command.type === "approve_for_invitation" ? emailHash : null,
      recordedAt,
    }),
  );
  await client.query(
    `insert into crays_core.clubs_owner_application_invitation_decision_receipts
      (owner_decision_receipt_id,application_id,organization_id,
       actor_account_id,actor_role,source_channel,attribution_receipt_id,
       ambassador_profile_id,command_type,owner_state_before,owner_state_after,
       owner_version_before,owner_version_after,reason_code,idempotency_key,
       request_sha256,response_payload,recipient_email_snapshot_sha256,
       proof_issuer_sha256,proof_client_id_sha256,proof_subject_sha256,
       proof_verified_email_sha256,exact_b2b_session_verified,
       strong_auth_verified,authenticated_at,recorded_at,
       invitation_delivery_intent_created,owner_decision_receipt_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
       $17::jsonb,$18,$19,$20,$21,$22,true,true,$23,$24,$25,$26)`,
    [
      decisionReceiptId,
      row.application_id,
      authority.actor.organizationId,
      authority.actor.accountId,
      authority.actor.role,
      sourceChannel,
      row.attribution_receipt_id,
      row.ambassador_profile_id,
      command.type,
      currentItem.state,
      stateAfter,
      currentItem.version,
      currentItem.version + 1,
      command.reasonCode,
      idempotencyKey,
      commandRequestHash,
      JSON.stringify(response),
      command.type === "approve_for_invitation" ? emailHash : null,
      authority.proof.issuerSha256,
      authority.proof.clientIdSha256,
      authority.proof.subjectSha256,
      authority.proof.verifiedEmailSha256,
      authority.proof.authenticatedAt,
      recordedAt,
      command.type === "approve_for_invitation",
      decisionReceiptHash,
    ],
  );

  if (command.type === "approve_for_invitation") {
    const normalizedEmail = row.recipient_email_normalized;
    if (!normalizedEmail || !emailHash) {
      throw new ClubsOwnerApplicationInvitationStateConflictError();
    }
    const intentId = `clubs-owner-application-invitation-intent_${randomUUID()}`;
    const intentHash = sha256(
      JSON.stringify({
        intentId,
        decisionReceiptId,
        applicationId: row.application_id,
        organizationId: authority.actor.organizationId,
        recipientEmailSha256: emailHash,
        sourceChannel,
        state: "unsent",
        createdAt: recordedAt,
      }),
    );
    await client.query(
      `insert into crays_core.clubs_owner_application_invitation_delivery_intents
        (invitation_delivery_intent_id,owner_decision_receipt_id,application_id,
         application_account_id,organization_id,source_channel,
         attribution_receipt_id,ambassador_profile_id,recipient_email_normalized,
         recipient_email_sha256,delivery_state,invitation_delivery_intent_sha256,
         created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'unsent',$11,$12)`,
      [
        intentId,
        decisionReceiptId,
        row.application_id,
        row.account_id,
        authority.actor.organizationId,
        sourceChannel,
        row.attribution_receipt_id,
        row.ambassador_profile_id,
        normalizedEmail,
        emailHash,
        intentHash,
        recordedAt,
      ],
    );
  }
  return response;
}

async function inTransaction<Result>(
  pool: ClubsOwnerApplicationInvitationPool,
  mode: "read" | "write",
  operation: (client: ClubsOwnerApplicationInvitationClient) => Promise<Result>,
) {
  const client = await pool.connect();
  try {
    await client.query(mode === "read" ? "begin read only" : "begin");
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

export async function readClubsOwnerApplicationInvitation(
  authority: ClubsOwnerApplicationInvitationAuthority,
  input: Readonly<{
    applicationReference?: string;
    idempotencyKey?: string;
  }> = {},
) {
  return inTransaction(getCorePgPool(), "read", (client) =>
    readClubsOwnerApplicationInvitationWithClient(client, authority, input),
  );
}

export async function executeClubsOwnerApplicationInvitation(
  authority: ClubsOwnerApplicationInvitationAuthority,
  idempotencyKey: string,
  command: ClubsOwnerApplicationInvitationCommand,
) {
  return inTransaction(getCorePgPool(), "write", (client) =>
    executeClubsOwnerApplicationInvitationWithClient(
      client,
      authority,
      idempotencyKey,
      command,
    ),
  );
}

export const clubsOwnerApplicationInvitationRepositoryTestApi = {
  applicationReference,
  applicationReferenceDigest,
  maskEmail,
  requestHash,
  reviewData,
  validateAuthority,
  validateCommand,
};
