import {
  projectClubsTeamDirectReviewItem,
  type ClubsTeamDirectReviewApplicationStatus,
  type ClubsTeamDirectReviewItem,
} from "@/lib/clubs/team-direct-membership-application-review-read-contract";

export const CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT = {
  schema: "crays.clubs.ambassador-direct-membership-application-inbox.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/ambassador/membership-applications",
  method: "GET",
  cache: "no-store",
  views: ["queue", "detail"],
  authentication: "exact_crays_pro_b2b_bootstrap",
  scope: {
    activeEntitlementBindingRequired: true,
    exactAccountTenantSubjectBindingRequired: true,
    exactAmbassadorProfileRequired: true,
    fullAccess: "own_tenant_assignments_only",
    scopedAccess: "own_tenant_assignments_plus_exact_ownership_receipt",
    foreignReference: "forbidden_without_projection",
    unknownOrUnownedReference: "not_found_without_count",
  },
  publicFields: [
    "reviewReference",
    "applicationStatus",
    "submittedAt",
    "updatedAt",
    "assignmentState",
    "decisionState",
    "reconcileState",
    "detailHref",
    "nextAction",
  ],
  deniedAuthorities: {
    globalInboxGranted: false,
    reviewerAuthorityGranted: false,
    decisionWriteGranted: false,
    teamGoGranted: false,
    membershipCreated: false,
    paymentAuthorityGranted: false,
    commissionControlPlaneGranted: false,
    entitlementControlPlaneGranted: false,
  },
} as const;

export type ClubsAmbassadorDirectInboxSignals = {
  reviewReference: string;
  applicationStatus: ClubsTeamDirectReviewApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  reviewerReady: boolean;
  decisionReceiptPersisted: boolean;
  teamGoReceiptPersisted: boolean;
};

export function projectClubsAmbassadorDirectInboxItem(
  signals: ClubsAmbassadorDirectInboxSignals,
  view: "queue" | "detail",
): ClubsTeamDirectReviewItem {
  const item = projectClubsTeamDirectReviewItem(signals, view);
  return {
    ...item,
    detailHref: `${CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.endpoint}?reviewReference=${encodeURIComponent(item.reviewReference)}`,
  };
}

export function unavailableClubsAmbassadorDirectInbox() {
  return {
    schema:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.schema,
    version:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.version,
    status: "temporarily_unavailable" as const,
  };
}
