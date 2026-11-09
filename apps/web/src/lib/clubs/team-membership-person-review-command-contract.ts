import type { ClubsExactB2bSessionProof } from "@/lib/clubs/ambassador-pre-registration-contract";
import type { ClubsTeamMembershipReviewActor } from "@/lib/clubs/team-membership-review-contract";

export const CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT = {
  schema: "crays.clubs.team-membership-person-review-command.v1",
  version: "1.0.0",
  endpoint:
    "/api/crays/clubs/team/membership-applications/person-review",
  methods: ["GET", "POST"],
  cache: "no-store",
  authentication: {
    exactSessionProof: "crays.clubs.exact-b2b-session-proof.v1",
    requiredApplication: "b2b",
    actorAuthority: "active_crays_team_tenant_role_binding",
    allowedRoles: ["crays-management", "reviewer", "admin"],
    assurance: ["aal2", "aal3"],
    maximumAuthenticationAgeSeconds: 300,
  },
  commands: ["request_more_information", "approve", "decline"],
  scope: {
    recommendationReceiptRequired: "0260_recommend_for_team_review",
    canonicalDecisionEvidenceWriter:
      "T3_record_person_decision_with_client_inside_0261_transaction",
    canonicalApplicationAuthority: "0232_direct_membership_application",
    exactApplicationBindingRequired: true,
    exactPersonBindingRequired: true,
    exactAccountAndConsentBindingRequired: true,
    canonicalDecisionVersionBeforeEqualityRequired: true,
    primaryOrAdditionalAdultOnly: true,
    expectedApplicationVersionRequired: true,
    expectedPersonVersionRequired: true,
    expectedDecisionVersionRequired: true,
    teamReviewEntryFromRecommendedOnly: true,
  },
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    strongIdempotencyKeyRequired: true,
    identicalReplay: 200,
    payloadOrVersionOrStateDrift: 409,
    unknownOutcome: "GET_with_same_Idempotency-Key_before_retry",
    appendOnlyReceipt: true,
    forcedRowLevelSecurity: true,
    publicDatabasePrivileges: false,
  },
  deniedAuthorities: {
    teamGoIssued: false,
    membershipCreated: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  },
} as const;

export type ClubsTeamMembershipPersonReviewCommandType =
  (typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.commands)[number];

export type ClubsTeamMembershipPersonReviewCommand = {
  type: ClubsTeamMembershipPersonReviewCommandType;
  reviewReference: string;
  personReference: string;
  expectedApplicationVersion: number;
  expectedPersonVersion: number;
  expectedDecisionVersion: number;
};

export type ClubsTeamMembershipPersonReviewAuthority = Readonly<{
  actor: ClubsTeamMembershipReviewActor;
  proof: ClubsExactB2bSessionProof;
}>;

export type ClubsTeamPersonReviewApplicationStatus =
  | "recommended"
  | "team_review"
  | "more_information_required";

export type ClubsTeamPersonReviewPersonStatus =
  | "application_submitted"
  | "under_review";

export type ClubsTeamPersonReviewTransition = Readonly<{
  applicationStatusAfter:
    | "team_review"
    | "more_information_required"
    | "declined";
  personStatusAfter:
    | "under_review"
    | "approved_for_membership_payment"
    | "declined";
  legacyCommandType:
    | "request_more_information"
    | "approve_person_for_membership_payment"
    | "decline_person";
  legacyOutcome:
    | "more_information_required"
    | "approved_for_membership_payment"
    | "declined";
  reasonCode:
    | "team_requested_more_information"
    | "team_person_approved_for_go_consideration"
    | "team_person_declined";
  decisionState:
    | "information_requested"
    | "approved_for_team_go_consideration"
    | "declined";
}>;

export function resolveClubsTeamPersonReviewTransition(
  command: ClubsTeamMembershipPersonReviewCommand,
  applicationStatusBefore: ClubsTeamPersonReviewApplicationStatus,
  personStatusBefore: ClubsTeamPersonReviewPersonStatus,
): ClubsTeamPersonReviewTransition {
  if (
    !["recommended", "team_review", "more_information_required"].includes(
      applicationStatusBefore,
    ) ||
    !["application_submitted", "under_review"].includes(personStatusBefore)
  ) {
    throw new Error("invalid_team_person_review_transition");
  }
  if (command.type === "request_more_information") {
    return {
      applicationStatusAfter: "more_information_required",
      personStatusAfter: "under_review",
      legacyCommandType: "request_more_information",
      legacyOutcome: "more_information_required",
      reasonCode: "team_requested_more_information",
      decisionState: "information_requested",
    };
  }
  if (command.type === "approve") {
    return {
      applicationStatusAfter: "team_review",
      personStatusAfter: "approved_for_membership_payment",
      legacyCommandType: "approve_person_for_membership_payment",
      legacyOutcome: "approved_for_membership_payment",
      reasonCode: "team_person_approved_for_go_consideration",
      decisionState: "approved_for_team_go_consideration",
    };
  }
  if (command.type === "decline") {
    return {
      applicationStatusAfter: "declined",
      personStatusAfter: "declined",
      legacyCommandType: "decline_person",
      legacyOutcome: "declined",
      reasonCode: "team_person_declined",
      decisionState: "declined",
    };
  }
  throw new Error("invalid_team_person_review_transition");
}

export type ClubsTeamMembershipPersonReviewCommandResult = Readonly<{
  schema: typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.schema;
  version: typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.version;
  status: "persisted";
  command: ClubsTeamMembershipPersonReviewCommandType;
  reviewReference: string;
  personReference: string;
  applicationStatus: ClubsTeamPersonReviewTransition["applicationStatusAfter"];
  applicationVersion: number;
  personStatus: ClubsTeamPersonReviewTransition["personStatusAfter"];
  personVersion: number;
  decisionVersion: number;
  decisionState: ClubsTeamPersonReviewTransition["decisionState"];
  reconcileState: "person_review_receipt_persisted";
  canonical0251EvidencePersisted: true;
  canonicalDecisionVersionAligned: true;
  decisionOutcomeAligned: true;
  teamGoIssued: false;
  membershipCreated: false;
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  commissionAuthorityGranted: false;
}>;

export function clubsTeamPersonReviewDeniedAuthorities() {
  return {
    ...CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.deniedAuthorities,
  };
}

export function unavailableClubsTeamPersonReview(status: string) {
  return {
    schema: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT.version,
    status,
    ...clubsTeamPersonReviewDeniedAuthorities(),
  };
}
