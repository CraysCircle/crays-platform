import type { ClubsTeamMembershipPersonReviewAuthority } from "@/lib/clubs/team-membership-person-review-command-contract";

export const CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT = {
  schema: "crays.clubs.team-membership-person-review-team-go.v1",
  version: "1.0.0",
  endpoint:
    "/api/crays/clubs/team/membership-applications/person-review/team-go",
  methods: ["GET", "POST"],
  cache: "no-store",
  authentication: {
    authFirst: true,
    exactB2bSessionRequired: true,
    activeCraysTeamActorRequired: true,
    tenantRoleAndAalRequired: true,
  },
  command: {
    type: "issue_team_go",
    opaqueReviewReferenceRequired: true,
    strongIdempotencyKeyRequired: true,
    sameOriginRequired: true,
    jsonOnly: true,
  },
  canonicalBoundary: {
    readinessSource:
      "0261_0251_team_membership_person_review_aggregate_readiness",
    writer: "T3_executeBookingPartyTeamGoWithClient",
    command: "issue_aggregate_go",
    sameTransactionRequired: true,
    everyCurrentDecisionVersionAligned: true,
    canonicalEvidenceAndSnapshotAlignmentRequired: true,
    noDuplicateLedger: true,
    directInsertForbidden: true,
  },
  reconciliation: {
    sameKeyGet: true,
    identicalReplay: 200,
    payloadOrVersionOrStateDrift: 409,
    missingOrAmbiguous: 404,
    unknownOutcome: "GET_with_same_Idempotency-Key_before_retry",
  },
  safeFields: [
    "teamGoReady",
    "issued",
    "alreadyIssued",
    "reconcileState",
  ],
  deniedAuthorities: {
    membershipCreated: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  },
} as const;

export type ClubsTeamPersonReviewTeamGoAuthority =
  ClubsTeamMembershipPersonReviewAuthority;

export type ClubsTeamPersonReviewTeamGoCommand = Readonly<{
  type: "issue_team_go";
  reviewReference: string;
}>;

export type ClubsTeamPersonReviewTeamGoResult = Readonly<{
  schema: typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.schema;
  version: typeof CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.version;
  status: "persisted";
  teamGoReady: true;
  issued: true;
  alreadyIssued: boolean;
  reconcileState: "canonical_team_go_issued" | "canonical_team_go_reconciled";
  membershipCreated: false;
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  commissionAuthorityGranted: false;
}>;

export function clubsTeamPersonReviewTeamGoDeniedAuthorities() {
  return {
    ...CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.deniedAuthorities,
  };
}

export function unavailableClubsTeamPersonReviewTeamGo(status: string) {
  return {
    schema: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.schema,
    version: CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT.version,
    status,
    teamGoReady: false,
    issued: false,
    alreadyIssued: false,
    reconcileState: "not_reconciled",
    ...clubsTeamPersonReviewTeamGoDeniedAuthorities(),
  };
}
