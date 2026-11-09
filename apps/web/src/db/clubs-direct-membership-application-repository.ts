import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import {
  DIRECT_MEMBERSHIP_APPLICATION_FIELDS,
  DIRECT_MEMBERSHIP_APPLICATION_PUBLIC_COPY,
  DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT,
} from "@/lib/clubs/direct-membership-application-contract";

export type DirectMembershipApplicant = {
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

export type DirectMembershipApplicationCommand = {
  type: "submit_application";
  applicant: DirectMembershipApplicant;
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

type ReviewerRow = { binding_id: string };

type ApplicationRow = {
  application_id: string;
  status: string;
  version: string | number;
  submitted_at: Date | string;
  updated_at: Date | string;
};

type CommandReceiptRow = {
  application_id: string;
  command_type: "submit_application";
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

export class DirectMembershipApplicationValidationError extends Error {
  constructor() {
    super("Direct membership application validation failed");
    this.name = "DirectMembershipApplicationValidationError";
  }
}

export class DirectMembershipApplicationReplayConflictError extends Error {
  constructor() {
    super("Direct membership application command replay conflict");
    this.name = "DirectMembershipApplicationReplayConflictError";
  }
}

export class DirectMembershipApplicationStateConflictError extends Error {
  constructor() {
    super("A current direct membership application already exists");
    this.name = "DirectMembershipApplicationStateConflictError";
  }
}

export class DirectMembershipApplicationReviewerUnavailableError extends Error {
  constructor() {
    super("Direct membership application reviewer binding unavailable");
    this.name = "DirectMembershipApplicationReviewerUnavailableError";
  }
}

export class DirectMembershipApplicationVerifiedEmailUnavailableError extends Error {
  constructor() {
    super("Verified server-resolved account email unavailable");
    this.name = "DirectMembershipApplicationVerifiedEmailUnavailableError";
  }
}

const deniedAuthorities = Object.freeze({
  membership: false,
  propertyAdmission: false,
  availability: false,
  quote: false,
  booking: false,
  payment: false,
  revenueEntitlement: false,
});

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function validateAccountId(accountId: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(accountId))
    throw new DirectMembershipApplicationValidationError();
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(idempotencyKey))
    throw new DirectMembershipApplicationValidationError();
}

function trimmed(value: string, min: number, max: number) {
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max)
    throw new DirectMembershipApplicationValidationError();
  return normalized;
}

function optionalHttpsUrl(value: string | null) {
  if (value === null) return null;
  if (value.length > 500)
    throw new DirectMembershipApplicationValidationError();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:")
      throw new DirectMembershipApplicationValidationError();
    return parsed.toString();
  } catch (error) {
    if (error instanceof DirectMembershipApplicationValidationError)
      throw error;
    throw new DirectMembershipApplicationValidationError();
  }
}

function normalizeApplicant(
  applicant: DirectMembershipApplicant,
): DirectMembershipApplicant {
  if (
    !["individual", "family", "team"].includes(applicant.applicantType) ||
    applicant.consent !== true
  )
    throw new DirectMembershipApplicationValidationError();
  return {
    applicantType: applicant.applicantType,
    fullName: trimmed(applicant.fullName, 2, 120),
    basedIn: trimmed(applicant.basedIn, 2, 120),
    interest: trimmed(applicant.interest, 2, 160),
    preferredArrivalWindow: trimmed(
      applicant.preferredArrivalWindow,
      2,
      120,
    ),
    preferredParticipationLength: trimmed(
      applicant.preferredParticipationLength,
      2,
      120,
    ),
    linkedinUrl: optionalHttpsUrl(applicant.linkedinUrl),
    socialUrl: optionalHttpsUrl(applicant.socialUrl),
    profileUrl: optionalHttpsUrl(applicant.profileUrl),
    motivation: trimmed(applicant.motivation, 20, 2000),
    contribution: trimmed(applicant.contribution, 20, 2000),
    consent: true,
  };
}

function applicantPayload(applicant: DirectMembershipApplicant) {
  return {
    applicantType: applicant.applicantType,
    fullName: applicant.fullName,
    basedIn: applicant.basedIn,
    interest: applicant.interest,
    preferredArrivalWindow: applicant.preferredArrivalWindow,
    preferredParticipationLength: applicant.preferredParticipationLength,
    linkedinUrl: applicant.linkedinUrl,
    socialUrl: applicant.socialUrl,
    profileUrl: applicant.profileUrl,
    motivation: applicant.motivation,
    contribution: applicant.contribution,
  };
}

function requestSha256(
  accountId: string,
  command: DirectMembershipApplicationCommand,
) {
  return sha256(
    JSON.stringify({
      schema: DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.schema,
      version: DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.version,
      accountId,
      command,
    }),
  );
}

function applicantStatus(status: string) {
  if (status === "submitted") return "submitted";
  if (
    [
      "assigned",
      "ambassador_review",
      "recommended",
      "not_recommended",
      "team_review",
    ].includes(status)
  )
    return "under_review";
  if (status === "more_information_required")
    return "more_information_required";
  if (status === "approved") return "approved";
  if (status === "declined") return "declined";
  if (status === "withdrawn") return "withdrawn";
  throw new DirectMembershipApplicationValidationError();
}

function publicApplicationState(row: ApplicationRow | undefined) {
  return {
    status: "ready",
    application: row
      ? {
          applicationId: row.application_id,
          status: applicantStatus(row.status),
          version: Number(row.version),
          submittedAt: iso(row.submitted_at),
          updatedAt: iso(row.updated_at),
        }
      : null,
    authorities: {
      applicationPersisted: Boolean(row),
      ...deniedAuthorities,
    },
  };
}

function publicConfiguration(submissionEnabled: boolean) {
  return {
    schema: DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.schema,
    version: DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.version,
    status: submissionEnabled ? "ready" : "temporarily_unavailable",
    submissionEnabled,
    fields: DIRECT_MEMBERSHIP_APPLICATION_FIELDS,
    copy: DIRECT_MEMBERSHIP_APPLICATION_PUBLIC_COPY,
    privacy: {
      privacyNoticeRoute:
        DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.privacy.privacyNoticeRoute,
      dataProtectionRoute:
        DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.privacy.dataProtectionRoute,
      consentStatementVersion:
        DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.privacy
          .consentStatementVersion,
      requiredConsentCopy:
        DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.privacy.requiredConsentCopy,
      marketingConsentRequired: false,
    },
    memberEndpoint:
      DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.endpoints.memberApplication,
    authorities: {
      application: submissionEnabled,
      ...deniedAuthorities,
    },
  };
}

async function activeReviewerBinding(client: QueryClient) {
  const result = await client.query<ReviewerRow>(
    `select b.binding_id
       from crays_core.clubs_direct_membership_application_reviewer_bindings b
       join crays_core.auth_identities source_identity
         on source_identity.identity_id=b.source_auth_identity_id
        and source_identity.account_id=b.source_principal_account_id
        and source_identity.provider_key='auth0'
        and source_identity.verified=true
       join crays_core.crays_accounts source_principal
         on source_principal.account_id=b.source_principal_account_id
        and source_principal.status='active'
       join crays_core.crays_accounts canonical
         on canonical.account_id=b.canonical_account_id
        and canonical.status='active'
       join crays_core.clubs_canonical_account_projection_receipts projection
         on projection.projection_receipt_id=
              b.canonical_account_projection_receipt_id
        and projection.canonical_account_id=b.canonical_account_id
        and projection.source_account_status='active'
        and projection.projected_contact_redacted=true
       left join
         crays_core.clubs_direct_membership_application_reviewer_binding_revocations r
         on r.binding_id=b.binding_id
      where b.route_key='direct-membership-application'
        and b.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
        and b.granted_capabilities @>
          '["read_assigned_applications","review_assigned_applications"]'::jsonb
        and b.provider_subject_sha256=encode(
          sha256(convert_to(source_identity.provider_subject,'UTF8')),'hex'
        )
        and projection.source_business_subject_sha256=
          b.provider_subject_sha256
        and b.valid_from<=now()
        and (b.expires_at is null or b.expires_at>now())
        and r.binding_id is null`,
  );
  return result.rows.length === 1 ? result.rows[0] : null;
}

export async function readDirectMembershipApplicationPublicConfigurationWithClient(
  client: QueryClient,
) {
  await client.query("select set_config('crays.app_role','core_service',true)");
  return publicConfiguration(Boolean(await activeReviewerBinding(client)));
}

export async function readDirectMembershipApplicationWithClient(
  client: QueryClient,
  accountId: string,
) {
  validateAccountId(accountId);
  await client.query("select set_config('crays.app_role','core_service',true)");
  const result = await client.query<ApplicationRow>(
    `select application_id,status,version,submitted_at,updated_at
       from crays_core.clubs_direct_membership_applications
      where account_id=$1
      order by submitted_at desc
      limit 1`,
    [accountId],
  );
  return publicApplicationState(result.rows[0]);
}

export async function executeDirectMembershipApplicationCommandWithClient(
  client: QueryClient,
  accountId: string,
  idempotencyKey: string,
  command: DirectMembershipApplicationCommand,
) {
  validateAccountId(accountId);
  validateIdempotencyKey(idempotencyKey);
  if (command.type !== "submit_application")
    throw new DirectMembershipApplicationValidationError();
  const applicant = normalizeApplicant(command.applicant);
  const normalizedCommand = {
    type: "submit_application",
    applicant,
  } as const;
  const commandSha256 = requestSha256(accountId, normalizedCommand);

  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    "clubs-direct-membership-application:" + accountId,
  ]);

  const replay = await client.query<CommandReceiptRow>(
    `select application_id,command_type,request_sha256,response_payload
       from crays_core.clubs_direct_membership_application_command_receipts
      where account_id=$1 and idempotency_key=$2 limit 1`,
    [accountId, idempotencyKey],
  );
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== normalizedCommand.type ||
      replay.rows[0].request_sha256 !== commandSha256
    )
      throw new DirectMembershipApplicationReplayConflictError();
    return { ...replay.rows[0].response_payload, replayed: true };
  }

  const account = await client.query<{ primary_contact: string }>(
    `select a.primary_contact
       from crays_core.crays_accounts a
      where a.account_id=$1
        and a.status in ('active','review')
        and a.primary_contact_type='contact'
        and a.primary_contact is not null
        and a.primary_contact ~*
          '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        and exists (
          select 1 from crays_core.auth_identities identity
           where identity.account_id=a.account_id
             and identity.provider_key='auth0'
             and identity.verified=true
        )
      limit 1`,
    [accountId],
  );
  if (!account.rows[0])
    throw new DirectMembershipApplicationVerifiedEmailUnavailableError();

  const existing = await client.query<{ application_id: string }>(
    `select application_id
       from crays_core.clubs_direct_membership_applications
      where account_id=$1
        and status in (
          'submitted','assigned','ambassador_review',
          'more_information_required','recommended','not_recommended',
          'team_review','approved'
        )
      limit 1 for update`,
    [accountId],
  );
  if (existing.rows[0])
    throw new DirectMembershipApplicationStateConflictError();

  const reviewer = await activeReviewerBinding(client);
  if (!reviewer)
    throw new DirectMembershipApplicationReviewerUnavailableError();

  const applicationId =
    "clubs-direct-membership-application_" + randomUUID();
  const inserted = await client.query<ApplicationRow>(
    `insert into crays_core.clubs_direct_membership_applications
      (application_id,account_id,assigned_reviewer_binding_id,
       applicant_payload,account_email_snapshot_sha256,
       consent_statement_version,consent_at,status,submitted_at,updated_at)
     values ($1,$2,$3,$4::jsonb,$5,
       'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1',
       now(),'submitted',now(),now())
     returning application_id,status,version,submitted_at,updated_at`,
    [
      applicationId,
      accountId,
      reviewer.binding_id,
      JSON.stringify(applicantPayload(applicant)),
      sha256(account.rows[0].primary_contact.trim().toLowerCase()),
    ],
  );
  const row = inserted.rows[0];
  if (!row) throw new DirectMembershipApplicationValidationError();
  const response = {
    status: "persisted",
    outcome: "application_submitted",
    application: publicApplicationState(row).application,
    replayed: false,
    authorities: {
      applicationPersisted: true,
      ...deniedAuthorities,
    },
  };
  await client.query(
    `insert into
       crays_core.clubs_direct_membership_application_command_receipts
      (command_receipt_id,account_id,application_id,idempotency_key,
       command_type,request_sha256,response_payload)
     values ($1,$2,$3,$4,'submit_application',$5,$6::jsonb)`,
    [
      "clubs-direct-membership-application-command_" + randomUUID(),
      accountId,
      applicationId,
      idempotencyKey,
      commandSha256,
      JSON.stringify(response),
    ],
  );
  return response;
}

async function inReadTransaction<Result>(
  pool: Pool,
  task: (client: QueryClient) => Promise<Result>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    const result = await task(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function readDirectMembershipApplicationPublicConfiguration() {
  return inReadTransaction(
    getCorePgPool(),
    readDirectMembershipApplicationPublicConfigurationWithClient,
  );
}

export async function readDirectMembershipApplication(accountId: string) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readDirectMembershipApplicationWithClient(client, accountId),
  );
}

export async function executeDirectMembershipApplicationCommandWithPool(
  pool: Pool,
  accountId: string,
  idempotencyKey: string,
  command: DirectMembershipApplicationCommand,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result =
      await executeDirectMembershipApplicationCommandWithClient(
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

export async function executeDirectMembershipApplicationCommand(
  accountId: string,
  idempotencyKey: string,
  command: DirectMembershipApplicationCommand,
) {
  return executeDirectMembershipApplicationCommandWithPool(
    getCorePgPool(),
    accountId,
    idempotencyKey,
    command,
  );
}

export const directMembershipApplicationRepositoryTestApi = {
  normalizeApplicant,
  requestSha256,
};
