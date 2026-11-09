import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import {
  DIRECT_MEMBERSHIP_APPLICATION_REVIEWER_BINDING_CONTRACT,
  type DirectMembershipReviewerResolution,
} from "@/lib/clubs/direct-membership-application-reviewer-binding-contract";

type ReviewerBindingRow = {
  binding_id: string;
  reviewer_profile_id: string;
  canonical_account_id: string;
  purpose_role: "AMBASSADOR_APPLICATION_REVIEWER";
  granted_capabilities: string[];
  canonical_account_status: string;
  source_principal_status: string;
  valid_from: Date | string;
  expires_at: Date | string | null;
  revoked_at: Date | string | null;
};

const deniedAuthorities =
  DIRECT_MEMBERSHIP_APPLICATION_REVIEWER_BINDING_CONTRACT.deniedAuthorities;

function unavailable(
  state: DirectMembershipReviewerResolution["state"],
): DirectMembershipReviewerResolution {
  return {
    state,
    reviewerProfileId: null,
    canonicalAccountId: null,
    bindingId: null,
    purposeRole: null,
    capabilities: [],
    authorities: deniedAuthorities,
  };
}

export async function resolveDirectMembershipApplicationReviewerWithClient(
  client: Pick<PoolClient, "query">,
  providerSubject: string,
  observedAt = new Date(),
): Promise<DirectMembershipReviewerResolution> {
  if (!providerSubject.trim()) return unavailable("identity_not_bound");

  await client.query("select set_config('crays.app_role','core_service',true)");
  const subjectSha256 = createHash("sha256")
    .update(providerSubject)
    .digest("hex");
  const result = await client.query<ReviewerBindingRow>(
    `select b.binding_id,b.reviewer_profile_id,b.canonical_account_id,
            b.purpose_role,b.granted_capabilities,
            canonical.status canonical_account_status,
            source_principal.status source_principal_status,
            b.valid_from,b.expires_at,r.revoked_at
       from crays_core.auth_identities i
       join crays_core.crays_accounts source_principal
         on source_principal.account_id=i.account_id
       join crays_core.clubs_direct_membership_application_reviewer_bindings b
         on b.source_principal_account_id=i.account_id
        and b.source_auth_identity_id=i.identity_id
        and b.provider_key=i.provider_key
        and b.provider_subject_sha256=$2
       join crays_core.crays_accounts canonical
         on canonical.account_id=b.canonical_account_id
       join crays_core.clubs_canonical_account_projection_receipts projection
         on projection.projection_receipt_id=
              b.canonical_account_projection_receipt_id
        and projection.canonical_account_id=b.canonical_account_id
        and projection.source_business_subject_sha256=$2
        and projection.source_account_status='active'
        and projection.projected_contact_redacted=true
       left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations r
         on r.binding_id=b.binding_id
      where i.provider_key='auth0'
        and i.provider_subject=$1
        and i.verified=true
        and b.route_key='direct-membership-application'
      order by b.valid_from desc`,
    [providerSubject, subjectSha256],
  );

  if (result.rows.length === 0) return unavailable("identity_not_bound");
  if (result.rows.length !== 1)
    return unavailable("reviewer_binding_ambiguous");

  const row = result.rows[0];
  if (
    row.canonical_account_status !== "active" ||
    row.source_principal_status !== "active"
  )
    return unavailable("core_account_not_active");
  if (row.revoked_at) return unavailable("reviewer_binding_revoked");
  if (new Date(row.valid_from).getTime() > observedAt.getTime())
    return unavailable("reviewer_binding_not_ready");
  if (
    row.expires_at &&
    new Date(row.expires_at).getTime() <= observedAt.getTime()
  )
    return unavailable("reviewer_binding_expired");

  return {
    state: "ready",
    reviewerProfileId: row.reviewer_profile_id,
    canonicalAccountId: row.canonical_account_id,
    bindingId: row.binding_id,
    purposeRole: row.purpose_role,
    capabilities: row.granted_capabilities,
    authorities: deniedAuthorities,
  };
}
