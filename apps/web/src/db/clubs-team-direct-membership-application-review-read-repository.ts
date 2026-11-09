import "server-only";

import { createHash } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import {
  CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT,
  projectClubsTeamDirectReviewItem,
  type ClubsTeamDirectReviewApplicationStatus,
} from "@/lib/clubs/team-direct-membership-application-review-read-contract";
import type { ClubsTeamMembershipReviewActor } from "@/lib/clubs/team-membership-review-contract";

export type ClubsTeamDirectReviewReadClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type ClubsTeamDirectReviewReadPool = {
  connect(): Promise<ClubsTeamDirectReviewReadClient & { release(): void }>;
};

type ReviewRow = {
  application_id: string;
  application_status: ClubsTeamDirectReviewApplicationStatus;
  submitted_at: string | Date;
  updated_at: string | Date;
  reviewer_binding_ready: boolean;
  decision_receipt_persisted: boolean;
  team_go_receipt_persisted: boolean;
};

export class ClubsTeamDirectReviewReadAuthorityError extends Error {
  constructor() {
    super("Team direct Membership application review read denied");
    this.name = "ClubsTeamDirectReviewReadAuthorityError";
  }
}

export class ClubsTeamDirectReviewReadNotFoundError extends Error {
  constructor() {
    super("Team direct Membership application review not found");
    this.name = "ClubsTeamDirectReviewReadNotFoundError";
  }
}

export class ClubsTeamDirectReviewReadValidationError extends Error {
  constructor() {
    super("Team direct Membership application review read invalid");
    this.name = "ClubsTeamDirectReviewReadValidationError";
  }
}

function iso(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsTeamDirectReviewReadValidationError();
  }
  return date.toISOString();
}

function validateActor(actor: ClubsTeamMembershipReviewActor, now: Date) {
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.allowedRoles.includes(
      actor.role,
    ) ||
    !["aal2", "aal3"].includes(actor.assuranceLevel) ||
    actor.authoritySource !== "auth0-crays-session"
  ) {
    throw new ClubsTeamDirectReviewReadAuthorityError();
  }
  const authenticatedAt = new Date(actor.authenticatedAt);
  const ageMs = now.getTime() - authenticatedAt.getTime();
  if (
    !Number.isFinite(authenticatedAt.getTime()) ||
    ageMs < -5_000 ||
    ageMs > 300_000
  ) {
    throw new ClubsTeamDirectReviewReadAuthorityError();
  }
}

async function assertActorAuthority(
  client: ClubsTeamDirectReviewReadClient,
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
    throw new ClubsTeamDirectReviewReadAuthorityError();
  }
}

export function deriveClubsTeamDirectReviewReference(sourceKey: string) {
  if (!/^clubs-booking-membership-application_[0-9a-f-]{36}$/.test(sourceKey)) {
    throw new ClubsTeamDirectReviewReadValidationError();
  }
  const digest = createHash("sha256")
    .update(`crays.clubs.team-direct-review.v1\u001f${sourceKey}`)
    .digest("hex")
    .slice(0, 32);
  return `cclub-review-${digest}`;
}

const reviewReadSql = `select
    application.application_id,
    application.status application_status,
    application.submitted_at,
    application.updated_at,
    exists (
      select 1
        from crays_core.clubs_direct_membership_application_reviewer_bindings binding
        join crays_core.auth_identities identity
          on identity.identity_id=binding.source_auth_identity_id
         and identity.account_id=binding.source_principal_account_id
         and identity.provider_key=binding.provider_key
         and identity.verified=true
        join crays_core.crays_accounts source_principal
          on source_principal.account_id=binding.source_principal_account_id
         and source_principal.status='active'
        join crays_core.crays_accounts canonical
          on canonical.account_id=binding.canonical_account_id
         and canonical.status='active'
        join crays_core.clubs_canonical_account_projection_receipts projection
          on projection.projection_receipt_id=
               binding.canonical_account_projection_receipt_id
         and projection.canonical_account_id=binding.canonical_account_id
         and projection.source_business_subject_sha256=
               binding.provider_subject_sha256
         and projection.source_account_status='active'
         and projection.projected_contact_redacted=true
        left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations revocation
          on revocation.binding_id=binding.binding_id
       where binding.binding_id=application.assigned_reviewer_binding_id
         and binding.route_key='direct-membership-application'
         and binding.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
         and binding.granted_capabilities @>
             '["read_assigned_applications","review_assigned_applications"]'::jsonb
         and binding.valid_from<=$4
         and (binding.expires_at is null or binding.expires_at>$4)
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
    ) team_go_receipt_persisted
  from crays_core.clubs_booking_membership_direct_applications application
  join crays_core.clubs_application_assignments_current assignment
    on assignment.application_id=application.application_id
   and assignment.organization_id=$2
   and assignment.status='assigned'
   and assignment.reviewer_binding_id=application.assigned_reviewer_binding_id
  join crays_core.clubs_ambassador_registry_current registry
    on registry.ambassador_profile_id=assignment.ambassador_profile_id
   and registry.organization_id=assignment.organization_id
   and registry.status='active'
 where (
   $3::text in ('crays-management','admin')
   or (
     $3::text='reviewer'
     and exists (
       select 1
         from crays_core.clubs_direct_membership_application_reviewer_bindings actor_binding
         join crays_core.auth_identities actor_identity
           on actor_identity.identity_id=actor_binding.source_auth_identity_id
          and actor_identity.account_id=actor_binding.source_principal_account_id
          and actor_identity.provider_key=actor_binding.provider_key
          and actor_identity.verified=true
         join crays_core.crays_accounts actor_source
           on actor_source.account_id=actor_binding.source_principal_account_id
          and actor_source.status='active'
         join crays_core.crays_accounts actor_canonical
           on actor_canonical.account_id=actor_binding.canonical_account_id
          and actor_canonical.status='active'
         join crays_core.clubs_canonical_account_projection_receipts actor_projection
           on actor_projection.projection_receipt_id=
                actor_binding.canonical_account_projection_receipt_id
          and actor_projection.canonical_account_id=actor_binding.canonical_account_id
          and actor_projection.source_business_subject_sha256=
                actor_binding.provider_subject_sha256
          and actor_projection.source_account_status='active'
          and actor_projection.projected_contact_redacted=true
         left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations actor_revocation
           on actor_revocation.binding_id=actor_binding.binding_id
        where actor_binding.binding_id=application.assigned_reviewer_binding_id
          and actor_binding.source_principal_account_id=$1
          and actor_binding.route_key='direct-membership-application'
          and actor_binding.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
          and actor_binding.granted_capabilities @>
              '["read_assigned_applications","review_assigned_applications"]'::jsonb
          and actor_binding.valid_from<=$4
          and (actor_binding.expires_at is null or actor_binding.expires_at>$4)
          and actor_revocation.binding_id is null
     )
   )
 )
 order by case application.status
   when 'submitted' then 1
   when 'assigned' then 2
   when 'ambassador_review' then 3
   when 'team_review' then 4
   else 5
 end, application.updated_at desc
 limit 100`;

async function readScopedRows(
  client: ClubsTeamDirectReviewReadClient,
  actor: ClubsTeamMembershipReviewActor,
  now: Date,
) {
  validateActor(actor, now);
  await client.query("select set_config('crays.app_role','core_service',true)");
  await assertActorAuthority(client, actor);
  const result = await client.query<ReviewRow>(reviewReadSql, [
    actor.accountId,
    actor.organizationId,
    actor.role,
    now.toISOString(),
  ]);
  return result.rows;
}

function safeItems(rows: readonly ReviewRow[], view: "queue" | "detail") {
  const references = new Set<string>();
  return rows.map((row) => {
    const reviewReference = deriveClubsTeamDirectReviewReference(
      row.application_id,
    );
    if (references.has(reviewReference)) {
      throw new ClubsTeamDirectReviewReadValidationError();
    }
    references.add(reviewReference);
    return projectClubsTeamDirectReviewItem(
      {
        reviewReference,
        applicationStatus: row.application_status,
        submittedAt: iso(row.submitted_at),
        updatedAt: iso(row.updated_at),
        reviewerReady: row.reviewer_binding_ready === true,
        decisionReceiptPersisted: row.decision_receipt_persisted === true,
        teamGoReceiptPersisted: row.team_go_receipt_persisted === true,
      },
      view,
    );
  });
}

export async function readClubsTeamDirectReviewQueueWithClient(
  client: ClubsTeamDirectReviewReadClient,
  actor: ClubsTeamMembershipReviewActor,
  now = new Date(),
) {
  const items = safeItems(await readScopedRows(client, actor, now), "queue");
  return {
    schema:
      CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.schema,
    version:
      CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.version,
    status: "ready" as const,
    view: "queue" as const,
    items,
  };
}

export async function readClubsTeamDirectReviewDetailWithClient(
  client: ClubsTeamDirectReviewReadClient,
  actor: ClubsTeamMembershipReviewActor,
  reviewReference: string,
  now = new Date(),
) {
  if (!/^cclub-review-[a-f0-9]{32}$/.test(reviewReference)) {
    throw new ClubsTeamDirectReviewReadValidationError();
  }
  const matches = safeItems(
    await readScopedRows(client, actor, now),
    "detail",
  ).filter((item) => item.reviewReference === reviewReference);
  if (matches.length !== 1) {
    throw new ClubsTeamDirectReviewReadNotFoundError();
  }
  return {
    schema:
      CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.schema,
    version:
      CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.version,
    status: "ready" as const,
    view: "detail" as const,
    item: matches[0],
  };
}

async function inReadTransaction<Result>(
  pool: ClubsTeamDirectReviewReadPool,
  operation: (client: ClubsTeamDirectReviewReadClient) => Promise<Result>,
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

export async function readClubsTeamDirectReviewQueue(
  actor: ClubsTeamMembershipReviewActor,
) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readClubsTeamDirectReviewQueueWithClient(client, actor),
  );
}

export async function readClubsTeamDirectReviewDetail(
  actor: ClubsTeamMembershipReviewActor,
  reviewReference: string,
) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readClubsTeamDirectReviewDetailWithClient(
      client,
      actor,
      reviewReference,
    ),
  );
}
