export const CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT = {
  schema: "crays.clubs.team-direct-membership-application-review-read.v1",
  version: "1.0.0",
  endpoint:
    "/api/crays/clubs/team/membership-applications/direct-review-status",
  method: "GET",
  cache: "no-store",
  views: ["queue", "detail"],
  allowedRoles: ["crays-management", "reviewer", "admin"],
  reviewReference: {
    format: "cclub-review-<sha256-prefix>",
    opaque: true,
    sourceIdentifierExposed: false,
  },
  scope: {
    tenantAssignmentRequired: true,
    activeRegistryProfileRequired: true,
    reviewerExactActiveBindingRequired: true,
    reviewerCapabilities: [
      "read_assigned_applications",
      "review_assigned_applications",
    ],
    unknownReference: "not_found_without_count",
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
  deniedProjection: {
    internalIdentifiers: false,
    applicantPayload: false,
    personalInformation: false,
    counts: false,
    economics: false,
    commission: false,
    paymentAuthority: false,
    entitlementAuthority: false,
  },
  decisionWrites: "existing_endpoints_unchanged",
} as const;

export const CLUBS_TEAM_DIRECT_REVIEW_APPLICATION_STATUSES = [
  "submitted",
  "assigned",
  "ambassador_review",
  "more_information_required",
  "recommended",
  "not_recommended",
  "team_review",
  "approved_for_membership_payment",
  "declined",
  "withdrawn",
] as const;

export type ClubsTeamDirectReviewApplicationStatus =
  (typeof CLUBS_TEAM_DIRECT_REVIEW_APPLICATION_STATUSES)[number];

export type ClubsTeamDirectReviewSignals = {
  reviewReference: string;
  applicationStatus: ClubsTeamDirectReviewApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  reviewerReady: boolean;
  decisionReceiptPersisted: boolean;
  teamGoReceiptPersisted: boolean;
};

export type ClubsTeamDirectReviewItem = {
  reviewReference: string;
  applicationStatus: ClubsTeamDirectReviewApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  assignmentState: "ready" | "reviewer_not_ready";
  decisionState:
    | "pending"
    | "more_information_required"
    | "recommended"
    | "not_recommended"
    | "team_review"
    | "approved_internal_no_payment"
    | "declined"
    | "withdrawn";
  reconcileState:
    | "review_pending"
    | "review_in_progress"
    | "decision_pending_reconciliation"
    | "decision_reconciled"
    | "team_go_reconciled_internal_no_payment";
  detailHref: string;
  nextAction: "open_detail" | "refresh_status";
};

function iso(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("invalid_team_direct_review_projection");
  }
  return date.toISOString();
}

function decisionState(
  status: ClubsTeamDirectReviewApplicationStatus,
): ClubsTeamDirectReviewItem["decisionState"] {
  if (status === "more_information_required") {
    return "more_information_required";
  }
  if (status === "recommended") return "recommended";
  if (status === "not_recommended") return "not_recommended";
  if (status === "team_review") return "team_review";
  if (status === "approved_for_membership_payment") {
    return "approved_internal_no_payment";
  }
  if (status === "declined") return "declined";
  if (status === "withdrawn") return "withdrawn";
  return "pending";
}

function reconcileState(
  status: ClubsTeamDirectReviewApplicationStatus,
  decisionReceiptPersisted: boolean,
  teamGoReceiptPersisted: boolean,
): ClubsTeamDirectReviewItem["reconcileState"] {
  if (status === "approved_for_membership_payment") {
    return teamGoReceiptPersisted
      ? "team_go_reconciled_internal_no_payment"
      : "decision_pending_reconciliation";
  }
  if (status === "declined" || status === "withdrawn") {
    return decisionReceiptPersisted
      ? "decision_reconciled"
      : "decision_pending_reconciliation";
  }
  if (
    status === "ambassador_review" ||
    status === "more_information_required" ||
    status === "recommended" ||
    status === "not_recommended" ||
    status === "team_review"
  ) {
    return "review_in_progress";
  }
  return "review_pending";
}

export function projectClubsTeamDirectReviewItem(
  signals: ClubsTeamDirectReviewSignals,
  view: "queue" | "detail",
): ClubsTeamDirectReviewItem {
  if (
    !/^cclub-review-[a-f0-9]{32}$/.test(signals.reviewReference) ||
    !CLUBS_TEAM_DIRECT_REVIEW_APPLICATION_STATUSES.includes(
      signals.applicationStatus,
    ) ||
    typeof signals.reviewerReady !== "boolean" ||
    typeof signals.decisionReceiptPersisted !== "boolean" ||
    typeof signals.teamGoReceiptPersisted !== "boolean" ||
    (signals.teamGoReceiptPersisted &&
      signals.applicationStatus !== "approved_for_membership_payment")
  ) {
    throw new Error("invalid_team_direct_review_projection");
  }
  const reference = signals.reviewReference;
  return {
    reviewReference: reference,
    applicationStatus: signals.applicationStatus,
    submittedAt: iso(signals.submittedAt),
    updatedAt: iso(signals.updatedAt),
    assignmentState: signals.reviewerReady ? "ready" : "reviewer_not_ready",
    decisionState: decisionState(signals.applicationStatus),
    reconcileState: reconcileState(
      signals.applicationStatus,
      signals.decisionReceiptPersisted,
      signals.teamGoReceiptPersisted,
    ),
    detailHref: `${CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.endpoint}?reviewReference=${encodeURIComponent(reference)}`,
    nextAction: view === "queue" ? "open_detail" : "refresh_status",
  };
}

export function unavailableClubsTeamDirectReviewRead() {
  return {
    schema:
      CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.schema,
    version:
      CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.version,
    status: "temporarily_unavailable" as const,
  };
}
