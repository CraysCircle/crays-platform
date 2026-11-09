import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  readCurrentClubsAmbassadorEntitlementWithClient,
} from "@/db/clubs-ambassador-b2b-entitlement-repository";
import {
  CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT,
  PUBLIC_AMBASSADOR_REFERRAL_DENIED_AUTHORITIES,
  isValidPublicAmbassadorAttributionReceiptId,
  isValidPublicAmbassadorReferralIdempotencyKey,
  validatePublicAmbassadorReferralAttributionCommand,
  type PublicAmbassadorReferralAttributionCommand,
  type PublicAmbassadorReferralAttributionReceiptResult,
  type PublicAmbassadorReferralOwnershipResult,
} from "@/lib/clubs/public-ambassador-referral-attribution-contract";
import {
  isApprovedAmbassadorSlug,
} from "@/lib/clubs/public-ambassador-registry";
import type {
  ClubsAmbassadorB2bBootstrapEvidence,
} from "@/lib/clubs/ambassador-b2b-entitlement-contract";
import {
  projectMemberAmbassadorApplicationStatus,
  type MemberAmbassadorApplicationStatusProjectionInput,
} from "@/lib/clubs/member-ambassador-application-status-contract";

type AttributionRow = {
  attribution_receipt_id: string;
  application_id: string;
  application_account_id: string;
  public_ambassador_slug: string;
  ambassador_profile_id: string;
  opaque_referral_context_sha256: string;
  safe_return_to_sha256: string;
  source_application_status: string;
  idempotency_key: string;
  request_sha256: string;
  attribution_receipt_sha256: string;
  attributed_at: Date | string;
};

type ApplicationRow = {
  application_id: string;
  status: string;
};

type RegistryRow = {
  status: string;
};

type BindingRow = {
  account_binding_receipt_id: string;
  organization_id: string;
  account_id: string;
  ambassador_profile_id: string;
  public_ambassador_slug: string;
};

type OwnershipRow = {
  scoped_ownership_receipt_id: string;
  account_binding_receipt_id: string;
  attribution_receipt_reference_sha256: string;
  request_sha256: string;
};

type MemberAmbassadorApplicationStatusRow = {
  application_status: string;
  application_updated_at: Date | string;
  attribution_receipt_count: number;
  attributed_at: Date | string | null;
  public_ambassador_slug: string | null;
  submitted_at: Date | string;
  lifecycle_candidate_count: number;
  ambassador_command_type:
    | "start_ambassador_review"
    | "request_more_information"
    | "recommend_for_team_review"
    | "do_not_recommend"
    | null;
  ambassador_receipt_aligned: boolean;
  team_command_type: "request_more_information" | "approve" | "decline" | null;
  canonical_outcome:
    | "more_information_required"
    | "approved_for_membership_payment"
    | "declined"
    | null;
  team_decision_aligned: boolean;
  team_go_issued: boolean;
  team_go_aligned: boolean;
  lifecycle_updated_at: Date | string | null;
};

export class PublicAmbassadorReferralAttributionValidationError extends Error {
  constructor(message = "invalid_public_ambassador_referral_attribution") {
    super(message);
    this.name = "PublicAmbassadorReferralAttributionValidationError";
  }
}

export class PublicAmbassadorReferralAttributionNotFoundError extends Error {
  constructor(message = "public_referral_source_not_found") {
    super(message);
    this.name = "PublicAmbassadorReferralAttributionNotFoundError";
  }
}

export class PublicAmbassadorReferralAttributionInactiveError extends Error {
  constructor(message = "public_ambassador_inactive") {
    super(message);
    this.name = "PublicAmbassadorReferralAttributionInactiveError";
  }
}

export class PublicAmbassadorReferralAttributionCrossAmbassadorError extends Error {
  constructor(message = "cross_ambassador_denied") {
    super(message);
    this.name = "PublicAmbassadorReferralAttributionCrossAmbassadorError";
  }
}

export class PublicAmbassadorReferralAttributionConflictError extends Error {
  constructor(message = "public_referral_payload_drift") {
    super(message);
    this.name = "PublicAmbassadorReferralAttributionConflictError";
  }
}

export class PublicAmbassadorReferralAttributionAuthorityError extends Error {
  constructor(message = "scoped_ambassador_authority_required") {
    super(message);
    this.name = "PublicAmbassadorReferralAttributionAuthorityError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function attributionResult(
  row: AttributionRow,
  replayed: boolean,
): PublicAmbassadorReferralAttributionReceiptResult {
  return {
    schema: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.schema,
    version: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.version,
    status: replayed ? "replayed" : "persisted",
    attributionReceiptId: row.attribution_receipt_id,
    attributionReceiptSha256: row.attribution_receipt_sha256,
    ambassadorSlug: row.public_ambassador_slug,
    referralContextDigest: row.opaque_referral_context_sha256,
    safeReturnToDigest: row.safe_return_to_sha256,
    sourceApplicationBinding: true,
    replayed,
    authorities: PUBLIC_AMBASSADOR_REFERRAL_DENIED_AUTHORITIES,
  };
}

function validateAccountId(value: string) {
  if (!value || value.length > 200) {
    throw new PublicAmbassadorReferralAttributionValidationError(
      "invalid_source_account",
    );
  }
}

// BEGIN: member Ambassador application status read projection
export async function readMemberAmbassadorApplicationStatusWithClient(
  client: PoolClient,
  accountId: string,
) {
  validateAccountId(accountId);
  await client.query("select set_config('crays.app_role','core_service',true)");

  const result = await client.query<MemberAmbassadorApplicationStatusRow>(
    `with source_application as (
         select application_id,account_id,status,submitted_at,updated_at
           from crays_core.clubs_direct_membership_applications
          where account_id=$1
          order by submitted_at desc,application_id desc
          limit 1
       ),
       attribution as (
         select count(receipt.attribution_receipt_id)::int receipt_count,
                case when count(receipt.attribution_receipt_id)=1
                  then max(receipt.public_ambassador_slug)
                  else null
                end public_ambassador_slug,
                case when count(receipt.attribution_receipt_id)=1
                  then max(receipt.ambassador_profile_id)
                  else null
                end ambassador_profile_id,
                case when count(receipt.attribution_receipt_id)=1
                  then max(receipt.attributed_at)
                  else null
                end attributed_at
           from source_application application
           left join crays_core.clubs_public_ambassador_referral_attribution_receipts receipt
             on receipt.application_id=application.application_id
            and receipt.application_account_id=application.account_id
            and receipt.application_account_id=$1
            and receipt.source_application_binding=true
       ),
       lifecycle_candidates as (
         select recommendation.command_type ambassador_command_type,
                team_command.command_type team_command_type,
                canonical_decision.outcome canonical_outcome,
                team_go.team_go_evidence_id is not null team_go_issued,
                coalesce(
                  team_go.issued_at,
                  canonical_decision.decided_at,
                  team_command.recorded_at,
                  recommendation.recorded_at
                ) lifecycle_updated_at,
                (
                  recommendation.recommendation_receipt_id is not null
                  and recommendation.persisted_record
                  and not recommendation.synthetic_source
                  and (
                    attribution.receipt_count=0
                    or (
                      attribution.receipt_count=1
                      and attribution.ambassador_profile_id=
                          recommendation.ambassador_profile_id
                    )
                  )
                  and (
                    (
                      team_command.command_receipt_id is null
                      and team_go.team_go_evidence_id is null
                      and booking_application.status=
                          recommendation.application_status_after
                      and booking_application.version=
                          recommendation.application_version_after
                    )
                    or (
                      team_command.command_receipt_id is not null
                      and recommendation.command_type='recommend_for_team_review'
                      and recommendation.application_status_after='recommended'
                      and team_command.recommendation_receipt_id=
                          recommendation.recommendation_receipt_id
                      and team_command.application_version_before>=
                          recommendation.application_version_after
                    )
                  )
                ) ambassador_receipt_aligned,
                (
                  team_command.command_receipt_id is not null
                  and team_command.persisted_record
                  and not team_command.synthetic_source
                  and canonical_decision.decision_evidence_id is not null
                  and canonical_decision.decision_version=
                      team_command.decision_version_after
                  and canonical_decision.decided_at=team_command.recorded_at
                  and (
                    (
                      team_command.command_type='request_more_information'
                      and canonical_decision.outcome='more_information_required'
                    )
                    or (
                      team_command.command_type='approve'
                      and canonical_decision.outcome=
                          'approved_for_membership_payment'
                    )
                    or (
                      team_command.command_type='decline'
                      and canonical_decision.outcome='declined'
                    )
                  )
                  and (
                    (
                      team_go.team_go_evidence_id is null
                      and booking_application.status=
                          team_command.application_status_after
                      and booking_application.version=
                          team_command.application_version_after
                      and person.status=team_command.person_status_after
                      and person.version=team_command.person_version_after
                      and handoff.state=case team_command.command_type
                        when 'approve' then 'under_team_review'
                        when 'decline' then 'declined'
                        else 'more_information_required'
                      end
                    )
                    or (
                      team_go.team_go_evidence_id is not null
                      and team_command.command_type='approve'
                      and canonical_decision.outcome=
                          'approved_for_membership_payment'
                      and booking_application.status=
                          'approved_for_membership_payment'
                      and booking_application.version=
                          team_command.application_version_after+1
                      and person.status='approved_for_membership_payment'
                      and person.version=team_command.person_version_after+1
                      and handoff.state='approved_for_membership_payment'
                      and team_go.issued_at>=team_command.recorded_at
                    )
                  )
                ) team_decision_aligned,
                (
                  team_go.team_go_evidence_id is not null
                  and team_command.command_type='approve'
                  and canonical_decision.outcome=
                      'approved_for_membership_payment'
                  and canonical_decision.decision_version=
                      team_command.decision_version_after
                  and canonical_decision.decided_at=team_command.recorded_at
                  and booking_application.status=
                      'approved_for_membership_payment'
                  and booking_application.version=
                      team_command.application_version_after+1
                  and person.status='approved_for_membership_payment'
                  and person.version=team_command.person_version_after+1
                  and handoff.state='approved_for_membership_payment'
                  and team_go.issued_at>=canonical_decision.decided_at
                ) team_go_aligned
           from source_application source
           cross join attribution
           join crays_core.clubs_booking_membership_application_party_members person
             on person.account_id=source.account_id
            and person.party_role in ('primary_applicant','additional_adult')
            and person.identity_state='ready'
            and person.consent_statement_version=
                'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1'
            and person.consent_at is not null
           join crays_core.clubs_booking_membership_direct_applications booking_application
             on booking_application.application_id=person.direct_application_id
           join crays_core.clubs_booking_membership_application_handoffs handoff
             on handoff.handoff_id=person.handoff_id
            and handoff.direct_application_id=booking_application.application_id
           left join lateral (
             select receipt.recommendation_receipt_id,
                    receipt.ambassador_profile_id,
                    receipt.command_type,
                    receipt.application_status_after,
                    receipt.application_version_after,
                    receipt.persisted_record,
                    receipt.synthetic_source,
                    receipt.recorded_at
               from crays_core.clubs_ambassador_application_review_recommendation_receipts receipt
              where receipt.application_id=booking_application.application_id
              order by receipt.application_version_after desc,receipt.recorded_at desc
              limit 1
           ) recommendation on true
           left join lateral (
             select receipt.command_receipt_id,
                    receipt.recommendation_receipt_id,
                    receipt.command_type,
                    receipt.application_status_after,
                    receipt.person_status_after,
                    receipt.application_version_before,
                    receipt.application_version_after,
                    receipt.person_version_after,
                    receipt.decision_version_after,
                    receipt.persisted_record,
                    receipt.synthetic_source,
                    receipt.recorded_at
               from crays_core.clubs_team_membership_person_review_command_receipts receipt
              where receipt.application_id=booking_application.application_id
                and receipt.handoff_id=handoff.handoff_id
                and receipt.party_member_id=person.party_member_id
              order by receipt.decision_version_after desc,receipt.recorded_at desc
              limit 1
           ) team_command on true
           left join lateral (
             select evidence.decision_evidence_id,
                    evidence.decision_version,
                    evidence.outcome,
                    evidence.decided_at
               from crays_core.clubs_booking_party_team_person_decision_evidence evidence
              where evidence.application_id=source.application_id
                and evidence.subject_account_id=source.account_id
                and evidence.handoff_id=handoff.handoff_id
                and evidence.party_member_id=person.party_member_id
              order by evidence.decision_version desc,evidence.decided_at desc
              limit 1
           ) canonical_decision on true
           left join crays_core.clubs_booking_party_team_go_evidence team_go
             on team_go.handoff_id=handoff.handoff_id
          where recommendation.recommendation_receipt_id is not null
             or team_command.command_receipt_id is not null
             or canonical_decision.decision_evidence_id is not null
             or team_go.team_go_evidence_id is not null
       ),
       lifecycle as (
         select count(*)::int candidate_count,
                case when count(*)=1 then max(ambassador_command_type) end
                  ambassador_command_type,
                case when count(*)=1 then bool_and(ambassador_receipt_aligned)
                  else false
                end ambassador_receipt_aligned,
                case when count(*)=1 then max(team_command_type) end
                  team_command_type,
                case when count(*)=1 then max(canonical_outcome) end
                  canonical_outcome,
                case when count(*)=1 then bool_and(team_decision_aligned)
                  else false
                end team_decision_aligned,
                case when count(*)=1 then bool_and(team_go_issued)
                  else false
                end team_go_issued,
                case when count(*)=1 then bool_and(team_go_aligned)
                  else false
                end team_go_aligned,
                max(lifecycle_updated_at) lifecycle_updated_at
           from lifecycle_candidates
       )
       select application.status application_status,
              application.submitted_at,
              application.updated_at application_updated_at,
              attribution.receipt_count attribution_receipt_count,
              attribution.public_ambassador_slug,
              attribution.attributed_at,
              lifecycle.candidate_count lifecycle_candidate_count,
              lifecycle.ambassador_command_type,
              lifecycle.ambassador_receipt_aligned,
              lifecycle.team_command_type,
              lifecycle.canonical_outcome,
              lifecycle.team_decision_aligned,
              lifecycle.team_go_issued,
              lifecycle.team_go_aligned,
              lifecycle.lifecycle_updated_at
         from source_application application
         cross join attribution
         cross join lifecycle`,
    [accountId],
  );

  const row = result.rows[0];
  const projection: MemberAmbassadorApplicationStatusProjectionInput | null =
    row
      ? {
          applicationStatus: row.application_status,
          applicationUpdatedAt: row.application_updated_at,
          attributedAt: row.attributed_at,
          ambassadorSlug: row.public_ambassador_slug,
          submittedAt: row.submitted_at,
          attributionAmbiguous: row.attribution_receipt_count > 1,
          lifecycleAmbiguous: row.lifecycle_candidate_count > 1,
          ambassadorCommand: row.ambassador_command_type,
          ambassadorReceiptAligned: row.ambassador_receipt_aligned,
          teamCommand: row.team_command_type,
          canonicalOutcome: row.canonical_outcome,
          teamDecisionAligned: row.team_decision_aligned,
          teamGoIssued: row.team_go_issued,
          teamGoAligned: row.team_go_aligned,
          lifecycleUpdatedAt: row.lifecycle_updated_at,
        }
      : null;
  return projectMemberAmbassadorApplicationStatus(projection);
}
// END: member Ambassador application status read projection

function validateAttributionCommand(
  idempotencyKey: string,
  command: PublicAmbassadorReferralAttributionCommand,
) {
  const reason = validatePublicAmbassadorReferralAttributionCommand(command);
  if (
    reason ||
    !isValidPublicAmbassadorReferralIdempotencyKey(idempotencyKey)
  ) {
    throw new PublicAmbassadorReferralAttributionValidationError(
      reason ?? "INVALID_IDEMPOTENCY_KEY",
    );
  }
}

async function assertAdmittedActiveAmbassador(
  client: PoolClient,
  ambassadorSlug: string,
) {
  if (!isApprovedAmbassadorSlug(ambassadorSlug)) {
    throw new PublicAmbassadorReferralAttributionNotFoundError(
      "ambassador_not_found",
    );
  }
  const ambassadorProfileId =
    "ambassador_profile_" + ambassadorSlug.replaceAll("-", "_");
  const registry = await client.query<RegistryRow>(
    `select status
       from crays_core.clubs_ambassador_registry_events
      where ambassador_profile_id=$1
      order by event_version desc
      limit 1`,
    [ambassadorProfileId],
  );
  if (registry.rows[0] && registry.rows[0].status !== "active") {
    throw new PublicAmbassadorReferralAttributionInactiveError();
  }
  return ambassadorProfileId;
}

export async function persistPublicAmbassadorReferralAttributionWithClient(
  client: PoolClient,
  accountId: string,
  idempotencyKey: string,
  command: PublicAmbassadorReferralAttributionCommand,
) {
  validateAccountId(accountId);
  validateAttributionCommand(idempotencyKey, command);
  await client.query("select set_config('crays.app_role','core_service',true)");

  const ambassadorProfileId = await assertAdmittedActiveAmbassador(
    client,
    command.ambassadorSlug,
  );
  const referralContextSha256 = sha256(command.opaqueReferralContext);
  const safeReturnToSha256 = sha256(command.safeReturnTo);
  const requestSha256 = sha256(
    JSON.stringify({
      schema: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.schema,
      accountId,
      ambassadorSlug: command.ambassadorSlug,
      referralContextSha256,
      safeReturnToSha256,
      sourceApplicationId: command.sourceApplicationId,
    }),
  );

  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    "clubs-public-referral-account:" + accountId,
  ]);
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    "clubs-public-referral-application:" + command.sourceApplicationId,
  ]);

  const keyedReplay = await client.query<AttributionRow>(
    `select *
       from crays_core.clubs_public_ambassador_referral_attribution_receipts
      where application_account_id=$1 and idempotency_key=$2
      limit 1`,
    [accountId, idempotencyKey],
  );
  if (keyedReplay.rows[0]) {
    if (keyedReplay.rows[0].request_sha256 !== requestSha256) {
      throw new PublicAmbassadorReferralAttributionConflictError();
    }
    return attributionResult(keyedReplay.rows[0], true);
  }

  const application = await client.query<ApplicationRow>(
    `select application_id,status
       from crays_core.clubs_direct_membership_applications
      where application_id=$1 and account_id=$2
      limit 1
      for share`,
    [command.sourceApplicationId, accountId],
  );
  if (!application.rows[0]) {
    throw new PublicAmbassadorReferralAttributionNotFoundError(
      "source_application_not_found",
    );
  }

  const applicationAttribution = await client.query<AttributionRow>(
    `select *
       from crays_core.clubs_public_ambassador_referral_attribution_receipts
      where application_id=$1
      limit 1`,
    [command.sourceApplicationId],
  );
  if (applicationAttribution.rows[0]) {
    if (
      applicationAttribution.rows[0].public_ambassador_slug !==
      command.ambassadorSlug
    ) {
      throw new PublicAmbassadorReferralAttributionCrossAmbassadorError();
    }
    if (applicationAttribution.rows[0].request_sha256 !== requestSha256) {
      throw new PublicAmbassadorReferralAttributionConflictError();
    }
    return attributionResult(applicationAttribution.rows[0], true);
  }

  const attributionReceiptId =
    "clubs-public-ambassador-referral-attribution_" + randomUUID();
  const attributedAt = new Date();
  const attributionReceiptSha256 = sha256(
    JSON.stringify({
      schema: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.schema,
      version: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.version,
      attributionReceiptId,
      requestSha256,
      ambassadorProfileId,
      applicationId: command.sourceApplicationId,
      applicationAccountId: accountId,
      attributedAt: attributedAt.toISOString(),
    }),
  );
  const inserted = await client.query<AttributionRow>(
    `insert into
       crays_core.clubs_public_ambassador_referral_attribution_receipts
      (attribution_receipt_id,application_id,application_account_id,
       public_ambassador_slug,ambassador_profile_id,
       opaque_referral_context_sha256,safe_return_to_sha256,
       source_application_status,registry_schema,registry_version,
       source_application_binding,opaque_context_persisted_raw,
       idempotency_key,request_sha256,attribution_receipt_sha256,
       attributed_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,
       'crays.clubs.public-ambassador-directory-referral-ui.v1','1.0.0',
       true,false,$9,$10,$11,$12)
     returning *`,
    [
      attributionReceiptId,
      command.sourceApplicationId,
      accountId,
      command.ambassadorSlug,
      ambassadorProfileId,
      referralContextSha256,
      safeReturnToSha256,
      application.rows[0].status,
      idempotencyKey,
      requestSha256,
      attributionReceiptSha256,
      attributedAt.toISOString(),
    ],
  );
  if (!inserted.rows[0]) {
    throw new PublicAmbassadorReferralAttributionConflictError(
      "attribution_insert_failed",
    );
  }
  return attributionResult(inserted.rows[0], false);
}

function validateOwnershipCommand(
  attributionReceiptId: string,
  idempotencyKey: string,
) {
  if (
    !isValidPublicAmbassadorAttributionReceiptId(attributionReceiptId) ||
    !isValidPublicAmbassadorReferralIdempotencyKey(idempotencyKey)
  ) {
    throw new PublicAmbassadorReferralAttributionValidationError(
      "invalid_ownership_command",
    );
  }
}

function ownershipResult(
  row: OwnershipRow,
  replayed: boolean,
): PublicAmbassadorReferralOwnershipResult {
  return {
    status: replayed ? "replayed" : "persisted",
    scopedOwnershipReceiptId: row.scoped_ownership_receipt_id,
    attributionReceiptSha256: row.attribution_receipt_reference_sha256,
    resourceKind: "application",
    foreignIdentifiersExposed: false,
    replayed,
  };
}

export async function materializePublicAmbassadorApplicationOwnershipWithClient(
  client: PoolClient,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  attributionReceiptId: string,
  idempotencyKey: string,
) {
  validateOwnershipCommand(attributionReceiptId, idempotencyKey);
  let entitlement;
  try {
    entitlement = await readCurrentClubsAmbassadorEntitlementWithClient(
      client,
      evidence,
    );
  } catch {
    throw new PublicAmbassadorReferralAttributionAuthorityError();
  }
  if (entitlement.entitlement !== "AMBASSADOR_SCOPED_ACCESS") {
    throw new PublicAmbassadorReferralAttributionAuthorityError(
      "scoped_entitlement_required",
    );
  }

  const binding = await client.query<BindingRow>(
    `select account_binding_receipt_id,organization_id,account_id,
            ambassador_profile_id,public_ambassador_slug
       from crays_core.clubs_ambassador_b2b_entitlement_account_receipts
      where account_id=$1 and organization_id=$2 and subject_sha256=$3
        and entitlement_key='AMBASSADOR_SCOPED_ACCESS'
        and entitlement_active=true
      limit 2`,
    [evidence.accountId, evidence.organizationId, evidence.subjectSha256],
  );
  if (binding.rows.length !== 1) {
    throw new PublicAmbassadorReferralAttributionAuthorityError();
  }

  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    "clubs-public-referral-ownership:" + binding.rows[0].account_binding_receipt_id,
  ]);
  const attribution = await client.query<AttributionRow>(
    `select *
       from crays_core.clubs_public_ambassador_referral_attribution_receipts
      where attribution_receipt_id=$1
      limit 1`,
    [attributionReceiptId],
  );
  if (!attribution.rows[0]) {
    throw new PublicAmbassadorReferralAttributionNotFoundError(
      "attribution_not_found",
    );
  }
  if (
    attribution.rows[0].public_ambassador_slug !==
      binding.rows[0].public_ambassador_slug ||
    attribution.rows[0].ambassador_profile_id !==
      binding.rows[0].ambassador_profile_id
  ) {
    throw new PublicAmbassadorReferralAttributionCrossAmbassadorError();
  }

  const resourceReferenceSha256 = sha256(attribution.rows[0].application_id);
  const requestSha256 = sha256(
    JSON.stringify({
      schema: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.schema,
      accountBindingReceiptId: binding.rows[0].account_binding_receipt_id,
      attributionReceiptSha256:
        attribution.rows[0].attribution_receipt_sha256,
      resourceKind: "application",
      resourceReferenceSha256,
    }),
  );
  const keyedReplay = await client.query<OwnershipRow>(
    `select scoped_ownership_receipt_id,account_binding_receipt_id,
            attribution_receipt_reference_sha256,request_sha256
       from crays_core.clubs_ambassador_scoped_resource_ownership_receipts
      where account_binding_receipt_id=$1 and idempotency_key=$2
      limit 1`,
    [binding.rows[0].account_binding_receipt_id, idempotencyKey],
  );
  if (keyedReplay.rows[0]) {
    if (
      keyedReplay.rows[0].request_sha256 !== requestSha256 ||
      keyedReplay.rows[0].attribution_receipt_reference_sha256 !==
        attribution.rows[0].attribution_receipt_sha256
    ) {
      throw new PublicAmbassadorReferralAttributionConflictError();
    }
    return ownershipResult(keyedReplay.rows[0], true);
  }

  const resourceOwnership = await client.query<OwnershipRow>(
    `select scoped_ownership_receipt_id,account_binding_receipt_id,
            attribution_receipt_reference_sha256,request_sha256
       from crays_core.clubs_ambassador_scoped_resource_ownership_receipts
      where organization_id=$1 and resource_kind='application'
        and resource_reference_sha256=$2
      limit 2`,
    [binding.rows[0].organization_id, resourceReferenceSha256],
  );
  if (resourceOwnership.rows[0]) {
    if (
      resourceOwnership.rows.length !== 1 ||
      resourceOwnership.rows[0].account_binding_receipt_id !==
        binding.rows[0].account_binding_receipt_id
    ) {
      throw new PublicAmbassadorReferralAttributionCrossAmbassadorError();
    }
    if (
      resourceOwnership.rows[0].request_sha256 !== requestSha256 ||
      resourceOwnership.rows[0].attribution_receipt_reference_sha256 !==
        attribution.rows[0].attribution_receipt_sha256
    ) {
      throw new PublicAmbassadorReferralAttributionConflictError();
    }
    return ownershipResult(resourceOwnership.rows[0], true);
  }

  const scopedOwnershipReceiptId =
    "clubs-ambassador-scoped-ownership_" + randomUUID();
  const recordedAt = new Date();
  const ownershipReceiptSha256 = sha256(
    JSON.stringify({
      scopedOwnershipReceiptId,
      requestSha256,
      attributionReceiptSha256:
        attribution.rows[0].attribution_receipt_sha256,
      recordedAt: recordedAt.toISOString(),
    }),
  );
  const inserted = await client.query<OwnershipRow>(
    `insert into
       crays_core.clubs_ambassador_scoped_resource_ownership_receipts
      (scoped_ownership_receipt_id,account_binding_receipt_id,
       organization_id,account_id,ambassador_profile_id,entitlement_key,
       resource_kind,resource_reference_sha256,attribution_source_kind,
       attribution_receipt_reference_sha256,attribution_receipt_verified,
       ownership_state,idempotency_key,request_sha256,
       ownership_receipt_sha256,recorded_at)
     values ($1,$2,$3,$4,$5,'AMBASSADOR_SCOPED_ACCESS',
       'application',$6,'public_referral_attribution',$7,true,'confirmed',
       $8,$9,$10,$11)
     returning scoped_ownership_receipt_id,account_binding_receipt_id,
       attribution_receipt_reference_sha256,request_sha256`,
    [
      scopedOwnershipReceiptId,
      binding.rows[0].account_binding_receipt_id,
      binding.rows[0].organization_id,
      binding.rows[0].account_id,
      binding.rows[0].ambassador_profile_id,
      resourceReferenceSha256,
      attribution.rows[0].attribution_receipt_sha256,
      idempotencyKey,
      requestSha256,
      ownershipReceiptSha256,
      recordedAt.toISOString(),
    ],
  );
  if (!inserted.rows[0]) {
    throw new PublicAmbassadorReferralAttributionConflictError(
      "ownership_insert_failed",
    );
  }
  return ownershipResult(inserted.rows[0], false);
}

async function withTransaction<Result>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<Result>,
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

async function withReadOnlyTransaction<Result>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<Result>,
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

export async function readMemberAmbassadorApplicationStatusWithPool(
  pool: Pool,
  accountId: string,
) {
  return withReadOnlyTransaction(pool, (client) =>
    readMemberAmbassadorApplicationStatusWithClient(client, accountId),
  );
}

export async function persistPublicAmbassadorReferralAttributionWithPool(
  pool: Pool,
  accountId: string,
  idempotencyKey: string,
  command: PublicAmbassadorReferralAttributionCommand,
) {
  return withTransaction(pool, (client) =>
    persistPublicAmbassadorReferralAttributionWithClient(
      client,
      accountId,
      idempotencyKey,
      command,
    ),
  );
}

export async function materializePublicAmbassadorApplicationOwnershipWithPool(
  pool: Pool,
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  attributionReceiptId: string,
  idempotencyKey: string,
) {
  return withTransaction(pool, (client) =>
    materializePublicAmbassadorApplicationOwnershipWithClient(
      client,
      evidence,
      attributionReceiptId,
      idempotencyKey,
    ),
  );
}

export async function persistPublicAmbassadorReferralAttribution(
  accountId: string,
  idempotencyKey: string,
  command: PublicAmbassadorReferralAttributionCommand,
) {
  return persistPublicAmbassadorReferralAttributionWithPool(
    getCorePgPool(),
    accountId,
    idempotencyKey,
    command,
  );
}

export async function readMemberAmbassadorApplicationStatus(
  accountId: string,
) {
  return readMemberAmbassadorApplicationStatusWithPool(
    getCorePgPool(),
    accountId,
  );
}

export async function materializePublicAmbassadorApplicationOwnership(
  evidence: ClubsAmbassadorB2bBootstrapEvidence,
  attributionReceiptId: string,
  idempotencyKey: string,
) {
  return materializePublicAmbassadorApplicationOwnershipWithPool(
    getCorePgPool(),
    evidence,
    attributionReceiptId,
    idempotencyKey,
  );
}
