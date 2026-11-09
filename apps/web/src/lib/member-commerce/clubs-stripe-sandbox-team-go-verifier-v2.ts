import { createHash } from "node:crypto";

export const CLUBS_STRIPE_SANDBOX_SCOPE_V2 = "CRAYS_CLUBS_STRIPE_SANDBOX" as const;

export const CLUBS_PAYMENT_LEDGER_DOMAINS_V2 = {
  MEMBERSHIP_FEE: "CLUBS_MEMBERSHIP_FEE",
  STAY_PAYMENT: "CLUBS_STAY_PAYMENT",
} as const;

export type ClubsSandboxPaymentKindV2 = keyof typeof CLUBS_PAYMENT_LEDGER_DOMAINS_V2;

export type PersistedTeamGoRecordV2 = {
  version: "CCLUB_TEAM_GO_V2";
  scope: typeof CLUBS_STRIPE_SANDBOX_SCOPE_V2;
  authority: "TEAM";
  decision: "GO";
  receiptId: string;
  receiptSha256: string;
  immutable: true;
  persisted: true;
  signatureVerified: true;
  livemode: false;
  paymentKind: ClubsSandboxPaymentKindV2;
  ledgerDomain: (typeof CLUBS_PAYMENT_LEDGER_DOMAINS_V2)[ClubsSandboxPaymentKindV2];
  amountMinor: number;
  currency: "EUR";
  issuedAt: string;
  expiresAt: string;
};

export type VerifiedTeamGoV2 = Readonly<{
  receiptId: string;
  receiptSha256: string;
  paymentKind: ClubsSandboxPaymentKindV2;
  ledgerDomain: PersistedTeamGoRecordV2["ledgerDomain"];
  amountMinor: number;
  currency: "EUR";
  livemode: false;
  expiresAt: string;
}>;

export type TeamGoVerificationV2 =
  | { ok: true; state: "IMMUTABLE_TEAM_GO_VERIFIED"; value: VerifiedTeamGoV2 }
  | {
      ok: false;
      state:
        | "IMMUTABLE_TEAM_GO_REQUIRED"
        | "TEAM_GO_INTEGRITY_REJECTED"
        | "TEAM_GO_SCOPE_REJECTED"
        | "TEAM_GO_PAYMENT_DOMAIN_REJECTED"
        | "TEAM_GO_LIVEMODE_REJECTED"
        | "TEAM_GO_EXPIRED";
    };

const RECEIPT_ID_PATTERN = /^teamgo_[a-f0-9]{32}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MIN_PAYMENT_AMOUNT_MINOR = 400;
const MAX_CLOCK_SKEW_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalTeamGoPayload(record: Omit<PersistedTeamGoRecordV2, "receiptSha256">): string {
  return JSON.stringify({
    version: record.version,
    scope: record.scope,
    authority: record.authority,
    decision: record.decision,
    receiptId: record.receiptId,
    immutable: record.immutable,
    persisted: record.persisted,
    signatureVerified: record.signatureVerified,
    livemode: record.livemode,
    paymentKind: record.paymentKind,
    ledgerDomain: record.ledgerDomain,
    amountMinor: record.amountMinor,
    currency: record.currency,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
  });
}

export function createTeamGoPayloadSha256V2(
  record: Omit<PersistedTeamGoRecordV2, "receiptSha256">,
): string {
  return createHash("sha256").update(canonicalTeamGoPayload(record), "utf8").digest("hex");
}

/**
 * Accept only records already loaded from a trusted, immutable repository. Client
 * request bodies must never be passed to this verifier as an authority source.
 */
export function verifyPersistedTeamGoRecordV2(
  input: unknown,
  nowMs = Date.now(),
): TeamGoVerificationV2 {
  if (!isRecord(input)) return { ok: false, state: "IMMUTABLE_TEAM_GO_REQUIRED" };
  if (
    input.version !== "CCLUB_TEAM_GO_V2"
    || input.authority !== "TEAM"
    || input.decision !== "GO"
    || input.immutable !== true
    || input.persisted !== true
    || input.signatureVerified !== true
    || typeof input.receiptId !== "string"
    || !RECEIPT_ID_PATTERN.test(input.receiptId)
    || typeof input.receiptSha256 !== "string"
    || !SHA256_PATTERN.test(input.receiptSha256)
  ) {
    return { ok: false, state: "TEAM_GO_INTEGRITY_REJECTED" };
  }
  if (input.scope !== CLUBS_STRIPE_SANDBOX_SCOPE_V2) {
    return { ok: false, state: "TEAM_GO_SCOPE_REJECTED" };
  }
  if (input.livemode !== false) {
    return { ok: false, state: "TEAM_GO_LIVEMODE_REJECTED" };
  }
  if (input.paymentKind !== "MEMBERSHIP_FEE" && input.paymentKind !== "STAY_PAYMENT") {
    return { ok: false, state: "TEAM_GO_PAYMENT_DOMAIN_REJECTED" };
  }
  const expectedDomain = CLUBS_PAYMENT_LEDGER_DOMAINS_V2[input.paymentKind];
  if (input.ledgerDomain !== expectedDomain) {
    return { ok: false, state: "TEAM_GO_PAYMENT_DOMAIN_REJECTED" };
  }
  if (
    !Number.isSafeInteger(input.amountMinor)
    || (input.amountMinor as number) < MIN_PAYMENT_AMOUNT_MINOR
    || input.currency !== "EUR"
    || typeof input.issuedAt !== "string"
    || typeof input.expiresAt !== "string"
  ) {
    return { ok: false, state: "TEAM_GO_INTEGRITY_REJECTED" };
  }
  const issuedAtMs = Date.parse(input.issuedAt);
  const expiresAtMs = Date.parse(input.expiresAt);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= issuedAtMs) {
    return { ok: false, state: "TEAM_GO_INTEGRITY_REJECTED" };
  }
  if (issuedAtMs > nowMs + MAX_CLOCK_SKEW_MS || expiresAtMs <= nowMs) {
    return { ok: false, state: "TEAM_GO_EXPIRED" };
  }

  const record = input as PersistedTeamGoRecordV2;
  if (createTeamGoPayloadSha256V2(record) !== record.receiptSha256) {
    return { ok: false, state: "TEAM_GO_INTEGRITY_REJECTED" };
  }

  return {
    ok: true,
    state: "IMMUTABLE_TEAM_GO_VERIFIED",
    value: Object.freeze({
      receiptId: record.receiptId,
      receiptSha256: record.receiptSha256,
      paymentKind: record.paymentKind,
      ledgerDomain: record.ledgerDomain,
      amountMinor: record.amountMinor,
      currency: record.currency,
      livemode: false,
      expiresAt: record.expiresAt,
    }),
  };
}
