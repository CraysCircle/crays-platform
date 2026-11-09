import "server-only";

import { getCorePgPool } from "@/db/client";
import { deriveClubsTeamDirectReviewReference } from "@/db/clubs-team-direct-membership-application-review-read-repository";
import type {
  ClubsAmbassadorB2bBootstrapEvidence,
  ClubsAmbassadorEntitlementKey,
} from "@/lib/clubs/ambassador-b2b-entitlement-contract";
import {
  CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT,
  projectClubsAmbassadorDirectInboxItem,
} from "@/lib/clubs/ambassador-direct-membership-application-inbox-contract";
import type { ClubsTeamDirectReviewApplicationStatus } from "@/lib/clubs/team-direct-membership-application-review-read-contract";

export type ClubsAmbassadorDirectInboxClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type ClubsAmbassadorDirectInboxPool = {
  connect(): Promise<ClubsAmbassadorDirectInboxClient & { release(): void }>;
};

type ActiveBinding = {
  account_binding_receipt_id: string;
  entitlement_key: ClubsAmbassadorEntitlementKey;
  ambassador_profile_id: string;
};

type InboxRow = {
  application_id: string;
  application_status: ClubsTeamDirectReviewApplicationStatus;
  submitted_at: string | Date;
  updated_at: string | Date;
  reviewer_binding_ready: boolean;
  decision_receipt_persisted: boolean;
  team_go_receipt_persisted: boolean;
  own_assignment: boolean;
  ownership_match: boolean;
};

export class ClubsAmbassadorDirectInboxAuthorityError extends Error {
  constructor() {
    super("Ambassador direct Membership application inbox denied");
    this.name = "ClubsAmbassadorDirectInboxAuthorityError";
  }
}

export class ClubsAmbassadorDirectInboxCrossAmbassadorError extends Error {
  constructor() {
    super("Ambassador direct Membership application belongs to another profile");
    this.name = "ClubsAmbassadorDirectInboxCrossAmbassadorError";
  }
}

export class ClubsAmbassadorDirectInboxNotFoundError extends Error {
  constructor() {
    super("Ambassador direct Membership application not found");
    this.name = "ClubsAmbassadorDirectInboxNotFoundError";
  }
}

export class ClubsAmbassadorDirectInboxValidationError extends Error {
  constructor() {
    super("Ambassador direct Membership application inbox invalid");
    this.name = "ClubsAmbassadorDirectInboxValidationError";
  }
}

function iso(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsAmbassadorDirectInboxValidationError();
  }
  return date.toISOString();
}

function validateEvidence(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  now: Date,
) {
  const authenticatedAt = new Date(evidence.authenticatedAt);
  const ageMs = now.getTime() - authenticatedAt.getTime();
  if (
    evidence.proofSchema !== "crays.clubs.b2b-entitlement-bootstrap.v1" ||
    evidence.authoritySource !== "exact_crays_pro_b2b_bootstrap" ||
    evidence.exactVerifiedCraysProB2bLogin !== true ||
    evidence.b2cRejected !== true ||
    !/^[0-9a-f]{64}$/.test(evidence.subjectSha256) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(evidence.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(evidence.organizationId) ||
    !/^tenant_session_[A-Za-z0-9_-]{16,180}$/.test(
      evidence.tenantSessionId,
    ) ||
    !Number.isFinite(authenticatedAt.getTime()) ||
    ageMs < -5_000 ||
    ageMs > 300_000
  ) {
    throw new ClubsAmbassadorDirectInboxAuthorityError();
  }
}

async function setCoreTenantRole(
  client: ClubsAmbassadorDirectInboxClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function resolveActiveBinding(
  client: ClubsAmbassadorDirectInboxClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
) {
  const result = await client.query<ActiveBinding>(
    `select binding.account_binding_receipt_id,binding.entitlement_key,
            binding.ambassador_profile_id
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
       join crays_core.role_assignments role_assignment
         on role_assignment.account_id=membership.account_id
        and role_assignment.organization_id=membership.organization_id
        and role_assignment.role_key=membership.role_key
        and role_assignment.status='active'
        and role_assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.clubs_ambassador_registry_current registry
         on registry.ambassador_profile_id=binding.ambassador_profile_id
        and registry.organization_id=binding.organization_id
        and registry.status='active'
      where binding.account_id=$1
        and binding.organization_id=$2
        and binding.subject_sha256=$4
        and binding.entitlement_active=true
        and binding.exact_subject_binding=true
        and binding.exact_active_account_binding=true
      limit 2`,
    [
      evidence.accountId,
      evidence.organizationId,
      evidence.tenantSessionId,
      evidence.subjectSha256,
    ],
  );
  if (result.rows.length !== 1) {
    throw new ClubsAmbassadorDirectInboxAuthorityError();
  }
  return result.rows[0];
}

const tenantInboxSql = `select
    application.application_id,
    application.status application_status,
    application.submitted_at,
    application.updated_at,
    exists (
      select 1
        from crays_core.clubs_direct_membership_application_reviewer_bindings reviewer
        left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations revocation
          on revocation.binding_id=reviewer.binding_id
       where reviewer.binding_id=application.assigned_reviewer_binding_id
         and reviewer.route_key='direct-membership-application'
         and reviewer.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
         and reviewer.granted_capabilities @>
             '["read_assigned_applications","review_assigned_applications"]'::jsonb
         and reviewer.valid_from<=$5
         and (reviewer.expires_at is null or reviewer.expires_at>$5)
         and revocation.binding_id is null
    ) reviewer_binding_ready,
    exists (
      select 1
        from crays_core.clubs_booking_membership_person_decision_receipts receipt
       where receipt.application_id=application.application_id
    ) decision_receipt_persisted,
    exists (
      select 1
        from crays_core.clubs_booking_membership_party_go_receipts receipt
       where receipt.handoff_id=application.handoff_id
    ) team_go_receipt_persisted,
    assignment.ambassador_profile_id=$3 own_assignment,
    exists (
      select 1
        from crays_core.clubs_ambassador_scoped_resource_ownership_receipts ownership
       where ownership.organization_id=$2
         and ownership.account_binding_receipt_id=$4
         and ownership.account_id=$1
         and ownership.ambassador_profile_id=$3
         and ownership.entitlement_key='AMBASSADOR_SCOPED_ACCESS'
         and ownership.resource_kind='application'
         and ownership.resource_reference_sha256=
             encode(sha256(convert_to(application.application_id,'UTF8')),'hex')
         and ownership.attribution_receipt_verified=true
         and ownership.ownership_state='confirmed'
    ) ownership_match
  from crays_core.clubs_application_assignments_current assignment
  join crays_core.clubs_booking_membership_direct_applications application
    on application.application_id=assignment.application_id
  join crays_core.clubs_ambassador_registry_current registry
    on registry.ambassador_profile_id=assignment.ambassador_profile_id
   and registry.organization_id=assignment.organization_id
   and registry.status='active'
 where assignment.organization_id=$2
   and assignment.status='assigned'
 order by case application.status
   when 'submitted' then 1
   when 'assigned' then 2
   when 'ambassador_review' then 3
   when 'team_review' then 4
   else 5
 end, application.updated_at desc
 limit 200`;

async function readTenantRows(
  client: ClubsAmbassadorDirectInboxClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  now: Date,
) {
  validateEvidence(evidence, now);
  await setCoreTenantRole(client, evidence.organizationId);
  const binding = await resolveActiveBinding(client, evidence);
  const result = await client.query<InboxRow>(tenantInboxSql, [
    evidence.accountId,
    evidence.organizationId,
    binding.ambassador_profile_id,
    binding.account_binding_receipt_id,
    now.toISOString(),
  ]);
  return { binding, rows: result.rows };
}

function visible(
  row: InboxRow,
  entitlement: ClubsAmbassadorEntitlementKey,
) {
  if (!row.own_assignment) return false;
  return (
    entitlement === "CLUBS_SAAS_FULL_ACCESS" || row.ownership_match === true
  );
}

function project(row: InboxRow, view: "queue" | "detail") {
  return projectClubsAmbassadorDirectInboxItem(
    {
      reviewReference: deriveClubsTeamDirectReviewReference(row.application_id),
      applicationStatus: row.application_status,
      submittedAt: iso(row.submitted_at),
      updatedAt: iso(row.updated_at),
      reviewerReady: row.reviewer_binding_ready === true,
      decisionReceiptPersisted: row.decision_receipt_persisted === true,
      teamGoReceiptPersisted: row.team_go_receipt_persisted === true,
    },
    view,
  );
}

export async function readClubsAmbassadorDirectInboxQueueWithClient(
  client: ClubsAmbassadorDirectInboxClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  now = new Date(),
) {
  const { binding, rows } = await readTenantRows(client, evidence, now);
  const items = rows
    .filter((row) => visible(row, binding.entitlement_key))
    .map((row) => project(row, "queue"));
  return {
    schema:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.schema,
    version:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.version,
    status: "ready" as const,
    view: "queue" as const,
    items,
  };
}

export async function readClubsAmbassadorDirectInboxDetailWithClient(
  client: ClubsAmbassadorDirectInboxClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  reviewReference: string,
  now = new Date(),
) {
  if (!/^cclub-review-[a-f0-9]{32}$/.test(reviewReference)) {
    throw new ClubsAmbassadorDirectInboxValidationError();
  }
  const { binding, rows } = await readTenantRows(client, evidence, now);
  const matches = rows.filter(
    (row) =>
      deriveClubsTeamDirectReviewReference(row.application_id) ===
      reviewReference,
  );
  if (matches.length !== 1) {
    throw new ClubsAmbassadorDirectInboxNotFoundError();
  }
  const row = matches[0];
  if (!row.own_assignment) {
    throw new ClubsAmbassadorDirectInboxCrossAmbassadorError();
  }
  if (!visible(row, binding.entitlement_key)) {
    throw new ClubsAmbassadorDirectInboxNotFoundError();
  }
  return {
    schema:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.schema,
    version:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.version,
    status: "ready" as const,
    view: "detail" as const,
    item: project(row, "detail"),
  };
}

async function inReadTransaction<Result>(
  pool: ClubsAmbassadorDirectInboxPool,
  operation: (client: ClubsAmbassadorDirectInboxClient) => Promise<Result>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
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

export async function readClubsAmbassadorDirectInboxQueue(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readClubsAmbassadorDirectInboxQueueWithClient(client, evidence),
  );
}

export async function readClubsAmbassadorDirectInboxDetail(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  reviewReference: string,
) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readClubsAmbassadorDirectInboxDetailWithClient(
      client,
      evidence,
      reviewReference,
    ),
  );
}
