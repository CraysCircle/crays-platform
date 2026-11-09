export const CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT = {
  schema: "crays.clubs.ambassador-direct-membership-application-review-command.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/ambassador/membership-applications/review",
  methods: ["GET", "POST"],
  cache: "no-store",
  authentication: "exact_crays_pro_b2b_bootstrap",
  commands: [
    "start_ambassador_review",
    "request_more_information",
    "recommend_for_team_review",
    "do_not_recommend",
  ],
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    strongIdempotencyKeyRequired: true,
    expectedVersionRequired: true,
    sameRequestReplay: "identical_response",
    payloadDriftStatus: 409,
    unknownOutcome: "GET_with_same_Idempotency-Key_before_retry",
    appendOnlyReceipt: true,
    forcedRowLevelSecurity: true,
    publicDatabasePrivileges: false,
  },
  scope: {
    ownAssignedApplicationOnly: true,
    activeEntitlementProfileRequired: true,
    scopedOwnershipReceiptRequired: true,
    fullAccessDoesNotCreateGlobalInbox: true,
    statusTransitionOnly: true,
  },
  deniedAuthorities: {
    reviewerAuthorityGranted: false,
    teamGoGranted: false,
    membershipCreated: false,
    paymentAuthorityGranted: false,
    commissionAuthorityGranted: false,
  },
} as const;

export type ClubsAmbassadorReviewCommandType =
  (typeof CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.commands)[number];

export type ClubsAmbassadorReviewReasonCode =
  | "ambassador_review_started"
  | "more_information_requested"
  | "recommended_to_crays_team"
  | "not_recommended_to_crays_team";

export type ClubsAmbassadorReviewCommand = {
  type: ClubsAmbassadorReviewCommandType;
  reviewReference: string;
  expectedVersion: number;
  reasonCode: ClubsAmbassadorReviewReasonCode;
};

export type ClubsAmbassadorReviewApplicationStatus =
  | "submitted"
  | "assigned"
  | "ambassador_review"
  | "more_information_required"
  | "recommended"
  | "not_recommended";

export type ClubsAmbassadorReviewTransition = {
  statusAfter: Extract<
    ClubsAmbassadorReviewApplicationStatus,
    | "ambassador_review"
    | "more_information_required"
    | "recommended"
    | "not_recommended"
  >;
  reasonCode: ClubsAmbassadorReviewReasonCode;
  outcome:
    | "ambassador_review_started"
    | "more_information_requested"
    | "recommended_for_crays_team_review"
    | "not_recommended_for_crays_team_review";
};

export function resolveClubsAmbassadorReviewTransition(
  command: ClubsAmbassadorReviewCommand,
  statusBefore: ClubsAmbassadorReviewApplicationStatus,
): ClubsAmbassadorReviewTransition {
  if (
    command.type === "start_ambassador_review" &&
    ["submitted", "assigned", "more_information_required"].includes(
      statusBefore,
    ) &&
    command.reasonCode === "ambassador_review_started"
  ) {
    return {
      statusAfter: "ambassador_review",
      reasonCode: command.reasonCode,
      outcome: "ambassador_review_started",
    };
  }
  if (
    command.type === "request_more_information" &&
    statusBefore === "ambassador_review" &&
    command.reasonCode === "more_information_requested"
  ) {
    return {
      statusAfter: "more_information_required",
      reasonCode: command.reasonCode,
      outcome: "more_information_requested",
    };
  }
  if (
    command.type === "recommend_for_team_review" &&
    statusBefore === "ambassador_review" &&
    command.reasonCode === "recommended_to_crays_team"
  ) {
    return {
      statusAfter: "recommended",
      reasonCode: command.reasonCode,
      outcome: "recommended_for_crays_team_review",
    };
  }
  if (
    command.type === "do_not_recommend" &&
    statusBefore === "ambassador_review" &&
    command.reasonCode === "not_recommended_to_crays_team"
  ) {
    return {
      statusAfter: "not_recommended",
      reasonCode: command.reasonCode,
      outcome: "not_recommended_for_crays_team_review",
    };
  }
  throw new Error("invalid_ambassador_review_transition");
}

export type ClubsAmbassadorReviewCommandResult = {
  schema: typeof CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.version;
  status: "persisted";
  outcome: ClubsAmbassadorReviewTransition["outcome"];
  reviewReference: string;
  applicationStatus: ClubsAmbassadorReviewTransition["statusAfter"];
  applicationVersion: number;
  reconcileState: "recommendation_receipt_persisted";
  reviewerAuthorityGranted: false;
  teamGoGranted: false;
  membershipCreated: false;
  paymentAuthorityGranted: false;
  commissionAuthorityGranted: false;
};

export function unavailableClubsAmbassadorReviewCommand() {
  return {
    schema:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.schema,
    version:
      CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.version,
    status: "temporarily_unavailable" as const,
  };
}
