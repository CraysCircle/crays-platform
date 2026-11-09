export const CLUBS_MEMBER_MEMBERSHIP_UI_CONTRACT = {
  schema: "crays.clubs.member-membership-ui.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/member/membership",
  cache: "no-store",
  authentication: "crays_clubs_b2c_auth0_exact_core_mapping",
  programKey: "crays-clubs-membership",
  memberCommands: ["submit_application", "withdraw_application"],
  decisionAuthority: "CRAYS_TEAM",
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
  },
  authoritySeparation: {
    authentication: "does_not_imply_membership",
    application: "does_not_imply_membership",
    membership: "requires_crays_team_decision_receipt",
    membershipType: "mapping_not_ready_not_inferred",
    marinaPropertyAdmission: "separate_exact_active_grant_required",
    availability: "separate_source_authority_required",
    booking: "separate_commercial_authority_required",
  },
} as const;

export const CLUBS_MEMBER_MEMBERSHIP_HTTP = {
  ready: 200,
  validationError: 400,
  signedOut: 401,
  denied: 403,
  identityBindingRequired: 409,
  replayOrStateConflict: 409,
  unavailableOrUnknownOutcome: 503,
} as const;

export const CLUBS_MEMBER_MEMBERSHIP_APPLICATION_STATES = [
  "none",
  "submitted",
  "under_review",
  "approved",
  "declined",
  "withdrawn",
] as const;

export const CLUBS_MEMBER_MEMBERSHIP_STATES = [
  "not_confirmed",
  "confirmed",
  "suspended",
  "revoked",
  "expired",
] as const;

export type ClubsMemberMembershipApplicationState =
  (typeof CLUBS_MEMBER_MEMBERSHIP_APPLICATION_STATES)[number];

export type ClubsMemberMembershipState =
  (typeof CLUBS_MEMBER_MEMBERSHIP_STATES)[number];

export type ClubsMemberMembershipCommand =
  | {
      type: "submit_application";
      interestPropertyId: "property-clubs-forest-city-marina" | null;
    }
  | { type: "withdraw_application" };
