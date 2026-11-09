import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_MEMBER_MEMBERSHIP_UI_CONTRACT,
  type ClubsMemberMembershipCommand,
} from "@/lib/clubs/member-membership-contract";

export type ClubsMemberMembershipClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type ClubsMemberMembershipPool = {
  connect(): Promise<ClubsMemberMembershipClient & { release(): void }>;
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

type ApplicationRow = {
  application_id: string;
  interest_property_id: string | null;
  status: "submitted" | "under_review" | "approved" | "declined" | "withdrawn";
  version: number;
  submitted_at: string | Date;
  updated_at: string | Date;
};

type MembershipRow = {
  membership_id: string;
  status: "confirmed" | "suspended" | "revoked" | "expired";
  membership_type_id: string | null;
  membership_type_mapping_ready: boolean;
  version: number;
  valid_from: string | Date;
  valid_until: string | Date | null;
  decision_authority_role: "CRAYS_TEAM";
};

type CommandReceiptRow = {
  command_type: ClubsMemberMembershipCommand["type"];
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

export class ClubsMemberMembershipValidationError extends Error {
  constructor() {
    super("Clubs membership command validation failed");
    this.name = "ClubsMemberMembershipValidationError";
  }
}

export class ClubsMemberMembershipReplayConflictError extends Error {
  constructor() {
    super("Clubs membership command replay conflict");
    this.name = "ClubsMemberMembershipReplayConflictError";
  }
}

export class ClubsMemberMembershipStateConflictError extends Error {
  constructor() {
    super("Clubs membership application state conflict");
    this.name = "ClubsMemberMembershipStateConflictError";
  }
}

function iso(value: string | Date | null) {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsMemberMembershipValidationError();
  }
  return date.toISOString();
}

function commandSha256(
  accountId: string,
  command: ClubsMemberMembershipCommand,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schema: CLUBS_MEMBER_MEMBERSHIP_UI_CONTRACT.schema,
        version: CLUBS_MEMBER_MEMBERSHIP_UI_CONTRACT.version,
        accountId,
        command,
      }),
    )
    .digest("hex");
}

function validateAccountId(accountId: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(accountId)) {
    throw new ClubsMemberMembershipValidationError();
  }
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(idempotencyKey)) {
    throw new ClubsMemberMembershipValidationError();
  }
}

async function readApplication(
  client: ClubsMemberMembershipClient,
  accountId: string,
  lock = false,
) {
  const result = await client.query<ApplicationRow>(
    `select application_id,interest_property_id,status,version,
            submitted_at,updated_at
       from crays_core.clubs_member_membership_applications
      where account_id=$1 and program_key='crays-clubs-membership'
      limit 1${lock ? " for update" : ""}`,
    [accountId],
  );
  return result.rows[0] ?? null;
}

async function readMembership(
  client: ClubsMemberMembershipClient,
  accountId: string,
  lock = false,
) {
  const result = await client.query<MembershipRow>(
    `select membership_id,status,membership_type_id,
            membership_type_mapping_ready,version,valid_from,valid_until,
            decision_authority_role
       from crays_core.clubs_member_memberships
      where account_id=$1 and program_key='crays-clubs-membership'
      limit 1${lock ? " for update" : ""}`,
    [accountId],
  );
  return result.rows[0] ?? null;
}

export async function readClubsMemberMembershipWithClient(
  client: ClubsMemberMembershipClient,
  accountId: string,
) {
  validateAccountId(accountId);
  const [application, membership] = await Promise.all([
    readApplication(client, accountId),
    readMembership(client, accountId),
  ]);

  return {
    schema: CLUBS_MEMBER_MEMBERSHIP_UI_CONTRACT.schema,
    version: CLUBS_MEMBER_MEMBERSHIP_UI_CONTRACT.version,
    status: "ready" as const,
    application: application
      ? {
          applicationId: application.application_id,
          status: application.status,
          interestPropertyId: application.interest_property_id,
          version: application.version,
          submittedAt: iso(application.submitted_at),
          updatedAt: iso(application.updated_at),
        }
      : {
          applicationId: null,
          status: "none" as const,
          interestPropertyId: null,
          version: null,
          submittedAt: null,
          updatedAt: null,
        },
    membership: membership
      ? {
          membershipId: membership.membership_id,
          status: membership.status,
          membershipTypeId: membership.membership_type_id,
          membershipTypeMappingReady: membership.membership_type_mapping_ready,
          version: membership.version,
          validFrom: iso(membership.valid_from),
          validUntil: iso(membership.valid_until),
          decisionAuthority: membership.decision_authority_role,
        }
      : {
          membershipId: null,
          status: "not_confirmed" as const,
          membershipTypeId: null,
          membershipTypeMappingReady: false,
          version: null,
          validFrom: null,
          validUntil: null,
          decisionAuthority: null,
        },
    authorities: {
      authenticationReady: true,
      membershipConfirmed: membership?.status === "confirmed",
      membershipDecisionAuthority: "CRAYS_TEAM" as const,
      membershipTypeMappingReady:
        membership?.membership_type_mapping_ready ?? false,
      marinaPropertyAdmission: false,
      availabilityAuthority: false,
      bookingAuthority: false,
    },
  };
}

export async function readClubsMemberMembership(accountId: string) {
  return readClubsMemberMembershipWithClient(getCorePgPool(), accountId);
}

export async function executeClubsMemberMembershipCommandWithClient(
  client: ClubsMemberMembershipClient,
  accountId: string,
  idempotencyKey: string,
  command: ClubsMemberMembershipCommand,
) {
  validateAccountId(accountId);
  validateIdempotencyKey(idempotencyKey);
  const requestSha256 = commandSha256(accountId, command);

  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-membership:${accountId}`,
  ]);

  const account = await client.query<{ account_id: string }>(
    `select account_id
       from crays_core.crays_accounts
      where account_id=$1 and status in ('active','review')
      limit 1`,
    [accountId],
  );
  if (!account.rows[0]) throw new ClubsMemberMembershipValidationError();

  const replay = await client.query<CommandReceiptRow>(
    `select command_type,request_sha256,response_payload
       from crays_core.clubs_member_membership_command_receipts
      where account_id=$1 and idempotency_key=$2
      limit 1`,
    [accountId, idempotencyKey],
  );
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].request_sha256 !== requestSha256
    ) {
      throw new ClubsMemberMembershipReplayConflictError();
    }
    return replay.rows[0].response_payload;
  }

  const membership = await readMembership(client, accountId, true);
  if (membership?.status === "confirmed") {
    throw new ClubsMemberMembershipStateConflictError();
  }

  let application = await readApplication(client, accountId, true);
  let response: Record<string, unknown>;

  if (command.type === "submit_application") {
    if (command.interestPropertyId !== null) {
      const property = await client.query<{ property_id: string }>(
        `select property_id
           from crays_core.clubs_public_property_identities
          where property_id=$1
            and lifecycle_state='active'
            and access_mode='membership_only'
            and membership_required=true
          limit 1`,
        [command.interestPropertyId],
      );
      if (!property.rows[0]) {
        throw new ClubsMemberMembershipValidationError();
      }
    }

    if (application?.status === "approved") {
      throw new ClubsMemberMembershipStateConflictError();
    }
    if (
      application &&
      ["submitted", "under_review"].includes(application.status) &&
      application.interest_property_id !== command.interestPropertyId
    ) {
      throw new ClubsMemberMembershipStateConflictError();
    }

    if (!application) {
      const applicationId = `clubs-membership-application_${randomUUID()}`;
      const inserted = await client.query<ApplicationRow>(
        `insert into crays_core.clubs_member_membership_applications
          (application_id,account_id,program_key,interest_property_id,status,
           submitted_at,updated_at)
         values ($1,$2,'crays-clubs-membership',$3,'submitted',now(),now())
         returning application_id,interest_property_id,status,version,
                   submitted_at,updated_at`,
        [applicationId, accountId, command.interestPropertyId],
      );
      application = inserted.rows[0] ?? null;
    } else if (
      application.status === "declined" ||
      application.status === "withdrawn"
    ) {
      const updated = await client.query<ApplicationRow>(
        `update crays_core.clubs_member_membership_applications
            set interest_property_id=$2,status='submitted',version=version+1,
                submitted_at=now(),updated_at=now(),review_started_at=null,
                decided_at=null,decision_authority_role=null,
                decision_receipt_id=null,decision_sha256=null
          where application_id=$1
          returning application_id,interest_property_id,status,version,
                    submitted_at,updated_at`,
        [application.application_id, command.interestPropertyId],
      );
      application = updated.rows[0] ?? null;
    }

    if (!application) throw new ClubsMemberMembershipValidationError();
    response = {
      status: "persisted",
      outcome:
        application.status === "under_review"
          ? "already_under_review"
          : application.status === "submitted"
            ? "application_submitted"
            : "application_pending",
      applicationId: application.application_id,
      applicationStatus: application.status,
      interestPropertyId: application.interest_property_id,
      membershipStatus: "not_confirmed",
      membershipDecisionAuthority: "CRAYS_TEAM",
      membershipTypeMappingReady: false,
      marinaPropertyAdmission: false,
      availabilityAuthority: false,
      bookingAuthority: false,
    };
  } else {
    if (
      !application ||
      !["submitted", "under_review"].includes(application.status)
    ) {
      throw new ClubsMemberMembershipStateConflictError();
    }
    const updated = await client.query<ApplicationRow>(
      `update crays_core.clubs_member_membership_applications
          set status='withdrawn',version=version+1,updated_at=now(),
              review_started_at=null
        where application_id=$1
        returning application_id,interest_property_id,status,version,
                  submitted_at,updated_at`,
      [application.application_id],
    );
    application = updated.rows[0] ?? null;
    if (!application) throw new ClubsMemberMembershipValidationError();
    response = {
      status: "persisted",
      outcome: "application_withdrawn",
      applicationId: application.application_id,
      applicationStatus: application.status,
      interestPropertyId: application.interest_property_id,
      membershipStatus: "not_confirmed",
      membershipDecisionAuthority: "CRAYS_TEAM",
      membershipTypeMappingReady: false,
      marinaPropertyAdmission: false,
      availabilityAuthority: false,
      bookingAuthority: false,
    };
  }

  await client.query(
    `insert into crays_core.clubs_member_membership_command_receipts
      (command_receipt_id,account_id,idempotency_key,command_type,
       request_sha256,response_payload,application_id)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [
      `clubs-membership-command_${randomUUID()}`,
      accountId,
      idempotencyKey,
      command.type,
      requestSha256,
      JSON.stringify(response),
      application.application_id,
    ],
  );
  return response;
}

export async function executeClubsMemberMembershipCommandWithPool(
  pool: ClubsMemberMembershipPool,
  accountId: string,
  idempotencyKey: string,
  command: ClubsMemberMembershipCommand,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await executeClubsMemberMembershipCommandWithClient(
      client,
      accountId,
      idempotencyKey,
      command,
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

export async function executeClubsMemberMembershipCommand(
  accountId: string,
  idempotencyKey: string,
  command: ClubsMemberMembershipCommand,
) {
  return executeClubsMemberMembershipCommandWithPool(
    getCorePgPool(),
    accountId,
    idempotencyKey,
    command,
  );
}
