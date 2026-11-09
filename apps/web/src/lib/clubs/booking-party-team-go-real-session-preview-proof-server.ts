import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { link, open, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { getCorePgPool } from "@/db/client";
import {
  BookingPartyTeamGoNotFoundError,
  BookingPartyTeamGoReplayConflictError,
  executeBookingPartyTeamGoWithClient,
  readBookingPartyTeamGoStatusWithClient,
  type BookingPartyTeamGoClient,
} from "@/db/clubs-booking-party-team-go-evidence-repository";
import type { BookingPartyTeamGoAuthority } from "@/lib/clubs/booking-party-team-go-evidence-contract";

const proofSchema =
  "crays.clubs.booking-party-team-go.real-session-preview-proof.v1";
const authorizationManifestPath =
  "/srv/crays/dev-state/01a04c6c-aa96-7fa0-a7aa-7be197450c2e/CCLUB_T2_0251_REAL_SESSION_ROLLBACK_AUTHORIZATION.json";
const receiptDirectory =
  "/srv/crays/dev-state/01a04c6c-aa96-7fa0-a7aa-7be197450c2e";
const receiptFilePath = path.join(
  receiptDirectory,
  "CCLUB_T2_0251_REAL_SESSION_PREVIEW_RECEIPT.json",
);
const executionMarkerPath = path.join(
  receiptDirectory,
  "CCLUB_T2_0251_REAL_SESSION_EXECUTION_MARKER.json",
);
const consentVersion =
  "CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1";
const expectedTarget = Object.freeze({
  databaseName: "crays_clubs_test_20260729",
  databaseRoleSha256:
    "6f198191100386e1f0c093fc1c902c0520c6382059d75fb4743ec1ec75cc7842",
  endpointSha256:
    "807a3e597788a8621952f86a77b48e1196b28c8634ef481ccba227a130c3825f",
  serverVersionNum: "180006",
  neonBranchName: "clubs-preview-cclub060-019feb95-20260810",
  neonBranchId: "br-crimson-breeze-aspgsex9",
});

type ProofClient = BookingPartyTeamGoClient & { release(): void };

type ProofCounts = {
  decisions: number;
  aggregates: number;
  commands: number;
  legacyGo: number;
  memberships: number;
  admissions: number;
};

type Fixture = {
  accountId: string;
  identityId: string;
  applicationId: string;
  handoffId: string;
  bookingApplicationId: string;
  partyMemberId: string;
};

type AuthorizationManifest = {
  schema: typeof proofSchema;
  version: "1.0.0";
  status: "AUTHORIZED";
  scope: "rollback_only_golf_repository_proof";
  oneVerifierRun: true;
  realExactB2bSessionRequired: true;
  actorTenantAalResolverRequired: true;
  adultCount: 1;
  dependentMinorCount: 0;
  consentStatementVersion: typeof consentVersion;
  durableGolfWorkflowAuthorized: false;
  marinaAuthorized: false;
  databaseName: typeof expectedTarget.databaseName;
  databaseRoleSha256: typeof expectedTarget.databaseRoleSha256;
  endpointSha256: typeof expectedTarget.endpointSha256;
  serverVersionNum: typeof expectedTarget.serverVersionNum;
  neonBranchName: typeof expectedTarget.neonBranchName;
  neonBranchId: typeof expectedTarget.neonBranchId;
  allowedIdempotencyKeySha256: string;
  allowedRunNonceSha256: string;
  expiresAt: string;
};

type SealedReceipt = {
  schema: typeof proofSchema;
  version: "1.0.0";
  status: "PREVIEW_ROLLBACK_PASS";
  persistence: "preview_filesystem_evidence_only_not_vercel_durable";
  requestSha256: string;
  requestRevision: number;
  actorBindingSha256: string;
  tenantBindingSha256: string;
  exactSessionBindingSha256: string;
  authorizationManifestSha256: string;
  structuralScope: "0251_repository_runtime_proof";
  adultCount: 1;
  dependentMinorCount: 0;
  personDecisionCount: 1;
  aggregateGoCount: 1;
  commandReceiptCount: 2;
  legacyPartyGoCount: 1;
  rollbackGolfEvidenceObserved: true;
  golfSandboxEvidenceReady: false;
  marinaMembershipReady: false;
  marinaAdmissionReady: false;
  transactionRolledBack: true;
  residualCountsEqual: true;
  fixtureSpecificResidualAbsent: true;
  replayVerified: true;
  payloadDriftConflictVerified: true;
  durableGolfWorkflowAuthorized: false;
  t3SandboxUnlocked: false;
  sandboxE2ePassed: false;
  productionPassed: false;
  createdAt: string;
};

export type BookingPartyTeamGoRealSessionPreviewProofResult = Readonly<{
  schema: typeof proofSchema;
  version: "1.0.0";
  status: "preview_rollback_pass";
  replayed: boolean;
  authorityProbe: "real_session_actor_authorized";
  transactionRolledBack: true;
  residualCountsEqual: true;
  rollbackGolfEvidenceObserved: true;
  golfSandboxEvidenceReady: false;
  marinaMembershipReady: false;
  marinaAdmissionReady: false;
  durableGolfWorkflowAuthorized: false;
  t3SandboxUnlocked: false;
  sandboxE2ePassed: false;
  productionPassed: false;
  receiptPersistence: "preview_filesystem_only_not_production_durable";
}>;

export class BookingPartyTeamGoPreviewProofValidationError extends Error {
  constructor() {
    super("Booking Party Team-GO preview proof validation failed");
    this.name = "BookingPartyTeamGoPreviewProofValidationError";
  }
}

export class BookingPartyTeamGoPreviewProofNotFoundError extends Error {
  constructor() {
    super("Booking Party Team-GO preview proof receipt not found");
    this.name = "BookingPartyTeamGoPreviewProofNotFoundError";
  }
}

export class BookingPartyTeamGoPreviewProofReplayConflictError extends Error {
  constructor() {
    super("Booking Party Team-GO preview proof replay conflict");
    this.name = "BookingPartyTeamGoPreviewProofReplayConflictError";
  }
}

export class BookingPartyTeamGoPreviewProofUnknownOutcomeError extends Error {
  constructor() {
    super("Booking Party Team-GO preview proof execution outcome is unknown");
    this.name = "BookingPartyTeamGoPreviewProofUnknownOutcomeError";
  }
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function assert(condition: unknown): asserts condition {
  if (!condition) throw new BookingPartyTeamGoPreviewProofValidationError();
}

function authorityBindings(authority: BookingPartyTeamGoAuthority) {
  return {
    actorBindingSha256: sha256(authority.actor.accountId),
    tenantBindingSha256: sha256(authority.actor.organizationId),
    exactSessionBindingSha256: sha256(
      JSON.stringify({
        issuerSha256: authority.proof.issuerSha256,
        clientIdSha256: authority.proof.clientIdSha256,
        subjectSha256: authority.proof.subjectSha256,
        verifiedEmailSha256: authority.proof.verifiedEmailSha256,
        authenticatedAt: authority.proof.authenticatedAt,
        assuranceLevel: authority.actor.assuranceLevel,
      }),
    ),
  };
}

function requestDigest(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  requestRevision: number,
) {
  return sha256(
    JSON.stringify({
      schema: proofSchema,
      version: "1.0.0",
      command: "rollback_only_golf_repository_proof",
      idempotencyKey,
      requestRevision,
      ...authorityBindings(authority),
    }),
  );
}

function runNonceDigest(idempotencyKey: string, requestRevision: number) {
  return sha256(
    JSON.stringify({
      schema: proofSchema,
      idempotencyKey,
      requestRevision,
      scope: "one_shot_rollback_only_golf_repository_proof",
    }),
  );
}

function publicResult(replayed: boolean): BookingPartyTeamGoRealSessionPreviewProofResult {
  return Object.freeze({
    schema: proofSchema,
    version: "1.0.0",
    status: "preview_rollback_pass",
    replayed,
    authorityProbe: "real_session_actor_authorized",
    transactionRolledBack: true,
    residualCountsEqual: true,
    rollbackGolfEvidenceObserved: true,
    golfSandboxEvidenceReady: false,
    marinaMembershipReady: false,
    marinaAdmissionReady: false,
    durableGolfWorkflowAuthorized: false,
    t3SandboxUnlocked: false,
    sandboxE2ePassed: false,
    productionPassed: false,
    receiptPersistence: "preview_filesystem_only_not_production_durable",
  });
}

async function readAuthorizationManifest(
  idempotencyKey: string,
  requestRevision: number,
  now: Date,
) {
  const metadata = await stat(authorizationManifestPath);
  assert((metadata.mode & 0o777) === 0o600 && metadata.isFile());
  const bytes = await readFile(authorizationManifestPath);
  let parsed: AuthorizationManifest;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as AuthorizationManifest;
  } catch {
    throw new BookingPartyTeamGoPreviewProofValidationError();
  }
  assert(
    parsed.schema === proofSchema &&
      parsed.version === "1.0.0" &&
      parsed.status === "AUTHORIZED" &&
      parsed.scope === "rollback_only_golf_repository_proof" &&
      parsed.oneVerifierRun === true &&
      parsed.realExactB2bSessionRequired === true &&
      parsed.actorTenantAalResolverRequired === true &&
      parsed.adultCount === 1 &&
      parsed.dependentMinorCount === 0 &&
      parsed.consentStatementVersion === consentVersion &&
      parsed.durableGolfWorkflowAuthorized === false &&
      parsed.marinaAuthorized === false &&
      parsed.databaseName === expectedTarget.databaseName &&
      parsed.databaseRoleSha256 === expectedTarget.databaseRoleSha256 &&
      parsed.endpointSha256 === expectedTarget.endpointSha256 &&
      parsed.serverVersionNum === expectedTarget.serverVersionNum &&
      parsed.neonBranchName === expectedTarget.neonBranchName &&
      parsed.neonBranchId === expectedTarget.neonBranchId &&
      parsed.allowedIdempotencyKeySha256 === sha256(idempotencyKey) &&
      parsed.allowedRunNonceSha256 ===
        runNonceDigest(idempotencyKey, requestRevision),
  );
  const expiresAt = new Date(parsed.expiresAt);
  assert(Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime());
  return Object.freeze({
    sha256: sha256(bytes),
    target: expectedTarget,
  });
}

function verifyRuntimeTargetBinding(manifest: Awaited<ReturnType<typeof readAuthorizationManifest>>) {
  const connectionString = process.env.CRAYS_DATABASE_URL?.trim() ?? "";
  assert(connectionString.length > 0);
  let target: URL;
  try {
    target = new URL(connectionString);
  } catch {
    throw new BookingPartyTeamGoPreviewProofValidationError();
  }
  assert(
    target.pathname.slice(1) === manifest.target.databaseName &&
      sha256(decodeURIComponent(target.username)) ===
        manifest.target.databaseRoleSha256 &&
      sha256(target.hostname) === manifest.target.endpointSha256 &&
      process.env.CRAYS_CLUBS_NEON_BRANCH_NAME?.trim() ===
        manifest.target.neonBranchName &&
      process.env.CRAYS_CLUBS_NEON_BRANCH_ID?.trim() === manifest.target.neonBranchId,
  );
}

async function verifyConnectedTarget(
  client: BookingPartyTeamGoClient,
  manifest: Awaited<ReturnType<typeof readAuthorizationManifest>>,
) {
  const result = await client.query<{
    database_name: string;
    database_role: string;
    server_version_num: string;
  }>(`select current_database() database_name,current_user database_role,
            current_setting('server_version_num') server_version_num`);
  assert(
    result.rows[0]?.database_name === manifest.target.databaseName &&
      sha256(result.rows[0]?.database_role ?? "") ===
        manifest.target.databaseRoleSha256 &&
      result.rows[0]?.server_version_num === manifest.target.serverVersionNum,
  );
}

function validateReceipt(
  value: unknown,
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  requestRevision: number | null,
): asserts value is SealedReceipt {
  assert(Boolean(value) && typeof value === "object" && !Array.isArray(value));
  const receipt = value as Partial<SealedReceipt>;
  const bindings = authorityBindings(authority);
  assert(
    receipt.schema === proofSchema &&
      receipt.version === "1.0.0" &&
      receipt.status === "PREVIEW_ROLLBACK_PASS" &&
      receipt.persistence === "preview_filesystem_evidence_only_not_vercel_durable" &&
      Number.isSafeInteger(receipt.requestRevision) &&
      Number(receipt.requestRevision) > 0 &&
      (requestRevision === null || receipt.requestRevision === requestRevision) &&
      receipt.requestSha256 ===
        requestDigest(authority, idempotencyKey, Number(receipt.requestRevision)) &&
      receipt.actorBindingSha256 === bindings.actorBindingSha256 &&
      receipt.tenantBindingSha256 === bindings.tenantBindingSha256 &&
      receipt.exactSessionBindingSha256 === bindings.exactSessionBindingSha256 &&
      isSha256(receipt.authorizationManifestSha256) &&
      receipt.structuralScope === "0251_repository_runtime_proof" &&
      receipt.adultCount === 1 &&
      receipt.dependentMinorCount === 0 &&
      receipt.personDecisionCount === 1 &&
      receipt.aggregateGoCount === 1 &&
      receipt.commandReceiptCount === 2 &&
      receipt.legacyPartyGoCount === 1 &&
      receipt.rollbackGolfEvidenceObserved === true &&
      receipt.golfSandboxEvidenceReady === false &&
      receipt.marinaMembershipReady === false &&
      receipt.marinaAdmissionReady === false &&
      receipt.transactionRolledBack === true &&
      receipt.residualCountsEqual === true &&
      receipt.fixtureSpecificResidualAbsent === true &&
      receipt.replayVerified === true &&
      receipt.payloadDriftConflictVerified === true &&
      receipt.durableGolfWorkflowAuthorized === false &&
      receipt.t3SandboxUnlocked === false &&
      receipt.sandboxE2ePassed === false &&
      receipt.productionPassed === false &&
      typeof receipt.createdAt === "string" &&
      Number.isFinite(new Date(receipt.createdAt).getTime()),
  );
}

async function readExistingReceipt(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  requestRevision: number | null,
) {
  const target = receiptFilePath;
  let metadata;
  let bytes;
  try {
    [metadata, bytes] = await Promise.all([stat(target), readFile(target)]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if ((metadata.mode & 0o777) !== 0o600 || !metadata.isFile()) {
    throw new BookingPartyTeamGoPreviewProofReplayConflictError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
    validateReceipt(parsed, authority, idempotencyKey, requestRevision);
  } catch {
    throw new BookingPartyTeamGoPreviewProofReplayConflictError();
  }
  return parsed;
}

async function publishReceiptAtomically(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  requestRevision: number,
  receipt: SealedReceipt,
) {
  const target = receiptFilePath;
  const temporary = path.join(
    receiptDirectory,
    `.CCLUB_T2_0251_REAL_SESSION_${randomUUID()}.tmp`,
  );
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(receipt)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  let published = true;
  try {
    await link(temporary, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readExistingReceipt(
      authority,
      idempotencyKey,
      requestRevision,
    );
    if (!existing) throw new BookingPartyTeamGoPreviewProofReplayConflictError();
    published = false;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
  const metadata = await stat(target);
  assert((metadata.mode & 0o777) === 0o600 && metadata.isFile());
  return published;
}

async function executionMarkerExists() {
  try {
    const metadata = await stat(executionMarkerPath);
    assert(metadata.isFile() && (metadata.mode & 0o777) === 0o600);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function acquireExecutionMarker(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  requestRevision: number,
  authorizationManifestSha256: string,
  now: Date,
) {
  const bindings = authorityBindings(authority);
  let handle;
  try {
    handle = await open(executionMarkerPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const receipt = await readExistingReceipt(
      authority,
      idempotencyKey,
      requestRevision,
    );
    if (receipt) return "replay" as const;
    throw new BookingPartyTeamGoPreviewProofUnknownOutcomeError();
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({
        schema: `${proofSchema}.execution-marker`,
        version: "1.0.0",
        status: "EXECUTION_SLOT_ACQUIRED",
        persistence: "local_xxl_preview_filesystem_only",
        requestSha256: requestDigest(authority, idempotencyKey, requestRevision),
        actorBindingSha256: bindings.actorBindingSha256,
        tenantBindingSha256: bindings.tenantBindingSha256,
        exactSessionBindingSha256: bindings.exactSessionBindingSha256,
        authorizationManifestSha256,
        acquiredAt: now.toISOString(),
      })}\n`,
      "utf8",
    );
    await handle.sync();
  } finally {
    await handle.close();
  }
  const metadata = await stat(executionMarkerPath);
  assert(metadata.isFile() && (metadata.mode & 0o777) === 0o600);
  return "acquired" as const;
}

async function readCounts(client: BookingPartyTeamGoClient): Promise<ProofCounts> {
  const result = await client.query<ProofCounts>(`select
    (select count(*)::int from crays_core.clubs_booking_party_team_person_decision_evidence) decisions,
    (select count(*)::int from crays_core.clubs_booking_party_team_go_evidence) aggregates,
    (select count(*)::int from crays_core.clubs_booking_party_team_go_command_receipts) commands,
    (select count(*)::int from crays_core.clubs_booking_membership_party_go_receipts) "legacyGo",
    (select count(*)::int from crays_core.clubs_member_memberships) memberships,
    (select count(*)::int from crays_core.clubs_property_admission_grants) admissions`);
  assert(Boolean(result.rows[0]));
  return result.rows[0]!;
}

function sameCounts(left: ProofCounts, right: ProofCounts) {
  return (
    left.decisions === right.decisions &&
    left.aggregates === right.aggregates &&
    left.commands === right.commands &&
    left.legacyGo === right.legacyGo &&
    left.memberships === right.memberships &&
    left.admissions === right.admissions
  );
}

async function insertRollbackFixture(client: BookingPartyTeamGoClient): Promise<Fixture> {
  const reviewer = await client.query<{ binding_id: string }>(`select binding_id
    from crays_core.clubs_direct_membership_application_reviewer_bindings binding
    left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations revocation
      on revocation.binding_id=binding.binding_id
    where binding.route_key='direct-membership-application'
      and binding.valid_from<=transaction_timestamp()
      and (binding.expires_at is null or binding.expires_at>transaction_timestamp())
      and revocation.binding_id is null
    order by binding.valid_from desc limit 1`);
  assert(Boolean(reviewer.rows[0]));

  const nonce = randomUUID();
  const accountId = `clubs-t2-preview-account_${nonce}`;
  const applicationId = `clubs-direct-membership-application_${randomUUID()}`;
  const handoffId = `clubs-booking-membership-handoff_${randomUUID()}`;
  const bookingApplicationId = `clubs-booking-membership-application_${randomUUID()}`;
  const partyMemberId = `clubs-booking-membership-party_${randomUUID()}`;
  const identityId = `clubs-t2-preview-auth_${nonce}`;

  await client.query("set constraints all deferred");
  await client.query(
    `insert into crays_core.crays_accounts
      (account_id,crays_id,display_name,primary_contact,primary_contact_type,
       default_role,status)
     values ($1,$2,'T2 Preview Fixture',null,'contact','gym-member','active')`,
    [accountId, `clubs-t2-preview-crays-id_${nonce}`],
  );
  await client.query(
    `insert into crays_core.auth_identities
      (identity_id,account_id,method_type,provider_key,provider_subject,verified)
     values ($1,$2,'social','auth0',$3,true)`,
    [
      identityId,
      accountId,
      `auth0|clubs-t2-preview-member-${nonce}`,
    ],
  );
  await client.query(
    `insert into crays_core.clubs_direct_membership_applications
      (application_id,account_id,assigned_reviewer_binding_id,
       applicant_payload,account_email_snapshot_sha256,
       consent_statement_version,consent_at,status,submitted_at,updated_at)
     values ($1,$2,$3,$4::jsonb,$5,$6,transaction_timestamp(),'submitted',
       transaction_timestamp(),transaction_timestamp())`,
    [
      applicationId,
      accountId,
      reviewer.rows[0]!.binding_id,
      JSON.stringify({ source: "t2_preview_rollback_fixture" }),
      sha256(`preview-contact:${nonce}`),
      consentVersion,
    ],
  );
  await client.query(
    `insert into crays_core.clubs_booking_membership_application_handoffs
      (handoff_id,account_id,property_id,resume_token_digest,intent_sha256,
       intent_payload,return_to,date_mode,stay_unit,adult_count,
       dependent_minor_count,pet_count,state,expiry_policy_receipt_id,expires_at)
     values ($1,$2,'property-clubs-forest-city-golf',$3,$4,$5::jsonb,
       '/en/account','exact','night',1,0,0,'submitted',
       'CCLUB-BOOKING-MEMBERSHIP-RESUME-EXPIRY-V1',
       transaction_timestamp()+interval '1 day')`,
    [
      handoffId,
      accountId,
      sha256(`resume:${handoffId}`),
      sha256(`intent:${handoffId}`),
      JSON.stringify({ source: "t2_preview_rollback_fixture" }),
    ],
  );
  await client.query(
    `insert into crays_core.clubs_booking_membership_direct_applications
      (application_id,handoff_id,account_id,assigned_reviewer_binding_id,
       applicant_payload,consent_statement_version,consent_at,status,
       submitted_at,updated_at)
     values ($1,$2,$3,$4,$5::jsonb,$6,transaction_timestamp(),'team_review',
       transaction_timestamp(),transaction_timestamp())`,
    [
      bookingApplicationId,
      handoffId,
      accountId,
      reviewer.rows[0]!.binding_id,
      JSON.stringify({ source: "t2_preview_rollback_fixture" }),
      consentVersion,
    ],
  );
  await client.query(
    `update crays_core.clubs_booking_membership_application_handoffs
        set direct_application_id=$2 where handoff_id=$1`,
    [handoffId, bookingApplicationId],
  );
  await client.query(
    `insert into crays_core.clubs_booking_membership_application_party_members
      (party_member_id,handoff_id,party_order,party_role,account_id,
       direct_application_id,identity_state,consent_statement_version,
       consent_at,status)
     values ($1,$2,1,'primary_applicant',$3,$4,'ready',$5,
       transaction_timestamp(),'under_review')`,
    [partyMemberId, handoffId, accountId, bookingApplicationId, consentVersion],
  );
  return {
    accountId,
    identityId,
    applicationId,
    handoffId,
    bookingApplicationId,
    partyMemberId,
  };
}

async function assertFixtureAbsent(
  client: BookingPartyTeamGoClient,
  fixture: Fixture,
) {
  const result = await client.query<{ residual_count: number }>(`select (
      (select count(*) from crays_core.crays_accounts where account_id=$1) +
      (select count(*) from crays_core.auth_identities where identity_id=$2) +
      (select count(*) from crays_core.clubs_direct_membership_applications where application_id=$3) +
      (select count(*) from crays_core.clubs_booking_membership_application_handoffs where handoff_id=$4) +
      (select count(*) from crays_core.clubs_booking_membership_direct_applications where application_id=$5) +
      (select count(*) from crays_core.clubs_booking_membership_application_party_members where party_member_id=$6) +
      (select count(*) from crays_core.clubs_booking_party_team_person_decision_evidence where handoff_id=$4) +
      (select count(*) from crays_core.clubs_booking_party_team_go_evidence where handoff_id=$4) +
      (select count(*) from crays_core.clubs_booking_party_team_go_command_receipts where handoff_id=$4) +
      (select count(*) from crays_core.clubs_booking_membership_party_go_receipts where handoff_id=$4)
    )::int residual_count`, [
    fixture.accountId,
    fixture.identityId,
    fixture.applicationId,
    fixture.handoffId,
    fixture.bookingApplicationId,
    fixture.partyMemberId,
  ]);
  assert(result.rows[0]?.residual_count === 0);
}

async function recordApprovedPerson(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  fixture: Fixture,
  idempotencyKey: string,
  now: Date,
) {
  const command = {
    type: "record_person_decision" as const,
    handoffId: fixture.handoffId,
    partyMemberId: fixture.partyMemberId,
    applicationId: fixture.applicationId,
    expectedPartyVersion: 1,
    expectedApplicationVersion: 1,
    expectedDecisionVersion: 0,
    outcome: "approved_for_membership_payment" as const,
    reasonCode: "membership_requirements_satisfied" as const,
  };
  const first = await executeBookingPartyTeamGoWithClient(
    client,
    authority,
    `${idempotencyKey}:person`,
    command,
    now,
  );
  assert(first.replayed === false);
  const replay = await executeBookingPartyTeamGoWithClient(
    client,
    authority,
    `${idempotencyKey}:person`,
    command,
    now,
  );
  assert(replay.replayed === true);
  let conflict = false;
  try {
    await executeBookingPartyTeamGoWithClient(
      client,
      authority,
      `${idempotencyKey}:person`,
      {
        ...command,
        outcome: "declined",
        reasonCode: "membership_requirements_not_satisfied",
      },
      now,
    );
  } catch (error) {
    conflict = error instanceof BookingPartyTeamGoReplayConflictError;
  }
  assert(conflict);
}

async function issueAggregateGo(
  client: BookingPartyTeamGoClient,
  authority: BookingPartyTeamGoAuthority,
  fixture: Fixture,
  idempotencyKey: string,
  now: Date,
) {
  const status = await readBookingPartyTeamGoStatusWithClient(
    client,
    authority,
    fixture.handoffId,
    now,
  );
  assert(status.aggregateGoReady === true);
  const command = {
    type: "issue_aggregate_go" as const,
    handoffId: fixture.handoffId,
    expectedHandoffVersion: status.handoffVersion,
    expectedPartySnapshotSha256: status.partySnapshotSha256,
    expectedDecisionSnapshotSha256: status.decisionSnapshotSha256,
  };
  const first = await executeBookingPartyTeamGoWithClient(
    client,
    authority,
    `${idempotencyKey}:aggregate`,
    command,
    now,
  );
  assert(
    first.replayed === false &&
      "golfSandboxEvidenceReady" in first &&
      "marinaMembershipReady" in first &&
      "marinaAdmissionReady" in first &&
      first.golfSandboxEvidenceReady === true &&
      first.marinaMembershipReady === false &&
      first.marinaAdmissionReady === false,
  );
  const replay = await executeBookingPartyTeamGoWithClient(
    client,
    authority,
    `${idempotencyKey}:aggregate`,
    command,
    now,
  );
  assert(replay.replayed === true);
  let conflict = false;
  try {
    await executeBookingPartyTeamGoWithClient(
      client,
      authority,
      `${idempotencyKey}:aggregate`,
      { ...command, expectedPartySnapshotSha256: sha256("payload-drift") },
      now,
    );
  } catch (error) {
    conflict = error instanceof BookingPartyTeamGoReplayConflictError;
  }
  assert(conflict);
}

async function assertGolfEvidence(client: BookingPartyTeamGoClient, fixture: Fixture) {
  const evidence = await client.query(`select 1
    from crays_core.clubs_booking_membership_party_go_receipts go_receipt
    join crays_core.clubs_booking_membership_application_handoffs handoff
      on handoff.handoff_id=go_receipt.handoff_id
    join crays_core.clubs_booking_party_team_go_evidence team_evidence
      on team_evidence.party_go_receipt_id=go_receipt.party_go_receipt_id
    where handoff.handoff_id=$1
      and handoff.property_id='property-clubs-forest-city-golf'
      and handoff.state='approved_for_membership_payment'
      and go_receipt.outcome='approved_for_membership_payment'
      and team_evidence.golf_sandbox_evidence_authorized is true`, [
    fixture.handoffId,
  ]);
  assert(evidence.rows.length === 1);
}

export async function probeBookingPartyTeamGoRealSessionAuthority(
  authority: BookingPartyTeamGoAuthority,
  now = new Date(),
) {
  const client = (await getCorePgPool().connect()) as ProofClient;
  try {
    await client.query("begin read only");
    try {
      await readBookingPartyTeamGoStatusWithClient(
        client,
        authority,
        `clubs-booking-membership-handoff_${randomUUID()}`,
        now,
      );
      throw new BookingPartyTeamGoPreviewProofValidationError();
    } catch (error) {
      if (!(error instanceof BookingPartyTeamGoNotFoundError)) throw error;
    }
    await client.query("rollback");
    return Object.freeze({
      schema: proofSchema,
      version: "1.0.0" as const,
      status: "real_session_actor_authorized" as const,
      proofMethod: "repository_not_found_after_authority_assertion" as const,
    });
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function reconcileBookingPartyTeamGoRealSessionPreviewProof(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
) {
  const receipt = await readExistingReceipt(authority, idempotencyKey, null);
  if (!receipt) {
    if (await executionMarkerExists()) {
      throw new BookingPartyTeamGoPreviewProofUnknownOutcomeError();
    }
    throw new BookingPartyTeamGoPreviewProofNotFoundError();
  }
  return publicResult(true);
}

export async function runBookingPartyTeamGoRealSessionPreviewProof(
  authority: BookingPartyTeamGoAuthority,
  idempotencyKey: string,
  requestRevision: number,
  now = new Date(),
) {
  assert(Number.isSafeInteger(requestRevision) && requestRevision > 0);
  const replay = await readExistingReceipt(
    authority,
    idempotencyKey,
    requestRevision,
  );
  if (replay) return publicResult(true);
  const authorizationManifest = await readAuthorizationManifest(
    idempotencyKey,
    requestRevision,
    now,
  );
  verifyRuntimeTargetBinding(authorizationManifest);
  const slot = await acquireExecutionMarker(
    authority,
    idempotencyKey,
    requestRevision,
    authorizationManifest.sha256,
    now,
  );
  if (slot === "replay") return publicResult(true);
  const client = (await getCorePgPool().connect()) as ProofClient;
  let baseline: ProofCounts | null = null;
  let fixture: Fixture | null = null;
  let proofPassed = false;
  try {
    await verifyConnectedTarget(client, authorizationManifest);
    await client.query("begin");
    baseline = await readCounts(client);
    fixture = await insertRollbackFixture(client);
    await recordApprovedPerson(client, authority, fixture, idempotencyKey, now);
    await issueAggregateGo(client, authority, fixture, idempotencyKey, now);
    await assertGolfEvidence(client, fixture);
    const during = await readCounts(client);
    assert(
      during.decisions === baseline.decisions + 1 &&
        during.aggregates === baseline.aggregates + 1 &&
        during.commands === baseline.commands + 2 &&
        during.legacyGo === baseline.legacyGo + 1 &&
        during.memberships === baseline.memberships &&
        during.admissions === baseline.admissions,
    );
    proofPassed = true;
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
  assert(proofPassed && baseline !== null && fixture !== null);
  try {
    await client.query("begin read only");
    const residual = await readCounts(client);
    assert(sameCounts(residual, baseline));
    await assertFixtureAbsent(client, fixture);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const bindings = authorityBindings(authority);
  const receipt: SealedReceipt = {
    schema: proofSchema,
    version: "1.0.0",
    status: "PREVIEW_ROLLBACK_PASS",
    persistence: "preview_filesystem_evidence_only_not_vercel_durable",
    requestSha256: requestDigest(authority, idempotencyKey, requestRevision),
    requestRevision,
    ...bindings,
    authorizationManifestSha256: authorizationManifest.sha256,
    structuralScope: "0251_repository_runtime_proof",
    adultCount: 1,
    dependentMinorCount: 0,
    personDecisionCount: 1,
    aggregateGoCount: 1,
    commandReceiptCount: 2,
    legacyPartyGoCount: 1,
    rollbackGolfEvidenceObserved: true,
    golfSandboxEvidenceReady: false,
    marinaMembershipReady: false,
    marinaAdmissionReady: false,
    transactionRolledBack: true,
    residualCountsEqual: true,
    fixtureSpecificResidualAbsent: true,
    replayVerified: true,
    payloadDriftConflictVerified: true,
    durableGolfWorkflowAuthorized: false,
    t3SandboxUnlocked: false,
    sandboxE2ePassed: false,
    productionPassed: false,
    createdAt: now.toISOString(),
  };
  const published = await publishReceiptAtomically(
    authority,
    idempotencyKey,
    requestRevision,
    receipt,
  );
  return publicResult(!published);
}
