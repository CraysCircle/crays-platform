import { createHash } from "node:crypto";

export const CLUBS_STRIPE_SANDBOX_CONTRACT_VERSION = "cclub-t5-stripe-sandbox.v1" as const;
export const CLUBS_STRIPE_ALLOCATION_BASIS_POINTS = Object.freeze({
  operator_or_franchise: 8_475,
  ambassador: 1_000,
  software: 500,
  global_concept: 25,
} as const);

export type ClubsStripePaymentKind = "MEMBERSHIP" | "STAY";
export type ClubsStripePaymentState =
  | "PREPARED"
  | "REQUIRES_PAYMENT_METHOD"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "AUTHORIZED"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type ClubsStripeRecipientAccounts = Readonly<{
  operatorOrFranchise: string;
  ambassador: string;
  software: string;
  globalConceptTestOnly: string;
  globalConceptProductionBindingAvailable: false;
}>;

export type PrepareClubsStripeSandboxPaymentInput = Readonly<{
  tenantId: string;
  projectId: string;
  paymentAuthorityId: string;
  sourceAuthoritySha256: string;
  stripeProductId: string;
  stripePriceId: string;
  paymentId: string;
  paymentKind: ClubsStripePaymentKind;
  subjectReference: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  recipientAccounts: ClubsStripeRecipientAccounts;
  testMode: true;
}>;

export type ClubsStripeAllocationLine = Readonly<{
  beneficiaryKind: keyof typeof CLUBS_STRIPE_ALLOCATION_BASIS_POINTS;
  destinationConnectedAccountId: string;
  basisPoints: number;
  amountMinor: number;
}>;

const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const ACCOUNT = /^acct_[A-Za-z0-9]{8,}$/;
const CURRENCY = /^[A-Z]{3}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PRODUCT = /^prod_[A-Za-z0-9]{8,}$/;
const PRICE = /^price_[A-Za-z0-9]{8,}$/;

function requireOpaque(value: string, code: string): string {
  if (!OPAQUE.test(value)) throw new Error(code);
  return value;
}

function requireAccount(value: string, code: string): string {
  if (!ACCOUNT.test(value)) throw new Error(code);
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("CCLUB_STRIPE_CANONICAL_NUMBER_INVALID");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  throw new Error("CCLUB_STRIPE_CANONICAL_VALUE_INVALID");
}

export function clubsStripeSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function allocateClubsStripeSandboxRevenue(
  amountMinor: number,
  recipients: ClubsStripeRecipientAccounts,
): readonly ClubsStripeAllocationLine[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 400) {
    throw new Error("CCLUB_STRIPE_AMOUNT_INVALID");
  }
  const accounts = [
    requireAccount(recipients.operatorOrFranchise, "CCLUB_STRIPE_OPERATOR_ACCOUNT_INVALID"),
    requireAccount(recipients.ambassador, "CCLUB_STRIPE_AMBASSADOR_ACCOUNT_INVALID"),
    requireAccount(recipients.software, "CCLUB_STRIPE_SOFTWARE_ACCOUNT_INVALID"),
    requireAccount(recipients.globalConceptTestOnly, "CCLUB_STRIPE_GLOBAL_TEST_ACCOUNT_INVALID"),
  ];
  if (recipients.globalConceptProductionBindingAvailable !== false) {
    throw new Error("CCLUB_STRIPE_GLOBAL_PRODUCTION_BINDING_FORBIDDEN");
  }
  if (new Set(accounts).size !== accounts.length) {
    throw new Error("CCLUB_STRIPE_RECIPIENT_ACCOUNT_DUPLICATED");
  }

  const ambassador = Math.floor((amountMinor * CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.ambassador) / 10_000);
  const software = Math.floor((amountMinor * CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.software) / 10_000);
  const globalConcept = Math.floor((amountMinor * CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.global_concept) / 10_000);
  const operator = amountMinor - ambassador - software - globalConcept;
  const lines = [
    {
      beneficiaryKind: "operator_or_franchise" as const,
      destinationConnectedAccountId: recipients.operatorOrFranchise,
      basisPoints: CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.operator_or_franchise,
      amountMinor: operator,
    },
    {
      beneficiaryKind: "ambassador" as const,
      destinationConnectedAccountId: recipients.ambassador,
      basisPoints: CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.ambassador,
      amountMinor: ambassador,
    },
    {
      beneficiaryKind: "software" as const,
      destinationConnectedAccountId: recipients.software,
      basisPoints: CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.software,
      amountMinor: software,
    },
    {
      beneficiaryKind: "global_concept" as const,
      destinationConnectedAccountId: recipients.globalConceptTestOnly,
      basisPoints: CLUBS_STRIPE_ALLOCATION_BASIS_POINTS.global_concept,
      amountMinor: globalConcept,
    },
  ];
  if (lines.some((line) => line.amountMinor <= 0) || lines.reduce((sum, line) => sum + line.amountMinor, 0) !== amountMinor) {
    throw new Error("CCLUB_STRIPE_ALLOCATION_RECONCILIATION_FAILED");
  }
  return Object.freeze(lines.map((line): ClubsStripeAllocationLine => Object.freeze(line)));
}

export function prepareClubsStripeSandboxPayment(input: PrepareClubsStripeSandboxPaymentInput) {
  if (input.testMode !== true) throw new Error("CCLUB_STRIPE_TEST_MODE_REQUIRED");
  if (input.paymentKind !== "MEMBERSHIP" && input.paymentKind !== "STAY") {
    throw new Error("CCLUB_STRIPE_PAYMENT_KIND_INVALID");
  }
  const tenantId = requireOpaque(input.tenantId, "CCLUB_STRIPE_TENANT_INVALID");
  const projectId = requireOpaque(input.projectId, "CCLUB_STRIPE_PROJECT_INVALID");
  const paymentAuthorityId = requireOpaque(input.paymentAuthorityId, "CCLUB_STRIPE_AUTHORITY_ID_INVALID");
  if (!SHA256.test(input.sourceAuthoritySha256)) throw new Error("CCLUB_STRIPE_SOURCE_AUTHORITY_SHA_INVALID");
  if (!PRODUCT.test(input.stripeProductId)) throw new Error("CCLUB_STRIPE_PRODUCT_ID_INVALID");
  if (!PRICE.test(input.stripePriceId)) throw new Error("CCLUB_STRIPE_PRICE_ID_INVALID");
  const paymentId = requireOpaque(input.paymentId, "CCLUB_STRIPE_PAYMENT_ID_INVALID");
  const subjectReference = requireOpaque(input.subjectReference, "CCLUB_STRIPE_SUBJECT_INVALID");
  const idempotencyKey = requireOpaque(input.idempotencyKey, "CCLUB_STRIPE_IDEMPOTENCY_INVALID");
  if (!CURRENCY.test(input.currency)) throw new Error("CCLUB_STRIPE_CURRENCY_INVALID");
  const allocation = allocateClubsStripeSandboxRevenue(input.amountMinor, input.recipientAccounts);
  const metadata = Object.freeze({
    crays_namespace: "cclub",
    crays_vertical: "clubs",
    crays_environment: "sandbox",
    crays_payment_kind: input.paymentKind.toLowerCase(),
    crays_payment_id: paymentId,
    crays_subject_reference: subjectReference,
    crays_tenant_id: tenantId,
    crays_project_id: projectId,
    crays_payment_authority_id: paymentAuthorityId,
    crays_source_authority_sha256: input.sourceAuthoritySha256,
    crays_stripe_product_id: input.stripeProductId,
    crays_stripe_price_id: input.stripePriceId,
  });
  const authority = {
    contractVersion: CLUBS_STRIPE_SANDBOX_CONTRACT_VERSION,
    tenantId,
    projectId,
    paymentAuthorityId,
    sourceAuthoritySha256: input.sourceAuthoritySha256,
    stripeProductId: input.stripeProductId,
    stripePriceId: input.stripePriceId,
    paymentId,
    paymentKind: input.paymentKind,
    subjectReference,
    amountMinor: input.amountMinor,
    currency: input.currency,
    idempotencyKey,
    livemode: false as const,
    billingLedgerDomain: input.paymentKind === "MEMBERSHIP" ? "clubs-membership" as const : "clubs-stay" as const,
    operatorConnectedAccountId: input.recipientAccounts.operatorOrFranchise,
    applicationFeeAmountMinor: allocation
      .filter((line) => line.beneficiaryKind !== "operator_or_franchise")
      .reduce((sum, line) => sum + line.amountMinor, 0),
    allocation,
    metadata,
    productionGlobalConceptBindingAvailable: false as const,
  };
  return Object.freeze({ ...authority, allocationPlanSha256: clubsStripeSha256(authority) });
}

export type ClubsStripeSandboxPaymentAuthority = ReturnType<typeof prepareClubsStripeSandboxPayment>;

export function assertClubsStripeSandboxMetadata(metadata: Readonly<Record<string, string>>): void {
  if (
    metadata.crays_namespace !== "cclub" ||
    metadata.crays_vertical !== "clubs" ||
    metadata.crays_environment !== "sandbox" ||
    (metadata.crays_payment_kind !== "membership" && metadata.crays_payment_kind !== "stay")
  ) {
    throw new Error("CCLUB_STRIPE_METADATA_SCOPE_INVALID");
  }
  const serialized = canonicalJson(metadata).toLowerCase();
  if (serialized.includes("gym") || serialized.includes("crays.pro") || serialized.includes("craysgym")) {
    throw new Error("CCLUB_STRIPE_FORBIDDEN_VERTICAL_METADATA");
  }
}

export function mapClubsStripePaymentState(status: string): ClubsStripePaymentState {
  const states: Record<string, ClubsStripePaymentState> = {
    requires_payment_method: "REQUIRES_PAYMENT_METHOD",
    requires_action: "REQUIRES_ACTION",
    processing: "PROCESSING",
    requires_capture: "AUTHORIZED",
    succeeded: "SUCCEEDED",
    canceled: "CANCELED",
  };
  const state = states[status];
  if (!state) throw new Error("CCLUB_STRIPE_PAYMENT_STATUS_UNKNOWN");
  return state;
}
