import { createHash } from "node:crypto";
import {
  CLUBS_PAYMENT_LEDGER_DOMAINS_V2,
  type ClubsSandboxPaymentKindV2,
  type TeamGoVerificationV2,
} from "./clubs-stripe-sandbox-team-go-verifier-v2";

export const CLUBS_SANDBOX_ALLOCATION_BPS_V2 = Object.freeze({
  operatorFranchise: 8_475,
  ambassador: 1_000,
  software: 500,
  globalConcept: 25,
});

export type ClubsSandboxAllocationV2 = Readonly<{
  grossMinor: number;
  operatorFranchiseMinor: number;
  ambassadorMinor: number;
  softwareMinor: number;
  globalConceptMinor: number;
  allocatedMinor: number;
  allocationStatus: "SOURCE_CALCULATED_UNPOSTED";
}>;

export type ClubsSandboxPrepareRequestV2 = Readonly<{
  paymentKind: ClubsSandboxPaymentKindV2;
  subjectReference: string;
  amountMinor: number;
  currency: "EUR";
  idempotencyKey: string;
  livemode: false;
}>;

export type PersistedPaymentBindingV2 = Readonly<{
  bindingId: string;
  teamGoReceiptSha256: string;
  paymentKind: ClubsSandboxPaymentKindV2;
  ledgerDomain: (typeof CLUBS_PAYMENT_LEDGER_DOMAINS_V2)[ClubsSandboxPaymentKindV2];
  idempotencyKey: string;
  requestFingerprint: string;
  immutable: true;
  persisted: true;
  livemode: false;
}>;

export type ClubsSandboxPrepareStateV2 = Readonly<{
  httpStatus: 400 | 409 | 503;
  state:
    | "IMMUTABLE_TEAM_GO_REQUIRED"
    | "PERSISTENT_PAYMENT_BINDING_REQUIRED"
    | "PAYMENT_BINDING_REJECTED"
    | "PAYMENT_DOMAIN_REJECTED"
    | "LIVEMODE_REJECTED"
    | "PROVIDER_CONNECTION_BLOCKED";
  livemode: false;
  teamGoVerified: boolean;
  persistentBindingVerified: boolean;
  checkoutCreated: false;
  allocationPosted: false;
  providerSuccessClaimed: false;
  requestFingerprint?: string;
  allocation?: ClubsSandboxAllocationV2;
}>;

export type PersistedIdempotencyRecordV2 = Readonly<{
  idempotencyKey: string;
  requestFingerprint: string;
  persisted: true;
  livemode: false;
}>;

export type IdempotencyResolutionV2 = Readonly<{
  httpStatus: 409 | 503;
  state: "UNKNOWN_OUTCOME" | "REPLAY_CONFIRMED_SOURCE_ONLY" | "IDEMPOTENCY_CONFLICT";
  livemode: false;
  providerSuccessClaimed: false;
}>;

const allocationOrder = [
  ["operatorFranchiseMinor", CLUBS_SANDBOX_ALLOCATION_BPS_V2.operatorFranchise],
  ["ambassadorMinor", CLUBS_SANDBOX_ALLOCATION_BPS_V2.ambassador],
  ["softwareMinor", CLUBS_SANDBOX_ALLOCATION_BPS_V2.software],
  ["globalConceptMinor", CLUBS_SANDBOX_ALLOCATION_BPS_V2.globalConcept],
] as const;

export function calculateClubsSandboxAllocationV2(grossMinor: number): ClubsSandboxAllocationV2 {
  if (!Number.isSafeInteger(grossMinor) || grossMinor < 400) {
    throw new RangeError("grossMinor must be a safe integer of at least 400 minor units");
  }
  const gross = BigInt(grossMinor);
  const denominator = 10_000n;
  const shares = allocationOrder.map(([key, basisPoints], index) => {
    const numerator = gross * BigInt(basisPoints);
    return { key, index, minor: numerator / denominator, remainder: numerator % denominator };
  });
  const allocatedFloor = shares.reduce((sum, share) => sum + share.minor, 0n);
  let remainderMinor = gross - allocatedFloor;
  const ranked = [...shares].sort(
    (left, right) => Number(right.remainder - left.remainder) || left.index - right.index,
  );
  for (let index = 0; remainderMinor > 0n; index += 1, remainderMinor -= 1n) {
    ranked[index % ranked.length].minor += 1n;
  }
  const amount = Object.fromEntries(shares.map((share) => [share.key, Number(share.minor)])) as {
    operatorFranchiseMinor: number;
    ambassadorMinor: number;
    softwareMinor: number;
    globalConceptMinor: number;
  };
  const allocatedMinor = Object.values(amount).reduce((sum, value) => sum + value, 0);
  if (allocatedMinor !== grossMinor) throw new Error("allocation invariant violated");
  return Object.freeze({
    grossMinor,
    ...amount,
    allocatedMinor,
    allocationStatus: "SOURCE_CALCULATED_UNPOSTED",
  });
}

export function createClubsSandboxRequestFingerprintV2(request: ClubsSandboxPrepareRequestV2): string {
  return createHash("sha256").update(JSON.stringify({
    paymentKind: request.paymentKind,
    ledgerDomain: CLUBS_PAYMENT_LEDGER_DOMAINS_V2[request.paymentKind],
    subjectReference: request.subjectReference,
    amountMinor: request.amountMinor,
    currency: request.currency,
    idempotencyKey: request.idempotencyKey,
    livemode: request.livemode,
  }), "utf8").digest("hex");
}

export function resolveClubsSandboxIdempotencyV2(
  request: ClubsSandboxPrepareRequestV2,
  persistedRecord: PersistedIdempotencyRecordV2 | null,
): IdempotencyResolutionV2 {
  if (!persistedRecord) {
    return {
      httpStatus: 503,
      state: "UNKNOWN_OUTCOME",
      livemode: false,
      providerSuccessClaimed: false,
    };
  }
  const fingerprint = createClubsSandboxRequestFingerprintV2(request);
  if (
    persistedRecord.livemode !== false
    || persistedRecord.idempotencyKey !== request.idempotencyKey
    || persistedRecord.requestFingerprint !== fingerprint
  ) {
    return {
      httpStatus: 409,
      state: "IDEMPOTENCY_CONFLICT",
      livemode: false,
      providerSuccessClaimed: false,
    };
  }
  return {
    httpStatus: 503,
    state: "REPLAY_CONFIRMED_SOURCE_ONLY",
    livemode: false,
    providerSuccessClaimed: false,
  };
}

export function prepareClubsSandboxSourcePaymentV2(input: {
  request: ClubsSandboxPrepareRequestV2;
  teamGoVerification: TeamGoVerificationV2;
  binding: PersistedPaymentBindingV2 | null;
}): ClubsSandboxPrepareStateV2 {
  const { request, teamGoVerification, binding } = input;
  if (request.livemode !== false) {
    return fail("LIVEMODE_REJECTED", false, false, 400);
  }
  if (!teamGoVerification.ok) {
    return fail("IMMUTABLE_TEAM_GO_REQUIRED", false, false, 503);
  }
  const teamGo = teamGoVerification.value;
  if (
    request.paymentKind !== teamGo.paymentKind
    || request.amountMinor !== teamGo.amountMinor
    || request.currency !== teamGo.currency
    || CLUBS_PAYMENT_LEDGER_DOMAINS_V2[request.paymentKind] !== teamGo.ledgerDomain
  ) {
    return fail("PAYMENT_DOMAIN_REJECTED", true, false, 409);
  }
  if (!binding) {
    return fail("PERSISTENT_PAYMENT_BINDING_REQUIRED", true, false, 503);
  }
  const requestFingerprint = createClubsSandboxRequestFingerprintV2(request);
  if (
    binding.immutable !== true
    || binding.persisted !== true
    || binding.livemode !== false
    || binding.teamGoReceiptSha256 !== teamGo.receiptSha256
    || binding.paymentKind !== request.paymentKind
    || binding.ledgerDomain !== teamGo.ledgerDomain
    || binding.idempotencyKey !== request.idempotencyKey
    || binding.requestFingerprint !== requestFingerprint
  ) {
    return fail("PAYMENT_BINDING_REJECTED", true, false, 409);
  }
  return {
    httpStatus: 503,
    state: "PROVIDER_CONNECTION_BLOCKED",
    livemode: false,
    teamGoVerified: true,
    persistentBindingVerified: true,
    checkoutCreated: false,
    allocationPosted: false,
    providerSuccessClaimed: false,
    requestFingerprint,
    allocation: calculateClubsSandboxAllocationV2(request.amountMinor),
  };
}

function fail(
  state: ClubsSandboxPrepareStateV2["state"],
  teamGoVerified: boolean,
  persistentBindingVerified: boolean,
  httpStatus: ClubsSandboxPrepareStateV2["httpStatus"],
): ClubsSandboxPrepareStateV2 {
  return {
    httpStatus,
    state,
    livemode: false,
    teamGoVerified,
    persistentBindingVerified,
    checkoutCreated: false,
    allocationPosted: false,
    providerSuccessClaimed: false,
  };
}
