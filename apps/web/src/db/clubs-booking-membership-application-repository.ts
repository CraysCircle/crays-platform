import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import { bookingHandoffStayError } from "@/lib/clubs/booking-handoff-stay-validation";
import {
  BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT,
  isSafeBookingMembershipReturnTo,
} from "@/lib/clubs/booking-membership-application-handoff-contract";

export type BookingMembershipIntent = {
  propertyId:
    "property-clubs-forest-city-golf" | "property-clubs-forest-city-marina";
  dateMode: "exact" | "flexible";
  checkIn: string | null;
  checkOut: string | null;
  flexibleMonth: string | null;
  flexibleStay: "weekend" | "week" | "month" | null;
  stayUnit: "night" | "week" | "month";
  nights: number | null;
  guests: number;
  children: number;
  pets: number;
  requestedServices: string[];
  returnTo: string;
};

export type BookingMembershipApplicant = {
  applicantType: "individual" | "family" | "team";
  fullName: string;
  basedIn: string;
  interest: string;
  preferredArrivalWindow: string;
  preferredParticipationLength: string;
  linkedinUrl: string | null;
  socialUrl: string | null;
  profileUrl: string | null;
  motivation: string;
  contribution: string;
  consent: true;
};

export type BookingMembershipCommand =
  | { type: "create_handoff"; intent: BookingMembershipIntent }
  | {
      type: "submit_primary_application";
      resumeToken: string;
      expectedVersion: number;
      applicant: BookingMembershipApplicant;
    };

type QueryClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

type Pool = QueryClient & {
  connect(): Promise<QueryClient & { release(): void }>;
};

type HandoffRow = {
  handoff_id: string;
  account_id: string;
  property_id: BookingMembershipIntent["propertyId"];
  resume_token_digest: string;
  intent_payload: BookingMembershipIntent;
  return_to: string;
  state: string;
  version: number;
  expires_at: Date | string;
  direct_application_id: string | null;
  application_status: string | null;
  application_updated_at: Date | string | null;
};

type PartyCountRow = {
  additional_required: string | number;
  additional_joined: string | number;
  minors_required: string | number;
};

type CommandReceiptRow = {
  handoff_id: string;
  command_type: BookingMembershipCommand["type"];
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

type ReviewerRow = {
  binding_id: string;
};

export class BookingMembershipValidationError extends Error {
  constructor() {
    super("Booking membership handoff validation failed");
    this.name = "BookingMembershipValidationError";
  }
}

export class BookingMembershipReplayConflictError extends Error {
  constructor() {
    super("Booking membership command replay conflict");
    this.name = "BookingMembershipReplayConflictError";
  }
}

export class BookingMembershipStateConflictError extends Error {
  constructor() {
    super("Booking membership handoff state conflict");
    this.name = "BookingMembershipStateConflictError";
  }
}

export class BookingMembershipResumeNotFoundError extends Error {
  constructor() {
    super("Booking membership resume token not found or expired");
    this.name = "BookingMembershipResumeNotFoundError";
  }
}

export class BookingMembershipReviewerUnavailableError extends Error {
  constructor() {
    super("Booking membership reviewer binding unavailable");
    this.name = "BookingMembershipReviewerUnavailableError";
  }
}

export class BookingMembershipTokenConfigurationError extends Error {
  constructor() {
    super("Booking membership token configuration unavailable");
    this.name = "BookingMembershipTokenConfigurationError";
  }
}

function tokenSecret(explicit?: string) {
  const dedicated =
    explicit ?? process.env.CRAYS_CLUBS_BOOKING_RESUME_SECRET ?? "";
  const previewFallback =
    process.env.NODE_ENV !== "production"
      ? (process.env.AUTH0_CLUBS_SECRET ?? "")
      : "";
  const value = dedicated || previewFallback;
  if (value.length < 32) throw new BookingMembershipTokenConfigurationError();
  return createHmac("sha256", value)
    .update("crays-clubs-booking-membership-resume-v1")
    .digest();
}

function deriveResumeToken(
  secret: string | undefined,
  accountId: string,
  idempotencyKey: string,
  requestSha256: string,
) {
  const digest = createHmac("sha256", tokenSecret(secret))
    .update(`${accountId}\u0000${idempotencyKey}\u0000${requestSha256}`)
    .digest("base64url");
  return `cbm1_${digest}`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function commandSha256(accountId: string, command: BookingMembershipCommand) {
  const safeCommand =
    command.type === "submit_primary_application"
      ? {
          ...command,
          resumeToken: undefined,
          resumeTokenDigest: sha256(command.resumeToken),
        }
      : command;
  return sha256(
    JSON.stringify({
      schema: BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT.schema,
      version: BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT.version,
      accountId,
      command: safeCommand,
    }),
  );
}

function validateAccountId(accountId: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(accountId))
    throw new BookingMembershipValidationError();
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value))
    throw new BookingMembershipValidationError();
}

function validateIntent(intent: BookingMembershipIntent) {
  if (!isSafeBookingMembershipReturnTo(intent.returnTo))
    throw new BookingMembershipValidationError();
  if (bookingHandoffStayError(intent))
    throw new BookingMembershipValidationError();
  if (intent.guests < 1 || intent.guests > 20) {
    throw new BookingMembershipValidationError();
  }
}

function iso(value: Date | string | null) {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime()))
    throw new BookingMembershipValidationError();
  return parsed.toISOString();
}

function continueHref(resumeToken: string, returnTo: string) {
  const query = new URLSearchParams({ resume: resumeToken, returnTo });
  return `/en/apply-directly?${query.toString()}`;
}

async function readPartyCounts(client: QueryClient, handoffId: string) {
  const result = await client.query<PartyCountRow>(
    `select count(*) filter (where party_role='additional_adult') additional_required,
            count(*) filter (where party_role='additional_adult' and account_id is not null) additional_joined,
            count(*) filter (where party_role='dependent_minor') minors_required
       from crays_core.clubs_booking_membership_application_party_members
      where handoff_id=$1`,
    [handoffId],
  );
  const row = result.rows[0];
  return {
    additionalAdultsRequired: Number(row?.additional_required ?? 0),
    additionalAdultsJoined: Number(row?.additional_joined ?? 0),
    dependentMinorsRequired: Number(row?.minors_required ?? 0),
  };
}

async function readHandoffByDigest(
  client: QueryClient,
  accountId: string,
  resumeTokenDigest: string,
  lock = false,
) {
  const result = await client.query<HandoffRow>(
    `select h.handoff_id,h.account_id,h.property_id,h.resume_token_digest,
            h.intent_payload,h.return_to,h.state,h.version,h.expires_at,
            h.direct_application_id,a.status application_status,
            a.updated_at application_updated_at
       from crays_core.clubs_booking_membership_application_handoffs h
       left join crays_core.clubs_booking_membership_direct_applications a
         on a.application_id=h.direct_application_id
      where h.account_id=$1 and h.resume_token_digest=$2
      limit 1${lock ? " for update of h" : ""}`,
    [accountId, resumeTokenDigest],
  );
  return result.rows[0] ?? null;
}

async function readHandoffById(
  client: QueryClient,
  accountId: string,
  handoffId: string,
) {
  const result = await client.query<HandoffRow>(
    `select h.handoff_id,h.account_id,h.property_id,h.resume_token_digest,
            h.intent_payload,h.return_to,h.state,h.version,h.expires_at,
            h.direct_application_id,a.status application_status,
            a.updated_at application_updated_at
       from crays_core.clubs_booking_membership_application_handoffs h
       left join crays_core.clubs_booking_membership_direct_applications a
         on a.application_id=h.direct_application_id
      where h.account_id=$1 and h.handoff_id=$2
      limit 1`,
    [accountId, handoffId],
  );
  return result.rows[0] ?? null;
}

async function publicState(client: QueryClient, row: HandoffRow) {
  const party = await readPartyCounts(client, row.handoff_id);
  return {
    schema: BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT.schema,
    version: BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT.version,
    status: "ready",
    flow: {
      state: row.state,
      version: row.version,
      propertyId: row.property_id,
      expiresAt: iso(row.expires_at),
      returnTo: row.return_to,
      intent: row.intent_payload,
    },
    party: {
      primaryApplicant: "verified_account",
      ...party,
      dependentPolicyReady: false,
      allRequiredPeopleReady:
        party.additionalAdultsRequired === party.additionalAdultsJoined &&
        party.dependentMinorsRequired === 0,
    },
    application: row.application_status
      ? {
          status: row.application_status,
          updatedAt: iso(row.application_updated_at),
        }
      : null,
    authorities: {
      applicationPersisted: Boolean(row.application_status),
      membership: false,
      propertyAdmission: false,
      availability: false,
      quote: false,
      booking: false,
      membershipPaymentPreparation: false,
      stayPaymentPreparation: false,
    },
  };
}

async function activeReviewerBinding(client: QueryClient) {
  const result = await client.query<ReviewerRow>(
    `select b.binding_id
       from crays_core.clubs_direct_membership_application_reviewer_bindings b
       join crays_core.crays_accounts a on a.account_id=b.canonical_account_id
       left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations r
         on r.binding_id=b.binding_id
      where b.route_key='direct-membership-application'
        and b.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
        and b.granted_capabilities @> '["read_assigned_applications","review_assigned_applications"]'::jsonb
        and b.valid_from<=now()
        and (b.expires_at is null or b.expires_at>now())
        and r.binding_id is null
        and a.status='active'`,
  );
  if (result.rows.length !== 1)
    throw new BookingMembershipReviewerUnavailableError();
  return result.rows[0].binding_id;
}

export async function readBookingMembershipApplicationWithClient(
  client: QueryClient,
  accountId: string,
  resumeToken: string,
) {
  validateAccountId(accountId);
  if (!/^cbm1_[A-Za-z0-9_-]{43}$/.test(resumeToken))
    throw new BookingMembershipResumeNotFoundError();
  await client.query("select set_config('crays.app_role','core_service',true)");
  const row = await readHandoffByDigest(client, accountId, sha256(resumeToken));
  if (!row || new Date(row.expires_at).getTime() <= Date.now())
    throw new BookingMembershipResumeNotFoundError();
  return publicState(client, row);
}

export async function readBookingMembershipApplication(
  accountId: string,
  resumeToken: string,
) {
  return readBookingMembershipApplicationWithClient(
    getCorePgPool(),
    accountId,
    resumeToken,
  );
}

async function executeWithClient(
  client: QueryClient,
  accountId: string,
  idempotencyKey: string,
  command: BookingMembershipCommand,
  secret?: string,
) {
  validateAccountId(accountId);
  validateIdempotencyKey(idempotencyKey);
  if (command.type === "create_handoff") validateIntent(command.intent);
  const requestSha256 = commandSha256(accountId, command);
  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-booking-membership:${accountId}`,
  ]);

  const replay = await client.query<CommandReceiptRow>(
    `select handoff_id,command_type,request_sha256,response_payload
       from crays_core.clubs_booking_membership_application_command_receipts
      where account_id=$1 and idempotency_key=$2 limit 1`,
    [accountId, idempotencyKey],
  );
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].request_sha256 !== requestSha256
    )
      throw new BookingMembershipReplayConflictError();
    if (command.type === "create_handoff") {
      const row = await readHandoffById(
        client,
        accountId,
        replay.rows[0].handoff_id,
      );
      if (!row) throw new BookingMembershipStateConflictError();
      const resumeToken = deriveResumeToken(
        secret,
        accountId,
        idempotencyKey,
        requestSha256,
      );
      if (sha256(resumeToken) !== row.resume_token_digest)
        throw new BookingMembershipStateConflictError();
      return {
        ...replay.rows[0].response_payload,
        resumeToken,
        continueHref: continueHref(resumeToken, row.return_to),
        replayed: true,
      };
    }
    return { ...replay.rows[0].response_payload, replayed: true };
  }

  const account = await client.query<{ account_id: string }>(
    `select account_id from crays_core.crays_accounts
      where account_id=$1 and status in ('active','review') limit 1`,
    [accountId],
  );
  if (!account.rows[0]) throw new BookingMembershipValidationError();

  if (command.type === "create_handoff") {
    const property = await client.query<{ property_id: string }>(
      `select property_id from crays_core.clubs_public_property_identities
        where property_id=$1 and lifecycle_state='active' limit 1`,
      [command.intent.propertyId],
    );
    if (!property.rows[0]) throw new BookingMembershipValidationError();

    const handoffId = `clubs-booking-membership-handoff_${randomUUID()}`;
    const resumeToken = deriveResumeToken(
      secret,
      accountId,
      idempotencyKey,
      requestSha256,
    );
    const intentSha256 = sha256(JSON.stringify(command.intent));
    const initialState =
      command.intent.guests > 1 || command.intent.children > 0
        ? "party_incomplete"
        : "application_incomplete";
    await client.query(
      `insert into crays_core.clubs_booking_membership_application_handoffs
        (handoff_id,account_id,property_id,resume_token_digest,intent_sha256,
         intent_payload,return_to,date_mode,stay_unit,adult_count,
         dependent_minor_count,pet_count,state,expiry_policy_receipt_id,expires_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,
         'CCLUB-BOOKING-MEMBERSHIP-RESUME-EXPIRY-V1',
         now()+interval '7 days')`,
      [
        handoffId,
        accountId,
        command.intent.propertyId,
        sha256(resumeToken),
        intentSha256,
        JSON.stringify(command.intent),
        command.intent.returnTo,
        command.intent.dateMode,
        command.intent.stayUnit,
        command.intent.guests,
        command.intent.children,
        command.intent.pets,
        initialState,
      ],
    );
    await client.query(
      `insert into crays_core.clubs_booking_membership_application_party_members
        (party_member_id,handoff_id,party_order,party_role,account_id,
         identity_state,status)
       values ($1,$2,1,'primary_applicant',$3,'ready','identity_ready')`,
      [`clubs-booking-membership-party_${randomUUID()}`, handoffId, accountId],
    );
    for (let order = 2; order <= command.intent.guests; order += 1) {
      const partyId = `clubs-booking-membership-party_${randomUUID()}`;
      const inviteToken = createHmac("sha256", tokenSecret(secret))
        .update(`party\u0000${handoffId}\u0000${partyId}`)
        .digest("base64url");
      await client.query(
        `insert into crays_core.clubs_booking_membership_application_party_members
          (party_member_id,handoff_id,party_order,party_role,invite_token_digest,
           identity_state,status)
         values ($1,$2,$3,'additional_adult',$4,'awaiting_identity','awaiting_identity')`,
        [partyId, handoffId, order, sha256(`cbp1_${inviteToken}`)],
      );
    }
    for (let offset = 1; offset <= command.intent.children; offset += 1) {
      await client.query(
        `insert into crays_core.clubs_booking_membership_application_party_members
          (party_member_id,handoff_id,party_order,party_role,identity_state,status)
         values ($1,$2,$3,'dependent_minor','dependent_policy_not_ready',
                 'dependent_policy_not_ready')`,
        [
          `clubs-booking-membership-party_${randomUUID()}`,
          handoffId,
          command.intent.guests + offset,
        ],
      );
    }
    const row = await readHandoffById(client, accountId, handoffId);
    if (!row) throw new BookingMembershipStateConflictError();
    const response = await publicState(client, row);
    await client.query(
      `insert into crays_core.clubs_booking_membership_application_command_receipts
        (command_receipt_id,account_id,handoff_id,idempotency_key,command_type,
         request_sha256,response_payload)
       values ($1,$2,$3,$4,'create_handoff',$5,$6::jsonb)`,
      [
        `clubs-booking-membership-command_${randomUUID()}`,
        accountId,
        handoffId,
        idempotencyKey,
        requestSha256,
        JSON.stringify(response),
      ],
    );
    return {
      ...response,
      resumeToken,
      continueHref: continueHref(resumeToken, command.intent.returnTo),
      replayed: false,
    };
  }

  const resumeDigest = sha256(command.resumeToken);
  const row = await readHandoffByDigest(client, accountId, resumeDigest, true);
  if (!row || new Date(row.expires_at).getTime() <= Date.now())
    throw new BookingMembershipResumeNotFoundError();
  if (row.version !== command.expectedVersion || row.direct_application_id)
    throw new BookingMembershipStateConflictError();
  const party = await readPartyCounts(client, row.handoff_id);
  if (party.dependentMinorsRequired > 0)
    throw new BookingMembershipStateConflictError();

  const reviewerBindingId = await activeReviewerBinding(client);
  const applicationId = `clubs-booking-membership-application_${randomUUID()}`;
  const applicantPayload = { ...command.applicant, consent: undefined };
  await client.query("set constraints all deferred");
  await client.query(
    `insert into crays_core.clubs_booking_membership_direct_applications
      (application_id,handoff_id,account_id,assigned_reviewer_binding_id,
       applicant_payload,consent_statement_version,consent_at,status,
       submitted_at,updated_at)
     values ($1,$2,$3,$4,$5::jsonb,
       'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1',now(),'submitted',now(),now())`,
    [
      applicationId,
      row.handoff_id,
      accountId,
      reviewerBindingId,
      JSON.stringify(applicantPayload),
    ],
  );
  await client.query(
    `update crays_core.clubs_booking_membership_application_party_members
        set direct_application_id=$3,
            consent_statement_version='CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1',
            consent_at=now(),status='application_submitted',version=version+1,
            updated_at=now()
      where handoff_id=$1 and account_id=$2 and party_role='primary_applicant'`,
    [row.handoff_id, accountId, applicationId],
  );
  const nextState =
    party.additionalAdultsRequired === party.additionalAdultsJoined
      ? "submitted"
      : "party_incomplete";
  await client.query(
    `update crays_core.clubs_booking_membership_application_handoffs
        set direct_application_id=$2,state=$3,version=version+1,updated_at=now()
      where handoff_id=$1`,
    [row.handoff_id, applicationId, nextState],
  );
  const next = await readHandoffById(client, accountId, row.handoff_id);
  if (!next) throw new BookingMembershipStateConflictError();
  const response = await publicState(client, next);
  await client.query(
    `insert into crays_core.clubs_booking_membership_application_command_receipts
      (command_receipt_id,account_id,handoff_id,idempotency_key,command_type,
       request_sha256,response_payload)
     values ($1,$2,$3,$4,'submit_primary_application',$5,$6::jsonb)`,
    [
      `clubs-booking-membership-command_${randomUUID()}`,
      accountId,
      row.handoff_id,
      idempotencyKey,
      requestSha256,
      JSON.stringify(response),
    ],
  );
  return { ...response, replayed: false };
}

export async function executeBookingMembershipCommandWithPool(
  pool: Pool,
  accountId: string,
  idempotencyKey: string,
  command: BookingMembershipCommand,
  secret?: string,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await executeWithClient(
      client,
      accountId,
      idempotencyKey,
      command,
      secret,
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

export async function executeBookingMembershipCommand(
  accountId: string,
  idempotencyKey: string,
  command: BookingMembershipCommand,
) {
  return executeBookingMembershipCommandWithPool(
    getCorePgPool(),
    accountId,
    idempotencyKey,
    command,
  );
}

export const bookingMembershipRepositoryTestApi = {
  commandSha256,
  deriveResumeToken,
  executeWithClient,
};
