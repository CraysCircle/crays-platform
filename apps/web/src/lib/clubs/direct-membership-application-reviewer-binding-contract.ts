export const DIRECT_MEMBERSHIP_APPLICATION_REVIEWER_BINDING_CONTRACT = {
  schema: "crays.clubs.direct-membership-application-reviewer-binding.v1",
  version: "1.1.0",
  routeKey: "direct-membership-application",
  reviewerProfileId: "ambassador_profile_thorben_biesenbach",
  reviewerDisplayName: "Thorben Biesenbach",
  entrypoint: "https://www.crays.pro",
  deliveryIsolation: {
    executionEnvironment: "isolated_clubs_preview",
    craysProSourceMutationAuthorized: false,
    craysProDeploymentAuthorized: false,
    craysGymMutationAuthorized: false,
    productionMutationAuthorized: false,
    futureCraysProHandoff: "source_contract_only",
  },
  identity: {
    provider: "auth0",
    exactVerifiedCoreBindingRequired: true,
    businessIdentitySubjectSha256:
      "6c140ff00fa680dfc032107e3ebbcb8971696a22419ae3eebbd89695de47cdc4",
    reuseCanonicalPerson: true,
    duplicateCorePersonForbidden: true,
    craysGymAuthorityInheritance: false,
    previewBridge: {
      mode: "canonical_account_projection_with_exact_source_principal",
      canonicalAccountIdPreservedAcrossDatabases: true,
      canonicalCraysIdPreservedAcrossDatabases: true,
      canonicalPrimaryContactRedactedInClubsPreview: true,
      sourcePrincipalAccountReassigned: false,
      existingPreviewDependenciesPreserved: true,
      projectionReceiptRequired: true,
      bridgeReceiptRequired: true,
      exactSourcePrincipalMustRemainActive: true,
      projectionBusinessSubjectDigestMustMatch: true,
    },
  },
  purposeRole: "AMBASSADOR_APPLICATION_REVIEWER",
  capabilities: ["read_assigned_applications", "review_assigned_applications"],
  deniedAuthorities: {
    globalAmbassadorRole: false,
    teamDecision: false,
    membershipApproval: false,
    marinaPropertyAdmission: false,
    availability: false,
    quote: false,
    booking: false,
    payment: false,
    revenueAttribution: false,
    payout: false,
  },
  resolverStates: [
    "ready",
    "identity_not_bound",
    "reviewer_binding_not_ready",
    "reviewer_binding_ambiguous",
    "reviewer_binding_expired",
    "reviewer_binding_revoked",
    "core_account_not_active",
  ],
  persistence: {
    environment: "isolated_neon_preview",
    productionMutationAuthorized: false,
    providerMutationAuthorized: false,
    bindingAppendOnly: true,
    revocationAppendOnly: true,
    canonicalProjectionAppendOnly: true,
    rowLevelSecurity: "core_service_only",
  },
} as const;

export type DirectMembershipReviewerResolverState =
  (typeof DIRECT_MEMBERSHIP_APPLICATION_REVIEWER_BINDING_CONTRACT.resolverStates)[number];

export type DirectMembershipReviewerResolution = Readonly<{
  state: DirectMembershipReviewerResolverState;
  reviewerProfileId: string | null;
  canonicalAccountId: string | null;
  bindingId: string | null;
  purposeRole: "AMBASSADOR_APPLICATION_REVIEWER" | null;
  capabilities: readonly string[];
  authorities: typeof DIRECT_MEMBERSHIP_APPLICATION_REVIEWER_BINDING_CONTRACT.deniedAuthorities;
}>;
