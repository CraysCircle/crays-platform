import type { ClubsExactB2bSessionProof } from "@/lib/clubs/ambassador-pre-registration-contract";
import type { ClubsTeamMembershipReviewActor } from "@/lib/clubs/team-membership-review-contract";

export const BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT = {
  schema: "crays.clubs.booking-party-team-go-evidence.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/booking-party-team-go-evidence",
  cache: "no-store",
  entrypoint: "https://www.crays.pro",
  sourceState: "source_only_0251_unapplied",
  commands: ["record_person_decision", "issue_aggregate_go"],
  authentication: {
    exactSessionProof: "crays.clubs.exact-b2b-session-proof.v1",
    requiredApplication: "b2b",
    clubsB2cSession: "wrong_vertical_session_403",
    missingB2bConfiguration: "service_unavailable_503",
    proofOutput: "digest_only",
    actorAuthority: "active_crays_org_membership_and_role_assignment",
    allowedRoles: ["crays-management", "reviewer", "admin"],
    assurance: ["aal2", "aal3"],
    maximumAuthenticationAgeSeconds: 300,
  },
  personBinding: {
    requiredChain: [
      "unique_verified_member_auth0_subject_digest",
      "exact_member_account",
      "booking_party_member",
      "0232_direct_membership_application",
    ],
    requiredPartyRoles: ["primary_applicant", "additional_adult"],
    identityState: "ready",
    consentStatement:
      "CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1",
    editableAdultIdentityForbidden: true,
    applicationAccountMustEqualPartyAccount: true,
    memberSubjectDigestDerivedServerSide: true,
    memberSubjectDigestFromBrowserForbidden: true,
  },
  guardianBoundary: {
    dependentMinorDecisionAuthority: false,
    dependentPolicyState: "not_ready",
    aggregateGoWhileDependentPolicyNotReady: false,
    primaryMayConsentForAdditionalAdult: false,
    guardianAuthorityMayNotBeInferred: true,
  },
  decisionLedger: {
    appendOnly: true,
    expectedPartyVersionRequired: true,
    expectedApplicationVersionRequired: true,
    expectedDecisionVersionRequired: true,
    outcomes: [
      "approved_for_membership_payment",
      "declined",
      "more_information_required",
    ],
  },
  aggregateGo: {
    requiredOutcome: "approved_for_membership_payment",
    everyRequiredAdultApproved: true,
    unchangedPartySnapshotRequired: true,
    unchangedDecisionSnapshotRequired: true,
    legacyReceipt:
      "crays_core.clubs_booking_membership_party_go_receipts",
    legacyReceiptCreatedOnlyAfterAggregateValidation: true,
    resultAuthority: "membership_payment_preparation_only",
  },
  sandboxEvidence: {
    scope: "forest_city_sunday_sandbox_team_go_v1",
    golf: {
      sourceReadableByT3: true,
      requiredProperty: "property-clubs-forest-city-golf",
      createsAvailability: false,
      createsQuote: false,
      createsHold: false,
      createsBooking: false,
    },
    marina: {
      requiredProperty: "property-clubs-forest-city-marina",
      membershipReadOnlyRequirement: true,
      admissionReadOnlyRequirement: true,
      aggregateGoCreatesMembership: false,
      aggregateGoCreatesAdmission: false,
      missingMembershipOrAdmission: "fail_closed",
    },
  },
  paymentSeparation: {
    membershipFee: "separate_not_created",
    stayPayment: "separate_not_created",
    membershipFeeMayNotCreateStayPayment: true,
    stayPaymentMayNotCreateMembership: true,
  },
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
    identicalReplay: 200,
    payloadDrift: 409,
    unknownOutcome: 503,
    reconciliation: "GET_by_same_idempotency_key",
    noWriteOnGet: true,
  },
  deniedAuthorities: {
    membership: false,
    membershipPayment: false,
    stayPayment: false,
    propertyAdmission: false,
    availability: false,
    quote: false,
    hold: false,
    booking: false,
    marinaMembership: false,
    marinaAdmission: false,
    provider: false,
    production: false,
  },
} as const;

export type BookingPartyTeamGoPersonOutcome =
  | "approved_for_membership_payment"
  | "declined"
  | "more_information_required";

export type BookingPartyTeamGoReasonCode =
  | "membership_requirements_satisfied"
  | "membership_requirements_not_satisfied"
  | "more_information_required";

export type BookingPartyTeamGoCommand =
  | {
      type: "record_person_decision";
      handoffId: string;
      partyMemberId: string;
      applicationId: string;
      expectedPartyVersion: number;
      expectedApplicationVersion: number;
      expectedDecisionVersion: number;
      outcome: BookingPartyTeamGoPersonOutcome;
      reasonCode: BookingPartyTeamGoReasonCode;
    }
  | {
      type: "issue_aggregate_go";
      handoffId: string;
      expectedHandoffVersion: number;
      expectedPartySnapshotSha256: string;
      expectedDecisionSnapshotSha256: string;
    };

export type BookingPartyTeamGoAuthority = Readonly<{
  actor: ClubsTeamMembershipReviewActor;
  proof: ClubsExactB2bSessionProof;
}>;

export function bookingPartyTeamGoDeniedAuthorities() {
  return {
    ...BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.deniedAuthorities,
  };
}
