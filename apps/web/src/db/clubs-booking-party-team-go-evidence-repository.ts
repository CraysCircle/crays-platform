import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import {
  BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT,
  bookingPartyTeamGoDeniedAuthorities,
  type BookingPartyTeamGoAuthority,
  type BookingPartyTeamGoCommand,
} from "@/lib/clubs/booking-party-team-go-evidence-contract";

export type BookingPartyTeamGoClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number }>;
};

export type BookingPartyTeamGoPool = {
  connect(): Promise<BookingPartyTeamGoClient & { release(): void }>;
};

type ReplayRow = {
  command_type: BookingPartyTeamGoCommand["type"];
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

type HandoffRow = {
  handoff_id: string;
  account_id: string;
  property_id:
    | "property-clubs-forest-city-golf"
    | "property-clubs-forest-city-marina";
  state: string;
  version: number;
  adult_count: number;
  dependent_minor_count: number;
  expires_at: string | Date;
  direct_application_id: string | null;
  booking_application_status: string | null;
};

type PersonRow = {
  party_member_id: string;
  party_order: number;
  party_role: "primary_applicant" | "additional_adult" | "dependent_minor";
  subject_account_id: string | null;
  member_subject_sha256: string | null;
  identity_state: string;
  party_status: string;
  party_version: number;
  consent_statement_version: string | null;
  consent_at: string | Date | null;
  application_id: string | null;
  application_account_id: string | null;
  application_status: string | null;
  application_version: number | null;
  decision_evidence_id: string | null;
  decision_version: number | null;
  decision_outcome: string | null;
  decision_sha256: string | null;
};

type DecisionTargetRow = {
  handoff_id: string;
  handoff_state: string;
  handoff_version: number;
  expires_at: string | Date;
  party_member_id: string;
  party_role: string;
  subject_account_id: string | null;
  member_subject_sha256: string | null;
  identity_state: string;
  party_status: string;
  party_version: number;
  consent_statement_version: string | null;
  consent_at: string | Date | null;
  application_id: string;
  application_account_id: string;
  application_status: string;
  application_version: number;
  current_decision_version: number;
};

export class BookingPartyTeamGoValidationError extends Error {
  constructor() {
    super("Booking Party Team-GO validation failed");
    this.name = "BookingPartyTeamGoValidationError";
  }
}

export class BookingPartyTeamGoAuthorityError extends Error {
  constructor() {
    super("Booking Party Team-GO authority denied");
    this.name = "BookingPartyTeamGoAuthorityError";
  }
}

export class BookingPartyTeamGoNotFoundError extends Error {
  constructor() {
    super("Booking Party Team-GO state not found");
    this.name = "BookingPartyTeamGoNotFoundError";
  }
}

export class BookingPartyTeamGoReplayConflictError extends Error {
  constructor() {
    super("Booking Party Team-GO replay conflict");
    this.name = "BookingPartyTeamGoReplayConflictError";
  }
}

export class BookingPartyTeamGoStateConflictError extends Error {
  constructor() {
    super("Booking Party Team-GO state conflict");
    this.name = "BookingPartyTeamGoStateConflictError";
  }
}

export class BookingPartyTeamGoGuardianPolicyError extends Error {
  constructor() {
    super("Booking Party guardian or dependent policy authority is not ready");
    this.name = "BookingPartyTeamGoGuardianPolicyError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function iso(value: string | Date | null) {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new BookingPartyTeamGoValidationError();
  }
  return parsed.toISOString();
}

function isSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

function validateAuthority(authority: BookingPartyTeamGoAuthority, now: Date) {
  const { actor, proof } = authority;
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.authentication.allowedRoles.includes(
      actor.role,
    ) ||
    !BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.authentication.assurance.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session" ||
    proof.proofSchema !== "crays.clubs.exact-b2b-session-proof.v1" ||
    proof.authoritySource !== "exact_b2b_session" ||
    proof.emailVerified !== true ||
    proof.b2cRejected !== true ||
    !isSha256(proof.issuerSha256) ||
    !isSha256(proof.clientIdSha256) ||
    !isSha256(proof.subjectSha256) ||
    !isSha256(proof.verifiedEmailSha256)
  ) {
    throw new BookingPartyTeamGoAuthorityError();
  }
  const actorAuthenticatedAt = new Date(actor.authenticatedAt);
  const proofAuthenticatedAt = new Date(proof.authenticatedAt);
  const ageMs = now.getTime() - proofAuthenticatedAt.getTime();
  if (
    !Number.isFinite(actorAuthenticatedAt.getTime()) ||
    !Number.isFinite(proofAuthenticatedAt.getTime()) ||
    Math.abs(actorAuthenticatedAt.getTime() - proofAuthenticatedAt.getTime()) >
      1_000 ||
    ageMs < -5_000 ||
    ageMs >
      BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.authentication
        .maximumAuthenticationAgeSeconds *
        1_000
  ) {
    throw new BookingPartyTeamGoAuthorityError();
  }
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(idempotencyKey)) {
    throw new BookingPartyTeamGoValidationError();
  }
}

function validateCommand(command: BookingPartyTeamGoCommand) {
  if (
    !/^clubs-booking-membership-handoff_[0-9a-f-]{36}$/.test(
      command.handoffId,
    )
  ) {
    throw new BookingPartyTeamGoValidationError();
  }
  if (command.type === "record_person_decision") {
    if (
      !/^clubs-booking-membership-party_[0-9a-f-]{36}$/.test(
        command.partyMemberId,
      ) ||
      !/^clubs-direct-membership-application_[0-9a-f-]{36}$/.test(
        command.applicationId,
      ) ||
      !Number.isInteger(command.expectedPartyVersion) ||
      command.expectedPartyVersion < 1 ||
      !Number.isInteger(command.expectedApplicationVersion) ||
      command.expectedApplicationVersion < 1 ||
      !Number.isInteger(command.expectedDecisionVersion) ||
      command.expectedDecisionVersion < 0
    ) {
      throw new BookingPartyTeamGoValidationError();
    }
    const reasonByOutcome = {
      approved_for_membership_payment:
        "membership_requirements_satisfied",
      declined: "membership_requirements_not_satisfied",
      more_information_required: "more_information_required",
    } as const;
    if (reasonByOutcome[command.outcome] !== command.reasonCode) {
      throw new BookingPartyTeamGoValidationError();
    }
    return;
  }
  if (
    !Number.isInteger(command.expectedHandoffVersion) ||
    command.expectedHandoffVersion < 1 ||
    !isSha256(command.expectedPartySnapshotSha256) ||
    !isSha256(command.expectedDecisionSnapshotSha256)
  ) {
    throw new BookingPartyTeamGoValidationError();
  }
}

async function assertActorAuthority(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
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
    [
      authority.actor.accountId,
      authority.actor.organizationId,
      authority.actor.role,
      authority.proof.subjectSha256,
    ],
  );
  if (!result.rows[0]?.allowed) {
    throw new BookingPartyTeamGoAuthorityError();
  }
}

function requestSha256(
  authority: BookingPartyTeamGoAuthority,
  command: BookingPartyTeamGoCommand,
) {
  return sha256(
    JSON.stringify({
      schema: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
      version: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.version,
      actor: {
        accountId: authority.actor.accountId,
        organizationId: authority.actor.organizationId,
        role: authority.actor.role,
        assuranceLevel: authority.actor.assuranceLevel,
      },
      proof: {
        issuerSha256: authority.proof.issuerSha256,
        clientIdSha256: authority.proof.clientIdSha256,
        subjectSha256: authority.proof.subjectSha256,
        verifiedEmailSha256: authority.proof.verifiedEmailSha256,
        authenticatedAt: authority.proof.authenticatedAt,
      },
      command,
    }),
  );
}

async function readHandoff(
  client: BookingPartyTeamGoClient,
  handoffId: string,
  lock = false,
) {
  const result = await client.query<HandoffRow>(
    `select h.handoff_id,h.account_id,h.property_id,h.state,h.version,
            h.adult_count,h.dependent_minor_count,h.expires_at,
            h.direct_application_id,a.status booking_application_status
       from crays_core.clubs_booking_membership_application_handoffs h
       left join crays_core.clubs_booking_membership_direct_applications a
         on a.application_id=h.direct_application_id
      where h.handoff_id=$1
      limit 1${lock ? " for update of h" : ""}`,
    [handoffId],
  );
  return result.rows[0] ?? null;
}

async function readPartySnapshot(
  client: BookingPartyTeamGoClient,
  handoffId: string,
) {
  const result = await client.query<PersonRow>(
    `with latest as (
       select distinct on (party_member_id)
              party_member_id,member_subject_sha256,decision_evidence_id,application_id,
              decision_version,outcome,decision_sha256
         from crays_core.clubs_booking_party_team_person_decision_evidence
        where handoff_id=$1
        order by party_member_id,decision_version desc
     )
     select party.party_member_id,party.party_order,party.party_role,
            party.account_id subject_account_id,party.identity_state,
            party.status party_status,party.version party_version,
            party.consent_statement_version,party.consent_at,
            latest.application_id,latest.member_subject_sha256,
            application.account_id application_account_id,
            application.status application_status,
            application.version application_version,
            latest.decision_evidence_id,latest.decision_version,
            latest.outcome decision_outcome,latest.decision_sha256
       from crays_core.clubs_booking_membership_application_party_members party
       left join latest on latest.party_member_id=party.party_member_id
       left join crays_core.clubs_direct_membership_applications application
         on application.application_id=latest.application_id
      where party.handoff_id=$1
      order by party.party_order,party.party_member_id`,
    [handoffId],
  );
  return result.rows;
}

function snapshotState(rows: PersonRow[]) {
  const partySnapshot = rows.map((row) => ({
    partyMemberId: row.party_member_id,
    partyOrder: row.party_order,
    partyRole: row.party_role,
    subjectAccountId: row.subject_account_id,
    identityState: row.identity_state,
    partyStatus: row.party_status,
    partyVersion: row.party_version,
    consentStatementVersion: row.consent_statement_version,
    consentAt: iso(row.consent_at),
  }));
  const decisionSnapshot = rows.map((row) => ({
    partyMemberId: row.party_member_id,
    applicationId: row.application_id,
    applicationAccountId: row.application_account_id,
    memberSubjectSha256: row.member_subject_sha256,
    applicationStatus: row.application_status,
    applicationVersion: row.application_version,
    decisionEvidenceId: row.decision_evidence_id,
    decisionVersion: row.decision_version,
    decisionOutcome: row.decision_outcome,
    decisionSha256: row.decision_sha256,
  }));
  return {
    partySnapshot,
    decisionSnapshot,
    partySnapshotSha256: sha256(JSON.stringify(partySnapshot)),
    decisionSnapshotSha256: sha256(JSON.stringify(decisionSnapshot)),
  };
}

function publicStatus(handoff: HandoffRow, rows: PersonRow[]) {
  const snapshots = snapshotState(rows);
  const adults = rows.filter((row) => row.party_role !== "dependent_minor");
  const dependents = rows.filter(
    (row) => row.party_role === "dependent_minor",
  );
  const approved = adults.filter(
    (row) => row.decision_outcome === "approved_for_membership_payment",
  );
  return {
    schema: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
    version: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.version,
    status: "ready" as const,
    handoffId: handoff.handoff_id,
    handoffState: handoff.state,
    handoffVersion: handoff.version,
    propertyId: handoff.property_id,
    requiredAdultCount: adults.length,
    approvedAdultCount: approved.length,
    dependentMinorCount: dependents.length,
    guardianPolicyReady: false,
    aggregateGoReady:
      dependents.length === 0 &&
      adults.length === handoff.adult_count &&
      approved.length === adults.length &&
      adults.every(
        (row) =>
          row.subject_account_id !== null &&
          row.member_subject_sha256 !== null &&
          row.identity_state === "ready" &&
          row.consent_statement_version ===
            "CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1" &&
          row.consent_at !== null &&
          row.application_id !== null &&
          row.application_account_id === row.subject_account_id,
      ),
    partySnapshotSha256: snapshots.partySnapshotSha256,
    decisionSnapshotSha256: snapshots.decisionSnapshotSha256,
    people: rows.map((row) => ({
      partyMemberId: row.party_member_id,
      partyRole: row.party_role,
      subjectAccountSha256: row.subject_account_id
        ? sha256(row.subject_account_id)
        : null,
      memberSubjectSha256: row.member_subject_sha256,
      applicationId: row.application_id,
      applicationVersion: row.application_version,
      decisionVersion: row.decision_version ?? 0,
      outcome: row.decision_outcome ?? "not_decided",
    })),
    authorities: bookingPartyTeamGoDeniedAuthorities(),
  };
}

async function insertCommandReceipt(
  client: BookingPartyTeamGoClient,
  input: {
    authority: BookingPartyTeamGoAuthority;
    command: BookingPartyTeamGoCommand;
    idempotencyKey: string;
    requestHash: string;
    response: Record<string, unknown>;
    decisionEvidenceId?: string;
    teamGoEvidenceId?: string;
  },
) {
  await client.query(
    `insert into crays_core.clubs_booking_party_team_go_command_receipts
      (command_receipt_id,actor_account_id,handoff_id,idempotency_key,
       command_type,request_sha256,response_payload,decision_evidence_id,
       team_go_evidence_id)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
    [
      `clubs-booking-party-team-go-command_${randomUUID()}`,
      input.authority.actor.accountId,
      input.command.handoffId,
      input.idempotencyKey,
      input.command.type,
      input.requestHash,
      JSON.stringify(input.response),
      input.decisionEvidenceId ?? null,
      input.teamGoEvidenceId ?? null,
    ],
  );
}

async function recordPersonDecision(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  command: Extract<
    BookingPartyTeamGoCommand,
    { type: "record_person_decision" }
  >,
  requestHash: string,
  now: Date,
) {
  const target = await client.query<DecisionTargetRow>(
    `select h.handoff_id,h.state handoff_state,h.version handoff_version,
            h.expires_at,party.party_member_id,party.party_role,
            party.account_id subject_account_id,party.identity_state,
            party.status party_status,party.version party_version,
            party.consent_statement_version,party.consent_at,
            application.application_id,
            application.account_id application_account_id,
            application.status application_status,
            application.version application_version,
            (select case when count(*)=1 then max(encode(
                       sha256(convert_to(identity.provider_subject,'UTF8')),'hex'
                     )) end
               from crays_core.auth_identities identity
              where identity.account_id=party.account_id
                and identity.provider_key='auth0'
                and identity.verified is true) member_subject_sha256,
            coalesce((select max(decision_version)
                        from crays_core.clubs_booking_party_team_person_decision_evidence
                       where party_member_id=party.party_member_id),0)::int
              current_decision_version
       from crays_core.clubs_booking_membership_application_handoffs h
       join crays_core.clubs_booking_membership_application_party_members party
         on party.handoff_id=h.handoff_id and party.party_member_id=$2
       join crays_core.clubs_direct_membership_applications application
         on application.application_id=$3
      where h.handoff_id=$1
      limit 1
      for update of h,party,application`,
    [command.handoffId, command.partyMemberId, command.applicationId],
  );
  const row = target.rows[0];
  if (!row) throw new BookingPartyTeamGoNotFoundError();
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    throw new BookingPartyTeamGoStateConflictError();
  }
  if (row.party_role === "dependent_minor") {
    throw new BookingPartyTeamGoGuardianPolicyError();
  }
  if (
    !["primary_applicant", "additional_adult"].includes(row.party_role) ||
    row.subject_account_id === null ||
    row.identity_state !== "ready" ||
    row.consent_statement_version !==
      "CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1" ||
    row.consent_at === null ||
    row.member_subject_sha256 === null ||
    row.application_account_id !== row.subject_account_id ||
    ["declined", "withdrawn"].includes(row.application_status) ||
    row.party_version !== command.expectedPartyVersion ||
    row.application_version !== command.expectedApplicationVersion ||
    row.current_decision_version !== command.expectedDecisionVersion ||
    ["approved_for_membership_payment", "declined", "withdrawn", "expired"].includes(
      row.handoff_state,
    )
  ) {
    throw new BookingPartyTeamGoStateConflictError();
  }

  const decisionEvidenceId = `clubs-booking-party-person-decision_${randomUUID()}`;
  const decisionVersion = row.current_decision_version + 1;
  const decidedAt = now.toISOString();
  const decisionHash = sha256(
    JSON.stringify({
      decisionEvidenceId,
      handoffId: command.handoffId,
      partyMemberId: command.partyMemberId,
      subjectAccountId: row.subject_account_id,
      memberSubjectSha256: row.member_subject_sha256,
      applicationId: command.applicationId,
      decisionVersion,
      outcome: command.outcome,
      reasonCode: command.reasonCode,
      actorAccountId: authority.actor.accountId,
      actorOrganizationId: authority.actor.organizationId,
      actorRole: authority.actor.role,
      proofSubjectSha256: authority.proof.subjectSha256,
      authenticatedAt: authority.proof.authenticatedAt,
      decidedAt,
      requestSha256: requestHash,
    }),
  );
  await client.query(
    `insert into crays_core.clubs_booking_party_team_person_decision_evidence
      (decision_evidence_id,handoff_id,party_member_id,subject_account_id,
       member_subject_sha256,application_id,decision_version,outcome,reason_code,actor_account_id,
       actor_organization_id,actor_role,proof_issuer_sha256,
       proof_client_id_sha256,proof_subject_sha256,
       proof_verified_email_sha256,assurance_level,authenticated_at,
       decided_at,decision_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      decisionEvidenceId,
      command.handoffId,
      command.partyMemberId,
      row.subject_account_id,
      row.member_subject_sha256,
      command.applicationId,
      decisionVersion,
      command.outcome,
      command.reasonCode,
      authority.actor.accountId,
      authority.actor.organizationId,
      authority.actor.role,
      authority.proof.issuerSha256,
      authority.proof.clientIdSha256,
      authority.proof.subjectSha256,
      authority.proof.verifiedEmailSha256,
      authority.actor.assuranceLevel,
      authority.proof.authenticatedAt,
      decidedAt,
      decisionHash,
    ],
  );
  const response = {
    schema: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
    version: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.version,
    status: "persisted",
    command: command.type,
    handoffId: command.handoffId,
    partyMemberId: command.partyMemberId,
    applicationId: command.applicationId,
    memberSubjectSha256: row.member_subject_sha256,
    decisionEvidenceId,
    decisionVersion,
    outcome: command.outcome,
    decisionSha256: decisionHash,
    aggregateGoIssued: false,
    authorities: bookingPartyTeamGoDeniedAuthorities(),
  };
  await insertCommandReceipt(client, {
    authority,
    command,
    idempotencyKey,
    requestHash,
    response,
    decisionEvidenceId,
  });
  return response;
}

async function issueAggregateGo(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  command: Extract<
    BookingPartyTeamGoCommand,
    { type: "issue_aggregate_go" }
  >,
  requestHash: string,
  now: Date,
) {
  const handoff = await readHandoff(client, command.handoffId, true);
  if (!handoff) throw new BookingPartyTeamGoNotFoundError();
  if (
    handoff.version !== command.expectedHandoffVersion ||
    new Date(handoff.expires_at).getTime() <= now.getTime() ||
    !handoff.direct_application_id ||
    ![
      "submitted",
      "under_ambassador_review",
      "under_team_review",
      "more_information_required",
    ].includes(handoff.state)
  ) {
    throw new BookingPartyTeamGoStateConflictError();
  }
  const alreadyIssued = await client.query(
    `select 1 from crays_core.clubs_booking_membership_party_go_receipts
      where handoff_id=$1
     union all
     select 1 from crays_core.clubs_booking_party_team_go_evidence
      where handoff_id=$1
     limit 1`,
    [command.handoffId],
  );
  if (alreadyIssued.rows[0]) {
    throw new BookingPartyTeamGoStateConflictError();
  }

  const rows = await readPartySnapshot(client, command.handoffId);
  const snapshots = snapshotState(rows);
  if (
    snapshots.partySnapshotSha256 !== command.expectedPartySnapshotSha256 ||
    snapshots.decisionSnapshotSha256 !==
      command.expectedDecisionSnapshotSha256
  ) {
    throw new BookingPartyTeamGoStateConflictError();
  }
  const adults = rows.filter((row) => row.party_role !== "dependent_minor");
  const dependents = rows.filter(
    (row) => row.party_role === "dependent_minor",
  );
  if (dependents.length > 0 || handoff.dependent_minor_count > 0) {
    throw new BookingPartyTeamGoGuardianPolicyError();
  }
  if (
    adults.length !== handoff.adult_count ||
    adults.length < 1 ||
    new Set(adults.map((row) => row.subject_account_id)).size !==
      adults.length ||
    new Set(adults.map((row) => row.application_id)).size !== adults.length ||
    !adults.every(
      (row) =>
        row.subject_account_id !== null &&
        row.member_subject_sha256 !== null &&
        row.identity_state === "ready" &&
        row.consent_statement_version ===
          "CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1" &&
        row.consent_at !== null &&
        row.application_id !== null &&
        row.application_account_id === row.subject_account_id &&
        row.application_status !== "declined" &&
        row.application_status !== "withdrawn" &&
        row.decision_outcome === "approved_for_membership_payment" &&
        row.decision_sha256 !== null,
    )
  ) {
    throw new BookingPartyTeamGoStateConflictError();
  }
  const primary = adults.find(
    (row) => row.party_role === "primary_applicant",
  );
  if (!primary?.subject_account_id || !primary.application_id) {
    throw new BookingPartyTeamGoStateConflictError();
  }

  const issuedAt = now.toISOString();
  const partyGoReceiptId = `clubs-booking-membership-party-go_${randomUUID()}`;
  const partyGoReceiptHash = sha256(
    JSON.stringify({
      partyGoReceiptId,
      handoffId: handoff.handoff_id,
      propertyId: handoff.property_id,
      outcome: "approved_for_membership_payment",
      partySnapshotSha256: snapshots.partySnapshotSha256,
      decisionSnapshotSha256: snapshots.decisionSnapshotSha256,
      actorAccountId: authority.actor.accountId,
      assuranceLevel: authority.actor.assuranceLevel,
      authenticatedAt: authority.proof.authenticatedAt,
      issuedAt,
    }),
  );
  await client.query(
    `insert into crays_core.clubs_booking_membership_party_go_receipts
      (party_go_receipt_id,handoff_id,actor_account_id,outcome,
       party_snapshot_sha256,assurance_level,authenticated_at,issued_at,
       receipt_sha256)
     values ($1,$2,$3,'approved_for_membership_payment',$4,$5,$6,$7,$8)`,
    [
      partyGoReceiptId,
      handoff.handoff_id,
      authority.actor.accountId,
      snapshots.partySnapshotSha256,
      authority.actor.assuranceLevel,
      authority.proof.authenticatedAt,
      issuedAt,
      partyGoReceiptHash,
    ],
  );

  const teamGoEvidenceId = `clubs-booking-party-team-go-evidence_${randomUUID()}`;
  const evidenceHash = sha256(
    JSON.stringify({
      teamGoEvidenceId,
      partyGoReceiptId,
      handoffId: handoff.handoff_id,
      primarySubjectAccountId: primary.subject_account_id,
      primaryApplicationId: primary.application_id,
      propertyId: handoff.property_id,
      requiredPersonCount: adults.length,
      approvedPersonCount: adults.length,
      partySnapshotSha256: snapshots.partySnapshotSha256,
      decisionSnapshotSha256: snapshots.decisionSnapshotSha256,
      sourceContract: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
      sandboxEvidenceScope:
        BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.sandboxEvidence.scope,
      proof: authority.proof,
      issuedAt,
    }),
  );
  await client.query(
    `insert into crays_core.clubs_booking_party_team_go_evidence
      (team_go_evidence_id,party_go_receipt_id,handoff_id,
       primary_subject_account_id,primary_application_id,property_id,
       required_person_count,approved_person_count,party_snapshot_sha256,
       decision_snapshot_sha256,source_contract,sandbox_evidence_scope,
       actor_account_id,actor_organization_id,actor_role,
       proof_issuer_sha256,proof_client_id_sha256,proof_subject_sha256,
       proof_verified_email_sha256,assurance_level,authenticated_at,issued_at,
       evidence_sha256,golf_sandbox_evidence_authorized)
     values ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
             $18,$19,$20,$21,$22,$23)`,
    [
      teamGoEvidenceId,
      partyGoReceiptId,
      handoff.handoff_id,
      primary.subject_account_id,
      primary.application_id,
      handoff.property_id,
      adults.length,
      snapshots.partySnapshotSha256,
      snapshots.decisionSnapshotSha256,
      BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
      BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.sandboxEvidence.scope,
      authority.actor.accountId,
      authority.actor.organizationId,
      authority.actor.role,
      authority.proof.issuerSha256,
      authority.proof.clientIdSha256,
      authority.proof.subjectSha256,
      authority.proof.verifiedEmailSha256,
      authority.actor.assuranceLevel,
      authority.proof.authenticatedAt,
      issuedAt,
      evidenceHash,
      handoff.property_id === "property-clubs-forest-city-golf",
    ],
  );

  await client.query(
    `update crays_core.clubs_booking_membership_direct_applications
        set status='approved_for_membership_payment',version=version+1,
            updated_at=$2
      where application_id=$1`,
    [handoff.direct_application_id, issuedAt],
  );
  await client.query(
    `update crays_core.clubs_booking_membership_application_party_members
        set status='approved_for_membership_payment',version=version+1,
            updated_at=$2
      where handoff_id=$1
        and party_role in ('primary_applicant','additional_adult')`,
    [handoff.handoff_id, issuedAt],
  );
  await client.query(
    `update crays_core.clubs_booking_membership_application_handoffs
        set state='approved_for_membership_payment',version=version+1,
            updated_at=$2
      where handoff_id=$1`,
    [handoff.handoff_id, issuedAt],
  );

  const golfEvidenceReady =
    handoff.property_id === "property-clubs-forest-city-golf";
  const response = {
    schema: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
    version: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.version,
    status: "persisted",
    command: command.type,
    handoffId: handoff.handoff_id,
    handoffState: "approved_for_membership_payment",
    handoffVersion: handoff.version + 1,
    propertyId: handoff.property_id,
    partyGoReceiptId,
    partyGoReceiptSha256: partyGoReceiptHash,
    teamGoEvidenceId,
    teamGoEvidenceSha256: evidenceHash,
    partySnapshotSha256: snapshots.partySnapshotSha256,
    decisionSnapshotSha256: snapshots.decisionSnapshotSha256,
    requiredPersonCount: adults.length,
    approvedPersonCount: adults.length,
    golfSandboxEvidenceReady: golfEvidenceReady,
    marinaMembershipReady: false,
    marinaAdmissionReady: false,
    authorities: bookingPartyTeamGoDeniedAuthorities(),
  };
  await insertCommandReceipt(client, {
    authority,
    command,
    idempotencyKey,
    requestHash,
    response,
    teamGoEvidenceId,
  });
  return response;
}

export async function executeBookingPartyTeamGoWithClient(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  command: BookingPartyTeamGoCommand,
  now = new Date(),
) {
  validateAuthority(authority, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await client.query("select set_config('crays.app_role','core_service',true)");
  await assertActorAuthority(client, authority);
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-booking-party-team-go:${command.handoffId}`,
  ]);

  const requestHash = requestSha256(authority, command);
  const replay = await client.query<ReplayRow>(
    `select command_type,request_sha256,response_payload
       from crays_core.clubs_booking_party_team_go_command_receipts
      where actor_account_id=$1 and idempotency_key=$2
      limit 1`,
    [authority.actor.accountId, idempotencyKey],
  );
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].request_sha256 !== requestHash
    ) {
      throw new BookingPartyTeamGoReplayConflictError();
    }
    return { ...replay.rows[0].response_payload, replayed: true };
  }

  const response =
    command.type === "record_person_decision"
      ? await recordPersonDecision(
          client,
          authority,
          idempotencyKey,
          command,
          requestHash,
          now,
        )
      : await issueAggregateGo(
          client,
          authority,
          idempotencyKey,
          command,
          requestHash,
          now,
        );
  return { ...response, replayed: false };
}

export async function executeBookingPartyTeamGoWithPool(
  pool: BookingPartyTeamGoPool,
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  command: BookingPartyTeamGoCommand,
  now = new Date(),
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await executeBookingPartyTeamGoWithClient(
      client,
      authority,
      idempotencyKey,
      command,
      now,
    );
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function executeBookingPartyTeamGo(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  command: BookingPartyTeamGoCommand,
) {
  return executeBookingPartyTeamGoWithPool(
    getCorePgPool(),
    authority,
    idempotencyKey,
    command,
  );
}

export async function readBookingPartyTeamGoStatusWithClient(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  handoffId: string,
  now = new Date(),
) {
  validateAuthority(authority, now);
  if (!/^clubs-booking-membership-handoff_[0-9a-f-]{36}$/.test(handoffId)) {
    throw new BookingPartyTeamGoValidationError();
  }
  await client.query("select set_config('crays.app_role','core_service',true)");
  await assertActorAuthority(client, authority);
  const handoff = await readHandoff(client, handoffId);
  if (!handoff) throw new BookingPartyTeamGoNotFoundError();
  return publicStatus(handoff, await readPartySnapshot(client, handoffId));
}

export async function readBookingPartyTeamGoStatus(
  authority: BookingPartyTeamGoAuthority,
  handoffId: string,
) {
  return readBookingPartyTeamGoStatusWithClient(
    getCorePgPool(),
    authority,
    handoffId,
  );
}

export async function reconcileBookingPartyTeamGoCommandWithClient(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  now = new Date(),
) {
  validateAuthority(authority, now);
  validateIdempotencyKey(idempotencyKey);
  await client.query("select set_config('crays.app_role','core_service',true)");
  await assertActorAuthority(client, authority);
  const receipt = await client.query<{ response_payload: Record<string, unknown> }>(
    `select response_payload
       from crays_core.clubs_booking_party_team_go_command_receipts
      where actor_account_id=$1 and idempotency_key=$2
      limit 1`,
    [authority.actor.accountId, idempotencyKey],
  );
  if (!receipt.rows[0]) throw new BookingPartyTeamGoNotFoundError();
  return { ...receipt.rows[0].response_payload, replayed: true };
}

export async function reconcileBookingPartyTeamGoCommand(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
) {
  return reconcileBookingPartyTeamGoCommandWithClient(
    getCorePgPool(),
    authority,
    idempotencyKey,
  );
}

export const bookingPartyTeamGoRepositoryTestApi = {
  requestSha256,
  snapshotState,
  validateAuthority,
  validateCommand,
};
