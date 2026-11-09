import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT,
  CLUBS_AMBASSADOR_ENTITLEMENT_DENIED_AUTHORITIES,
  type ClubsAmbassadorB2bBootstrapEvidence,
  type ClubsAmbassadorCurrentEntitlement,
  type ClubsAmbassadorEntitlementIssueResult,
  type ClubsAmbassadorEntitlementKey,
  type ClubsAmbassadorScopedAuthorizationResult,
  type ClubsAmbassadorScopedResourceKind,
} from "@/lib/clubs/ambassador-b2b-entitlement-contract";

export type ClubsAmbassadorB2bEntitlementClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
  release(): void;
};

export type ClubsAmbassadorB2bEntitlementPool = {
  connect(): Promise<ClubsAmbassadorB2bEntitlementClient>;
};

type ActivationRow = {
  activation_pass_receipt_id: string;
  public_ambassador_slug: string;
  pending_entitlement_plan: ClubsAmbassadorEntitlementKey;
  subject_sha256: string;
  exact_match: boolean;
  b2c_rejected: boolean;
};

type EntitlementReplayRow = {
  entitlement_issue_receipt_id: string;
  account_binding_receipt_id: string;
  public_ambassador_slug: string;
  entitlement_key: ClubsAmbassadorEntitlementKey;
  subject_sha256: string;
  request_sha256: string;
  issued_at: Date | string;
};

type ActiveEntitlementRow = {
  account_binding_receipt_id: string;
  entitlement_issue_receipt_id: string;
  entitlement_key: ClubsAmbassadorEntitlementKey;
  public_ambassador_slug: string;
};

type OwnershipRow = {
  account_binding_receipt_id: string;
};

export class ClubsAmbassadorB2bEntitlementValidationError extends Error {
  constructor(message = "invalid_b2b_entitlement_request") {
    super(message);
    this.name = "ClubsAmbassadorB2bEntitlementValidationError";
  }
}

export class ClubsAmbassadorB2bEntitlementAuthorityError extends Error {
  constructor(message = "b2b_entitlement_authority_denied") {
    super(message);
    this.name = "ClubsAmbassadorB2bEntitlementAuthorityError";
  }
}

export class ClubsAmbassadorB2bEntitlementNotFoundError extends Error {
  constructor(message = "b2b_entitlement_not_found") {
    super(message);
    this.name = "ClubsAmbassadorB2bEntitlementNotFoundError";
  }
}

export class ClubsAmbassadorB2bEntitlementConflictError extends Error {
  constructor(message = "b2b_entitlement_conflict") {
    super(message);
    this.name = "ClubsAmbassadorB2bEntitlementConflictError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function validateIdempotencyKey(value: string) {
  if (
    value.length < 16 ||
    value.length > 200 ||
    !/^[A-Za-z0-9:_.-]+$/.test(value)
  ) {
    throw new ClubsAmbassadorB2bEntitlementValidationError(
      "invalid_idempotency_key",
    );
  }
}

function validateActivationPassReceiptId(value: string) {
  if (!/^clubs-ambassador-activation-pass_[0-9a-f-]{36}$/.test(value)) {
    throw new ClubsAmbassadorB2bEntitlementValidationError(
      "invalid_activation_pass_context",
    );
  }
}

function validateEvidence(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  now = new Date(),
) {
  const authenticatedAt = new Date(evidence.authenticatedAt);
  const age = now.getTime() - authenticatedAt.getTime();
  if (
    evidence.proofSchema !== "crays.clubs.b2b-entitlement-bootstrap.v1" ||
    evidence.authoritySource !== "exact_crays_pro_b2b_bootstrap" ||
    evidence.exactVerifiedCraysProB2bLogin !== true ||
    evidence.b2cRejected !== true ||
    !/^[0-9a-f]{64}$/.test(evidence.subjectSha256) ||
    !evidence.accountId ||
    !evidence.organizationId ||
    !/^tenant_session_[A-Za-z0-9_-]{16,180}$/.test(evidence.tenantSessionId) ||
    Number.isNaN(authenticatedAt.getTime()) ||
    age < -5_000 ||
    age > 300_000
  ) {
    throw new ClubsAmbassadorB2bEntitlementAuthorityError(
      "fresh_exact_crays_pro_b2b_bootstrap_required",
    );
  }
}

function validateResource(
  resourceKind: ClubsAmbassadorScopedResourceKind,
  opaqueResourceReference: string,
) {
  if (
    !CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.resourceKinds.includes(
      resourceKind,
    ) ||
    opaqueResourceReference.length < 8 ||
    opaqueResourceReference.length > 240 ||
    !/^[A-Za-z0-9:_.-]+$/.test(opaqueResourceReference)
  ) {
    throw new ClubsAmbassadorB2bEntitlementValidationError(
      "invalid_scoped_resource_reference",
    );
  }
}

async function setCoreTenantRole(
  client: ClubsAmbassadorB2bEntitlementClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function assertExactActiveBootstrap(
  client: ClubsAmbassadorB2bEntitlementClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  subjectSha256: string,
) {
  const result = await client.query<{ ready: boolean }>(
    `select true ready
       from crays_core.auth_identities identity
       join crays_core.crays_accounts account
         on account.account_id=identity.account_id
        and account.status='active'
       join crays_core.tenant_sessions session
         on session.session_id=$3
        and session.account_id=account.account_id
        and session.organization_id=$2
        and session.status='active'
        and session.expires_at>now()
        and session.account_security_version=account.security_version
       join crays_core.organization_memberships membership
         on membership.account_id=session.account_id
        and membership.organization_id=session.organization_id
        and membership.role_key=session.role_key
        and membership.status='active'
       join crays_core.role_assignments assignment
         on assignment.account_id=membership.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.organizations organization
         on organization.organization_id=session.organization_id
        and organization.status='active'
      where identity.account_id=$1
        and identity.provider_key='auth0'
        and identity.verified=true
        and encode(sha256(convert_to(identity.provider_subject,'UTF8')),'hex')=$4
      limit 2`,
    [
      evidence.accountId,
      evidence.organizationId,
      evidence.tenantSessionId,
      subjectSha256,
    ],
  );
  if (result.rows.length !== 1 || !result.rows[0]?.ready) {
    throw new ClubsAmbassadorB2bEntitlementAuthorityError(
      "exact_active_account_tenant_binding_required",
    );
  }
}

async function assertRegistryProfile(
  client: ClubsAmbassadorB2bEntitlementClient,
  organizationId: string,
  publicAmbassadorSlug: string,
) {
  const profileId = `ambassador_profile_${publicAmbassadorSlug.replaceAll("-", "_")}`;
  const result = await client.query<{ ready: boolean }>(
    `select true ready
       from crays_core.clubs_ambassador_registry_current registry
      where registry.ambassador_profile_id=$1
        and registry.organization_id=$2
        and registry.status='active'
      limit 1`,
    [profileId, organizationId],
  );
  if (!result.rows[0]?.ready) {
    throw new ClubsAmbassadorB2bEntitlementAuthorityError(
      "active_ambassador_registry_profile_required",
    );
  }
  return profileId;
}

function requestSha256(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  activationPassReceiptId: string,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.schema,
      accountId: evidence.accountId,
      organizationId: evidence.organizationId,
      tenantSessionId: evidence.tenantSessionId,
      subjectSha256: evidence.subjectSha256,
      activationPassReceiptId,
      idempotencyKey,
    }),
  );
}

function mapIssueResult(
  row: EntitlementReplayRow,
  status: "issued" | "replayed",
): ClubsAmbassadorEntitlementIssueResult {
  return {
    schema: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.version,
    status,
    entitlementIssueReceiptId: row.entitlement_issue_receipt_id,
    accountBindingReceiptId: row.account_binding_receipt_id,
    entitlement: row.entitlement_key,
    accountActive: true,
    entitlementActive: true,
    passwordCreated: false,
    inviteSent: false,
    authorities: CLUBS_AMBASSADOR_ENTITLEMENT_DENIED_AUTHORITIES,
    issuedAt: iso(row.issued_at),
  };
}

export async function issueClubsAmbassadorB2bEntitlementWithClient(
  client: ClubsAmbassadorB2bEntitlementClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  activationPassReceiptId: string,
  now = new Date(),
): Promise<ClubsAmbassadorEntitlementIssueResult> {
  validateEvidence(evidence, now);
  validateIdempotencyKey(idempotencyKey);
  validateActivationPassReceiptId(activationPassReceiptId);
  await setCoreTenantRole(client, evidence.organizationId);
  const requestSha = requestSha256(
    evidence,
    idempotencyKey,
    activationPassReceiptId,
  );
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [
    `clubs-b2b-entitlement:${evidence.accountId}`,
  ]);

  const replay = await client.query<EntitlementReplayRow>(
    `select entitlement_issue_receipt_id,account_binding_receipt_id,
            public_ambassador_slug,entitlement_key,subject_sha256,
            request_sha256,issued_at
       from crays_core.clubs_ambassador_entitlement_issue_receipts
      where idempotency_key=$1
      limit 1`,
    [idempotencyKey],
  );
  if (replay.rows[0]) {
    if (
      replay.rows[0].request_sha256 !== requestSha ||
      replay.rows[0].subject_sha256 !== evidence.subjectSha256
    ) {
      throw new ClubsAmbassadorB2bEntitlementConflictError(
        "idempotency_replay_conflict",
      );
    }
    return mapIssueResult(replay.rows[0], "replayed");
  }

  const activation = await client.query<ActivationRow>(
    `select activation_pass_receipt_id,public_ambassador_slug,
            pending_entitlement_plan,subject_sha256,exact_match,b2c_rejected
       from crays_core.clubs_ambassador_activation_pass_receipts
      where activation_pass_receipt_id=$1
      for share`,
    [activationPassReceiptId],
  );
  const activationRow = activation.rows[0];
  if (!activationRow) {
    throw new ClubsAmbassadorB2bEntitlementNotFoundError(
      "activation_pass_not_found",
    );
  }
  if (
    activationRow.exact_match !== true ||
    activationRow.b2c_rejected !== true ||
    activationRow.subject_sha256 !== evidence.subjectSha256
  ) {
    throw new ClubsAmbassadorB2bEntitlementAuthorityError(
      "activation_pass_subject_mismatch",
    );
  }

  await assertExactActiveBootstrap(
    client,
    evidence,
    activationRow.subject_sha256,
  );
  const ambassadorProfileId = await assertRegistryProfile(
    client,
    evidence.organizationId,
    activationRow.public_ambassador_slug,
  );

  const entitlementIssueReceiptId =
    `clubs-ambassador-entitlement-issue_${randomUUID()}`;
  const accountBindingReceiptId = `clubs-account-binding_${randomUUID()}`;
  const safeResponseMaterial = {
    entitlementIssueReceiptId,
    accountBindingReceiptId,
    entitlement: activationRow.pending_entitlement_plan,
    accountActive: true,
    entitlementActive: true,
    passwordCreated: false,
    inviteSent: false,
    issuedAt: now.toISOString(),
  };
  const responseSha = sha256(JSON.stringify(safeResponseMaterial));
  const bindingSha = sha256(
    JSON.stringify({
      ...safeResponseMaterial,
      accountId: evidence.accountId,
      organizationId: evidence.organizationId,
      tenantSessionId: evidence.tenantSessionId,
      ambassadorProfileId,
      subjectSha256: evidence.subjectSha256,
    }),
  );

  await client.query(
    `insert into crays_core.clubs_ambassador_entitlement_issue_receipts (
       entitlement_issue_receipt_id,activation_pass_receipt_id,
       public_ambassador_slug,entitlement_key,account_binding_receipt_id,
       subject_sha256,exact_active_account_binding,exact_subject_binding,
       account_active_at_issue,entitlement_active,issued_by_account_id,
       idempotency_key,request_sha256,response_sha256,issued_at
     ) values (
       $1,$2,$3,$4,$5,$6,true,true,true,true,$7,$8,$9,$10,$11
     )`,
    [
      entitlementIssueReceiptId,
      activationPassReceiptId,
      activationRow.public_ambassador_slug,
      activationRow.pending_entitlement_plan,
      accountBindingReceiptId,
      evidence.subjectSha256,
      evidence.accountId,
      idempotencyKey,
      requestSha,
      responseSha,
      now.toISOString(),
    ],
  );

  await client.query(
    `insert into crays_core.clubs_ambassador_b2b_entitlement_account_receipts (
       account_binding_receipt_id,entitlement_issue_receipt_id,
       activation_pass_receipt_id,account_id,organization_id,
       tenant_session_id,ambassador_profile_id,public_ambassador_slug,
       entitlement_key,subject_sha256,exact_activation_pass_binding,
       exact_subject_binding,exact_active_account_binding,
       exact_active_tenant_binding,b2c_rejected,account_active,
       entitlement_active,binding_receipt_sha256,issued_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
       true,true,true,true,true,true,true,$11,$12
     )`,
    [
      accountBindingReceiptId,
      entitlementIssueReceiptId,
      activationPassReceiptId,
      evidence.accountId,
      evidence.organizationId,
      evidence.tenantSessionId,
      ambassadorProfileId,
      activationRow.public_ambassador_slug,
      activationRow.pending_entitlement_plan,
      evidence.subjectSha256,
      bindingSha,
      now.toISOString(),
    ],
  );

  return mapIssueResult(
    {
      entitlement_issue_receipt_id: entitlementIssueReceiptId,
      account_binding_receipt_id: accountBindingReceiptId,
      public_ambassador_slug: activationRow.public_ambassador_slug,
      entitlement_key: activationRow.pending_entitlement_plan,
      subject_sha256: evidence.subjectSha256,
      request_sha256: requestSha,
      issued_at: now,
    },
    "issued",
  );
}

async function resolveActiveEntitlement(
  client: ClubsAmbassadorB2bEntitlementClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
): Promise<ActiveEntitlementRow> {
  validateEvidence(evidence);
  await setCoreTenantRole(client, evidence.organizationId);
  const result = await client.query<ActiveEntitlementRow>(
    `select binding.account_binding_receipt_id,
            binding.entitlement_issue_receipt_id,binding.entitlement_key,
            binding.public_ambassador_slug
       from crays_core.clubs_ambassador_b2b_entitlement_account_receipts binding
       join crays_core.clubs_ambassador_entitlement_issue_receipts issue
         on issue.entitlement_issue_receipt_id=binding.entitlement_issue_receipt_id
        and issue.entitlement_active=true
       join crays_core.clubs_ambassador_activation_pass_receipts activation
         on activation.activation_pass_receipt_id=binding.activation_pass_receipt_id
        and activation.subject_sha256=$4
        and activation.exact_match=true
        and activation.b2c_rejected=true
       join crays_core.crays_accounts account
         on account.account_id=binding.account_id
        and account.status='active'
       join crays_core.tenant_sessions session
         on session.session_id=$3
        and session.account_id=binding.account_id
        and session.organization_id=binding.organization_id
        and session.status='active'
        and session.expires_at>now()
        and session.account_security_version=account.security_version
       join crays_core.organization_memberships membership
         on membership.account_id=session.account_id
        and membership.organization_id=session.organization_id
        and membership.role_key=session.role_key
        and membership.status='active'
       join crays_core.role_assignments assignment
         on assignment.account_id=membership.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
      where binding.account_id=$1
        and binding.organization_id=$2
        and binding.subject_sha256=$4
        and binding.entitlement_active=true
      limit 2`,
    [
      evidence.accountId,
      evidence.organizationId,
      evidence.tenantSessionId,
      evidence.subjectSha256,
    ],
  );
  if (result.rows.length !== 1) {
    throw new ClubsAmbassadorB2bEntitlementAuthorityError(
      "active_b2b_entitlement_binding_required",
    );
  }
  return result.rows[0];
}

export async function readCurrentClubsAmbassadorEntitlementWithClient(
  client: ClubsAmbassadorB2bEntitlementClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
): Promise<ClubsAmbassadorCurrentEntitlement> {
  const binding = await resolveActiveEntitlement(client, evidence);
  return {
    schema: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.version,
    status: "ready",
    entitlement: binding.entitlement_key,
    accountActive: true,
    entitlementActive: true,
    fullAccessActive:
      binding.entitlement_key === "CLUBS_SAAS_FULL_ACCESS",
    scopedAccessActive:
      binding.entitlement_key === "AMBASSADOR_SCOPED_ACCESS",
    authorities: CLUBS_AMBASSADOR_ENTITLEMENT_DENIED_AUTHORITIES,
  };
}

export async function authorizeClubsAmbassadorScopedResourceWithClient(
  client: ClubsAmbassadorB2bEntitlementClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  resourceKind: ClubsAmbassadorScopedResourceKind,
  opaqueResourceReference: string,
): Promise<ClubsAmbassadorScopedAuthorizationResult> {
  validateResource(resourceKind, opaqueResourceReference);
  const binding = await resolveActiveEntitlement(client, evidence);
  if (binding.entitlement_key === "CLUBS_SAAS_FULL_ACCESS") {
    return {
      status: "allowed",
      scope: "full_access",
      httpStatus: 200,
      foreignIdentifiersExposed: false,
    };
  }

  const resourceSha = sha256(opaqueResourceReference);
  const ownership = await client.query<OwnershipRow>(
    `select account_binding_receipt_id
       from crays_core.clubs_ambassador_scoped_resource_ownership_receipts
      where organization_id=$1
        and resource_kind=$2
        and resource_reference_sha256=$3
      limit 2`,
    [evidence.organizationId, resourceKind, resourceSha],
  );
  if (ownership.rows.length === 0) {
    return {
      status: "ownership_not_found",
      httpStatus: 404,
      foreignIdentifiersExposed: false,
    };
  }
  if (
    ownership.rows.length !== 1 ||
    ownership.rows[0].account_binding_receipt_id !==
      binding.account_binding_receipt_id
  ) {
    return {
      status: "cross_ambassador_denied",
      httpStatus: 403,
      foreignIdentifiersExposed: false,
    };
  }
  return {
    status: "allowed",
    scope: "owned_scoped_access",
    httpStatus: 200,
    foreignIdentifiersExposed: false,
  };
}

async function withTransaction<T>(
  pool: ClubsAmbassadorB2bEntitlementPool,
  operation: (client: ClubsAmbassadorB2bEntitlementClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
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

export async function issueClubsAmbassadorB2bEntitlementWithPool(
  pool: ClubsAmbassadorB2bEntitlementPool,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  activationPassReceiptId: string,
) {
  return withTransaction(pool, (client) =>
    issueClubsAmbassadorB2bEntitlementWithClient(
      client,
      evidence,
      idempotencyKey,
      activationPassReceiptId,
    ),
  );
}

export async function readCurrentClubsAmbassadorEntitlementWithPool(
  pool: ClubsAmbassadorB2bEntitlementPool,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
) {
  return withTransaction(pool, (client) =>
    readCurrentClubsAmbassadorEntitlementWithClient(client, evidence),
  );
}

export async function authorizeClubsAmbassadorScopedResourceWithPool(
  pool: ClubsAmbassadorB2bEntitlementPool,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  resourceKind: ClubsAmbassadorScopedResourceKind,
  opaqueResourceReference: string,
) {
  return withTransaction(pool, (client) =>
    authorizeClubsAmbassadorScopedResourceWithClient(
      client,
      evidence,
      resourceKind,
      opaqueResourceReference,
    ),
  );
}

export async function issueClubsAmbassadorB2bEntitlement(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  idempotencyKey: string,
  activationPassReceiptId: string,
) {
  return issueClubsAmbassadorB2bEntitlementWithPool(
    getCorePgPool(),
    evidence,
    idempotencyKey,
    activationPassReceiptId,
  );
}

export async function readCurrentClubsAmbassadorEntitlement(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
) {
  return readCurrentClubsAmbassadorEntitlementWithPool(
    getCorePgPool(),
    evidence,
  );
}

export async function authorizeClubsAmbassadorScopedResource(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  resourceKind: ClubsAmbassadorScopedResourceKind,
  opaqueResourceReference: string,
) {
  return authorizeClubsAmbassadorScopedResourceWithPool(
    getCorePgPool(),
    evidence,
    resourceKind,
    opaqueResourceReference,
  );
}
