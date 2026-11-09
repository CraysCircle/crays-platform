export const CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT = {
  schema: "crays.clubs.ambassador-b2b-entitlement.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/ambassador/b2b-entitlement",
  implementationStatus: "SOURCE_ONLY_PREVIEW_NOT_APPLIED",
  cache: "no-store",
  entitlementKeys: [
    "CLUBS_SAAS_FULL_ACCESS",
    "AMBASSADOR_SCOPED_ACCESS",
  ],
  resourceKinds: [
    "person",
    "application",
    "booking",
    "follow_up",
    "settlement_evidence",
    "task",
    "invoice",
  ],
  identityBoundary: {
    loginEntrypoint: "crays_pro_b2b_only",
    exactB2bProofAuthority:
      "src/lib/clubs/exact-b2b-session-proof-server.ts",
    exactVerifiedLoginRequired: true,
    b2cSessionDenied: true,
    wrongVerticalStatus: 403,
    missingTrustedB2bConfigurationStatus: 503,
    activationPassRequired: true,
    exactActivationSubjectBindingRequired: true,
    activeCoreAccountRequired: true,
    activeTenantSessionRequired: true,
    activeMembershipAndAssignmentRequired: true,
    publicRoleLabelMayGrantEntitlement: false,
    passwordOrInviteCreated: false,
  },
  // Advisory owner plan only; NEVER grants access by slug, email, or name.
  // Activation and the exact current account/registry binding remain required.
  ownerEntitlementPlan: {
    "thorben-biesenbach": "CLUBS_SAAS_FULL_ACCESS",
    "isabel-maria-jeworski": "CLUBS_SAAS_FULL_ACCESS",
    "robin-karlsen": "CLUBS_SAAS_FULL_ACCESS",
    "anouk-knuffmann": "CLUBS_SAAS_FULL_ACCESS",
    "stephanie-weyer": "CLUBS_SAAS_FULL_ACCESS",
  },
  futureAmbassadorDefault: "AMBASSADOR_SCOPED_ACCESS",
  fullAccessPolicy: {
    clubsSaasModulesVisible: true,
    clubsSaasNavigationVisible: true,
    clubsSaasApiFunctionsVisible: true,
    incompleteModuleVisibilityAllowed: true,
    irreversibleActionGateBypassed: false,
  },
  scopedAccessPolicy: {
    ownProfileAndWorkspaceOnly: true,
    immutableReferralAttributionRequired: true,
    exactAccountAmbassadorBindingRequired: true,
    tenantScopeRequired: true,
    ownPeopleApplicationsBookingsOnly: true,
    ownFollowUpsAndAdmittedStatusOnly: true,
    ownCommissionSettlementViewOnly: true,
    ownInvoicesReadAndDownloadOnly: true,
    ownAssignedTasksOnly: true,
    personalRecommendationIsNotCraysTeamFinalApproval: true,
    crossAmbassadorStatus: 403,
    unknownOwnershipStatus: 404,
    foreignListCountsOrIdentifiersExposed: false,
  },
  receiptSecurity: {
    entitlementIssueReceiptReusedFrom0249: true,
    companionBindingReceiptAppendOnly: true,
    scopedOwnershipReceiptAppendOnly: true,
    idempotencyKeyRequired: true,
    sameKeyDifferentRequestFailsClosed: true,
    forcedRowLevelSecurity: true,
    noRawIdentityOrResourceValuesInReceipts: true,
  },
  sourceBoundary: {
    t2ExactProofFilesTouched: false,
    exactB2bBootstrapAdapter: "T2_EXACT_B2B_SOURCE_AUTHORITY_ADMITTED",
    accountTenantBootstrapUsesExistingLifecycle: true,
    identityTenantAmbassadorGlobalRoleCreated: false,
    persistedReferralAttributionAuthorityAvailable: false,
    scopedOwnershipWriterImplemented: false,
    previewApplyAuthorized: false,
  },
  deniedAuthorities: {
    globalRole: false,
    reviewer: false,
    globalInbox: false,
    teamGo: false,
    membership: false,
    marinaPropertyAdmission: false,
    availability: false,
    quote: false,
    bookingCreation: false,
    payment: false,
    beneficiaryControlPlane: false,
    payoutControlPlane: false,
    providerControlPlane: false,
    deploymentControlPlane: false,
    secretAuthority: false,
  },
  deliveryIsolation: {
    craysProMutation: false,
    craysGymMutation: false,
    auth0Mutation: false,
    environmentMutation: false,
    stripeMutation: false,
    providerMutation: false,
    productionMutation: false,
    deploymentMutation: false,
    runtimeRestart: false,
  },
} as const;

export type ClubsAmbassadorEntitlementKey =
  (typeof CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.entitlementKeys)[number];

export type ClubsAmbassadorScopedResourceKind =
  (typeof CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.resourceKinds)[number];

export type ClubsAmbassadorB2bBootstrapEvidence = {
  proofSchema: "crays.clubs.b2b-entitlement-bootstrap.v1";
  accountId: string;
  organizationId: string;
  tenantSessionId: string;
  subjectSha256: string;
  authenticatedAt: string;
  exactVerifiedCraysProB2bLogin: true;
  b2cRejected: true;
  authoritySource: "exact_crays_pro_b2b_bootstrap";
};

export type ClubsAmbassadorB2bBootstrapResolution =
  | { status: "ready"; evidence: ClubsAmbassadorB2bBootstrapEvidence }
  | { status: "b2c_rejected" }
  | { status: "missing_actor_bootstrap" }
  | { status: "unavailable" };

export type ClubsAmbassadorEntitlementIssueCommand = {
  type: "issue_entitlement";
  activationPassReceiptId: string;
};

export type ClubsAmbassadorScopedAuthorizationCommand = {
  type: "authorize_scoped_resource";
  resourceKind: ClubsAmbassadorScopedResourceKind;
  opaqueResourceReference: string;
};

export type ClubsAmbassadorEntitlementCommand =
  | ClubsAmbassadorEntitlementIssueCommand
  | ClubsAmbassadorScopedAuthorizationCommand;

export type ClubsAmbassadorEntitlementIssueResult = {
  schema: typeof CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.version;
  status: "issued" | "replayed";
  entitlementIssueReceiptId: string;
  accountBindingReceiptId: string;
  entitlement: ClubsAmbassadorEntitlementKey;
  accountActive: true;
  entitlementActive: true;
  passwordCreated: false;
  inviteSent: false;
  authorities: ClubsAmbassadorDeniedAuthorityResult;
  issuedAt: string;
};

export type ClubsAmbassadorCurrentEntitlement = {
  schema: typeof CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.version;
  status: "ready";
  entitlement: ClubsAmbassadorEntitlementKey;
  accountActive: true;
  entitlementActive: true;
  fullAccessActive: boolean;
  scopedAccessActive: boolean;
  authorities: ClubsAmbassadorDeniedAuthorityResult;
};

export type ClubsAmbassadorScopedAuthorizationResult =
  | {
      status: "allowed";
      scope: "full_access" | "owned_scoped_access";
      httpStatus: 200;
      foreignIdentifiersExposed: false;
    }
  | {
      status: "cross_ambassador_denied";
      httpStatus: 403;
      foreignIdentifiersExposed: false;
    }
  | {
      status: "ownership_not_found";
      httpStatus: 404;
      foreignIdentifiersExposed: false;
    };

export type ClubsAmbassadorDeniedAuthorityResult = {
  reviewerAuthorityGranted: false;
  globalInboxGranted: false;
  teamGoGranted: false;
  membershipCreated: false;
  propertyAdmissionGranted: false;
  bookingCreated: false;
  paymentAuthorityGranted: false;
  beneficiaryControlPlaneGranted: false;
  payoutControlPlaneGranted: false;
  providerControlPlaneGranted: false;
  deploymentControlPlaneGranted: false;
  secretAuthorityGranted: false;
};

export const CLUBS_AMBASSADOR_ENTITLEMENT_DENIED_AUTHORITIES: ClubsAmbassadorDeniedAuthorityResult =
  Object.freeze({
    reviewerAuthorityGranted: false,
    globalInboxGranted: false,
    teamGoGranted: false,
    membershipCreated: false,
    propertyAdmissionGranted: false,
    bookingCreated: false,
    paymentAuthorityGranted: false,
    beneficiaryControlPlaneGranted: false,
    payoutControlPlaneGranted: false,
    providerControlPlaneGranted: false,
    deploymentControlPlaneGranted: false,
    secretAuthorityGranted: false,
  });
