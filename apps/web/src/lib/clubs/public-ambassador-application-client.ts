"use client";

export const PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT = {
  schema: "crays.clubs.public-ambassador-application-client.v1",
  version: "1.0.0",
  endpoints: {
    directApplication:
      "/api/crays/clubs/member/membership-applications/direct",
    referralAttribution:
      "/api/crays/clubs/public-ambassador/referral-attribution",
  },
  visibleStates: [
    "Nothing sent yet",
    "Sign in required",
    "Submitting",
    "Application received",
    "Attribution pending reconciliation",
    "Complete",
  ],
  transport: {
    cache: "no-store",
    credentials: "same-origin",
    contentType: "application/json",
    idempotencyHeader: "Idempotency-Key",
    retryUnknownOutcomeWithSameKeyAndBody: true,
  },
  success: {
    directApplicationPersistedRequired: true,
    referralServerPassRequired: true,
    immutableReferralReceiptRequired: true,
  },
  deniedClaims: {
    membership: false,
    teamGo: false,
    booking: false,
    payment: false,
    commission: false,
    beneficiary: false,
    payout: false,
    provider: false,
    production: false,
  },
} as const;

export type PublicAmbassadorApplicationVisibleState =
  (typeof PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT.visibleStates)[number];

export type DirectMembershipApplicantPayload = Readonly<{
  applicantType: "individual" | "family" | "team";
  fullName: string;
  basedIn: string;
  interest: string;
  preferredArrivalWindow: string;
  preferredParticipationLength: string;
  linkedinUrl: string | null;
  socialUrl: string | null;
  profileUrl: string | null;
  motivation: string;
  contribution: string;
  consent: true;
}>;

type ReferralAttempt = Readonly<{
  ambassadorSlug: string;
  idempotencyKey: string;
  opaqueReferralContext: string;
  safeReturnTo: string;
}>;

export type PublicAmbassadorApplicationAttempt = Readonly<{
  applicationIdempotencyKey: string;
  applicationPayload: string;
  loginHref: string;
  referral: ReferralAttempt | null;
}>;

export type DirectApplicationSubmissionResult =
  | Readonly<{
      kind: "confirmed";
      applicationId: string;
      replayed: boolean;
    }>
  | Readonly<{
      kind:
        | "sign_in_required"
        | "denied"
        | "validation_error"
        | "conflict"
        | "unavailable"
        | "unknown_outcome";
    }>;

export type ReferralAttributionSubmissionResult = Readonly<{
  kind:
    | "complete"
    | "sign_in_required"
    | "cross_ambassador"
    | "not_found"
    | "conflict"
    | "unavailable"
    | "unknown_outcome";
}>;

type JsonRecord = Record<string, unknown>;
type HttpResult = Readonly<{
  body: JsonRecord | null;
  retryAfterSeconds: number;
  status: number;
}>;

const APPLICATION_ID =
  /^clubs-direct-membership-application_[0-9a-f-]{36}$/;
const ATTRIBUTION_RECEIPT_ID =
  /^clubs-public-ambassador-referral-attribution_[0-9a-f-]{36}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const AMBASSADOR_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_RETURN_TO_PREFIXES = [
  "/en/ambassadors/",
  "/en/become-a-member",
  "/en/apply-directly",
] as const;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return false;
  }
  try {
    const parsed = new URL(value, "https://return-to.invalid");
    return (
      parsed.origin === "https://return-to.invalid" &&
      !parsed.username &&
      !parsed.password &&
      SAFE_RETURN_TO_PREFIXES.some((prefix) =>
        parsed.pathname.startsWith(prefix),
      )
    );
  } catch {
    return false;
  }
}

function browserCrypto() {
  if (!globalThis.crypto?.randomUUID || !globalThis.crypto.getRandomValues) {
    throw new Error("Secure browser randomness is unavailable");
  }
  return globalThis.crypto;
}

function idempotencyKey(kind: "application" | "attribution") {
  return `cclub:${kind}:${browserCrypto().randomUUID()}`;
}

function opaqueReferralContext() {
  const bytes = new Uint8Array(32);
  browserCrypto().getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function nullableTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createPublicAmbassadorApplicationAttempt(input: {
  ambassadorSlug?: string;
  applicant: DirectMembershipApplicantPayload;
}) {
  if (input.ambassadorSlug && !AMBASSADOR_SLUG.test(input.ambassadorSlug)) {
    throw new Error("Ambassador application context is invalid");
  }
  const safeJourneyReturnTo = input.ambassadorSlug
    ? `/en/ambassadors/${input.ambassadorSlug}`
    : "/en/apply-directly";
  if (!safeReturnTo(safeJourneyReturnTo)) {
    throw new Error("Ambassador application return path is invalid");
  }
  const applicant: DirectMembershipApplicantPayload = {
    applicantType: input.applicant.applicantType,
    fullName: input.applicant.fullName.trim(),
    basedIn: input.applicant.basedIn.trim(),
    interest: input.applicant.interest.trim(),
    preferredArrivalWindow: input.applicant.preferredArrivalWindow.trim(),
    preferredParticipationLength:
      input.applicant.preferredParticipationLength.trim(),
    linkedinUrl: nullableTrimmed(input.applicant.linkedinUrl ?? ""),
    socialUrl: nullableTrimmed(input.applicant.socialUrl ?? ""),
    profileUrl: nullableTrimmed(input.applicant.profileUrl ?? ""),
    motivation: input.applicant.motivation.trim(),
    contribution: input.applicant.contribution.trim(),
    consent: true,
  };
  return Object.freeze({
    applicationIdempotencyKey: idempotencyKey("application"),
    applicationPayload: JSON.stringify({
      type: "submit_application",
      applicant,
    }),
    loginHref: `/auth/login?returnTo=${encodeURIComponent(`${safeJourneyReturnTo}#application`)}`,
    referral: input.ambassadorSlug
      ? Object.freeze({
          ambassadorSlug: input.ambassadorSlug,
          idempotencyKey: idempotencyKey("attribution"),
          opaqueReferralContext: opaqueReferralContext(),
          safeReturnTo: safeJourneyReturnTo,
        })
      : null,
  }) satisfies PublicAmbassadorApplicationAttempt;
}

async function requestJson(
  endpoint: string,
  init: RequestInit,
): Promise<HttpResult> {
  try {
    const response = await fetch(endpoint, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    const parsed = record(await response.json().catch(() => null));
    const retryAfter = Number(response.headers.get("retry-after") ?? "2");
    return {
      body: parsed,
      retryAfterSeconds:
        Number.isFinite(retryAfter) && retryAfter >= 1 && retryAfter <= 5
          ? retryAfter
          : 2,
      status: response.status,
    };
  } catch {
    return { body: null, retryAfterSeconds: 2, status: 0 };
  }
}

function allDirectAuthoritiesDenied(authorities: JsonRecord | null) {
  return (
    authorities?.applicationPersisted === true &&
    authorities.membership === false &&
    authorities.propertyAdmission === false &&
    authorities.availability === false &&
    authorities.quote === false &&
    authorities.booking === false &&
    authorities.payment === false &&
    authorities.revenueEntitlement === false
  );
}

function directPostReceipt(body: JsonRecord | null) {
  const application = record(body?.application);
  if (
    body?.status !== "persisted" ||
    body.outcome !== "application_submitted" ||
    !APPLICATION_ID.test(String(application?.applicationId ?? "")) ||
    !allDirectAuthoritiesDenied(record(body.authorities))
  ) {
    return null;
  }
  return {
    applicationId: String(application!.applicationId),
    replayed: body.replayed === true,
  };
}

function directReadReceipt(body: JsonRecord | null) {
  const application = record(body?.application);
  if (
    body?.status !== "ready" ||
    !APPLICATION_ID.test(String(application?.applicationId ?? "")) ||
    !allDirectAuthoritiesDenied(record(body.authorities))
  ) {
    return null;
  }
  return { applicationId: String(application!.applicationId), replayed: true };
}

async function postDirectApplication(
  attempt: PublicAmbassadorApplicationAttempt,
): Promise<DirectApplicationSubmissionResult & { retryAfterSeconds?: number }> {
  const response = await requestJson(
    PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT.endpoints.directApplication,
    {
      body: attempt.applicationPayload,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": attempt.applicationIdempotencyKey,
      },
      method: "POST",
    },
  );
  const receipt = response.status === 200 ? directPostReceipt(response.body) : null;
  if (receipt) return { kind: "confirmed", ...receipt };
  if (response.status === 401) return { kind: "sign_in_required" };
  if (response.status === 403) return { kind: "denied" };
  if (response.status === 400) return { kind: "validation_error" };
  if (response.status === 409)
    return { kind: "conflict", retryAfterSeconds: response.retryAfterSeconds };
  if (
    response.status === 0 ||
    (response.status === 503 && response.body?.status === "unknown_outcome")
  ) {
    return {
      kind: "unknown_outcome",
      retryAfterSeconds: response.retryAfterSeconds,
    };
  }
  return { kind: "unavailable" };
}

async function readDirectApplication(): Promise<DirectApplicationSubmissionResult> {
  const response = await requestJson(
    PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT.endpoints.directApplication,
    { method: "GET" },
  );
  const receipt = response.status === 200 ? directReadReceipt(response.body) : null;
  if (receipt) return { kind: "confirmed", ...receipt };
  if (response.status === 401) return { kind: "sign_in_required" };
  if (response.status === 403) return { kind: "denied" };
  if (response.status === 200 && response.body?.application === null) {
    return { kind: "conflict" };
  }
  return { kind: "unavailable" };
}

function wait(seconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, seconds * 1000);
  });
}

export async function submitDirectMembershipApplication(
  attempt: PublicAmbassadorApplicationAttempt,
): Promise<DirectApplicationSubmissionResult> {
  const first = await postDirectApplication(attempt);
  if (first.kind === "confirmed" || first.kind === "sign_in_required") {
    return first;
  }
  if (first.kind !== "conflict" && first.kind !== "unknown_outcome") {
    return first;
  }
  const reconciled = await readDirectApplication();
  if (reconciled.kind === "confirmed" || reconciled.kind === "sign_in_required") {
    return reconciled;
  }
  if (first.kind === "conflict") return first;

  await wait(first.retryAfterSeconds ?? 2);
  const replay = await postDirectApplication(attempt);
  if (replay.kind === "confirmed" || replay.kind === "sign_in_required") {
    return replay;
  }
  if (replay.kind === "conflict" || replay.kind === "unknown_outcome") {
    const finalReconciliation = await readDirectApplication();
    if (
      finalReconciliation.kind === "confirmed" ||
      finalReconciliation.kind === "sign_in_required"
    ) {
      return finalReconciliation;
    }
  }
  return replay.kind === "unknown_outcome"
    ? { kind: "unknown_outcome" }
    : replay;
}

function allReferralAuthoritiesDenied(authorities: JsonRecord | null) {
  return (
    authorities?.reviewerAuthorityGranted === false &&
    authorities.globalInboxGranted === false &&
    authorities.teamGoGranted === false &&
    authorities.membershipCreated === false &&
    authorities.propertyAdmissionGranted === false &&
    authorities.bookingCreated === false &&
    authorities.paymentAuthorityGranted === false &&
    authorities.commissionAuthorityGranted === false &&
    authorities.beneficiaryControlPlaneGranted === false &&
    authorities.payoutControlPlaneGranted === false &&
    authorities.providerControlPlaneGranted === false &&
    authorities.deploymentControlPlaneGranted === false &&
    authorities.secretAuthorityGranted === false
  );
}

function referralReceipt(body: JsonRecord | null, ambassadorSlug: string) {
  return (
    body?.serverPass === true &&
    (body.status === "persisted" || body.status === "replayed") &&
    body.ambassadorSlug === ambassadorSlug &&
    body.sourceApplicationBinding === true &&
    ATTRIBUTION_RECEIPT_ID.test(String(body.attributionReceiptId ?? "")) &&
    SHA256.test(String(body.attributionReceiptSha256 ?? "")) &&
    allReferralAuthoritiesDenied(record(body.authorities))
  );
}

async function postReferralAttribution(
  referral: ReferralAttempt,
  payload: string,
): Promise<ReferralAttributionSubmissionResult & { retryAfterSeconds?: number }> {
  const response = await requestJson(
    PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT.endpoints.referralAttribution,
    {
      body: payload,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": referral.idempotencyKey,
      },
      method: "POST",
    },
  );
  if (response.status === 200 && referralReceipt(response.body, referral.ambassadorSlug)) {
    return { kind: "complete" };
  }
  if (response.status === 401) return { kind: "sign_in_required" };
  if (response.status === 403) return { kind: "cross_ambassador" };
  if (response.status === 404) return { kind: "not_found" };
  if (response.status === 409) return { kind: "conflict" };
  if (
    response.status === 0 ||
    (response.status === 503 && response.body?.status === "unknown_outcome")
  ) {
    return {
      kind: "unknown_outcome",
      retryAfterSeconds: response.retryAfterSeconds,
    };
  }
  return { kind: "unavailable" };
}

export async function submitPublicAmbassadorReferralAttribution(
  attempt: PublicAmbassadorApplicationAttempt,
  sourceApplicationId: string,
): Promise<ReferralAttributionSubmissionResult> {
  const referral = attempt.referral;
  if (!referral) return { kind: "complete" };
  if (!APPLICATION_ID.test(sourceApplicationId)) return { kind: "not_found" };
  const payload = JSON.stringify({
    type: "persist_referral_attribution",
    ambassadorSlug: referral.ambassadorSlug,
    opaqueReferralContext: referral.opaqueReferralContext,
    safeReturnTo: referral.safeReturnTo,
    sourceApplicationId,
  });
  const first = await postReferralAttribution(
    referral,
    payload,
  );
  if (first.kind !== "unknown_outcome") return first;

  await wait(first.retryAfterSeconds ?? 2);
  const replay = await postReferralAttribution(
    referral,
    payload,
  );
  return replay.kind === "unknown_outcome"
    ? { kind: "unknown_outcome" }
    : replay;
}
