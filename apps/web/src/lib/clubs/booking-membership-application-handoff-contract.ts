export const BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT = {
  schema: "crays.clubs.booking-membership-application-handoff-ui.v1",
  version: "1.1.0",
  cache: "no-store",
  publicRoute: "/en/apply-directly",
  endpoints: {
    memberHandoff: "/api/crays/clubs/member/booking-membership-applications",
    partyJoin: "/api/crays/clubs/member/booking-membership-applications/party",
    ambassadorReview:
      "/api/crays/clubs/ambassador/booking-membership-applications",
    teamGo: "/api/crays/clubs/team/booking-membership-applications",
    membershipPaymentPreparation:
      "/api/crays/clubs/member/membership-payments/prepare",
    stayPaymentPreparation: null,
  },
  entrypoints: {
    applicantAndParty: "https://www.craysclub.com",
    ambassadorAndTeam: "https://www.crays.pro",
    craysGym: "blueprint_only_not_an_identity_entrypoint",
  },
  activation: {
    state: "isolated_preview_persistence",
    handoffEnabled: true,
    submitEnabled: true,
    teamGoEnabled: false,
    membershipPaymentPreparationEnabled: false,
    stayPaymentPreparationEnabled: false,
    bookingEnabled: false,
    requiredPriorGate:
      "CCLUB-V26931-CANONICAL-REVIEWER-PRINCIPAL-BRIDGE-PREVIEW-PASS-2026-08-29",
  },
  bookingIntent: {
    source: "server_validated_search_detail_booking_intent",
    admittedFields: [
      "propertyId",
      "dateMode",
      "checkIn",
      "checkOut",
      "flexibleMonth",
      "flexibleStay",
      "stayUnit",
      "nights",
      "guests",
      "children",
      "pets",
      "requestedServices",
      "returnTo",
    ],
    rateIsNotAvailability: true,
    intentIsNotQuote: true,
    intentIsNotBooking: true,
    internalIdsInPublicPayload: false,
  },
  correlation: {
    publicResumeToken: "opaque_random_server_generated",
    tokenStoredServerSide: false,
    tokenDigestStoredServerSide: true,
    tokenInPublicCopy: false,
    internalApplicationIdInUrl: false,
    signedAccountBindingRequired: true,
    exactIntentDigestRequired: true,
    expiryPolicyReceiptRequired: true,
    expiryPolicy: {
      receiptId: "CCLUB-BOOKING-MEMBERSHIP-RESUME-EXPIRY-V1",
      lifetimeSeconds: 604800,
      state: "active_preview_policy",
    },
    unknownOrExpiredToken: "fail_closed_404_or_409",
  },
  party: {
    primaryApplicant: {
      exactB2CCoreAccountRequired: true,
      separateMembershipApplicationRequired: true,
      ownConsentRequired: true,
      editableAccountEmailForbidden: true,
    },
    additionalAdult: {
      exactB2CCoreAccountRequired: true,
      separateMembershipApplicationRequired: true,
      ownConsentRequired: true,
      primaryMayConsentForAdult: false,
      primaryMayEnterAdultEmail: false,
      joinMethod: "one_time_opaque_share_link",
      unresolvedIdentity: "party_incomplete_fail_closed",
    },
    dependentMinor: {
      ownAccountRequired: false,
      guardianCoreAccountRequired: true,
      guardianDeclarationRequired: true,
      guardianConsentRequired: true,
      separateAdultMembershipApplicationRequired: false,
      dependentMembershipPolicyState: "not_ready",
      unresolvedGuardianOrPolicy: "party_incomplete_fail_closed",
    },
    pet: {
      membershipCandidate: false,
      remainsBookingRequestOnly: true,
    },
    aggregateReadyRule:
      "every_required_person_identity_consent_and_team_decision_ready",
  },
  teamDecision: {
    entrypoint: "https://www.crays.pro",
    assurance: ["aal2", "aal3"],
    maximumAuthenticationAgeSeconds: 300,
    perPersonDecisionReceiptRequired: true,
    aggregatePartyGoReceiptRequired: true,
    appendOnly: true,
    commands: [
      "start_party_review",
      "approve_person_for_membership_payment",
      "decline_person",
      "request_more_information",
      "issue_party_go",
    ],
    goOutcome: "membership_payment_preparation_only",
    createsMembership: false,
    createsPropertyAdmission: false,
    createsBooking: false,
    createsPayment: false,
  },
  paymentSeparation: {
    membershipFee: {
      requiredBeforePreparation: [
        "all_required_person_decisions_approved",
        "aggregate_party_go_receipt_active",
        "versioned_membership_fee_offer_per_payable_person",
        "currency_and_minor_units_present",
        "payer_account_exactly_bound",
      ],
      teamGoCreatesPaymentInstrument: false,
      teamGoCreatesCheckout: false,
      paymentConfirmationCreatesHotelBooking: false,
      feeFallbackForbidden: true,
    },
    stay: {
      separateQuoteRequired: true,
      separateAvailabilityRequired: true,
      separateBookingAuthorityRequired: true,
      separatePaymentPreparationRequired: true,
      membershipPaymentMayBeCombined: false,
      totalFallbackForbidden: true,
    },
  },
  propertyRules: {
    golf: {
      propertyId: "property-clubs-forest-city-golf",
      propertyAccessMode: "open",
      propertyMembershipRequired: false,
      craysBookingWorkflowApplicationRequired: true,
      allowedStayUnits: ["night", "week", "month"],
      propertyAdmissionRequired: false,
      teamGoDoesNotImplyAvailabilityOrBooking: true,
    },
    marina: {
      propertyId: "property-clubs-forest-city-marina",
      propertyAccessMode: "property_admission_required",
      propertyMembershipRequired: true,
      craysBookingWorkflowApplicationRequired: true,
      allowedStayUnits: ["month"],
      propertyAdmissionRequired: true,
      membershipPaymentDoesNotImplyPropertyAdmission: true,
      teamGoDoesNotImplyAvailabilityOrBooking: true,
    },
  },
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    secFetchSite: "same-origin",
    originMustEqualRequestOrigin: true,
    idempotencyKeyHeader: "Idempotency-Key",
    idempotencyKeyPattern: "^[A-Za-z0-9:_.-]{16,200}$",
    expectedVersionRequired: true,
    noWriteOnLoad: true,
    optimisticSuccessForbidden: true,
    retryUnknownOutcomeOnceWithSameKey: true,
    reconcileByGetAfterWrite: true,
    appendOnlyCommandReceipt: true,
  },
  memberCommands: ["create_handoff", "submit_primary_application"],
  previewPersistence: {
    migration: "0230_cclub_phase9_booking_membership_application_handoff.sql",
    rawResumeTokenPersisted: false,
    resumeTokenDigestPersisted: true,
    applicationPayloadEncryptionAuthority:
      "database-provider-at-rest-not-independently-asserted",
    publicInternalIds: false,
    readSideWrites: false,
    productionAuthorized: false,
    resumeTokenSecret: {
      dedicatedEnvironmentVariable: "CRAYS_CLUBS_BOOKING_RESUME_SECRET",
      isolatedPreviewFallbackEnvironmentVariable: "AUTH0_CLUBS_SECRET",
      isolatedPreviewFallbackOnlyOutsideProductionNodeEnv: true,
      hmacDomainSeparated: true,
      productionRequiresDedicatedSecret: true,
    },
  },
  safeNavigation: {
    queryKeys: ["resume", "returnTo"],
    allowedReturnPaths: [
      "/en/account",
      "/en/search",
      "/en/hospitality/golf-hotel",
      "/en/hospitality/marina-hotel",
    ],
    defaultReturnTo: "/en/account?view=booking-requests",
    rejectAbsoluteUrl: true,
    rejectProtocolRelative: true,
    rejectBackslashOrControlCharacter: true,
  },
  compatibility: {
    previousPreviewTeamApprovalCreatesConfirmedMembership:
      "not_admitted_for_booking_linked_flow",
    bookingLinkedTeamGoCreatesConfirmedMembership: false,
    requiredSuccessorState: "approved_for_membership_payment",
  },
} as const;

export const BOOKING_MEMBERSHIP_APPLICATION_STATES = {
  handoff: [
    "not_created",
    "application_incomplete",
    "party_incomplete",
    "ready_to_submit",
    "submitted",
    "under_ambassador_review",
    "under_team_review",
    "more_information_required",
    "approved_for_membership_payment",
    "declined",
    "withdrawn",
    "expired",
    "temporarily_unavailable",
  ],
  membershipPayment: [
    "not_allowed",
    "preparation_ready",
    "pending",
    "provider_confirmed",
    "unknown_outcome",
    "failed",
  ],
  membership: [
    "not_confirmed",
    "payment_pending",
    "activation_pending",
    "confirmed",
    "suspended",
    "revoked",
    "expired",
  ],
  stay: [
    "intent_only",
    "availability_not_ready",
    "quote_not_ready",
    "booking_not_ready",
    "payment_not_ready",
  ],
} as const;

export const BOOKING_MEMBERSHIP_APPLICATION_HTTP = {
  readyOrReplay: 200,
  validationError: 400,
  signedOut: 401,
  deniedOrStepUpRequired: 403,
  resumeTokenNotFoundOrExpired: 404,
  identityBindingRequiredOrStateConflict: 409,
  rateLimited: 429,
  unavailableOrUnknownOutcome: 503,
} as const;

export const BOOKING_MEMBERSHIP_APPLICATION_PUBLIC_COPY = {
  stepTitle: "Continue with your CRAYS membership application",
  stepBody:
    "Your stay details will be carried forward securely. Submitting the application does not book the hotel or take payment.",
  signIn: "Sign in to continue",
  primaryApplicant: "You will apply with your verified CRAYS account.",
  additionalAdults:
    "Each adult joins and consents with their own secure CRAYS account.",
  dependentMinor:
    "A parent or legal guardian must complete the dependent step.",
  continue: "Continue to application",
  submitted:
    "Your application is with the CRAYS team. No payment or hotel booking has been made.",
  waitingForParty:
    "Your request is waiting for the other adults or guardian steps to be completed.",
  approvedForMembershipPayment:
    "The CRAYS team has approved the membership payment step. No hotel booking or stay payment has been made.",
  moreInformation:
    "The CRAYS team needs more information before the request can continue.",
  declined:
    "This request cannot continue to membership payment or hotel booking.",
  temporarilyUnavailable:
    "We cannot continue this request right now. Your search details remain unchanged.",
  boundary:
    "Membership payment and hotel payment are separate. Neither is available before the required review is complete.",
} as const;

export function isSafeBookingMembershipReturnTo(value: string): boolean {
  if (
    value.length < 1 ||
    value.length > 2048 ||
    !value.startsWith("/en/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }
  const queryIndex = value.indexOf("?");
  const path = queryIndex === -1 ? value : value.slice(0, queryIndex);
  return BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT.safeNavigation.allowedReturnPaths.includes(
    path as (typeof BOOKING_MEMBERSHIP_APPLICATION_HANDOFF_CONTRACT.safeNavigation.allowedReturnPaths)[number],
  );
}
