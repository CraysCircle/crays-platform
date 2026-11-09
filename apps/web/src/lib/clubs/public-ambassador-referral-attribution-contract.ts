import {
  isOpaquePublicAmbassadorReferralContext,
  isPublicAmbassadorReferralIdempotencyKey,
  isSafePublicAmbassadorReturnTo,
} from "@/lib/clubs/public-ambassador-directory-referral-contract";

export const CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT = {
  schema: "crays.clubs.public-ambassador-referral-attribution.v1",
  version: "1.0.0",
  endpoint:
    "/api/crays/clubs/public-ambassador/referral-attribution",
  implementationStatus: "SOURCE_ONLY_0252_NOT_APPLIED",
  cache: "no-store",
  sourceAuthorities: {
    publicRegistry:
      "src/lib/clubs/public-ambassador-registry.ts",
    referralHandoff:
      "src/lib/clubs/public-ambassador-directory-referral-contract.ts",
    sourceApplication:
      "crays_core.clubs_direct_membership_applications",
    scopedOwnership:
      "crays_core.clubs_ambassador_scoped_resource_ownership_receipts",
  },
  persistence: {
    admittedSlugRequired: true,
    inactiveRegistryOverrideFailsClosed: true,
    opaqueReferralContextPersistedRaw: false,
    safeReturnToPersistedRaw: false,
    sourceApplicationBindingRequired: true,
    sourceApplicationAccountBindingRequired: true,
    idempotencyKeyRequired: true,
    sameRequestReplay: true,
    sameKeyPayloadDriftStatus: 409,
    immutableReceiptIdAndHash: true,
    appendOnly: true,
    forcedRowLevelSecurity: true,
  },
  statusMatrix: {
    persisted: 200,
    replayed: 200,
    validationError: 400,
    crossAmbassador: 403,
    unknownAmbassador: 404,
    unknownSourceApplication: 404,
    unknownOwnership: 404,
    inactiveAmbassador: 409,
    payloadDrift: 409,
    unknownOutcome: 503,
  },
  ownership: {
    writerImplemented: true,
    materializationIsInternalOnly: true,
    activeScopedEntitlementRequired: true,
    exactAttributionSlugBindingRequired: true,
    exactSourceApplicationDigestRequired: true,
    crossAmbassadorStatus: 403,
    unknownOwnershipStatus: 404,
    listCountsOrForeignIdentifiersExposed: false,
  },
  publicProjection: {
    commissionIncluded: false,
    internalEconomicsIncluded: false,
    beneficiaryIncluded: false,
    payoutIncluded: false,
    financialCopyIncluded: false,
  },
  deniedAuthorities: {
    reviewerAuthorityGranted: false,
    globalInboxGranted: false,
    teamGoGranted: false,
    membershipCreated: false,
    propertyAdmissionGranted: false,
    bookingCreated: false,
    paymentAuthorityGranted: false,
    commissionAuthorityGranted: false,
    beneficiaryControlPlaneGranted: false,
    payoutControlPlaneGranted: false,
    providerControlPlaneGranted: false,
    deploymentControlPlaneGranted: false,
    secretAuthorityGranted: false,
  },
  deliveryIsolation: {
    publicUiMutation: false,
    craysProMutation: false,
    craysGymMutation: false,
    auth0Mutation: false,
    environmentMutation: false,
    stripeMutation: false,
    providerMutation: false,
    productionMutation: false,
    deploymentMutation: false,
    databaseApplyAuthorized: false,
  },
} as const;

export type PublicAmbassadorReferralAttributionCommand = {
  ambassadorSlug: string;
  opaqueReferralContext: string;
  safeReturnTo: string;
  sourceApplicationId: string;
};

export type PublicAmbassadorReferralAttributionReceiptResult = {
  schema: typeof CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.schema;
  version: typeof CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.version;
  status: "persisted" | "replayed";
  attributionReceiptId: string;
  attributionReceiptSha256: string;
  ambassadorSlug: string;
  referralContextDigest: string;
  safeReturnToDigest: string;
  sourceApplicationBinding: true;
  replayed: boolean;
  authorities: PublicAmbassadorReferralDeniedAuthorities;
};

export type PublicAmbassadorReferralOwnershipCommand = {
  attributionReceiptId: string;
  idempotencyKey: string;
};

export type PublicAmbassadorReferralOwnershipResult = {
  status: "persisted" | "replayed";
  scopedOwnershipReceiptId: string;
  attributionReceiptSha256: string;
  resourceKind: "application";
  foreignIdentifiersExposed: false;
  replayed: boolean;
};

export type PublicAmbassadorReferralDeniedAuthorities = {
  reviewerAuthorityGranted: false;
  globalInboxGranted: false;
  teamGoGranted: false;
  membershipCreated: false;
  propertyAdmissionGranted: false;
  bookingCreated: false;
  paymentAuthorityGranted: false;
  commissionAuthorityGranted: false;
  beneficiaryControlPlaneGranted: false;
  payoutControlPlaneGranted: false;
  providerControlPlaneGranted: false;
  deploymentControlPlaneGranted: false;
  secretAuthorityGranted: false;
};

export const PUBLIC_AMBASSADOR_REFERRAL_DENIED_AUTHORITIES: PublicAmbassadorReferralDeniedAuthorities =
  Object.freeze({
    reviewerAuthorityGranted: false,
    globalInboxGranted: false,
    teamGoGranted: false,
    membershipCreated: false,
    propertyAdmissionGranted: false,
    bookingCreated: false,
    paymentAuthorityGranted: false,
    commissionAuthorityGranted: false,
    beneficiaryControlPlaneGranted: false,
    payoutControlPlaneGranted: false,
    providerControlPlaneGranted: false,
    deploymentControlPlaneGranted: false,
    secretAuthorityGranted: false,
  });

const SOURCE_APPLICATION_ID =
  /^clubs-direct-membership-application_[0-9a-f-]{36}$/;
const ATTRIBUTION_RECEIPT_ID =
  /^clubs-public-ambassador-referral-attribution_[0-9a-f-]{36}$/;

export function validatePublicAmbassadorReferralAttributionCommand(
  command: PublicAmbassadorReferralAttributionCommand,
) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(command.ambassadorSlug)) {
    return "INVALID_AMBASSADOR_SLUG" as const;
  }
  if (!isOpaquePublicAmbassadorReferralContext(command.opaqueReferralContext)) {
    return "INVALID_OPAQUE_REFERRAL_CONTEXT" as const;
  }
  if (!isSafePublicAmbassadorReturnTo(command.safeReturnTo)) {
    return "UNSAFE_RETURN_TO" as const;
  }
  if (!SOURCE_APPLICATION_ID.test(command.sourceApplicationId)) {
    return "INVALID_SOURCE_APPLICATION" as const;
  }
  return null;
}

export function isValidPublicAmbassadorReferralIdempotencyKey(value: string) {
  return isPublicAmbassadorReferralIdempotencyKey(value);
}

export function isValidPublicAmbassadorAttributionReceiptId(value: string) {
  return ATTRIBUTION_RECEIPT_ID.test(value);
}

