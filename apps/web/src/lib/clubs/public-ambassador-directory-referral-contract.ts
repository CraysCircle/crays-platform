export const CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT = {
  schema: "crays.clubs.public-ambassador-directory-referral-ui.v1",
  version: "1.0.0",
  implementationStatus: "SOURCE_CONTRACT_ONLY_SERVER_PASS_NOT_IMPLEMENTED",
  publicFields: [
    "slug",
    "displayName",
    "publicProfileAdmission",
    "ownerAuthoredPublicDisplayFact",
    "linkedIn",
    "media",
    "apply",
  ],
  applyReferralFields: [
    "ambassadorSlug",
    "opaqueReferralContext",
    "safeReturnTo",
    "idempotencyKey",
  ],
  requiredFutureServerPassFields: [
    "status",
    "attributionReceiptId",
    "attributionReceiptSha256",
    "referralContextDigest",
    "registrySchema",
    "registryVersion",
    "replayed",
  ],
  referralSemantics: {
    opaqueContextRequired: true,
    safeReturnToRequired: true,
    idempotencyKeyRequired: true,
    immutableAttributionReceiptRequired: true,
    serverPassRequired: true,
    clientMayClaimSuccess: false,
    sourceContractCreatesReceipt: false,
    sourceContractPersistsAttribution: false,
    sourceContractCreatesApplication: false,
  },
  linkedInPresentation: {
    visibleText: "LinkedIn",
    presentation: "icon_label_only",
    rawUrlTextVisible: false,
    target: "_blank",
    rel: "noopener noreferrer",
  },
  mediaPolicy: {
    admittedState: "admitted",
    permittedSlots: ["directory_card_portrait", "profile_hero_portrait"],
    localAssetsRequired: true,
    rightsReceiptRequired: true,
    hotlinkAllowed: false,
    downloadAllowed: false,
  },
  internalEconomics: {
    includedInPublicProjection: false,
    includedInPublicCopy: false,
  },
  statusMatrix: {
    identity: "ADMITTED_OWNER_SOURCE",
    publicProfileAdmission: "ADMITTED",
    publicRoleLabel: "ADMITTED_OWNER_AUTHORED_DISPLAY_ONLY",
    media: "OWNER_AUTHORIZED_LOCAL_ASSET",
    referralContext: "SERVER_PASS_REQUIRED",
    attributionReceipt: "REQUIRED_NOT_IMPLEMENTED",
    sourcePass: "SOURCE_CONTRACT_ONLY",
    previewPass: "NOT_RUN",
    productionPass: "NOT_AUTHORIZED",
  },
  deniedAuthorities: {
    corporateAuthority: false,
    directorAuthority: false,
    reviewerAuthority: false,
    inboxAuthority: false,
    teamGoAuthority: false,
    membershipAuthority: false,
    marinaPropertyAdmissionAuthority: false,
    bookingAuthority: false,
    paymentAuthority: false,
    globalSaasRoleAuthority: false,
    financialAuthority: false,
    beneficiaryAuthority: false,
    payoutAuthority: false,
    commissionAuthority: false,
    productionIdentityAuthority: false,
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

export type PublicAmbassadorRoleLabel = "Founder" | "Co-Founder" | "Ambassador";

export type OwnerAuthoredPublicDisplayFact = {
  publicRoleLabel: PublicAmbassadorRoleLabel;
  sourceAuthority: "owner_authored";
  displayOnly: true;
  authorityDerived: false;
};

export type PublicAmbassadorLinkedIn = {
  href: string;
  label: "LinkedIn";
  presentation: "icon_label_only";
  rawUrlTextVisible: false;
};

export type PublicAmbassadorPlaceholderMedia = {
  url: null;
  state: "placeholder_pending_rights";
  rightsReceiptId: null;
  originalSha256: null;
  sourceAuthority: null;
  alt: null;
  width: null;
  height: null;
  focalPoint: null;
  crop: null;
  renderable: false;
  hotlinkAllowed: false;
  downloadAllowed: false;
};

export type PublicAmbassadorAdmittedMedia = {
  url: string;
  state: "admitted";
  rightsReceiptId: string;
  originalSha256: string;
  sourceAuthority:
    | "owner_authorized_existing_crays_asset"
    | "owner_authorized_chat_attachment";
  alt: string;
  width: number;
  height: number;
  focalPoint: { x: number; y: number };
  crop: "3:4";
  renderable: true;
  hotlinkAllowed: false;
  downloadAllowed: false;
};

export type PublicAmbassadorMedia =
  | PublicAmbassadorPlaceholderMedia
  | PublicAmbassadorAdmittedMedia;

export type PublicAmbassadorDirectoryProfile = {
  slug: string;
  name: string;
  publicProfileAdmission: "ADMITTED_OWNER_SOURCE";
  publicRoleLabel: PublicAmbassadorRoleLabel;
  ownerAuthoredPublicDisplayFact: OwnerAuthoredPublicDisplayFact;
  linkedIn: PublicAmbassadorLinkedIn;
  media: PublicAmbassadorMedia;
  apply: {
    path: string;
    ambassadorSlug: string;
    referralContextRequired: true;
    serverPassRequired: true;
  };
  authority: typeof CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.deniedAuthorities;
  role: PublicAmbassadorRoleLabel;
  projectRole: null;
  confirmationRoute: string;
};

export type PublicAmbassadorProjection = Pick<
  PublicAmbassadorDirectoryProfile,
  | "slug"
  | "name"
  | "publicProfileAdmission"
  | "ownerAuthoredPublicDisplayFact"
  | "linkedIn"
  | "media"
  | "apply"
  | "authority"
>;

export type PublicAmbassadorReferralHandoffInput = {
  ambassadorSlug: string;
  opaqueReferralContext: string;
  safeReturnTo: string;
  idempotencyKey: string;
};

export const PUBLIC_AMBASSADOR_SAFE_RETURN_TO_PREFIXES = [
  "/en/ambassadors/",
  "/en/become-a-member",
  "/en/apply-directly",
] as const;

const OPAQUE_REFERRAL_CONTEXT = /^[A-Za-z0-9_-]{43,512}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_.-]{16,200}$/;

export function isOpaquePublicAmbassadorReferralContext(value: string) {
  return OPAQUE_REFERRAL_CONTEXT.test(value);
}

export function isPublicAmbassadorReferralIdempotencyKey(value: string) {
  return IDEMPOTENCY_KEY.test(value);
}

export function isSafePublicAmbassadorReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  try {
    const parsed = new URL(value, "https://return-to.invalid");
    return (
      parsed.origin === "https://return-to.invalid" &&
      !parsed.username &&
      !parsed.password &&
      PUBLIC_AMBASSADOR_SAFE_RETURN_TO_PREFIXES.some((prefix) =>
        parsed.pathname.startsWith(prefix),
      )
    );
  } catch {
    return false;
  }
}

export function validatePublicAmbassadorReferralHandoffShape(
  input: PublicAmbassadorReferralHandoffInput,
) {
  if (!isOpaquePublicAmbassadorReferralContext(input.opaqueReferralContext)) {
    return "INVALID_OPAQUE_REFERRAL_CONTEXT" as const;
  }
  if (!isSafePublicAmbassadorReturnTo(input.safeReturnTo)) {
    return "UNSAFE_RETURN_TO" as const;
  }
  if (!isPublicAmbassadorReferralIdempotencyKey(input.idempotencyKey)) {
    return "INVALID_IDEMPOTENCY_KEY" as const;
  }
  return null;
}
