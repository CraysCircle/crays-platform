import "server-only";

import { createHash } from "node:crypto";

import {
  BookingPartyTeamGoAuthorityError,
  BookingPartyTeamGoGuardianPolicyError,
  BookingPartyTeamGoNotFoundError,
  BookingPartyTeamGoReplayConflictError,
  BookingPartyTeamGoStateConflictError,
  BookingPartyTeamGoValidationError,
  executeBookingPartyTeamGoWithClient,
  readBookingPartyTeamGoStatusWithClient,
  reconcileBookingPartyTeamGoCommandWithClient,
} from "@/db/clubs-booking-party-team-go-evidence-repository";
import { getCorePgPool } from "@/db/client";
import {
  ClubsTeamPersonReviewAggregateReadAuthorityError,
  ClubsTeamPersonReviewAggregateReadNotFoundError,
  ClubsTeamPersonReviewAggregateReadValidationError,
  readClubsTeamPersonReviewAggregateReadinessWithClient,
} from "@/db/clubs-team-membership-person-review-aggregate-readiness-repository";
import {
  CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT,
  clubsTeamPersonReviewTeamGoDeniedAuthorities,
  type ClubsTeamPersonReviewTeamGoAuthority,
  type ClubsTeamPersonReviewTeamGoCommand,
  type ClubsTeamPersonReviewTeamGoResult,
} from "@/lib/clubs/team-membership-person-review-team-go-contract";

export type ClubsTeamPersonReviewTeamGoClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

export type ClubsTeamPersonReviewTeamGoPool = {
  connect(): Promise<ClubsTeamPersonReviewTeamGoClient & { release(): void }>;
};

type TargetRow = {
  handoff_id: string;
};

export class ClubsTeamPersonReviewTeamGoAuthorityError extends Error {
  constructor() {
    super("Team person review Team-GO authority denied");
    this.name = "ClubsTeamPersonReviewTeamGoAuthorityError";
  }
}

export class ClubsTeamPersonReviewTeamGoNotFoundError extends Error {
  constructor() {
    super("Team person review Team-GO target not found");
    this.name = "ClubsTeamPersonReviewTeamGoNotFoundError";
  }
}

export class ClubsTeamPersonReviewTeamGoConflictError extends Error {
  constructor() {
    super("Team person review Team-GO conflict");
    this.name = "ClubsTeamPersonReviewTeamGoConflictError";
  }
}

export class ClubsTeamPersonReviewTeamGoValidationError extends Error {
  constructor() {
    super("Team person review Team-GO request invalid");
    this.name = "ClubsTeamPersonReviewTeamGoValidationError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new ClubsTeamPersonReviewTeamGoValidationError();
  }
}

function validateCommand(command: ClubsTeamPersonReviewTeamGoCommand) {
  if (
    command.type !== "issue_team_go" ||
    !/^cclub-review-[a-f0-9]{32}$/.test(command.reviewReference)
  ) {
    throw new ClubsTeamPersonReviewTeamGoValidationError();
  }
}

function canonicalIdempotencyKey(idempotencyKey: string) {
  return `t4-team-go:${sha256(
    `crays.clubs.team-person-review-team-go.v1\u001f${idempotencyKey}`,
  )}`;
}

function bookingPartyClient(client: ClubsTeamPersonReviewTeamGoClient) {
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

async function setCoreTenantRole(
  client: ClubsTeamPersonReviewTeamGoClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function resolveTargetForUpdate(
  client: ClubsTeamPersonReviewTeamGoClient,
  authority: ClubsTeamPersonReviewTeamGoAuthority,
  reviewReference: string,
) {
  const digestPrefix = reviewReference.slice("cclub-review-".length);
  const result = await client.query<TargetRow>(
    `select handoff.handoff_id
       from crays_core.clubs_booking_membership_direct_applications application
       join crays_core.clubs_booking_membership_application_handoffs handoff
         on handoff.handoff_id=application.handoff_id
        and handoff.direct_application_id=application.application_id
       join lateral (
         select receipt.recommendation_receipt_id
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
      where left(encode(sha256(convert_to(concat(
              'crays.clubs.team-direct-review.v1',chr(31),
              application.application_id
            ),'UTF8')),'hex'),32)=$2
      limit 2
      for update of application,handoff`,
    [authority.actor.organizationId, digestPrefix],
  );
  if (result.rows.length !== 1) {
    throw new ClubsTeamPersonReviewTeamGoNotFoundError();
  }
  return result.rows[0];
}

function canonicalIssueResult(
  value: unknown,
  expectedHandoffId?: string,
) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("status" in value) ||
    value.status !== "persisted" ||
    !("command" in value) ||
    value.command !== "issue_aggregate_go" ||
    !("handoffId" in value) ||
    typeof value.handoffId !== "string" ||
    (expectedHandoffId !== undefined && value.handoffId !== expectedHandoffId) ||
    !("handoffState" in value) ||
    value.handoffState !== "approved_for_membership_payment" ||
    !("partyGoReceiptId" in value) ||
    typeof value.partyGoReceiptId !== "string" ||
    !/^clubs-booking-membership-party-go_[0-9a-f-]{36}$/.test(
      value.partyGoReceiptId,
    ) ||
    !("teamGoEvidenceId" in value) ||
    typeof value.teamGoEvidenceId !== "string" ||
    !/^clubs-booking-party-team-go-evidence_[0-9a-f-]{36}$/.test(
      value.teamGoEvidenceId,
    )
  ) {
    throw new ClubsTeamPersonReviewTeamGoConflictError();
  }
}

function safeIssuedResult(alreadyIssued: boolean): ClubsTeamPersonReviewTeamGoResult {
  return {
    schema: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.version,
    status: "persisted",
    teamGoReady: true,
    issued: true,
    alreadyIssued,
    reconcileState: alreadyIssued
      ? "canonical_team_go_reconciled"
      : "canonical_team_go_issued",
    ...clubsTeamPersonReviewTeamGoDeniedAuthorities(),
  };
}

function mapAggregateError(error: unknown): never {
  if (error instanceof ClubsTeamPersonReviewAggregateReadAuthorityError) {
    throw new ClubsTeamPersonReviewTeamGoAuthorityError();
  }
  if (error instanceof ClubsTeamPersonReviewAggregateReadNotFoundError) {
    throw new ClubsTeamPersonReviewTeamGoNotFoundError();
  }
  if (error instanceof ClubsTeamPersonReviewAggregateReadValidationError) {
    throw new ClubsTeamPersonReviewTeamGoValidationError();
  }
  throw error;
}

function mapBookingPartyError(error: unknown): never {
  if (error instanceof BookingPartyTeamGoAuthorityError) {
    throw new ClubsTeamPersonReviewTeamGoAuthorityError();
  }
  if (error instanceof BookingPartyTeamGoNotFoundError) {
    throw new ClubsTeamPersonReviewTeamGoNotFoundError();
  }
  if (
    error instanceof BookingPartyTeamGoGuardianPolicyError ||
    error instanceof BookingPartyTeamGoReplayConflictError ||
    error instanceof BookingPartyTeamGoStateConflictError ||
    error instanceof BookingPartyTeamGoValidationError
  ) {
    throw new ClubsTeamPersonReviewTeamGoConflictError();
  }
  throw error;
}

async function canonicalReplay(
  client: ClubsTeamPersonReviewTeamGoClient,
  authority: ClubsTeamPersonReviewTeamGoAuthority,
  idempotencyKey: string,
) {
  try {
    return await reconcileBookingPartyTeamGoCommandWithClient(
      bookingPartyClient(client),
      authority,
      canonicalIdempotencyKey(idempotencyKey),
    );
  } catch (error) {
    if (error instanceof BookingPartyTeamGoNotFoundError) return null;
    mapBookingPartyError(error);
  }
}

export async function executeClubsTeamPersonReviewTeamGoWithClient(
  client: ClubsTeamPersonReviewTeamGoClient,
  authority: ClubsTeamPersonReviewTeamGoAuthority,
  idempotencyKey: string,
  command: ClubsTeamPersonReviewTeamGoCommand,
  now = new Date(),
) {
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await setCoreTenantRole(client, authority.actor.organizationId);

  const replay = await canonicalReplay(
    client,
    authority,
    idempotencyKey,
  );
  const target = await resolveTargetForUpdate(
    client,
    authority,
    command.reviewReference,
  );
  if (replay !== null) {
    canonicalIssueResult(replay, target.handoff_id);
    return safeIssuedResult(true);
  }

  let readiness;
  try {
    readiness = await readClubsTeamPersonReviewAggregateReadinessWithClient(
      client,
      authority,
      command.reviewReference,
      now,
    );
  } catch (error) {
    mapAggregateError(error);
  }
  if (
    readiness.status !== "ready" ||
    readiness.teamGoIssueReady !== true ||
    readiness.allRequiredPersonDecisionsPresent !== true ||
    readiness.allRequiredPersonsApproved !== true ||
    readiness.moreInformationRequired !== false ||
    readiness.declined !== false ||
    readiness.decisionVersionsAligned !== true ||
    readiness.canonical0251EvidenceAligned !== true ||
    readiness.canonical0251SnapshotAligned !== true ||
    readiness.dependentPolicyReady !== true ||
    readiness.reconcileState !== "canonical_0251_aligned"
  ) {
    throw new ClubsTeamPersonReviewTeamGoConflictError();
  }

  let status;
  try {
    status = await readBookingPartyTeamGoStatusWithClient(
      bookingPartyClient(client),
      authority,
      target.handoff_id,
      now,
    );
  } catch (error) {
    mapBookingPartyError(error);
  }
  if (
    status.status !== "ready" ||
    status.handoffId !== target.handoff_id ||
    status.aggregateGoReady !== true ||
    !Number.isInteger(status.handoffVersion) ||
    status.handoffVersion < 1 ||
    !/^[a-f0-9]{64}$/.test(status.partySnapshotSha256) ||
    !/^[a-f0-9]{64}$/.test(status.decisionSnapshotSha256)
  ) {
    throw new ClubsTeamPersonReviewTeamGoConflictError();
  }

  let result;
  try {
    result = await executeBookingPartyTeamGoWithClient(
      bookingPartyClient(client),
      authority,
      canonicalIdempotencyKey(idempotencyKey),
      {
        type: "issue_aggregate_go",
        handoffId: target.handoff_id,
        expectedHandoffVersion: status.handoffVersion,
        expectedPartySnapshotSha256: status.partySnapshotSha256,
        expectedDecisionSnapshotSha256: status.decisionSnapshotSha256,
      },
      now,
    );
  } catch (error) {
    mapBookingPartyError(error);
  }
  canonicalIssueResult(result, target.handoff_id);
  return safeIssuedResult(false);
}

export async function reconcileClubsTeamPersonReviewTeamGoWithClient(
  client: ClubsTeamPersonReviewTeamGoClient,
  authority: ClubsTeamPersonReviewTeamGoAuthority,
  idempotencyKey: string,
) {
  validateIdempotencyKey(idempotencyKey);
  await setCoreTenantRole(client, authority.actor.organizationId);
  const replay = await canonicalReplay(client, authority, idempotencyKey);
  if (replay === null) {
    throw new ClubsTeamPersonReviewTeamGoNotFoundError();
  }
  canonicalIssueResult(replay);
  return safeIssuedResult(true);
}

async function inTransaction<Result>(
  pool: ClubsTeamPersonReviewTeamGoPool,
  readOnly: boolean,
  operation: (client: ClubsTeamPersonReviewTeamGoClient) => Promise<Result>,
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

export async function executeClubsTeamPersonReviewTeamGo(
  authority: ClubsTeamPersonReviewTeamGoAuthority,
  idempotencyKey: string,
  command: ClubsTeamPersonReviewTeamGoCommand,
) {
  return inTransaction(getCorePgPool(), false, (client) =>
    executeClubsTeamPersonReviewTeamGoWithClient(
      client,
      authority,
      idempotencyKey,
      command,
    ),
  );
}

export async function reconcileClubsTeamPersonReviewTeamGo(
  authority: ClubsTeamPersonReviewTeamGoAuthority,
  idempotencyKey: string,
) {
  return inTransaction(getCorePgPool(), true, (client) =>
    reconcileClubsTeamPersonReviewTeamGoWithClient(
      client,
      authority,
      idempotencyKey,
    ),
  );
}

export const clubsTeamPersonReviewTeamGoRepositoryTestApi = {
  canonicalIdempotencyKey,
  canonicalIssueResult,
  validateCommand,
  validateIdempotencyKey,
};
