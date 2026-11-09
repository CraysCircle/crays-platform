import "server-only";

import { getCorePgPool } from "@/db/client";
import {
  projectClubsTeamPersonReviewAggregateReadiness,
  type ClubsTeamPersonReviewAggregateAuthority,
} from "@/lib/clubs/team-membership-person-review-aggregate-readiness-contract";
import { CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT } from "@/lib/clubs/team-membership-person-review-command-contract";

export type ClubsTeamPersonReviewAggregateReadClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

export type ClubsTeamPersonReviewAggregateReadPool = {
  connect(): Promise<
    ClubsTeamPersonReviewAggregateReadClient & { release(): void }
  >;
};

type AggregateRow = {
  application_status: string;
  handoff_state: string;
  has_dependent_minor: boolean;
  application_chain_aligned: boolean;
  person_status: string;
  person_version: number;
  command_type: "request_more_information" | "approve" | "decline" | null;
  person_status_after: string | null;
  person_version_after: number | null;
  decision_version_after: number | null;
  person_chain_aligned: boolean;
  canonical_decision_version: number | null;
  canonical_outcome: string | null;
  canonical_application_ready: boolean;
  person_binding_ready: boolean;
};

export class ClubsTeamPersonReviewAggregateReadAuthorityError extends Error {
  constructor() {
    super("Team person review aggregate authority denied");
    this.name = "ClubsTeamPersonReviewAggregateReadAuthorityError";
  }
}

export class ClubsTeamPersonReviewAggregateReadNotFoundError extends Error {
  constructor() {
    super("Team person review aggregate target not found");
    this.name = "ClubsTeamPersonReviewAggregateReadNotFoundError";
  }
}

export class ClubsTeamPersonReviewAggregateReadValidationError extends Error {
  constructor() {
    super("Team person review aggregate request invalid");
    this.name = "ClubsTeamPersonReviewAggregateReadValidationError";
  }
}

function validateAuthority(
  authority: ClubsTeamPersonReviewAggregateAuthority,
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
    !/^[0-9a-f]{64}$/.test(proof.issuerSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.clientIdSha256) ||
    !/^[0-9a-f]{64}$/.test(proof.subjectSha256) ||
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
    throw new ClubsTeamPersonReviewAggregateReadAuthorityError();
  }
}

async function setCoreTenantRole(
  client: ClubsTeamPersonReviewAggregateReadClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function assertActorAuthority(
  client: ClubsTeamPersonReviewAggregateReadClient,
  authority: ClubsTeamPersonReviewAggregateAuthority,
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
       join crays_core.role_assignments assignment
         on assignment.account_id=membership.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
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
    throw new ClubsTeamPersonReviewAggregateReadAuthorityError();
  }
}

function canonicalOutcomeForCommand(command: AggregateRow["command_type"]) {
  if (command === "approve") return "approved_for_membership_payment";
  if (command === "decline") return "declined";
  if (command === "request_more_information") {
    return "more_information_required";
  }
  return null;
}

function safeSignals(reviewReference: string, rows: AggregateRow[]) {
  const hasRequiredAdults = rows.length > 0;
  const allRequiredPersonDecisionsPresent =
    hasRequiredAdults && rows.every((row) => row.command_type !== null);
  const allRequiredPersonsApproved =
    allRequiredPersonDecisionsPresent &&
    rows.every((row) => row.command_type === "approve");
  const moreInformationRequired = rows.some(
    (row) => row.command_type === "request_more_information",
  );
  const declined = rows.some((row) => row.command_type === "decline");
  const decisionVersionsAligned =
    rows.every((row) => row.application_chain_aligned) &&
    rows.every(
      (row) => row.command_type === null || row.person_chain_aligned,
    );
  const canonical0251EvidenceAligned =
    allRequiredPersonDecisionsPresent &&
    rows.every(
      (row) =>
        row.canonical_decision_version === row.decision_version_after &&
        row.canonical_outcome === canonicalOutcomeForCommand(row.command_type),
    );
  const canonical0251SnapshotAligned =
    canonical0251EvidenceAligned &&
    rows.every(
      (row) =>
        row.canonical_application_ready &&
        row.person_binding_ready &&
        row.person_status === row.person_status_after &&
        row.person_version === row.person_version_after,
    );
  const first = rows[0];
  return {
    reviewReference,
    hasRequiredAdults,
    allRequiredPersonDecisionsPresent,
    allRequiredPersonsApproved,
    moreInformationRequired,
    declined,
    decisionVersionsAligned,
    canonical0251EvidenceAligned,
    canonical0251SnapshotAligned,
    dependentPolicyReady:
      hasRequiredAdults && rows.every((row) => !row.has_dependent_minor),
    applicationInTeamReview: first?.application_status === "team_review",
    handoffInTeamReview: first?.handoff_state === "under_team_review",
  };
}

async function readAggregateRows(
  client: ClubsTeamPersonReviewAggregateReadClient,
  authority: ClubsTeamPersonReviewAggregateAuthority,
  reviewReference: string,
) {
  const digestPrefix = reviewReference.slice("cclub-review-".length);
  return client.query<AggregateRow>(
    `with latest_0261 as (
       select distinct on (party_member_id)
              recommendation_receipt_id,application_id,party_member_id,
              command_type,application_status_after,person_status_after,
              application_version_after,person_version_after,
              decision_version_after
         from crays_core.clubs_team_membership_person_review_command_receipts
        order by party_member_id,decision_version_after desc
     ), latest_0251 as (
       select distinct on (party_member_id)
              party_member_id,application_id,decision_version,outcome
         from crays_core.clubs_booking_party_team_person_decision_evidence
        order by party_member_id,decision_version desc
     )
     select application.status application_status,
            handoff.state handoff_state,
            exists (
              select 1
                from crays_core.clubs_booking_membership_application_party_members dependent
               where dependent.handoff_id=handoff.handoff_id
                 and dependent.party_role='dependent_minor'
            ) has_dependent_minor,
            case
              when application.version=recommendation.application_version_after
                and application.status='recommended'
                and not exists (
                  select 1
                    from crays_core.clubs_team_membership_person_review_command_receipts any_command
                   where any_command.application_id=application.application_id
                     and any_command.recommendation_receipt_id=
                         recommendation.recommendation_receipt_id
                )
              then true
              else (
                select min(command.application_version_before)=
                         recommendation.application_version_after
                   and max(command.application_version_after)=application.version
                   and count(*)=(application.version-
                       recommendation.application_version_after)
                   and (array_agg(command.application_status_after
                         order by command.application_version_after desc))[1]=
                       application.status
                  from crays_core.clubs_team_membership_person_review_command_receipts command
                 where command.application_id=application.application_id
                   and command.recommendation_receipt_id=
                       recommendation.recommendation_receipt_id
              )
            end application_chain_aligned,
            person.status person_status,person.version person_version,
            command.command_type,command.person_status_after,
            command.person_version_after,command.decision_version_after,
            coalesce((
              select min(history.decision_version_before)=0
                 and max(history.decision_version_after)=command.decision_version_after
                 and count(*)=command.decision_version_after
                from crays_core.clubs_team_membership_person_review_command_receipts history
               where history.party_member_id=person.party_member_id
            ),false)
              and command.person_version_after=person.version
              and command.person_status_after=person.status
              person_chain_aligned,
            evidence.decision_version canonical_decision_version,
            evidence.outcome canonical_outcome,
            exists (
              select 1
                from crays_core.clubs_direct_membership_applications canonical_application
               where canonical_application.application_id=evidence.application_id
                 and canonical_application.account_id=person.account_id
                 and canonical_application.status not in ('declined','withdrawn')
            ) canonical_application_ready,
            person.account_id is not null
              and person.identity_state='ready'
              and person.consent_statement_version=
                  'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1'
              and person.consent_at is not null person_binding_ready
       from crays_core.clubs_booking_membership_direct_applications application
       join crays_core.clubs_booking_membership_application_handoffs handoff
         on handoff.handoff_id=application.handoff_id
        and handoff.direct_application_id=application.application_id
       join crays_core.clubs_booking_membership_application_party_members person
         on person.handoff_id=handoff.handoff_id
        and person.direct_application_id=application.application_id
        and person.party_role in ('primary_applicant','additional_adult')
       join lateral (
         select receipt.recommendation_receipt_id,
                receipt.application_version_after
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
       left join latest_0261 command
         on command.party_member_id=person.party_member_id
        and command.application_id=application.application_id
        and command.recommendation_receipt_id=
            recommendation.recommendation_receipt_id
       left join latest_0251 evidence
         on evidence.party_member_id=person.party_member_id
      where left(encode(sha256(convert_to(concat(
              'crays.clubs.team-direct-review.v1',chr(31),
              application.application_id
            ),'UTF8')),'hex'),32)=$2
      order by person.party_order,person.party_member_id`,
    [authority.actor.organizationId, digestPrefix],
  );
}

export async function readClubsTeamPersonReviewAggregateReadinessWithClient(
  client: ClubsTeamPersonReviewAggregateReadClient,
  authority: ClubsTeamPersonReviewAggregateAuthority,
  reviewReference: string,
  now = new Date(),
) {
  validateAuthority(authority, now);
  if (!/^cclub-review-[a-f0-9]{32}$/.test(reviewReference)) {
    throw new ClubsTeamPersonReviewAggregateReadValidationError();
  }
  await setCoreTenantRole(client, authority.actor.organizationId);
  await assertActorAuthority(client, authority);
  const result = await readAggregateRows(
    client,
    authority,
    reviewReference,
  );
  if (result.rows.length === 0) {
    throw new ClubsTeamPersonReviewAggregateReadNotFoundError();
  }
  return projectClubsTeamPersonReviewAggregateReadiness(
    safeSignals(reviewReference, result.rows),
  );
}

async function inReadTransaction<Result>(
  pool: ClubsTeamPersonReviewAggregateReadPool,
  operation: (client: ClubsTeamPersonReviewAggregateReadClient) => Promise<Result>,
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

export async function readClubsTeamPersonReviewAggregateReadiness(
  authority: ClubsTeamPersonReviewAggregateAuthority,
  reviewReference: string,
) {
  return inReadTransaction(getCorePgPool(), (client) =>
    readClubsTeamPersonReviewAggregateReadinessWithClient(
      client,
      authority,
      reviewReference,
    ),
  );
}

export const clubsTeamPersonReviewAggregateReadRepositoryTestApi = {
  safeSignals,
  validateAuthority,
};
