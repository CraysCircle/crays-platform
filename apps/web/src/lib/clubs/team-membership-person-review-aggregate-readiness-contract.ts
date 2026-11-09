import type { ClubsTeamMembershipPersonReviewAuthority } from "@/lib/clubs/team-membership-person-review-command-contract";

export const CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT = {
  schema: "crays.clubs.team-membership-person-review-aggregate-readiness.v1",
  version: "1.0.0",
  endpoint:
    "/api/crays/clubs/team/membership-applications/person-review/aggregate-readiness",
  method: "GET",
  cache: "no-store",
  authentication: {
    exactB2bSessionRequired: true,
    activeCraysTeamActorRequired: true,
    tenantAndRoleBindingRequired: true,
  },
  sourceSeparation: {
    commandCompletionSource: "0261_person_review_command_receipts",
    canonicalTeamGoEvidenceSource: "0251_person_decision_evidence",
    compatibilityMayNotBeInferred: true,
    teamGoReadyRequiresExactCanonicalAlignment: true,
    noBridgeWriteOnGet: true,
  },
  safeFields: [
    "reviewReference",
    "personDecisionCompletion",
    "allRequiredPersonDecisionsPresent",
    "allRequiredPersonsApproved",
    "moreInformationRequired",
    "declined",
    "decisionVersionsAligned",
    "canonical0251EvidenceAligned",
    "canonical0251SnapshotAligned",
    "dependentPolicyReady",
    "teamGoIssueReady",
    "reconcileState",
  ],
  deniedProjection: {
    internalIdentifiers: false,
    personalInformation: false,
    counts: false,
    receiptHashes: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    membershipCreated: false,
    teamGoIssued: false,
  },
} as const;

export type ClubsTeamPersonReviewAggregateAuthority =
  ClubsTeamMembershipPersonReviewAuthority;

export type ClubsTeamPersonReviewAggregateSignals = Readonly<{
  reviewReference: string;
  hasRequiredAdults: boolean;
  allRequiredPersonDecisionsPresent: boolean;
  allRequiredPersonsApproved: boolean;
  moreInformationRequired: boolean;
  declined: boolean;
  decisionVersionsAligned: boolean;
  canonical0251EvidenceAligned: boolean;
  canonical0251SnapshotAligned: boolean;
  dependentPolicyReady: boolean;
  applicationInTeamReview: boolean;
  handoffInTeamReview: boolean;
}>;

export type ClubsTeamPersonReviewAggregateReadiness = Readonly<{
  schema: typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT.schema;
  version: typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT.version;
  status: "ready";
  reviewReference: string;
  personDecisionCompletion:
    | "pending"
    | "complete_approved"
    | "more_information_required"
    | "declined"
    | "version_conflict";
  allRequiredPersonDecisionsPresent: boolean;
  allRequiredPersonsApproved: boolean;
  moreInformationRequired: boolean;
  declined: boolean;
  decisionVersionsAligned: boolean;
  canonical0251EvidenceAligned: boolean;
  canonical0251SnapshotAligned: boolean;
  dependentPolicyReady: boolean;
  teamGoIssueReady: boolean;
  reconcileState:
    | "0261_decisions_pending"
    | "0261_complete_0251_alignment_pending"
    | "0251_evidence_aligned_snapshot_pending"
    | "canonical_0251_aligned"
    | "blocked_more_information"
    | "blocked_declined"
    | "version_conflict";
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  membershipCreated: false;
  teamGoIssued: false;
}>;

export function projectClubsTeamPersonReviewAggregateReadiness(
  signals: ClubsTeamPersonReviewAggregateSignals,
): ClubsTeamPersonReviewAggregateReadiness {
  if (!/^cclub-review-[a-f0-9]{32}$/.test(signals.reviewReference)) {
    throw new Error("invalid_team_person_review_aggregate_projection");
  }
  const versionConflict =
    !signals.decisionVersionsAligned &&
    signals.allRequiredPersonDecisionsPresent;
  const teamGoIssueReady =
    signals.hasRequiredAdults &&
    signals.allRequiredPersonDecisionsPresent &&
    signals.allRequiredPersonsApproved &&
    !signals.moreInformationRequired &&
    !signals.declined &&
    signals.decisionVersionsAligned &&
    signals.canonical0251EvidenceAligned &&
    signals.canonical0251SnapshotAligned &&
    signals.dependentPolicyReady &&
    signals.applicationInTeamReview &&
    signals.handoffInTeamReview;

  let personDecisionCompletion: ClubsTeamPersonReviewAggregateReadiness["personDecisionCompletion"] =
    "pending";
  let reconcileState: ClubsTeamPersonReviewAggregateReadiness["reconcileState"] =
    "0261_decisions_pending";
  if (versionConflict) {
    personDecisionCompletion = "version_conflict";
    reconcileState = "version_conflict";
  } else if (signals.declined) {
    personDecisionCompletion = "declined";
    reconcileState = "blocked_declined";
  } else if (signals.moreInformationRequired) {
    personDecisionCompletion = "more_information_required";
    reconcileState = "blocked_more_information";
  } else if (
    signals.allRequiredPersonDecisionsPresent &&
    signals.allRequiredPersonsApproved
  ) {
    personDecisionCompletion = "complete_approved";
    reconcileState = !signals.canonical0251EvidenceAligned
      ? "0261_complete_0251_alignment_pending"
      : !signals.canonical0251SnapshotAligned
        ? "0251_evidence_aligned_snapshot_pending"
        : "canonical_0251_aligned";
  }

  return {
    schema:
      CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT.schema,
    version:
      CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT.version,
    status: "ready",
    reviewReference: signals.reviewReference,
    personDecisionCompletion,
    allRequiredPersonDecisionsPresent:
      signals.allRequiredPersonDecisionsPresent,
    allRequiredPersonsApproved: signals.allRequiredPersonsApproved,
    moreInformationRequired: signals.moreInformationRequired,
    declined: signals.declined,
    decisionVersionsAligned: signals.decisionVersionsAligned,
    canonical0251EvidenceAligned: signals.canonical0251EvidenceAligned,
    canonical0251SnapshotAligned: signals.canonical0251SnapshotAligned,
    dependentPolicyReady: signals.dependentPolicyReady,
    teamGoIssueReady,
    reconcileState,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    membershipCreated: false,
    teamGoIssued: false,
  };
}

export function unavailableClubsTeamPersonReviewAggregate(status: string) {
  return {
    schema:
      CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT.schema,
    version:
      CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_AGGREGATE_READINESS_CONTRACT.version,
    status,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    membershipCreated: false,
    teamGoIssued: false,
  };
}
