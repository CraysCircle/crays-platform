import "server-only";

import { createHash } from "node:crypto";

import { getCorePgPool } from "@/db/client";
import {
  ClubsTeamPersonReviewAggregateReadAuthorityError,
  ClubsTeamPersonReviewAggregateReadNotFoundError,
  ClubsTeamPersonReviewAggregateReadValidationError,
  readClubsTeamPersonReviewAggregateReadinessWithClient,
} from "@/db/clubs-team-membership-person-review-aggregate-readiness-repository";
import {
  CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT,
  projectClubsTeamMembershipTeamGoOperations,
  projectClubsTeamMembershipTeamGoOperationsItem,
  type ClubsTeamMembershipTeamGoOperationsAuthority,
  type ClubsTeamMembershipTeamGoOperationsSignals,
} from "@/lib/clubs/team-membership-team-go-operations-contract";
import { CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT } from "@/lib/clubs/team-membership-person-review-command-contract";

export type ClubsTeamMembershipTeamGoOperationsClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

export type ClubsTeamMembershipTeamGoOperationsPool = {
  connect(): Promise<
    ClubsTeamMembershipTeamGoOperationsClient & { release(): void }
  >;
};

type QueueRow = {
  application_id: string;
  application_status: string;
  application_version: number;
  ambassador_display_name: string;
  recommendation_command:
    | "start_ambassador_review"
    | "request_more_information"
    | "recommend_for_team_review"
    | "do_not_recommend"
    | null;
  recommendation_status_after: string | null;
  recommendation_version_after: number | null;
  recommendation_profile_aligned: boolean;
  team_decision_receipt_present: boolean;
  team_go_issued: boolean;
  team_go_evidence_aligned: boolean;
  updated_at: Date | string;
};

export class ClubsTeamMembershipTeamGoOperationsAuthorityError extends Error {
  constructor() {
    super("Team-GO operations authority denied");
    this.name = "ClubsTeamMembershipTeamGoOperationsAuthorityError";
  }
}

export class ClubsTeamMembershipTeamGoOperationsValidationError extends Error {
  constructor() {
    super("Team-GO operations projection invalid");
    this.name = "ClubsTeamMembershipTeamGoOperationsValidationError";
  }
}

function validateAuthority(
  authority: ClubsTeamMembershipTeamGoOperationsAuthority,
  now: Date,
) {
  const { actor, proof } = authority;
  const actorAuthenticatedAt = new Date(actor.authenticatedAt);
  const proofAuthenticatedAt = new Date(proof.authenticatedAt);
  const ageMs = now.getTime() - proofAuthenticatedAt.getTime();
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.authentication.allowedRoles.includes(
      actor.role,
    ) ||
    !CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.authentication.assurance.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session" ||
    proof.proofSchema !== "crays.clubs.exact-b2b-session-proof.v1" ||
    proof.authoritySource !== "exact_b2b_session" ||
    proof.emailVerified !== true ||
    proof.b2cRejected !== true ||
    !/^[0-9a-f]{64}$/.test(proof.subjectSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.issuerSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.clientIdSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.verifiedEmailSha256) ||
    !Number.isFinite(actorAuthenticatedAt.getTime()) ||
    !Number.isFinite(proofAuthenticatedAt.getTime()) ||
    Math.abs(actorAuthenticatedAt.getTime() - proofAuthenticatedAt.getTime()) >
      1_000 ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.authentication
        .maximumAuthenticationAgeSeconds *
        1_000
  ) {
    throw new ClubsTeamMembershipTeamGoOperationsAuthorityError();
  }
}

async function setCoreTenantRole(
  client: ClubsTeamMembershipTeamGoOperationsClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function assertActorAuthority(
  client: ClubsTeamMembershipTeamGoOperationsClient,
  authority: ClubsTeamMembershipTeamGoOperationsAuthority,
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
       join crays_core.role_assignments role_assignment
         on role_assignment.account_id=membership.account_id
        and role_assignment.organization_id=membership.organization_id
        and role_assignment.role_key=membership.role_key
        and role_assignment.status='active'
        and role_assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.organizations organization
         on organization.organization_id=membership.organization_id
        and organization.organization_type='crays'
        and organization.status='active'
      where account.account_id=$1 and account.status='active'
      limit 2`,
    [
      authority.actor.accountId,
      authority.actor.organizationId,
      authority.actor.role,
      authority.proof.subjectSha256,
    ],
  );
  if (result.rows.length !== 1 || !result.rows[0]?.allowed) {
    throw new ClubsTeamMembershipTeamGoOperationsAuthorityError();
  }
}

function reviewReference(applicationId: string) {
  if (!/^clubs-booking-membership-application_[0-9a-f-]{36}$/.test(applicationId)) {
    throw new ClubsTeamMembershipTeamGoOperationsValidationError();
  }
  return `cclub-review-${createHash("sha256")
    .update(`crays.clubs.team-direct-review.v1\u001f${applicationId}`)
    .digest("hex")
    .slice(0, 32)}`;
}

const queueSql = `select
    application.application_id,
    application.status application_status,
    application.version application_version,
    registry.display_name ambassador_display_name,
    recommendation.command_type recommendation_command,
    recommendation.application_status_after recommendation_status_after,
    recommendation.application_version_after recommendation_version_after,
    coalesce(recommendation.ambassador_profile_id=assignment.ambassador_profile_id,false)
      recommendation_profile_aligned,
    decision_summary.command_count>0 team_decision_receipt_present,
    team_go.team_go_evidence_id is not null team_go_issued,
    coalesce(
      team_go.team_go_evidence_id is not null
      and recommendation.command_type='recommend_for_team_review'
      and recommendation.ambassador_profile_id=assignment.ambassador_profile_id
      and application.status='approved_for_membership_payment'
      and handoff.state='approved_for_membership_payment'
      and team_go.required_person_count=team_go.approved_person_count
      and exists (
        select 1
          from crays_core.clubs_booking_membership_party_go_receipts go_receipt
         where go_receipt.party_go_receipt_id=team_go.party_go_receipt_id
           and go_receipt.handoff_id=handoff.handoff_id
           and go_receipt.outcome='approved_for_membership_payment'
           and go_receipt.party_snapshot_sha256=team_go.party_snapshot_sha256
      )
      and not exists (
        select 1
          from crays_core.clubs_booking_membership_application_party_members person
         where person.handoff_id=handoff.handoff_id
           and person.party_role in ('primary_applicant','additional_adult')
           and (
             person.status<>'approved_for_membership_payment'
             or person.account_id is null
             or person.identity_state<>'ready'
             or person.consent_statement_version<>
                  'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1'
             or person.consent_at is null
           )
      ),false
    ) team_go_evidence_aligned,
    greatest(
      application.updated_at,
      handoff.updated_at,
      recommendation.recorded_at,
      decision_summary.last_recorded_at,
      team_go.issued_at
    ) updated_at
  from crays_core.clubs_booking_membership_direct_applications application
  join crays_core.clubs_booking_membership_application_handoffs handoff
    on handoff.handoff_id=application.handoff_id
   and handoff.direct_application_id=application.application_id
  join crays_core.clubs_application_assignments_current assignment
    on assignment.application_id=application.application_id
   and assignment.organization_id=$2
   and assignment.status='assigned'
   and assignment.reviewer_binding_id=application.assigned_reviewer_binding_id
  join crays_core.clubs_ambassador_registry_current registry
    on registry.ambassador_profile_id=assignment.ambassador_profile_id
   and registry.organization_id=assignment.organization_id
   and registry.status='active'
  left join lateral (
    select receipt.command_type,receipt.application_status_after,
           receipt.application_version_after,receipt.ambassador_profile_id,
           receipt.recorded_at
      from crays_core.clubs_ambassador_application_review_recommendation_receipts receipt
     where receipt.application_id=application.application_id
       and receipt.organization_id=$2
       and receipt.persisted_record=true
       and receipt.synthetic_source=false
     order by receipt.application_version_after desc,receipt.recorded_at desc
     limit 1
  ) recommendation on true
  left join lateral (
    select count(*)::integer command_count,max(receipt.recorded_at) last_recorded_at
      from crays_core.clubs_team_membership_person_review_command_receipts receipt
     where receipt.application_id=application.application_id
       and receipt.organization_id=$2
  ) decision_summary on true
  left join crays_core.clubs_booking_party_team_go_evidence team_go
    on team_go.handoff_id=handoff.handoff_id
   and team_go.actor_organization_id=$2
 where (
   $3::text in ('crays-management','admin')
   or (
     $3::text='reviewer'
     and exists (
       select 1
         from crays_core.clubs_direct_membership_application_reviewer_bindings binding
         join crays_core.auth_identities actor_identity
           on actor_identity.identity_id=binding.source_auth_identity_id
          and actor_identity.account_id=binding.source_principal_account_id
          and actor_identity.provider_key=binding.provider_key
          and actor_identity.verified=true
         join crays_core.crays_accounts source_account
           on source_account.account_id=binding.source_principal_account_id
          and source_account.status='active'
         join crays_core.crays_accounts canonical_account
           on canonical_account.account_id=binding.canonical_account_id
          and canonical_account.status='active'
         join crays_core.clubs_canonical_account_projection_receipts projection
           on projection.projection_receipt_id=
                binding.canonical_account_projection_receipt_id
          and projection.canonical_account_id=binding.canonical_account_id
          and projection.source_business_subject_sha256=binding.provider_subject_sha256
          and projection.source_account_status='active'
          and projection.projected_contact_redacted=true
         left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations revocation
           on revocation.binding_id=binding.binding_id
        where binding.binding_id=application.assigned_reviewer_binding_id
          and binding.source_principal_account_id=$1
          and binding.route_key='direct-membership-application'
          and binding.purpose_role='AMBASSADOR_APPLICATION_REVIEWER'
          and binding.granted_capabilities @>
              '["read_assigned_applications","review_assigned_applications"]'::jsonb
          and binding.valid_from<=$4
          and (binding.expires_at is null or binding.expires_at>$4)
          and revocation.binding_id is null
     )
   )
 )
 order by updated_at desc,application.application_id
 limit ${CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.maximumItems + 1}`;

function baseAmbassadorReceiptAligned(row: QueueRow) {
  if (!row.recommendation_command || !row.recommendation_profile_aligned) {
    return false;
  }
  if (
    row.team_decision_receipt_present ||
    row.team_go_issued
  ) {
    return row.recommendation_command === "recommend_for_team_review";
  }
  return (
    row.application_version === row.recommendation_version_after &&
    row.application_status === row.recommendation_status_after
  );
}

async function safeSignals(
  client: ClubsTeamMembershipTeamGoOperationsClient,
  authority: ClubsTeamMembershipTeamGoOperationsAuthority,
  row: QueueRow,
  evidenceAmbiguous: boolean,
  now: Date,
): Promise<ClubsTeamMembershipTeamGoOperationsSignals> {
  const reference = reviewReference(row.application_id);
  let aggregate = null;
  if (
    row.recommendation_command === "recommend_for_team_review" &&
    !row.team_go_issued &&
    !evidenceAmbiguous
  ) {
    try {
      aggregate = await readClubsTeamPersonReviewAggregateReadinessWithClient(
        client,
        authority,
        reference,
        now,
      );
    } catch (error) {
      if (error instanceof ClubsTeamPersonReviewAggregateReadNotFoundError) {
        aggregate = null;
      } else if (
        error instanceof ClubsTeamPersonReviewAggregateReadAuthorityError
      ) {
        throw new ClubsTeamMembershipTeamGoOperationsAuthorityError();
      } else if (
        error instanceof ClubsTeamPersonReviewAggregateReadValidationError
      ) {
        throw new ClubsTeamMembershipTeamGoOperationsValidationError();
      } else {
        throw error;
      }
    }
  }
  return {
    reviewReference: reference,
    ambassadorDisplayName: row.ambassador_display_name,
    ambassadorCommand: row.recommendation_command,
    ambassadorReceiptPresent: row.recommendation_command !== null,
    ambassadorReceiptAligned: baseAmbassadorReceiptAligned(row),
    teamDecisionReceiptPresent: row.team_decision_receipt_present,
    allRequiredPersonDecisionsPresent:
      aggregate?.allRequiredPersonDecisionsPresent ?? false,
    allRequiredPersonsApproved:
      row.team_go_evidence_aligned ||
      (aggregate?.allRequiredPersonsApproved ?? false),
    moreInformationRequired: aggregate?.moreInformationRequired ?? false,
    declined:
      row.recommendation_command === "do_not_recommend" ||
      (aggregate?.declined ?? false),
    decisionVersionsAligned:
      row.team_go_evidence_aligned ||
      (!row.team_decision_receipt_present
        ? true
        : (aggregate?.decisionVersionsAligned ?? false)),
    canonical0251EvidenceAligned:
      row.team_go_evidence_aligned ||
      (aggregate?.canonical0251EvidenceAligned ?? false),
    canonical0251SnapshotAligned:
      row.team_go_evidence_aligned ||
      (aggregate?.canonical0251SnapshotAligned ?? false),
    dependentPolicyReady:
      row.team_go_evidence_aligned || (aggregate?.dependentPolicyReady ?? false),
    teamGoIssueReady: aggregate?.teamGoIssueReady ?? false,
    teamGoIssued: row.team_go_issued,
    teamGoEvidenceAligned: row.team_go_evidence_aligned,
    evidenceAmbiguous,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function readClubsTeamMembershipTeamGoOperationsWithClient(
  client: ClubsTeamMembershipTeamGoOperationsClient,
  authority: ClubsTeamMembershipTeamGoOperationsAuthority,
  now = new Date(),
) {
  validateAuthority(authority, now);
  await setCoreTenantRole(client, authority.actor.organizationId);
  await assertActorAuthority(client, authority);
  const result = await client.query<QueueRow>(queueSql, [
    authority.actor.accountId,
    authority.actor.organizationId,
    authority.actor.role,
    now.toISOString(),
  ]);
  const truncated =
    result.rows.length >
    CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.maximumItems;
  const selected = result.rows.slice(
    0,
    CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.maximumItems,
  );
  const frequencies = new Map<string, number>();
  for (const row of selected) {
    const reference = reviewReference(row.application_id);
    frequencies.set(reference, (frequencies.get(reference) ?? 0) + 1);
  }
  const unique = new Map<string, QueueRow>();
  for (const row of selected) {
    unique.set(reviewReference(row.application_id), row);
  }
  const items = [];
  for (const [reference, row] of unique) {
    const signals = await safeSignals(
      client,
      authority,
      row,
      (frequencies.get(reference) ?? 0) !== 1,
      now,
    );
    try {
      items.push(projectClubsTeamMembershipTeamGoOperationsItem(signals));
    } catch {
      throw new ClubsTeamMembershipTeamGoOperationsValidationError();
    }
  }
  return projectClubsTeamMembershipTeamGoOperations(items, truncated);
}

async function inReadTransaction<Result>(
  pool: ClubsTeamMembershipTeamGoOperationsPool,
  operation: (
    client: ClubsTeamMembershipTeamGoOperationsClient,
  ) => Promise<Result>,
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

export async function readClubsTeamMembershipTeamGoOperations(
  authority: ClubsTeamMembershipTeamGoOperationsAuthority,
) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readClubsTeamMembershipTeamGoOperationsWithClient(client, authority),
  );
}

export const clubsTeamMembershipTeamGoOperationsRepositoryTestApi = {
  baseAmbassadorReceiptAligned,
  queueSql,
  reviewReference,
  validateAuthority,
};
