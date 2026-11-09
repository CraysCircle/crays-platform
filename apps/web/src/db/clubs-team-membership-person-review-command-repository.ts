import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  BookingPartyTeamGoAuthorityError,
  BookingPartyTeamGoGuardianPolicyError,
  BookingPartyTeamGoNotFoundError,
  BookingPartyTeamGoReplayConflictError,
  BookingPartyTeamGoStateConflictError,
  BookingPartyTeamGoValidationError,
  executeBookingPartyTeamGoWithClient,
} from "@/db/clubs-booking-party-team-go-evidence-repository";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT,
  clubsTeamPersonReviewDeniedAuthorities,
  resolveClubsTeamPersonReviewTransition,
  type ClubsTeamMembershipPersonReviewAuthority,
  type ClubsTeamMembershipPersonReviewCommand,
  type ClubsTeamMembershipPersonReviewCommandResult,
  type ClubsTeamPersonReviewApplicationStatus,
  type ClubsTeamPersonReviewPersonStatus,
} from "@/lib/clubs/team-membership-person-review-command-contract";

export type ClubsTeamPersonReviewCommandClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

export type ClubsTeamPersonReviewCommandPool = {
  connect(): Promise<ClubsTeamPersonReviewCommandClient & { release(): void }>;
};

type TargetRow = {
  recommendation_receipt_id: string;
  recommendation_application_version_after: number;
  application_id: string;
  application_status: ClubsTeamPersonReviewApplicationStatus;
  application_version: number;
  handoff_id: string;
  handoff_state: string;
  handoff_version: number;
  party_member_id: string;
  party_account_id: string;
  person_status: ClubsTeamPersonReviewPersonStatus;
  person_version: number;
  current_decision_version: number;
  chain_ready: boolean;
};

type CanonicalApplicationRow = {
  application_id: string;
  application_version: number;
};

type CanonicalDecisionVersionRow = {
  current_decision_version: number;
};

type ReplayRow = {
  command_type: ClubsTeamMembershipPersonReviewCommand["type"];
  request_sha256: string;
  response_payload: ClubsTeamMembershipPersonReviewCommandResult;
};

export class ClubsTeamPersonReviewCommandAuthorityError extends Error {
  constructor() {
    super("Team person review command authority denied");
    this.name = "ClubsTeamPersonReviewCommandAuthorityError";
  }
}

export class ClubsTeamPersonReviewCommandNotFoundError extends Error {
  constructor() {
    super("Team person review command target not found");
    this.name = "ClubsTeamPersonReviewCommandNotFoundError";
  }
}

export class ClubsTeamPersonReviewCommandConflictError extends Error {
  constructor() {
    super("Team person review command conflict");
    this.name = "ClubsTeamPersonReviewCommandConflictError";
  }
}

export class ClubsTeamPersonReviewCommandValidationError extends Error {
  constructor() {
    super("Team person review command invalid");
    this.name = "ClubsTeamPersonReviewCommandValidationError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function deriveClubsTeamPersonReviewReference(sourceKey: string) {
  if (!/^clubs-booking-membership-party_[0-9a-f-]{36}$/.test(sourceKey)) {
    throw new ClubsTeamPersonReviewCommandValidationError();
  }
  return `cclub-person-${sha256(
    `crays.clubs.team-person-review.v1\u001f${sourceKey}`,
  ).slice(0, 32)}`;
}

function validateAuthority(
  authority: ClubsTeamMembershipPersonReviewAuthority,
  now: Date,
) {
  const { actor, proof } = authority;
  const actorAuthenticatedAt = new Date(actor.authenticatedAt);
  const proofAuthenticatedAt = new Date(proof.authenticatedAt);
  const ageMs = now.getTime() - proofAuthenticatedAt.getTime();
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.authentication.allowedRoles.includes(
      actor.role,
    ) ||
    !CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.authentication.assurance.includes(
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
      CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.authentication
        .maximumAuthenticationAgeSeconds *
        1_000
  ) {
    throw new ClubsTeamPersonReviewCommandAuthorityError();
  }
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new ClubsTeamPersonReviewCommandValidationError();
  }
}

function validateCommand(command: ClubsTeamMembershipPersonReviewCommand) {
  if (
    !CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.commands.includes(
      command.type,
    ) ||
    !/^cclub-review-[a-f0-9]{32}$/.test(command.reviewReference) ||
    !/^cclub-person-[a-f0-9]{32}$/.test(command.personReference) ||
    !Number.isInteger(command.expectedApplicationVersion) ||
    command.expectedApplicationVersion < 1 ||
    !Number.isInteger(command.expectedPersonVersion) ||
    command.expectedPersonVersion < 1 ||
    !Number.isInteger(command.expectedDecisionVersion) ||
    command.expectedDecisionVersion < 0
  ) {
    throw new ClubsTeamPersonReviewCommandValidationError();
  }
}

async function setCoreTenantRole(
  client: ClubsTeamPersonReviewCommandClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function assertActorAuthority(
  client: ClubsTeamPersonReviewCommandClient,
  authority: ClubsTeamMembershipPersonReviewAuthority,
) {
  const result = await client.query<{ allowed: boolean }>(
    `select true allowed
       from crays_core.crays_accounts account
       join crays_core.auth_identities identity
         on identity.account_id=account.account_id
        and identity.provider_key='auth0'
        and identity.verified is true
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
      where account.account_id=$1
        and account.status='active'
      limit 2`,
    [
      authority.actor.accountId,
      authority.actor.organizationId,
      authority.actor.role,
      authority.proof.subjectSha256,
    ],
  );
  if (result.rows.length !== 1 || !result.rows[0]?.allowed) {
    throw new ClubsTeamPersonReviewCommandAuthorityError();
  }
}

function requestSha256(
  authority: ClubsTeamMembershipPersonReviewAuthority,
  idempotencyKey: string,
  command: ClubsTeamMembershipPersonReviewCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.schema,
      actor: authority.actor,
      proof: {
        issuerSha256: authority.proof.issuerSha256,
        clientIdSha256: authority.proof.clientIdSha256,
        subjectSha256: authority.proof.subjectSha256,
        verifiedEmailSha256: authority.proof.verifiedEmailSha256,
        authenticatedAt: authority.proof.authenticatedAt,
      },
      idempotencyKey,
      command,
    }),
  );
}

async function findReplay(
  client: ClubsTeamPersonReviewCommandClient,
  authority: ClubsTeamMembershipPersonReviewAuthority,
  idempotencyKey: string,
) {
  return client.query<ReplayRow>(
    `select command_type,request_sha256,response_payload
       from crays_core.clubs_team_membership_person_review_command_receipts
      where actor_account_id=$1
        and organization_id=$2
        and idempotency_key=$3
      limit 2`,
    [
      authority.actor.accountId,
      authority.actor.organizationId,
      idempotencyKey,
    ],
  );
}

async function resolveTargetForUpdate(
  client: ClubsTeamPersonReviewCommandClient,
  authority: ClubsTeamMembershipPersonReviewAuthority,
  command: ClubsTeamMembershipPersonReviewCommand,
) {
  const reviewDigest = command.reviewReference.slice("cclub-review-".length);
  const personDigest = command.personReference.slice("cclub-person-".length);
  const result = await client.query<TargetRow>(
    `select recommendation.recommendation_receipt_id,
            recommendation.application_version_after
              recommendation_application_version_after,
            application.application_id,
            application.status application_status,
            application.version application_version,
            handoff.handoff_id,handoff.state handoff_state,
            handoff.version handoff_version,
            person.party_member_id,person.account_id party_account_id,
            person.status person_status,
            person.version person_version,
            coalesce((
              select max(receipt.decision_version_after)
                from crays_core.clubs_team_membership_person_review_command_receipts receipt
               where receipt.party_member_id=person.party_member_id
            ),0)::int current_decision_version,
            (
              (application.status='recommended'
                and application.version=recommendation.application_version_after)
              or exists (
                select 1
                  from crays_core.clubs_team_membership_person_review_command_receipts prior
                 where prior.recommendation_receipt_id=
                         recommendation.recommendation_receipt_id
                   and prior.application_id=application.application_id
                   and prior.application_version_after=application.version
                   and prior.application_status_after=application.status
              )
            ) chain_ready
       from crays_core.clubs_booking_membership_direct_applications application
       join crays_core.clubs_booking_membership_application_handoffs handoff
         on handoff.handoff_id=application.handoff_id
        and handoff.direct_application_id=application.application_id
       join crays_core.clubs_booking_membership_application_party_members person
         on person.handoff_id=handoff.handoff_id
        and person.direct_application_id=application.application_id
       join lateral (
         select receipt.recommendation_receipt_id,
                receipt.application_version_after
           from crays_core.clubs_ambassador_application_review_recommendation_receipts receipt
          where receipt.application_id=application.application_id
            and receipt.organization_id=$1
            and receipt.command_type='recommend_for_team_review'
            and receipt.application_status_after='recommended'
            and receipt.persisted_record=true
            and receipt.synthetic_source=false
          order by receipt.recorded_at desc
          limit 1
       ) recommendation on true
      where application.status in (
              'recommended','team_review','more_information_required'
            )
        and person.party_role in ('primary_applicant','additional_adult')
        and person.identity_state='ready'
        and person.account_id is not null
        and person.consent_statement_version=
            'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1'
        and person.consent_at is not null
        and person.status in ('application_submitted','under_review')
        and left(encode(sha256(convert_to(concat(
              'crays.clubs.team-direct-review.v1',chr(31),
              application.application_id
            ),'UTF8')),'hex'),32)=$2
        and left(encode(sha256(convert_to(concat(
              'crays.clubs.team-person-review.v1',chr(31),
              person.party_member_id
            ),'UTF8')),'hex'),32)=$3
      limit 2
      for update of application,handoff,person`,
    [authority.actor.organizationId, reviewDigest, personDigest],
  );
  if (result.rows.length !== 1) {
    throw new ClubsTeamPersonReviewCommandNotFoundError();
  }
  return result.rows[0];
}

async function resolveCanonicalApplicationForUpdate(
  client: ClubsTeamPersonReviewCommandClient,
  target: TargetRow,
) {
  const result = await client.query<CanonicalApplicationRow>(
    `select application.application_id,
            application.version application_version
       from crays_core.clubs_direct_membership_applications application
       join crays_core.crays_accounts account
         on account.account_id=application.account_id
        and account.status='active'
      where application.account_id=$1
        and application.status in (
          'submitted','assigned','ambassador_review',
          'more_information_required','recommended','not_recommended',
          'team_review','approved'
        )
        and application.consent_statement_version=
            'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1'
        and application.consent_at is not null
        and (
          select count(*)
            from crays_core.auth_identities identity
           where identity.account_id=account.account_id
             and identity.provider_key='auth0'
             and identity.verified is true
        )=1
      order by application.submitted_at desc
      limit 2
      for update of application,account`,
    [target.party_account_id],
  );
  if (result.rows.length !== 1) {
    throw new ClubsTeamPersonReviewCommandNotFoundError();
  }
  return result.rows[0];
}

async function resolveCanonicalDecisionVersion(
  client: ClubsTeamPersonReviewCommandClient,
  partyMemberId: string,
) {
  const result = await client.query<CanonicalDecisionVersionRow>(
    `select coalesce(max(decision_version),0)::int current_decision_version
       from crays_core.clubs_booking_party_team_person_decision_evidence
      where party_member_id=$1`,
    [partyMemberId],
  );
  if (result.rows.length !== 1) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  return result.rows[0].current_decision_version;
}

function canonicalDecisionFor(
  command: ClubsTeamMembershipPersonReviewCommand,
) {
  if (command.type === "approve") {
    return {
      outcome: "approved_for_membership_payment" as const,
      reasonCode: "membership_requirements_satisfied" as const,
    };
  }
  if (command.type === "decline") {
    return {
      outcome: "declined" as const,
      reasonCode: "membership_requirements_not_satisfied" as const,
    };
  }
  return {
    outcome: "more_information_required" as const,
    reasonCode: "more_information_required" as const,
  };
}

function canonicalDecisionIdempotencyKey(idempotencyKey: string) {
  return `t4-0261:${sha256(
    `crays.clubs.team-person-review.canonical-0251\u001f${idempotencyKey}`,
  )}`;
}

function canonicalDecisionClient(
  client: ClubsTeamPersonReviewCommandClient,
) {
  return {
    async query<Row = Record<string, unknown>>(
      sql: string,
      values?: readonly unknown[],
    ) {
      const result = await client.query<Row>(sql, values);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? undefined,
      };
    },
  };
}

function canonicalDecisionResultAligned(
  result: unknown,
  expectedDecisionVersion: number,
  expectedOutcome: string,
) {
  return (
    typeof result === "object" &&
    result !== null &&
    "status" in result &&
    result.status === "persisted" &&
    "command" in result &&
    result.command === "record_person_decision" &&
    "decisionVersion" in result &&
    result.decisionVersion === expectedDecisionVersion &&
    "outcome" in result &&
    result.outcome === expectedOutcome &&
    "aggregateGoIssued" in result &&
    result.aggregateGoIssued === false
  );
}

function mapCanonicalDecisionError(error: unknown): never {
  if (error instanceof BookingPartyTeamGoAuthorityError) {
    throw new ClubsTeamPersonReviewCommandAuthorityError();
  }
  if (error instanceof BookingPartyTeamGoNotFoundError) {
    throw new ClubsTeamPersonReviewCommandNotFoundError();
  }
  if (
    error instanceof BookingPartyTeamGoGuardianPolicyError ||
    error instanceof BookingPartyTeamGoReplayConflictError ||
    error instanceof BookingPartyTeamGoStateConflictError ||
    error instanceof BookingPartyTeamGoValidationError
  ) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  throw error;
}

function expectedHandoffState(
  applicationStatus: ClubsTeamPersonReviewApplicationStatus,
  handoffState: string,
) {
  if (applicationStatus === "recommended") {
    return ["under_ambassador_review", "under_team_review"].includes(
      handoffState,
    );
  }
  if (applicationStatus === "team_review") {
    return handoffState === "under_team_review";
  }
  return handoffState === "more_information_required";
}

export async function executeClubsTeamPersonReviewCommandWithClient(
  client: ClubsTeamPersonReviewCommandClient,
  authority: ClubsTeamMembershipPersonReviewAuthority,
  idempotencyKey: string,
  command: ClubsTeamMembershipPersonReviewCommand,
  now = new Date(),
) {
  validateAuthority(authority, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await setCoreTenantRole(client, authority.actor.organizationId);
  await assertActorAuthority(client, authority);
  const requestHash = requestSha256(authority, idempotencyKey, command);
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-team-person-review:${authority.actor.organizationId}:${command.reviewReference}`,
  ]);

  const replay = await findReplay(client, authority, idempotencyKey);
  if (replay.rows.length > 1) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].request_sha256 !== requestHash
    ) {
      throw new ClubsTeamPersonReviewCommandConflictError();
    }
    return replay.rows[0].response_payload;
  }

  const target = await resolveTargetForUpdate(client, authority, command);
  if (
    target.application_version !== command.expectedApplicationVersion ||
    target.person_version !== command.expectedPersonVersion ||
    target.current_decision_version !== command.expectedDecisionVersion ||
    !target.chain_ready ||
    !expectedHandoffState(target.application_status, target.handoff_state)
  ) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  let transition;
  try {
    transition = resolveClubsTeamPersonReviewTransition(
      command,
      target.application_status,
      target.person_status,
    );
  } catch {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }

  const canonicalApplication = await resolveCanonicalApplicationForUpdate(
    client,
    target,
  );
  const canonicalDecisionVersion = await resolveCanonicalDecisionVersion(
    client,
    target.party_member_id,
  );
  if (canonicalDecisionVersion !== target.current_decision_version) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  const canonicalDecision = canonicalDecisionFor(command);
  const canonicalDecisionVersionAfter = canonicalDecisionVersion + 1;
  let canonicalResult: Awaited<
    ReturnType<typeof executeBookingPartyTeamGoWithClient>
  >;
  try {
    canonicalResult = await executeBookingPartyTeamGoWithClient(
      canonicalDecisionClient(client),
      authority,
      canonicalDecisionIdempotencyKey(idempotencyKey),
      {
        type: "record_person_decision",
        handoffId: target.handoff_id,
        partyMemberId: target.party_member_id,
        applicationId: canonicalApplication.application_id,
        expectedPartyVersion: target.person_version,
        expectedApplicationVersion: canonicalApplication.application_version,
        expectedDecisionVersion: canonicalDecisionVersion,
        outcome: canonicalDecision.outcome,
        reasonCode: canonicalDecision.reasonCode,
      },
      now,
    );
  } catch (error) {
    mapCanonicalDecisionError(error);
  }
  if (
    !canonicalDecisionResultAligned(
      canonicalResult,
      canonicalDecisionVersionAfter,
      canonicalDecision.outcome,
    )
  ) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }

  const recordedAt = now.toISOString();
  const applicationVersionAfter = target.application_version + 1;
  const personVersionAfter = target.person_version + 1;
  const decisionVersionAfter = target.current_decision_version + 1;
  const decisionReceiptId =
    `clubs-booking-membership-person-decision_${randomUUID()}`;
  const decisionHash = sha256(
    JSON.stringify({
      decisionReceiptId,
      recommendationReceiptId: target.recommendation_receipt_id,
      applicationId: target.application_id,
      handoffId: target.handoff_id,
      partyMemberId: target.party_member_id,
      command: command.type,
      applicationVersionBefore: target.application_version,
      personVersionBefore: target.person_version,
      decisionVersionAfter,
      actorAccountId: authority.actor.accountId,
      actorOrganizationId: authority.actor.organizationId,
      proofSubjectSha256: authority.proof.subjectSha256,
      authenticatedAt: authority.proof.authenticatedAt,
      recordedAt,
    }),
  );
  const response: ClubsTeamMembershipPersonReviewCommandResult = {
    schema: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.version,
    status: "persisted",
    command: command.type,
    reviewReference: command.reviewReference,
    personReference: command.personReference,
    applicationStatus: transition.applicationStatusAfter,
    applicationVersion: applicationVersionAfter,
    personStatus: transition.personStatusAfter,
    personVersion: personVersionAfter,
    decisionVersion: decisionVersionAfter,
    decisionState: transition.decisionState,
    reconcileState: "person_review_receipt_persisted",
    canonical0251EvidencePersisted: true,
    canonicalDecisionVersionAligned: true,
    decisionOutcomeAligned: true,
    ...clubsTeamPersonReviewDeniedAuthorities(),
  };
  const commandReceiptId = `clubs-team-person-review-command_${randomUUID()}`;
  const commandReceiptHash = sha256(
    JSON.stringify({
      commandReceiptId,
      requestHash,
      decisionHash,
      applicationVersionAfter,
      personVersionAfter,
      decisionVersionAfter,
      recordedAt,
    }),
  );

  await client.query(
    `insert into crays_core.clubs_booking_membership_person_decision_receipts (
       decision_receipt_id,handoff_id,party_member_id,application_id,
       actor_account_id,command_type,outcome,assurance_level,
       authenticated_at,decided_at,decision_sha256
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      decisionReceiptId,
      target.handoff_id,
      target.party_member_id,
      target.application_id,
      authority.actor.accountId,
      transition.legacyCommandType,
      transition.legacyOutcome,
      authority.actor.assuranceLevel,
      authority.proof.authenticatedAt,
      recordedAt,
      decisionHash,
    ],
  );
  await client.query(
    `insert into crays_core.clubs_team_membership_person_review_command_receipts (
       command_receipt_id,recommendation_receipt_id,decision_receipt_id,
       organization_id,actor_account_id,actor_role,application_id,handoff_id,
       party_member_id,command_type,application_status_before,
       application_status_after,person_status_before,person_status_after,
       application_version_before,application_version_after,
       person_version_before,person_version_after,decision_version_before,
       decision_version_after,reason_code,idempotency_key,request_sha256,
       response_payload,proof_issuer_sha256,proof_client_id_sha256,
       proof_subject_sha256,proof_verified_email_sha256,assurance_level,
       exact_b2b_session_verified,strong_auth_verified,authenticated_at,
       recorded_at,decision_sha256,command_receipt_sha256
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
       $17,$18,$19,$20,$21,$22,$23,$24::jsonb,$25,$26,$27,$28,$29,true,
       true,$30,$31,$32,$33)`,
    [
      commandReceiptId,
      target.recommendation_receipt_id,
      decisionReceiptId,
      authority.actor.organizationId,
      authority.actor.accountId,
      authority.actor.role,
      target.application_id,
      target.handoff_id,
      target.party_member_id,
      command.type,
      target.application_status,
      transition.applicationStatusAfter,
      target.person_status,
      transition.personStatusAfter,
      target.application_version,
      applicationVersionAfter,
      target.person_version,
      personVersionAfter,
      target.current_decision_version,
      decisionVersionAfter,
      transition.reasonCode,
      idempotencyKey,
      requestHash,
      JSON.stringify(response),
      authority.proof.issuerSha256,
      authority.proof.clientIdSha256,
      authority.proof.subjectSha256,
      authority.proof.verifiedEmailSha256,
      authority.actor.assuranceLevel,
      authority.proof.authenticatedAt,
      recordedAt,
      decisionHash,
      commandReceiptHash,
    ],
  );

  const applicationUpdate = await client.query(
    `update crays_core.clubs_booking_membership_direct_applications
        set status=$2,version=$3,updated_at=$4
      where application_id=$1 and status=$5 and version=$6`,
    [
      target.application_id,
      transition.applicationStatusAfter,
      applicationVersionAfter,
      recordedAt,
      target.application_status,
      target.application_version,
    ],
  );
  const personUpdate = await client.query(
    `update crays_core.clubs_booking_membership_application_party_members
        set status=$2,version=$3,updated_at=$4
      where party_member_id=$1 and status=$5 and version=$6`,
    [
      target.party_member_id,
      transition.personStatusAfter,
      personVersionAfter,
      recordedAt,
      target.person_status,
      target.person_version,
    ],
  );
  const handoffStateAfter =
    transition.applicationStatusAfter === "team_review"
      ? "under_team_review"
      : transition.applicationStatusAfter;
  const handoffUpdate = await client.query(
    `update crays_core.clubs_booking_membership_application_handoffs
        set state=$2,version=version+1,updated_at=$3
      where handoff_id=$1 and state=$4 and version=$5`,
    [
      target.handoff_id,
      handoffStateAfter,
      recordedAt,
      target.handoff_state,
      target.handoff_version,
    ],
  );
  if (
    applicationUpdate.rowCount !== 1 ||
    personUpdate.rowCount !== 1 ||
    handoffUpdate.rowCount !== 1
  ) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  return response;
}

export async function reconcileClubsTeamPersonReviewCommandWithClient(
  client: ClubsTeamPersonReviewCommandClient,
  authority: ClubsTeamMembershipPersonReviewAuthority,
  idempotencyKey: string,
  now = new Date(),
) {
  validateAuthority(authority, now);
  validateIdempotencyKey(idempotencyKey);
  await setCoreTenantRole(client, authority.actor.organizationId);
  await assertActorAuthority(client, authority);
  const replay = await findReplay(client, authority, idempotencyKey);
  if (replay.rows.length === 0) {
    throw new ClubsTeamPersonReviewCommandNotFoundError();
  }
  if (replay.rows.length !== 1) {
    throw new ClubsTeamPersonReviewCommandConflictError();
  }
  return replay.rows[0].response_payload;
}

async function inTransaction<Result>(
  pool: ClubsTeamPersonReviewCommandPool,
  readOnly: boolean,
  operation: (client: ClubsTeamPersonReviewCommandClient) => Promise<Result>,
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

export async function executeClubsTeamPersonReviewCommand(
  authority: ClubsTeamMembershipPersonReviewAuthority,
  idempotencyKey: string,
  command: ClubsTeamMembershipPersonReviewCommand,
) {
  return inTransaction(getCorePgPool(), false, (client) =>
    executeClubsTeamPersonReviewCommandWithClient(
      client,
      authority,
      idempotencyKey,
      command,
    ),
  );
}

export async function reconcileClubsTeamPersonReviewCommand(
  authority: ClubsTeamMembershipPersonReviewAuthority,
  idempotencyKey: string,
) {
  return inTransaction(getCorePgPool(), true, (client) =>
    reconcileClubsTeamPersonReviewCommandWithClient(
      client,
      authority,
      idempotencyKey,
    ),
  );
}

export const clubsTeamPersonReviewCommandRepositoryTestApi = {
  deriveClubsTeamPersonReviewReference,
  requestSha256,
  validateAuthority,
  validateCommand,
};
