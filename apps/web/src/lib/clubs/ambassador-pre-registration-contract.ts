import type { RoleKey } from "@/lib/roles";

export const CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT = {
  schema: "crays.clubs.ambassador-pre-registration.v1",
  version: "1.0.0",
  deployment: "source_only_not_applied",
  cache: "no-store",
  endpoints: {
    operations:
      "/api/crays/clubs/ambassador/operations/pre-registrations",
    activationPass:
      "/api/crays/clubs/ambassador/pre-registration/activation-pass",
  },
  publicAmbassadorSlugs: [
    "isabel-maria-jeworski",
    "thorben-biesenbach",
    "kumar-hindocha",
    "robin-karlsen",
    "stephanie-weyer",
    "aiana-lopes-bezerra",
  ],
  lifecycleStates: ["pending_contact_not_supplied", "pre_registered"],
  commands: ["record_pending_contact_not_supplied", "pre_register_digest"],
  allowedActorRoles: ["crays-management", "admin"],
  assurance: { allowed: ["aal2", "aal3"], maximumAgeSeconds: 300 },
  digestContract: {
    algorithm: "sha256",
    encoding: "lowercase_hex",
    canonicalInput: "trim_nfkc_lowercase_utf8",
    computedBy: "external_management_or_t2_adapter",
    sourceAcceptsRawContact: false,
    outputReturnsDigest: false,
  },
  mutationSecurity: {
    previewOnlyHost: true,
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
    expectedVersionRequired: true,
    appendOnlyPreRegistration: true,
    appendOnlyActivationPass: true,
    forcedRowLevelSecurity: true,
    duplicateDigestFailsClosed: true,
    duplicateSubjectFailsClosed: true,
    unknownOutcomeRetryUsesSameIdempotencyKey: true,
  },
  activationPass: {
    exactT2B2bSessionRequired: true,
    browserSuppliedIdentityClaimsAccepted: false,
    exactIssuerDigestRequired: true,
    exactClientDigestRequired: true,
    exactSubjectDigestRequired: true,
    verifiedContactDigestRequired: true,
    maximumAuthenticationAgeSeconds: 300,
    evidenceOnly: true,
    accountActive: false,
    fullAccessActive: false,
    scopedAccessActive: false,
  },
  identityEntryPoints: {
    b2b: "crays_pro_only",
    b2c: "craysclub_com_only",
    b2cMayActivateB2b: false,
    exactIssuerClientSubjectAndVerifiedDigestRequired: true,
  },
  pendingEntitlementPlans: [
    "CLUBS_SAAS_FULL_ACCESS",
    "AMBASSADOR_SCOPED_ACCESS",
  ],
  entitlementIssue: {
    separateReceiptRequiredAfterActivationPass: true,
    activationPassAloneIssuesEntitlement: false,
    activeAccountBindingRequired: true,
    exactSubjectBindingRequired: true,
    publicRoleLabelMaySelectEntitlement: false,
  },
  scopedAccessPolicy: {
    ownProfileAndWorkspaceOnly: true,
    immutableReferralAttributionOwnershipRequired: true,
    tenantScopeRequired: true,
    ownFollowUpsAndAdmittedStatusOnly: true,
    ownSettlementEvidenceOnly: true,
    crossAmbassadorReadOrWriteStatus: 403,
    unknownOwnershipStatus: 404,
    listQueriesMayLeakForeignCountsOrIdentifiers: false,
    beneficiaryOrPayoutControlPlane: false,
    providerDeploymentOrSecretAuthority: false,
  },
  publicProjection: {
    exposesDigests: false,
    exposesProvenanceReceipt: false,
    exposesIdentityClaims: false,
    exposesIdempotencyMaterial: false,
    exposesFinancialTerms: false,
  },
  deniedAuthorities: {
    passwordCreation: false,
    inviteDelivery: false,
    accountActivation: false,
    globalRole: false,
    reviewer: false,
    inbox: false,
    teamGo: false,
    membership: false,
    marina: false,
    propertyAdmission: false,
    booking: false,
    payment: false,
    beneficiary: false,
    payout: false,
    fullAccessBeforeEntitlementIssue: false,
    scopedAccessBeforeEntitlementIssue: false,
  },
  authoritySeparation: {
    t2ExactB2bAdapter: "external_contract_dependency",
    b2cSession: "strictly_rejected_by_t2_adapter",
    reviewerBinding: "separate_existing_authority",
    publicDirectory: "display_identity_only",
    activationPass: "evidence_only_not_account_state",
  },
  deliveryIsolation: {
    craysProMutation: false,
    craysGymMutation: false,
    auth0Mutation: false,
    stripeMutation: false,
    providerMutation: false,
    productionMutation: false,
    deploymentMutation: false,
  },
} as const;

export type ClubsAmbassadorPreRegistrationActorRole = Extract<
  RoleKey,
  "crays-management" | "admin"
>;

export type ClubsAmbassadorPreRegistrationActor = {
  accountId: string;
  organizationId: string;
  role: ClubsAmbassadorPreRegistrationActorRole;
  assuranceLevel: "aal2" | "aal3";
  authenticatedAt: string;
  authoritySource: "auth0-crays-session";
};

export type ClubsPublicAmbassadorSlug =
  (typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.publicAmbassadorSlugs)[number];

export type ClubsAmbassadorPreRegistrationLifecycleState =
  (typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.lifecycleStates)[number];

export type ClubsAmbassadorPendingEntitlementPlan =
  (typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.pendingEntitlementPlans)[number];

export const CLUBS_AMBASSADOR_PENDING_ENTITLEMENT_BY_SLUG = Object.freeze({
  "thorben-biesenbach": "CLUBS_SAAS_FULL_ACCESS",
  "isabel-maria-jeworski": "CLUBS_SAAS_FULL_ACCESS",
  "robin-karlsen": "CLUBS_SAAS_FULL_ACCESS",
  "kumar-hindocha": "CLUBS_SAAS_FULL_ACCESS",
  "stephanie-weyer": "CLUBS_SAAS_FULL_ACCESS",
  "aiana-lopes-bezerra": "AMBASSADOR_SCOPED_ACCESS",
} as const satisfies Record<
  ClubsPublicAmbassadorSlug,
  ClubsAmbassadorPendingEntitlementPlan
>);

type PreRegistrationCommandBase = {
  publicAmbassadorSlug: ClubsPublicAmbassadorSlug;
  expectedVersion: number;
  ownerProvenanceReceiptId: string;
  expectedIssuerSha256: string;
  expectedClientIdSha256: string;
};

export type ClubsAmbassadorPreRegistrationCommand =
  | (PreRegistrationCommandBase & {
      type: "record_pending_contact_not_supplied";
      reasonCode: "owner_contact_pending";
    })
  | (PreRegistrationCommandBase & {
      type: "pre_register_digest";
      normalizedEmailSha256: string;
      reasonCode: "owner_digest_pre_registered";
    });

export type ClubsAmbassadorPreRegistrationItem = {
  preRegistrationEventId: string;
  publicAmbassadorSlug: ClubsPublicAmbassadorSlug;
  version: number;
  lifecycleState: ClubsAmbassadorPreRegistrationLifecycleState;
  inviteState: "not_sent";
  passwordState: "not_created";
  accountState: "not_active";
  accountActive: false;
  updatedAt: string;
};

export type ClubsAmbassadorPreRegistrationMutationResult = {
  schema: typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version;
  status: "recorded" | "replayed";
  preRegistration: ClubsAmbassadorPreRegistrationItem;
  authorities: ClubsAmbassadorDeniedAuthorityResult;
};

export type ClubsAmbassadorPreRegistrationReadModel = {
  schema: typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version;
  status: "ready";
  preRegistrations: ClubsAmbassadorPreRegistrationItem[];
  publicRedaction: {
    digestsExposed: false;
    provenanceExposed: false;
    identityClaimsExposed: false;
  };
  authorities: ClubsAmbassadorDeniedAuthorityResult;
};

export type ClubsExactB2bSessionProof = {
  proofSchema: "crays.clubs.exact-b2b-session-proof.v1";
  issuerSha256: string;
  clientIdSha256: string;
  subjectSha256: string;
  verifiedEmailSha256: string;
  emailVerified: true;
  authenticatedAt: string;
  authoritySource: "exact_b2b_session";
  b2cRejected: true;
};

export type ClubsExactB2bSessionResolution =
  | { status: "ready"; proof: ClubsExactB2bSessionProof }
  | { status: "b2c_rejected" }
  | { status: "unavailable" };

export type ClubsAmbassadorActivationPassCommand = {
  preRegistrationContext: string;
};

export type ClubsAmbassadorActivationPassResult = {
  schema: typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version;
  status: "activation_match_passed" | "replayed";
  activationPassReceiptId: string;
  preRegistrationEventId: string;
  publicAmbassadorSlug: ClubsPublicAmbassadorSlug;
  exactMatch: true;
  accountActive: false;
  fullAccessActive: false;
  scopedAccessActive: false;
  authorities: ClubsAmbassadorDeniedAuthorityResult;
  matchedAt: string;
};

export type ClubsAmbassadorDeniedAuthorityResult = {
  passwordCreated: false;
  inviteSent: false;
  accountActive: false;
  globalRoleGranted: false;
  reviewerAuthorityGranted: false;
  inboxAuthorityGranted: false;
  teamGoAuthorityGranted: false;
  membershipCreated: false;
  marinaAuthorityGranted: false;
  propertyAdmissionGranted: false;
  bookingCreated: false;
  paymentAuthorityGranted: false;
  beneficiaryActivated: false;
  payoutActivated: false;
  fullAccessActive: false;
  scopedAccessActive: false;
};

export const CLUBS_AMBASSADOR_DENIED_AUTHORITY_RESULT: ClubsAmbassadorDeniedAuthorityResult =
  Object.freeze({
    passwordCreated: false,
    inviteSent: false,
    accountActive: false,
    globalRoleGranted: false,
    reviewerAuthorityGranted: false,
    inboxAuthorityGranted: false,
    teamGoAuthorityGranted: false,
    membershipCreated: false,
    marinaAuthorityGranted: false,
    propertyAdmissionGranted: false,
    bookingCreated: false,
    paymentAuthorityGranted: false,
    beneficiaryActivated: false,
    payoutActivated: false,
    fullAccessActive: false,
    scopedAccessActive: false,
  });

export type ClubsAmbassadorEntitlementIssueReceipt = {
  entitlementIssueReceiptId: string;
  activationPassReceiptId: string;
  publicAmbassadorSlug: ClubsPublicAmbassadorSlug;
  entitlement: ClubsAmbassadorPendingEntitlementPlan;
  accountBindingReceiptId: string;
  exactActiveAccountBinding: true;
  exactSubjectBinding: true;
  issuedAt: string;
};
