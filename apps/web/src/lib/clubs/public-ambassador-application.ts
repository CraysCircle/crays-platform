import type { ClubsLocale } from "./public-site";
import {
  CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT,
  type PublicAmbassadorReferralHandoffInput,
  validatePublicAmbassadorReferralHandoffShape,
} from "./public-ambassador-directory-referral-contract";
import {
  getApprovedAmbassador,
  isApprovedAmbassadorSlug,
} from "./public-ambassador-registry";

export const CLUBS_AMBASSADOR_INTERESTS = [
  "community",
  "school-jobs",
  "fitness-wellbeing",
  "family",
  "company-residency",
  "culture-events",
] as const;

export type ClubsAmbassadorInterest =
  (typeof CLUBS_AMBASSADOR_INTERESTS)[number];

export type ClubsAmbassadorApplicationInput = {
  fullName: string;
  email: string;
  basedIn: string;
  interest: ClubsAmbassadorInterest | "";
  motivation: string;
  contribution: string;
  profileUrl: string;
  consent: boolean;
};

export type ClubsAmbassadorApplicationErrors = Partial<
  Record<keyof ClubsAmbassadorApplicationInput, string>
>;

const AMBASSADOR_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidAmbassadorSlug(value: string): boolean {
  return value.length <= 64 && AMBASSADOR_SLUG.test(value);
}

export function ambassadorNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function validateAmbassadorApplication(
  input: ClubsAmbassadorApplicationInput,
  messages: {
    required: string;
    email: string;
    min80: string;
    url: string;
    consent: string;
  },
): ClubsAmbassadorApplicationErrors {
  const errors: ClubsAmbassadorApplicationErrors = {};
  const fullName = input.fullName.trim();
  const basedIn = input.basedIn.trim();
  const motivation = input.motivation.trim();
  const contribution = input.contribution.trim();
  const profileUrl = input.profileUrl.trim();

  if (fullName.length < 2 || fullName.length > 120)
    errors.fullName = messages.required;
  if (!EMAIL.test(input.email.trim()) || input.email.trim().length > 254)
    errors.email = messages.email;
  if (basedIn.length > 120) errors.basedIn = messages.required;
  if (!input.interest) errors.interest = messages.required;
  if (motivation.length < 80 || motivation.length > 1500)
    errors.motivation = messages.min80;
  if (contribution.length < 80 || contribution.length > 1500)
    errors.contribution = messages.min80;

  if (profileUrl) {
    try {
      if (new URL(profileUrl).protocol !== "https:")
        errors.profileUrl = messages.url;
    } catch {
      errors.profileUrl = messages.url;
    }
  }

  if (!input.consent) errors.consent = messages.consent;
  return errors;
}

export type ClubsAmbassadorPreviewResult = {
  status: "PREVIEW_NOT_PERSISTED";
  locale: ClubsLocale;
  ambassadorSlug: string | null;
};

export function createNoSendAmbassadorPreviewResult(
  locale: ClubsLocale,
  ambassadorSlug: string | null,
): ClubsAmbassadorPreviewResult {
  return { status: "PREVIEW_NOT_PERSISTED", locale, ambassadorSlug };
}

export type ClubsPublicAmbassadorReferralHandoffResult =
  | {
      status: "REJECTED_FAIL_CLOSED";
      reason:
        | "UNKNOWN_OR_INACTIVE_AMBASSADOR"
        | "INVALID_OPAQUE_REFERRAL_CONTEXT"
        | "UNSAFE_RETURN_TO"
        | "INVALID_IDEMPOTENCY_KEY";
      serverPass: false;
      attributionReceipt: null;
    }
  | {
      status: "CLIENT_HANDOFF_VALIDATED_SERVER_PASS_REQUIRED";
      contractSchema: typeof CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.schema;
      contractVersion: typeof CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.version;
      ambassadorSlug: string;
      ambassadorDisplayName: string;
      opaqueReferralContext: string;
      safeReturnTo: string;
      idempotencyKey: string;
      serverPassRequired: true;
      serverPass: false;
      clientMayClaimSuccess: false;
      attributionReceipt: null;
      authority: typeof CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.deniedAuthorities;
    };

export function createPublicAmbassadorReferralHandoff(
  input: PublicAmbassadorReferralHandoffInput,
): ClubsPublicAmbassadorReferralHandoffResult {
  if (!isApprovedAmbassadorSlug(input.ambassadorSlug)) {
    return {
      status: "REJECTED_FAIL_CLOSED",
      reason: "UNKNOWN_OR_INACTIVE_AMBASSADOR",
      serverPass: false,
      attributionReceipt: null,
    };
  }
  const invalidReason = validatePublicAmbassadorReferralHandoffShape(input);
  if (invalidReason) {
    return {
      status: "REJECTED_FAIL_CLOSED",
      reason: invalidReason,
      serverPass: false,
      attributionReceipt: null,
    };
  }
  const ambassador = getApprovedAmbassador(input.ambassadorSlug);
  return {
    status: "CLIENT_HANDOFF_VALIDATED_SERVER_PASS_REQUIRED",
    contractSchema:
      CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.schema,
    contractVersion:
      CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.version,
    ambassadorSlug: ambassador.slug,
    ambassadorDisplayName: ambassador.name,
    opaqueReferralContext: input.opaqueReferralContext,
    safeReturnTo: input.safeReturnTo,
    idempotencyKey: input.idempotencyKey,
    serverPassRequired: true,
    serverPass: false,
    clientMayClaimSuccess: false,
    attributionReceipt: null,
    authority:
      CLUBS_PUBLIC_AMBASSADOR_DIRECTORY_REFERRAL_CONTRACT.deniedAuthorities,
  };
}
