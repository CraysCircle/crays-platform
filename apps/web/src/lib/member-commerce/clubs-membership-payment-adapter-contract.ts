import "server-only";

import { createHash } from "node:crypto";

export const CLUBS_MEMBERSHIP_PAYMENT_ADAPTER_CONTRACT = Object.freeze({
  schema: "crays.clubs.membership-payment-adapter.v1",
  version: "1.0.0",
  paymentKind: "MEMBERSHIP",
  stripePlatformAccountId: "acct_1TvjKnPonqvDpQ1m",
  livemode: false,
} as const);

export const CLUBS_MEMBERSHIP_PAYMENT_REQUIRED_SETUP = Object.freeze([
  "confirmed_account_bound_team_go",
  "versioned_person_membership_fee_offer",
  "owner_membership_fee_authority",
  "stripe_test_membership_product_price_readback",
  "stripe_test_operator_ambassador_software_global_concept_bindings",
] as const);

export type ClubsMembershipPaymentRequiredSetup =
  (typeof CLUBS_MEMBERSHIP_PAYMENT_REQUIRED_SETUP)[number];

export type ClubsMembershipPaymentSetupPendingReason =
  | "schema_not_ready"
  | "team_go_not_ready"
  | "membership_setup_not_ready"
  | "membership_setup_ambiguous";

export type ClubsMembershipPaymentPrepareResult =
  | Readonly<{
      status: "payment_setup_pending";
      reason: ClubsMembershipPaymentSetupPendingReason;
      paymentKind: "MEMBERSHIP";
      missingSetup: readonly ClubsMembershipPaymentRequiredSetup[];
      livemode: false;
      prepared: false;
      providerCallAuthorized: false;
      providerCalled: false;
      providerSuccessClaimed: false;
      paymentSuccessClaimed: false;
      membershipGranted: false;
    }>
  | Readonly<{
      status: "structurally_ready";
      paymentKind: "MEMBERSHIP";
      reconcileState: "prepared_no_provider_call" | "canonical_replay";
      prepared: true;
      replayed: boolean;
      livemode: false;
      providerCallAuthorized: false;
      providerCalled: false;
      providerSuccessClaimed: false;
      paymentSuccessClaimed: false;
      membershipGranted: false;
    }>;

export class ClubsMembershipPaymentAdapterValidationError extends Error {
  constructor() {
    super("Membership payment prepare request is invalid");
    this.name = "ClubsMembershipPaymentAdapterValidationError";
  }
}

export class ClubsMembershipPaymentAdapterReplayConflictError extends Error {
  constructor() {
    super("Membership payment idempotency replay conflicts with canonical state");
    this.name = "ClubsMembershipPaymentAdapterReplayConflictError";
  }
}

export class ClubsMembershipPaymentAdapterStateConflictError extends Error {
  constructor() {
    super("Membership payment authority cardinality or source state is invalid");
    this.name = "ClubsMembershipPaymentAdapterStateConflictError";
  }
}

const HASH = /^[0-9a-f]{64}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_.-]{16,200}$/;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9:_.-]{2,199}$/;

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ClubsMembershipPaymentAdapterValidationError();
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  throw new ClubsMembershipPaymentAdapterValidationError();
}

export function clubsMembershipPaymentSha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function assertClubsMembershipPaymentIdempotencyKey(value: string) {
  if (!IDEMPOTENCY_KEY.test(value)) {
    throw new ClubsMembershipPaymentAdapterValidationError();
  }
  return value;
}

export function clubsMembershipPaymentPrepareRequestSha(input: Readonly<{
  memberAccountId: string;
  idempotencyKey: string;
  setupReceiptSha256: string;
  paymentAuthorityId: string;
}>) {
  if (
    !OPAQUE_ID.test(input.memberAccountId) ||
    !IDEMPOTENCY_KEY.test(input.idempotencyKey) ||
    !HASH.test(input.setupReceiptSha256) ||
    !OPAQUE_ID.test(input.paymentAuthorityId)
  ) {
    throw new ClubsMembershipPaymentAdapterValidationError();
  }
  return clubsMembershipPaymentSha256({
    contract: CLUBS_MEMBERSHIP_PAYMENT_ADAPTER_CONTRACT.schema,
    version: CLUBS_MEMBERSHIP_PAYMENT_ADAPTER_CONTRACT.version,
    memberAccountId: input.memberAccountId,
    idempotencyKey: input.idempotencyKey,
    setupReceiptSha256: input.setupReceiptSha256,
    paymentAuthorityId: input.paymentAuthorityId,
    livemode: false,
    providerCalled: false,
  });
}

export function deriveClubsMembershipPaymentPrepareIds(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  feeOfferId: string;
  idempotencyKey: string;
}>) {
  for (const value of [
    input.tenantId,
    input.memberAccountId,
    input.feeOfferId,
  ]) {
    if (!OPAQUE_ID.test(value)) {
      throw new ClubsMembershipPaymentAdapterValidationError();
    }
  }
  assertClubsMembershipPaymentIdempotencyKey(input.idempotencyKey);
  const digest = clubsMembershipPaymentSha256({
    contract: CLUBS_MEMBERSHIP_PAYMENT_ADAPTER_CONTRACT.schema,
    tenantId: input.tenantId,
    memberAccountId: input.memberAccountId,
    feeOfferId: input.feeOfferId,
    idempotencyKey: input.idempotencyKey,
  });
  return Object.freeze({
    paymentId: `cclubmem_${digest.slice(0, 40)}`,
    prepareReceiptId: `cclub-membership-prepare_${digest.slice(0, 40)}`,
    paymentIdempotencyKey: `cclub_mem_prepare_${digest}`,
  });
}

export function clubsMembershipPaymentSetupPending(
  reason: ClubsMembershipPaymentSetupPendingReason,
): ClubsMembershipPaymentPrepareResult {
  return Object.freeze({
    status: "payment_setup_pending" as const,
    reason,
    paymentKind: "MEMBERSHIP" as const,
    missingSetup: CLUBS_MEMBERSHIP_PAYMENT_REQUIRED_SETUP,
    livemode: false as const,
    prepared: false as const,
    providerCallAuthorized: false as const,
    providerCalled: false as const,
    providerSuccessClaimed: false as const,
    paymentSuccessClaimed: false as const,
    membershipGranted: false as const,
  });
}

export function clubsMembershipPaymentStructurallyReady(
  replayed: boolean,
): ClubsMembershipPaymentPrepareResult {
  return Object.freeze({
    status: "structurally_ready" as const,
    paymentKind: "MEMBERSHIP" as const,
    reconcileState: replayed
      ? ("canonical_replay" as const)
      : ("prepared_no_provider_call" as const),
    prepared: true as const,
    replayed,
    livemode: false as const,
    providerCallAuthorized: false as const,
    providerCalled: false as const,
    providerSuccessClaimed: false as const,
    paymentSuccessClaimed: false as const,
    membershipGranted: false as const,
  });
}
