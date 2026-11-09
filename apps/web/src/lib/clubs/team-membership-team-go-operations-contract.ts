import {
  CLUBS_APPROVED_AMBASSADORS,
  type ApprovedAmbassadorSlug,
} from "@/lib/clubs/public-ambassador-registry";
import type { ClubsTeamMembershipPersonReviewAuthority } from "@/lib/clubs/team-membership-person-review-command-contract";

export const CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT = {
  schema: "crays.clubs.team-membership-team-go-operations.v1",
  version: "1.0.0",
  endpoint:
    "/api/crays/clubs/team/membership-applications/team-go-status",
  method: "GET",
  cache: "no-store",
  maximumItems: 25,
  authentication: {
    authFirst: true,
    exactB2bSessionRequired: true,
    activeCraysTeamActorRequired: true,
    tenantRoleAndAssignmentBindingRequired: true,
    strongAuthenticationRequired: true,
  },
  sources: {
    ambassadorReview: "0260_immutable_recommendation_receipt",
    personReview: "0261_immutable_person_review_receipt",
    canonicalDecision: "0251_immutable_person_decision_evidence",
    teamGo: "0251_immutable_team_go_evidence",
    currentSnapshotsRequired: true,
    ambiguityNeverReady: true,
  },
  safeFields: [
    "reviewReference",
    "ambassador.slug",
    "ambassador.displayName",
    "lifecycleState",
    "updatedAt",
    "readiness",
    "detailHref",
    "actionHref",
  ],
  deniedProjection: {
    internalIdentifiers: false,
    personalInformation: false,
    globalOrForeignCounts: false,
    decisionPayload: false,
    receiptIdentifiersOrHashes: false,
    economics: false,
    membershipAuthorityGranted: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  },
} as const;

export type ClubsTeamMembershipTeamGoOperationsAuthority =
  ClubsTeamMembershipPersonReviewAuthority;

export type ClubsTeamMembershipTeamGoLifecycleState =
  | "ambassador_review"
  | "team_review"
  | "alignment_required"
  | "ready_to_issue"
  | "issued"
  | "declined"
  | "reconciliation_required";

export type ClubsTeamMembershipTeamGoOperationsSignals = Readonly<{
  reviewReference: string;
  ambassadorDisplayName: string;
  ambassadorCommand:
    | "start_ambassador_review"
    | "request_more_information"
    | "recommend_for_team_review"
    | "do_not_recommend"
    | null;
  ambassadorReceiptPresent: boolean;
  ambassadorReceiptAligned: boolean;
  teamDecisionReceiptPresent: boolean;
  allRequiredPersonDecisionsPresent: boolean;
  allRequiredPersonsApproved: boolean;
  moreInformationRequired: boolean;
  declined: boolean;
  decisionVersionsAligned: boolean;
  canonical0251EvidenceAligned: boolean;
  canonical0251SnapshotAligned: boolean;
  dependentPolicyReady: boolean;
  teamGoIssueReady: boolean;
  teamGoIssued: boolean;
  teamGoEvidenceAligned: boolean;
  evidenceAmbiguous: boolean;
  updatedAt: string;
}>;

export type ClubsTeamMembershipTeamGoOperationsItem = Readonly<{
  reviewReference: string;
  ambassador: Readonly<{
    slug: ApprovedAmbassadorSlug;
    displayName: string;
  }>;
  lifecycleState: ClubsTeamMembershipTeamGoLifecycleState;
  updatedAt: string;
  readiness: Readonly<{
    ambassadorReceiptAligned: boolean;
    allRequiredPersonDecisionsPresent: boolean;
    allRequiredPersonsApproved: boolean;
    decisionVersionsAligned: boolean;
    canonical0251EvidenceAligned: boolean;
    canonical0251SnapshotAligned: boolean;
    dependentPolicyReady: boolean;
    teamGoIssueReady: boolean;
    teamGoIssued: boolean;
    teamGoEvidenceAligned: boolean;
    alignmentRequired: boolean;
    reconciliationRequired: boolean;
  }>;
  detailHref: string;
  actionHref: string;
}>;

export type ClubsTeamMembershipTeamGoOperationsResponse = Readonly<{
  schema: typeof CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.schema;
  version: typeof CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.version;
  status: "ready";
  items: readonly ClubsTeamMembershipTeamGoOperationsItem[];
  truncated: boolean;
  membershipAuthorityGranted: false;
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  commissionAuthorityGranted: false;
}>;

function admittedAmbassador(displayName: string) {
  const matches = Object.values(CLUBS_APPROVED_AMBASSADORS).filter(
    (profile) => profile.name === displayName,
  );
  if (matches.length !== 1) {
    throw new Error("ambassador_public_projection_not_exact");
  }
  return {
    slug: matches[0].slug as ApprovedAmbassadorSlug,
    displayName: matches[0].name,
  };
}

function lifecycleState(
  signals: ClubsTeamMembershipTeamGoOperationsSignals,
): ClubsTeamMembershipTeamGoLifecycleState {
  const reconciliationRequired =
    signals.evidenceAmbiguous ||
    (signals.ambassadorReceiptPresent &&
      !signals.ambassadorReceiptAligned) ||
    (signals.teamDecisionReceiptPresent &&
      !signals.decisionVersionsAligned) ||
    (signals.teamGoIssued && !signals.teamGoEvidenceAligned);
  if (reconciliationRequired) return "reconciliation_required";
  if (signals.teamGoIssued) return "issued";
  if (!signals.ambassadorReceiptPresent) return "alignment_required";
  if (signals.ambassadorCommand === "do_not_recommend") return "declined";
  if (
    signals.ambassadorCommand === "start_ambassador_review" ||
    signals.ambassadorCommand === "request_more_information"
  ) {
    return "ambassador_review";
  }
  if (signals.declined) return "declined";
  if (signals.teamGoIssueReady) return "ready_to_issue";
  if (
    signals.allRequiredPersonDecisionsPresent &&
    (!signals.canonical0251EvidenceAligned ||
      !signals.canonical0251SnapshotAligned)
  ) {
    return "alignment_required";
  }
  return "team_review";
}

export function projectClubsTeamMembershipTeamGoOperationsItem(
  signals: ClubsTeamMembershipTeamGoOperationsSignals,
): ClubsTeamMembershipTeamGoOperationsItem {
  if (
    !/^cclub-review-[a-f0-9]{32}$/.test(signals.reviewReference) ||
    !Number.isFinite(new Date(signals.updatedAt).getTime()) ||
    (signals.teamGoIssueReady &&
      (!signals.allRequiredPersonDecisionsPresent ||
        !signals.allRequiredPersonsApproved ||
        !signals.decisionVersionsAligned ||
        !signals.canonical0251EvidenceAligned ||
        !signals.canonical0251SnapshotAligned ||
        !signals.dependentPolicyReady ||
        signals.teamGoIssued))
  ) {
    throw new Error("invalid_team_go_operations_projection");
  }
  const state = lifecycleState(signals);
  const reconciliationRequired = state === "reconciliation_required";
  const alignmentRequired = state === "alignment_required";
  const detailHref = `${CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.endpoint.replace(
    "/team-go-status",
    "/person-review/aggregate-readiness",
  )}?reviewReference=${encodeURIComponent(signals.reviewReference)}`;
  return {
    reviewReference: signals.reviewReference,
    ambassador: admittedAmbassador(signals.ambassadorDisplayName),
    lifecycleState: state,
    updatedAt: new Date(signals.updatedAt).toISOString(),
    readiness: {
      ambassadorReceiptAligned: signals.ambassadorReceiptAligned,
      allRequiredPersonDecisionsPresent:
        signals.allRequiredPersonDecisionsPresent,
      allRequiredPersonsApproved: signals.allRequiredPersonsApproved,
      decisionVersionsAligned: signals.decisionVersionsAligned,
      canonical0251EvidenceAligned: signals.canonical0251EvidenceAligned,
      canonical0251SnapshotAligned: signals.canonical0251SnapshotAligned,
      dependentPolicyReady: signals.dependentPolicyReady,
      teamGoIssueReady: signals.teamGoIssueReady,
      teamGoIssued: signals.teamGoIssued,
      teamGoEvidenceAligned: signals.teamGoEvidenceAligned,
      alignmentRequired,
      reconciliationRequired,
    },
    detailHref,
    actionHref:
      state === "ready_to_issue"
        ? "/api/crays/clubs/team/membership-applications/person-review/team-go"
        : detailHref,
  };
}

export function projectClubsTeamMembershipTeamGoOperations(
  items: readonly ClubsTeamMembershipTeamGoOperationsItem[],
  truncated: boolean,
): ClubsTeamMembershipTeamGoOperationsResponse {
  if (items.length > CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.maximumItems) {
    throw new Error("team_go_operations_limit_exceeded");
  }
  return {
    schema: CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.version,
    status: "ready",
    items,
    truncated,
    membershipAuthorityGranted: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  };
}

export function unavailableClubsTeamMembershipTeamGoOperations(status: string) {
  return {
    schema: CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_TEAM_GO_OPERATIONS_CONTRACT.version,
    status,
    items: [],
    truncated: false,
    membershipAuthorityGranted: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  };
}
