import type { RoleKey } from "@/lib/roles";

export const CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT = {
  schema: "crays.clubs.team-membership-review-ui.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/membership-applications",
  cache: "no-store",
  entrypoint: "https://www.crays.pro",
  authentication: "crays_pro_b2b_auth0_exact_core_mapping",
  decisionAuthority: "CRAYS_TEAM",
  allowedRoles: ["crays-management", "reviewer", "admin"],
  assurance: {
    allowed: ["aal2", "aal3"],
    maximumAgeSeconds: 300,
  },
  commands: ["start_review", "approve_application", "decline_application"],
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
    expectedVersionRequired: true,
    appendOnlyDecisionReceipt: true,
  },
  authoritySeparation: {
    authentication: "does_not_imply_membership_decision",
    applicationApproval: "creates_confirmed_membership_only",
    membershipType: "mapping_not_ready_not_inferred",
    marinaPropertyAdmission: "separate_exact_active_grant_required",
    availability: "separate_source_authority_required",
    booking: "separate_commercial_authority_required",
  },
} as const;

export const CLUBS_TEAM_MEMBERSHIP_REVIEW_HTTP = {
  ready: 200,
  validationError: 400,
  signedOut: 401,
  deniedOrStepUpRequired: 403,
  notFound: 404,
  replayOrStateConflict: 409,
  unavailableOrUnknownOutcome: 503,
} as const;

export type ClubsTeamMembershipReviewRole = Extract<
  RoleKey,
  "crays-management" | "reviewer" | "admin"
>;

export type ClubsTeamMembershipReviewActor = {
  accountId: string;
  organizationId: string;
  role: ClubsTeamMembershipReviewRole;
  assuranceLevel: "aal2" | "aal3";
  authenticatedAt: string;
  authoritySource: "auth0-crays-session";
};

export type ClubsTeamMembershipReviewCommand =
  | {
      type: "start_review";
      applicationId: string;
      expectedVersion: number;
      reasonCode: "review_started";
    }
  | {
      type: "approve_application";
      applicationId: string;
      expectedVersion: number;
      reasonCode: "membership_requirements_satisfied";
    }
  | {
      type: "decline_application";
      applicationId: string;
      expectedVersion: number;
      reasonCode: "membership_requirements_not_satisfied";
    };
