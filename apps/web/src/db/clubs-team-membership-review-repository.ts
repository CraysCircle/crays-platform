import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT,
  type ClubsTeamMembershipReviewActor,
  type ClubsTeamMembershipReviewCommand,
} from "@/lib/clubs/team-membership-review-contract";

export type ClubsTeamMembershipReviewClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type ClubsTeamMembershipReviewPool = {
  connect(): Promise<ClubsTeamMembershipReviewClient & { release(): void }>;
};

type QueueRow = {
  application_id: string;
  member_account_id: string;
  interest_property_id: string | null;
  application_status:
    "submitted" | "under_review" | "approved" | "declined" | "withdrawn";
  application_version: number;
  submitted_at: string | Date;
  updated_at: string | Date;
  review_started_at: string | Date | null;
  decided_at: string | Date | null;
  decision_receipt_id: string | null;
  membership_id: string | null;
  membership_status: "confirmed" | "suspended" | "revoked" | "expired" | null;
  membership_type_id: string | null;
  membership_type_mapping_ready: boolean | null;
};

type ReplayRow = {
  command_type: ClubsTeamMembershipReviewCommand["type"];
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

export class ClubsTeamMembershipReviewValidationError extends Error {
  constructor() {
    super("Clubs team Membership review validation failed");
    this.name = "ClubsTeamMembershipReviewValidationError";
  }
}

export class ClubsTeamMembershipReviewAuthorityError extends Error {
  constructor() {
    super("Clubs team Membership review authority denied");
    this.name = "ClubsTeamMembershipReviewAuthorityError";
  }
}

export class ClubsTeamMembershipReviewNotFoundError extends Error {
  constructor() {
    super("Clubs Membership application not found");
    this.name = "ClubsTeamMembershipReviewNotFoundError";
  }
}

export class ClubsTeamMembershipReviewReplayConflictError extends Error {
  constructor() {
    super("Clubs team Membership review replay conflict");
    this.name = "ClubsTeamMembershipReviewReplayConflictError";
  }
}

export class ClubsTeamMembershipReviewStateConflictError extends Error {
  constructor() {
    super("Clubs Membership application state conflict");
    this.name = "ClubsTeamMembershipReviewStateConflictError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function iso(value: string | Date | null) {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsTeamMembershipReviewValidationError();
  }
  return date.toISOString();
}

function validateActor(actor: ClubsTeamMembershipReviewActor, now: Date) {
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.allowedRoles.includes(actor.role) ||
    !CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.assurance.allowed.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session"
  ) {
    throw new ClubsTeamMembershipReviewAuthorityError();
  }
  const authenticatedAt = new Date(actor.authenticatedAt);
  const ageMs = now.getTime() - authenticatedAt.getTime();
  if (
    !Number.isFinite(authenticatedAt.getTime()) ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.assurance.maximumAgeSeconds * 1_000
  ) {
    throw new ClubsTeamMembershipReviewAuthorityError();
  }
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(idempotencyKey)) {
    throw new ClubsTeamMembershipReviewValidationError();
  }
}

function validateCommand(command: ClubsTeamMembershipReviewCommand) {
  if (
    !/^clubs-membership-application_[0-9a-f-]{36}$/.test(
      command.applicationId,
    ) ||
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 1
  ) {
    throw new ClubsTeamMembershipReviewValidationError();
  }
  const reasonByCommand = {
    start_review: "review_started",
    approve_application: "membership_requirements_satisfied",
    decline_application: "membership_requirements_not_satisfied",
  } as const;
  if (command.reasonCode !== reasonByCommand[command.type]) {
    throw new ClubsTeamMembershipReviewValidationError();
  }
}

async function assertActorAuthority(
  client: ClubsTeamMembershipReviewClient,
  actor: ClubsTeamMembershipReviewActor,
) {
  const authority = await client.query<{ allowed: boolean }>(
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
      where account.account_id=$1
        and account.status='active'
      limit 1`,
    [actor.accountId, actor.organizationId, actor.role],
  );
  if (!authority.rows[0]?.allowed) {
    throw new ClubsTeamMembershipReviewAuthorityError();
  }
}

function queueItem(row: QueueRow) {
  return {
    applicationId: row.application_id,
    memberAccountId: row.member_account_id,
    interestPropertyId: row.interest_property_id,
    applicationStatus: row.application_status,
    applicationVersion: row.application_version,
    submittedAt: iso(row.submitted_at),
    updatedAt: iso(row.updated_at),
    reviewStartedAt: iso(row.review_started_at),
    decidedAt: iso(row.decided_at),
    decisionReceiptId: row.decision_receipt_id,
    membership: row.membership_id
      ? {
          membershipId: row.membership_id,
          status: row.membership_status,
          membershipTypeId: row.membership_type_id,
          membershipTypeMappingReady:
            row.membership_type_mapping_ready === true,
        }
      : {
          membershipId: null,
          status: "not_confirmed" as const,
          membershipTypeId: null,
          membershipTypeMappingReady: false,
        },
  };
}

const queueSql = `select
    application.application_id,
    application.account_id member_account_id,
    application.interest_property_id,
    application.status application_status,
    application.version application_version,
    application.submitted_at,
    application.updated_at,
    application.review_started_at,
    application.decided_at,
    application.decision_receipt_id,
    membership.membership_id,
    membership.status membership_status,
    membership.membership_type_id,
    membership.membership_type_mapping_ready
  from crays_core.clubs_member_membership_applications application
  left join crays_core.clubs_member_memberships membership
    on membership.application_id=application.application_id
   and membership.program_key=application.program_key`;

export async function readClubsTeamMembershipApplicationsWithClient(
  client: ClubsTeamMembershipReviewClient,
  actor: ClubsTeamMembershipReviewActor,
  now = new Date(),
) {
  validateActor(actor, now);
  await assertActorAuthority(client, actor);
  const result = await client.query<QueueRow>(
    `${queueSql}
      where application.program_key='crays-clubs-membership'
      order by
        case application.status
          when 'submitted' then 1
          when 'under_review' then 2
          else 3
        end,
        application.updated_at desc
      limit 100`,
  );
  return {
    schema: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.version,
    status: "ready" as const,
    queue: result.rows.map(queueItem),
    authorities: {
      actorRole: actor.role,
      decisionAuthority: "CRAYS_TEAM" as const,
      membershipTypeMappingReady: false,
      marinaPropertyAdmission: false,
      availabilityAuthority: false,
      bookingAuthority: false,
    },
  };
}

function requestSha256(
  actor: ClubsTeamMembershipReviewActor,
  command: ClubsTeamMembershipReviewCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.schema,
      version: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.version,
      actor: {
        accountId: actor.accountId,
        organizationId: actor.organizationId,
        role: actor.role,
      },
      command,
    }),
  );
}

export async function executeClubsTeamMembershipReviewWithClient(
  client: ClubsTeamMembershipReviewClient,
  actor: ClubsTeamMembershipReviewActor,
  idempotencyKey: string,
  command: ClubsTeamMembershipReviewCommand,
  now = new Date(),
) {
  validateActor(actor, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await assertActorAuthority(client, actor);
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-membership-review:${command.applicationId}`,
  ]);

  const requestHash = requestSha256(actor, command);
  const replay = await client.query<ReplayRow>(
    `select command_type,request_sha256,response_payload
       from crays_core.clubs_member_membership_decision_receipts
      where actor_account_id=$1 and idempotency_key=$2
      limit 1`,
    [actor.accountId, idempotencyKey],
  );
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].request_sha256 !== requestHash
    ) {
      throw new ClubsTeamMembershipReviewReplayConflictError();
    }
    return replay.rows[0].response_payload;
  }

  const applicationResult = await client.query<QueueRow>(
    `${queueSql}
      where application.application_id=$1
        and application.program_key='crays-clubs-membership'
      limit 1
      for update of application`,
    [command.applicationId],
  );
  const application = applicationResult.rows[0];
  if (!application) throw new ClubsTeamMembershipReviewNotFoundError();
  if (application.application_version !== command.expectedVersion) {
    throw new ClubsTeamMembershipReviewStateConflictError();
  }

  if (
    (command.type === "start_review" &&
      application.application_status !== "submitted") ||
    (command.type !== "start_review" &&
      application.application_status !== "under_review")
  ) {
    throw new ClubsTeamMembershipReviewStateConflictError();
  }
  if (application.membership_id) {
    throw new ClubsTeamMembershipReviewStateConflictError();
  }

  const decisionReceiptId = `clubs-membership-decision_${randomUUID()}`;
  const membershipId =
    command.type === "approve_application"
      ? `clubs-membership_${randomUUID()}`
      : null;
  const versionAfter = application.application_version + 1;
  const decidedAt = now.toISOString();
  const decisionHash = sha256(
    JSON.stringify({
      decisionReceiptId,
      applicationId: application.application_id,
      memberAccountId: application.member_account_id,
      actorAccountId: actor.accountId,
      actorOrganizationId: actor.organizationId,
      actorRole: actor.role,
      authorityRole: "CRAYS_TEAM",
      commandType: command.type,
      applicationVersionBefore: application.application_version,
      applicationVersionAfter: versionAfter,
      membershipId,
      reasonCode: command.reasonCode,
      assuranceLevel: actor.assuranceLevel,
      authenticatedAt: actor.authenticatedAt,
      decidedAt,
      requestSha256: requestHash,
    }),
  );
  const applicationStatus =
    command.type === "start_review"
      ? "under_review"
      : command.type === "approve_application"
        ? "approved"
        : "declined";
  const response = {
    schema: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.version,
    status: "persisted",
    outcome:
      command.type === "start_review"
        ? "review_started"
        : command.type === "approve_application"
          ? "membership_confirmed"
          : "application_declined",
    decisionReceiptId,
    decisionSha256: decisionHash,
    applicationId: application.application_id,
    applicationStatus,
    applicationVersion: versionAfter,
    memberAccountId: application.member_account_id,
    membershipId,
    membershipStatus:
      command.type === "approve_application" ? "confirmed" : "not_confirmed",
    membershipTypeId: null,
    membershipTypeMappingReady: false,
    marinaPropertyAdmission: false,
    availabilityAuthority: false,
    bookingAuthority: false,
  };

  await client.query(
    `insert into crays_core.clubs_member_membership_decision_receipts
      (decision_receipt_id,application_id,member_account_id,actor_account_id,
       actor_organization_id,actor_role,authority_role,command_type,
       application_version_before,application_version_after,membership_id,
       reason_code,idempotency_key,request_sha256,response_payload,
       assurance_level,authenticated_at,decided_at,decision_sha256)
     values ($1,$2,$3,$4,$5,$6,'CRAYS_TEAM',$7,$8,$9,$10,$11,$12,$13,
             $14::jsonb,$15,$16,$17,$18)`,
    [
      decisionReceiptId,
      application.application_id,
      application.member_account_id,
      actor.accountId,
      actor.organizationId,
      actor.role,
      command.type,
      application.application_version,
      versionAfter,
      membershipId,
      command.reasonCode,
      idempotencyKey,
      requestHash,
      JSON.stringify(response),
      actor.assuranceLevel,
      actor.authenticatedAt,
      decidedAt,
      decisionHash,
    ],
  );

  if (command.type === "start_review") {
    await client.query(
      `update crays_core.clubs_member_membership_applications
          set status='under_review',version=$2,review_started_at=$3,
              updated_at=$3
        where application_id=$1`,
      [application.application_id, versionAfter, decidedAt],
    );
  } else {
    await client.query(
      `update crays_core.clubs_member_membership_applications
          set status=$2,version=$3,decided_at=$4,updated_at=$4,
              decision_authority_role='CRAYS_TEAM',decision_receipt_id=$5,
              decision_sha256=$6
        where application_id=$1`,
      [
        application.application_id,
        applicationStatus,
        versionAfter,
        decidedAt,
        decisionReceiptId,
        decisionHash,
      ],
    );
    if (command.type === "approve_application" && membershipId) {
      await client.query(
        `insert into crays_core.clubs_member_memberships
          (membership_id,account_id,application_id,program_key,status,
           membership_type_id,membership_type_mapping_ready,valid_from,
           valid_until,decision_authority_role,decision_receipt_id,
           decision_sha256,updated_at)
         values ($1,$2,$3,'crays-clubs-membership','confirmed',null,false,$4,
                 null,'CRAYS_TEAM',$5,$6,$4)`,
        [
          membershipId,
          application.member_account_id,
          application.application_id,
          decidedAt,
          decisionReceiptId,
          decisionHash,
        ],
      );
    }
  }
  return response;
}

export async function executeClubsTeamMembershipReviewWithPool(
  pool: ClubsTeamMembershipReviewPool,
  actor: ClubsTeamMembershipReviewActor,
  idempotencyKey: string,
  command: ClubsTeamMembershipReviewCommand,
  now = new Date(),
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await executeClubsTeamMembershipReviewWithClient(
      client,
      actor,
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

export async function readClubsTeamMembershipApplications(
  actor: ClubsTeamMembershipReviewActor,
) {
  return readClubsTeamMembershipApplicationsWithClient(getCorePgPool(), actor);
}

export async function executeClubsTeamMembershipReview(
  actor: ClubsTeamMembershipReviewActor,
  idempotencyKey: string,
  command: ClubsTeamMembershipReviewCommand,
) {
  return executeClubsTeamMembershipReviewWithPool(
    getCorePgPool(),
    actor,
    idempotencyKey,
    command,
  );
}
