import "server-only";

import { clubsStripeSha256 } from "./clubs-stripe-sandbox-contract";

export const CLUBS_STRIPE_PRICE_BINDING_VERSION = "cclub-t5-stripe-price-binding.v1" as const;

export type ClubsStripePriceTaxBehaviorV1 = "exclusive" | "inclusive" | "unspecified";

export type ClubsStripeProductReadbackV1 = Readonly<{
  id: string;
  active: boolean;
  livemode: false;
  taxCode: string;
  metadata: Readonly<Record<string, string>>;
}>;

export type ClubsStripePriceReadbackV1 = Readonly<{
  id: string;
  productId: string;
  active: boolean;
  livemode: false;
  type: "one_time" | "recurring";
  recurring: Readonly<{
    interval: "day" | "week" | "month" | "year";
    intervalCount: number;
  }> | null;
  unitAmountMinor: number | null;
  currency: string;
  taxBehavior: ClubsStripePriceTaxBehaviorV1;
  metadata: Readonly<Record<string, string>>;
}>;

export type ClubsStripeMembershipOwnerAuthorityV1 = Readonly<{
  authorityId: string;
  authoritySha256: string;
  approvedAt: string;
  expiresAt: string;
  planId: string;
  tierId: string;
  billingMode: "ONE_TIME" | "RECURRING";
  recurrence: Readonly<{
    interval: "day" | "week" | "month" | "year";
    intervalCount: number;
  }> | null;
  stripeProductId: string;
  stripePriceId: string;
  amountMinor: number;
  currency: string;
  productTaxCode: string;
  priceTaxBehavior: ClubsStripePriceTaxBehaviorV1;
  taxLiabilityAuthorityId: string;
}>;

export type ClubsStripeAcceptedStayQuoteV1 = Readonly<{
  sourceTable: "crays_core.clubs_quote_snapshots";
  paymentAuthority: true;
  quoteId: string;
  accountId: string;
  outcome: "issued";
  pricingSnapshotSha256: string;
  sellerSnapshotSha256: string;
  feeSnapshotSha256: string;
  depositSnapshotSha256: string;
  cancellationSnapshotSha256: string;
  refundAuthoritySha256: string;
  sellerConnectedAccountId: string;
  totalMinor: number;
  depositDueMinor: number;
  currency: string;
  expiresAt: string;
}>;

export type ClubsStripeStayQuoteAcceptanceV1 = Readonly<{
  sourceTable: "crays_core.clubs_quote_acceptances";
  quoteId: string;
  accountId: string;
  holdId: string;
  acceptedPricingSha256: string;
  acceptedSellerSha256: string;
  acceptedAt: string;
}>;

export type ClubsStripeActiveStayHoldV1 = Readonly<{
  sourceTable: "crays_core.clubs_reservation_holds";
  holdId: string;
  quoteId: string;
  accountId: string;
  status: "active" | "consumed" | "expired" | "released";
  expiresAt: string;
}>;

export type ClubsStripeStayTaxAuthorityV1 = Readonly<{
  authorityId: string;
  authoritySha256: string;
  productTaxCode: string;
  priceTaxBehavior: ClubsStripePriceTaxBehaviorV1;
  qloTaxFinal: boolean;
}>;

type ClubsStripePrebindingGuardV1 = Readonly<{
  state: "PREBINDING_UNVERIFIED";
  authorityLevel: "PREBINDING_UNVERIFIED";
  trustedRepositoryReceiptId: null;
  trustedRepositoryReceiptSha256: null;
  requiredTrustedReceiptScope: "QUOTE_ACCEPTANCE_HOLD_TAX_SELLER_REFUND";
  requiresTrustedRepositoryAdapter: true;
  persistableTo0256: false;
  providerCallable: false;
  persistenceAllowed: false;
  providerUseAllowed: false;
}>;

type ClubsStripePaymentBindingBaseV1 = ClubsStripePrebindingGuardV1 & Readonly<{
  version: typeof CLUBS_STRIPE_PRICE_BINDING_VERSION;
  livemode: false;
  sourceAuthorityId: string;
  sourceAuthoritySha256: string;
  subjectReference: string;
  stripeProductId: string;
  stripePriceId: string;
  amountMinor: number;
  currency: string;
  productReadbackSha256: string;
  priceReadbackSha256: string;
  bindingFingerprint: string;
  providerSuccessClaimed: false;
}>;

export type ClubsStripeMembershipCatalogBindingV1 = ClubsStripePaymentBindingBaseV1 &
  Readonly<{
    paymentKind: "MEMBERSHIP";
    sourceAuthorityKind: "MEMBERSHIP_APPROVAL";
    ownerAuthoritySha256: string;
    planId: string;
    tierId: string;
    taxLiabilityAuthorityId: string;
  }>;

export type ClubsStripeStayQuotePriceCreationIntentV1 = ClubsStripePrebindingGuardV1 & Readonly<{
  version: typeof CLUBS_STRIPE_PRICE_BINDING_VERSION;
  paymentKind: "STAY";
  sourceAuthorityKind: "STAY_QUOTE";
  sourceAuthorityId: string;
  subjectReference: string;
  accountId: string;
  pricingSnapshotSha256: string;
  sellerSnapshotSha256: string;
  sellerConnectedAccountId: string;
  holdExpiresAt: string;
  sourceAuthorityExpiresAt: string;
  payableBasis: "TOTAL" | "DEPOSIT_DUE";
  settlementCoverage: "FULL_STAY" | "DEPOSIT_ONLY";
  stripeProductId: string;
  stripePriceId: null;
  amountMinor: number;
  currency: string;
  productTaxCode: string;
  priceTaxBehavior: ClubsStripePriceTaxBehaviorV1;
  taxAuthorityId: string;
  taxAuthoritySha256: string;
  productReadbackSha256: string;
  expectedPriceMetadata: Readonly<Record<string, string>>;
  priceCreationFingerprint: string;
  providerIdempotencyKey: string;
  livemode: false;
  providerSuccessClaimed: false;
  stayFullyPaidClaimed: false;
}>;

export type ClubsStripeStayPriceBindingV1 = ClubsStripePaymentBindingBaseV1 &
  Readonly<{
    paymentKind: "STAY";
    sourceAuthorityKind: "STAY_QUOTE";
    priceCreationFingerprint: string;
    providerIdempotencyKey: string;
    sellerConnectedAccountId: string;
    payableBasis: "TOTAL" | "DEPOSIT_DUE";
    settlementCoverage: "FULL_STAY" | "DEPOSIT_ONLY";
    taxAuthoritySha256: string;
    stayFullyPaidClaimed: false;
  }>;

export type ClubsStripePriceBindingUnknownOutcomeV1 = ClubsStripePrebindingGuardV1 & Readonly<{
  version: typeof CLUBS_STRIPE_PRICE_BINDING_VERSION;
  reconciliationState: "UNKNOWN_OUTCOME";
  httpStatus: 503;
  priceCreationFingerprint: string;
  providerIdempotencyKey: string;
  matchingReadbackCount: 0;
  retryWithSameIdempotencyKeyOnly: true;
  providerSuccessClaimed: false;
}>;

export type ClubsStripePriceBindingConflictV1 = ClubsStripePrebindingGuardV1 & Readonly<{
  version: typeof CLUBS_STRIPE_PRICE_BINDING_VERSION;
  reconciliationState: "CONFLICT";
  httpStatus: 409;
  priceCreationFingerprint: string;
  providerIdempotencyKey: string;
  matchingReadbackCount: number;
  retryWithSameIdempotencyKeyOnly: false;
  providerSuccessClaimed: false;
}>;

export type ClubsStripePriceBindingReconciledV1 = ClubsStripePrebindingGuardV1 & Readonly<{
  version: typeof CLUBS_STRIPE_PRICE_BINDING_VERSION;
  reconciliationState: "READBACK_MATCH";
  httpStatus: 503;
  priceCreationFingerprint: string;
  providerIdempotencyKey: string;
  matchingReadbackCount: 1;
  retryWithSameIdempotencyKeyOnly: false;
  providerSuccessClaimed: false;
  binding: ClubsStripeStayPriceBindingV1;
}>;

export type ClubsStripePriceBindingUnknownOutcomeResolutionV1 =
  | ClubsStripePriceBindingUnknownOutcomeV1
  | ClubsStripePriceBindingConflictV1
  | ClubsStripePriceBindingReconciledV1;

const PRODUCT_ID = /^prod_[A-Za-z0-9]+$/;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const CONNECTED_ACCOUNT_ID = /^acct_[A-Za-z0-9]+$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CURRENCY = /^[A-Z]{3}$/;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,254}$/;

function fail(code: string): never {
  throw new Error(code);
}

function prebindingGuard(): ClubsStripePrebindingGuardV1 {
  return Object.freeze({
    state: "PREBINDING_UNVERIFIED",
    authorityLevel: "PREBINDING_UNVERIFIED",
    trustedRepositoryReceiptId: null,
    trustedRepositoryReceiptSha256: null,
    requiredTrustedReceiptScope: "QUOTE_ACCEPTANCE_HOLD_TAX_SELLER_REFUND",
    requiresTrustedRepositoryAdapter: true,
    persistableTo0256: false,
    providerCallable: false,
    persistenceAllowed: false,
    providerUseAllowed: false,
  });
}

function requireOpaqueId(value: string, code: string): string {
  if (!OPAQUE_ID.test(value)) fail(code);
  return value;
}

function requireSha256(value: string, code: string): string {
  if (!SHA256.test(value)) fail(code);
  return value;
}

function requireAmount(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 400) fail(code);
  return value;
}

function requireCurrency(value: string): string {
  if (!CURRENCY.test(value)) fail("CCLUB_PRICE_BINDING_CURRENCY_INVALID");
  return value;
}

function requireTimestamp(value: string, code: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail(code);
  return timestamp;
}

function requireSandboxOnly(value: unknown, code: string): void {
  const serialized = JSON.stringify(value).toLowerCase();
  if (serialized.includes("craysgym") || serialized.includes("crays.pro") || serialized.includes("gym")) {
    fail(code);
  }
}

function assertMetadataSubset(
  actual: Readonly<Record<string, string>>,
  expected: Readonly<Record<string, string>>,
  code: string,
): void {
  requireSandboxOnly(actual, "CCLUB_PRICE_BINDING_FORBIDDEN_VERTICAL_METADATA");
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) fail(code);
  }
}

function baseMetadata(paymentKind: "membership" | "stay"): Readonly<Record<string, string>> {
  return Object.freeze({
    crays_namespace: "cclub",
    crays_vertical: "clubs",
    crays_environment: "sandbox",
    crays_payment_kind: paymentKind,
    crays_contract_version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
  });
}

function assertProduct(
  product: ClubsStripeProductReadbackV1,
  expectedId: string,
  expectedTaxCode: string,
  expectedMetadata: Readonly<Record<string, string>>,
): string {
  if (!PRODUCT_ID.test(expectedId) || product.id !== expectedId) {
    fail("CCLUB_PRICE_BINDING_PRODUCT_ID_MISMATCH");
  }
  if (product.livemode !== false || product.active !== true) {
    fail("CCLUB_PRICE_BINDING_PRODUCT_NOT_ACTIVE_SANDBOX");
  }
  requireOpaqueId(expectedTaxCode, "CCLUB_PRICE_BINDING_PRODUCT_TAX_CODE_MISSING");
  if (product.taxCode !== expectedTaxCode) {
    fail("CCLUB_PRICE_BINDING_PRODUCT_TAX_CODE_MISMATCH");
  }
  assertMetadataSubset(product.metadata, expectedMetadata, "CCLUB_PRICE_BINDING_PRODUCT_METADATA_MISMATCH");
  return clubsStripeSha256(product);
}

function assertPrice(
  price: ClubsStripePriceReadbackV1,
  expected: Readonly<{
    productId: string;
    priceId?: string;
    amountMinor: number;
    currency: string;
    taxBehavior: ClubsStripePriceTaxBehaviorV1;
    metadata: Readonly<Record<string, string>>;
  }>,
): string {
  if (!PRICE_ID.test(price.id) || (expected.priceId !== undefined && price.id !== expected.priceId)) {
    fail("CCLUB_PRICE_BINDING_PRICE_ID_MISMATCH");
  }
  if (price.productId !== expected.productId || !PRODUCT_ID.test(price.productId)) {
    fail("CCLUB_PRICE_BINDING_PRICE_PRODUCT_MISMATCH");
  }
  if (price.livemode !== false || price.active !== true || price.type !== "one_time") {
    fail("CCLUB_PRICE_BINDING_PRICE_NOT_ACTIVE_ONE_TIME_SANDBOX");
  }
  if (price.recurring !== null) {
    fail("CCLUB_PRICE_BINDING_PRICE_RECURRING_MUST_BE_NULL");
  }
  if (price.unitAmountMinor !== expected.amountMinor || price.currency !== expected.currency) {
    fail("CCLUB_PRICE_BINDING_PRICE_VALUE_MISMATCH");
  }
  if (price.taxBehavior !== expected.taxBehavior) {
    fail("CCLUB_PRICE_BINDING_PRICE_TAX_MISMATCH");
  }
  assertMetadataSubset(price.metadata, expected.metadata, "CCLUB_PRICE_BINDING_PRICE_METADATA_MISMATCH");
  return clubsStripeSha256(price);
}

function membershipMetadata(
  authority: ClubsStripeMembershipOwnerAuthorityV1,
): Readonly<Record<string, string>> {
  return Object.freeze({
    ...baseMetadata("membership"),
    crays_membership_plan_id: authority.planId,
    crays_membership_tier_id: authority.tierId,
    crays_owner_authority_sha256: authority.authoritySha256,
  });
}

export function prepareClubsMembershipCatalogBindingV1(input: Readonly<{
  authority: ClubsStripeMembershipOwnerAuthorityV1;
  productReadback: ClubsStripeProductReadbackV1;
  priceReadback: ClubsStripePriceReadbackV1;
  observedAt: string;
}>): ClubsStripeMembershipCatalogBindingV1 {
  const authority = input.authority;
  requireOpaqueId(authority.authorityId, "CCLUB_MEMBERSHIP_AUTHORITY_ID_MISSING");
  requireSha256(authority.authoritySha256, "CCLUB_MEMBERSHIP_AUTHORITY_SHA_INVALID");
  requireOpaqueId(authority.planId, "CCLUB_MEMBERSHIP_PLAN_ID_MISSING");
  requireOpaqueId(authority.tierId, "CCLUB_MEMBERSHIP_TIER_ID_MISSING");
  requireOpaqueId(authority.taxLiabilityAuthorityId, "CCLUB_MEMBERSHIP_TAX_AUTHORITY_MISSING");
  requireAmount(authority.amountMinor, "CCLUB_MEMBERSHIP_AMOUNT_MISSING");
  requireCurrency(authority.currency);
  if (authority.billingMode !== "ONE_TIME" || authority.recurrence !== null) {
    fail("CCLUB_MEMBERSHIP_RECURRING_CONTRACT_V2_REQUIRED");
  }
  const approvedAt = requireTimestamp(authority.approvedAt, "CCLUB_MEMBERSHIP_APPROVED_AT_INVALID");
  const expiresAt = requireTimestamp(authority.expiresAt, "CCLUB_MEMBERSHIP_EXPIRES_AT_INVALID");
  const observedAt = requireTimestamp(input.observedAt, "CCLUB_MEMBERSHIP_OBSERVED_AT_INVALID");
  if (approvedAt > observedAt || observedAt >= expiresAt) {
    fail("CCLUB_MEMBERSHIP_AUTHORITY_NOT_ACTIVE");
  }
  requireSandboxOnly(authority, "CCLUB_MEMBERSHIP_FORBIDDEN_VERTICAL_AUTHORITY");

  const metadata = membershipMetadata(authority);
  const productReadbackSha256 = assertProduct(
    input.productReadback,
    authority.stripeProductId,
    authority.productTaxCode,
    metadata,
  );
  const priceReadbackSha256 = assertPrice(input.priceReadback, {
    productId: authority.stripeProductId,
    priceId: authority.stripePriceId,
    amountMinor: authority.amountMinor,
    currency: authority.currency,
    taxBehavior: authority.priceTaxBehavior,
    metadata,
  });
  const bindingFingerprint = clubsStripeSha256({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    paymentKind: "MEMBERSHIP",
    ownerAuthoritySha256: authority.authoritySha256,
    planId: authority.planId,
    tierId: authority.tierId,
    amountMinor: authority.amountMinor,
    currency: authority.currency,
    stripeProductId: authority.stripeProductId,
    stripePriceId: authority.stripePriceId,
    productReadbackSha256,
    priceReadbackSha256,
  });

  return Object.freeze({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    ...prebindingGuard(),
    paymentKind: "MEMBERSHIP",
    sourceAuthorityKind: "MEMBERSHIP_APPROVAL",
    sourceAuthorityId: authority.authorityId,
    sourceAuthoritySha256: bindingFingerprint,
    subjectReference: `${authority.planId}:${authority.tierId}`,
    ownerAuthoritySha256: authority.authoritySha256,
    planId: authority.planId,
    tierId: authority.tierId,
    stripeProductId: authority.stripeProductId,
    stripePriceId: authority.stripePriceId,
    amountMinor: authority.amountMinor,
    currency: authority.currency,
    taxLiabilityAuthorityId: authority.taxLiabilityAuthorityId,
    productReadbackSha256,
    priceReadbackSha256,
    bindingFingerprint,
    livemode: false,
    providerSuccessClaimed: false,
  });
}

function stayProductMetadata(): Readonly<Record<string, string>> {
  return Object.freeze({
    ...baseMetadata("stay"),
    crays_stay_catalog_role: "quote_bound_dynamic_price",
  });
}

function stayPriceMetadata(input: Readonly<{
  quoteId: string;
  holdId: string;
  pricingSnapshotSha256: string;
  payableBasis: "TOTAL" | "DEPOSIT_DUE";
  priceCreationFingerprint: string;
}>): Readonly<Record<string, string>> {
  return Object.freeze({
    ...baseMetadata("stay"),
    crays_quote_id: input.quoteId,
    crays_hold_id: input.holdId,
    crays_pricing_snapshot_sha256: input.pricingSnapshotSha256,
    crays_payable_basis: input.payableBasis.toLowerCase(),
    crays_price_creation_fingerprint: input.priceCreationFingerprint,
  });
}

function stayCreationFingerprintPayload(input: Readonly<{
  sourceAuthorityId: string;
  subjectReference: string;
  accountId: string;
  pricingSnapshotSha256: string;
  sellerSnapshotSha256: string;
  sellerConnectedAccountId: string;
  holdExpiresAt: string;
  sourceAuthorityExpiresAt: string;
  payableBasis: "TOTAL" | "DEPOSIT_DUE";
  settlementCoverage: "FULL_STAY" | "DEPOSIT_ONLY";
  stripeProductId: string;
  amountMinor: number;
  currency: string;
  productTaxCode: string;
  priceTaxBehavior: ClubsStripePriceTaxBehaviorV1;
  taxAuthorityId: string;
  taxAuthoritySha256: string;
  productReadbackSha256: string;
}>): Readonly<Record<string, unknown>> {
  return Object.freeze({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    intent: "STAY_QUOTE_PRICE_CREATE",
    livemode: false,
    sourceAuthorityId: input.sourceAuthorityId,
    subjectReference: input.subjectReference,
    accountId: input.accountId,
    pricingSnapshotSha256: input.pricingSnapshotSha256,
    sellerSnapshotSha256: input.sellerSnapshotSha256,
    sellerConnectedAccountId: input.sellerConnectedAccountId,
    holdExpiresAt: input.holdExpiresAt,
    sourceAuthorityExpiresAt: input.sourceAuthorityExpiresAt,
    payableBasis: input.payableBasis,
    settlementCoverage: input.settlementCoverage,
    stripeProductId: input.stripeProductId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    productTaxCode: input.productTaxCode,
    priceTaxBehavior: input.priceTaxBehavior,
    taxAuthorityId: input.taxAuthorityId,
    taxAuthoritySha256: input.taxAuthoritySha256,
    productReadbackSha256: input.productReadbackSha256,
  });
}

export function prepareClubsStayQuotePriceCreationIntentV1(input: Readonly<{
  quote: ClubsStripeAcceptedStayQuoteV1;
  acceptance: ClubsStripeStayQuoteAcceptanceV1;
  hold: ClubsStripeActiveStayHoldV1;
  payableBasis: "TOTAL" | "DEPOSIT_DUE";
  productReadback: ClubsStripeProductReadbackV1;
  taxAuthority: ClubsStripeStayTaxAuthorityV1;
  observedAt: string;
}>): ClubsStripeStayQuotePriceCreationIntentV1 {
  const { quote, acceptance, hold, taxAuthority } = input;
  if (
    quote.sourceTable !== "crays_core.clubs_quote_snapshots" ||
    quote.paymentAuthority !== true ||
    acceptance.sourceTable !== "crays_core.clubs_quote_acceptances" ||
    hold.sourceTable !== "crays_core.clubs_reservation_holds" ||
    quote.outcome !== "issued"
  ) {
    fail("CCLUB_STAY_CANONICAL_AUTHORITY_REQUIRED");
  }
  requireOpaqueId(quote.quoteId, "CCLUB_STAY_QUOTE_ID_MISSING");
  requireOpaqueId(quote.accountId, "CCLUB_STAY_ACCOUNT_ID_MISSING");
  requireSha256(quote.pricingSnapshotSha256, "CCLUB_STAY_PRICING_SHA_INVALID");
  requireSha256(quote.sellerSnapshotSha256, "CCLUB_STAY_SELLER_SHA_INVALID");
  requireSha256(quote.feeSnapshotSha256, "CCLUB_STAY_FEE_SHA_INVALID");
  requireSha256(quote.depositSnapshotSha256, "CCLUB_STAY_DEPOSIT_SHA_INVALID");
  requireSha256(quote.cancellationSnapshotSha256, "CCLUB_STAY_CANCELLATION_SHA_INVALID");
  requireSha256(quote.refundAuthoritySha256, "CCLUB_STAY_REFUND_AUTHORITY_SHA_INVALID");
  if (!CONNECTED_ACCOUNT_ID.test(quote.sellerConnectedAccountId)) {
    fail("CCLUB_STAY_SELLER_ACCOUNT_INVALID");
  }
  if (
    acceptance.quoteId !== quote.quoteId ||
    acceptance.accountId !== quote.accountId ||
    acceptance.acceptedPricingSha256 !== quote.pricingSnapshotSha256 ||
    acceptance.acceptedSellerSha256 !== quote.sellerSnapshotSha256
  ) {
    fail("CCLUB_STAY_ACCEPTANCE_MISMATCH");
  }
  requireOpaqueId(acceptance.holdId, "CCLUB_STAY_ACCEPTED_HOLD_ID_MISSING");
  if (
    hold.holdId !== acceptance.holdId ||
    hold.quoteId !== quote.quoteId ||
    hold.accountId !== quote.accountId ||
    hold.status !== "active"
  ) {
    fail("CCLUB_STAY_ACTIVE_HOLD_MISMATCH");
  }
  const observedAt = requireTimestamp(input.observedAt, "CCLUB_STAY_OBSERVED_AT_INVALID");
  const quoteExpiresAt = requireTimestamp(quote.expiresAt, "CCLUB_STAY_QUOTE_EXPIRES_AT_INVALID");
  const holdExpiresAt = requireTimestamp(hold.expiresAt, "CCLUB_STAY_HOLD_EXPIRES_AT_INVALID");
  const acceptedAt = requireTimestamp(acceptance.acceptedAt, "CCLUB_STAY_ACCEPTED_AT_INVALID");
  if (acceptedAt > observedAt || acceptedAt >= quoteExpiresAt || observedAt >= quoteExpiresAt || observedAt >= holdExpiresAt) {
    fail("CCLUB_STAY_QUOTE_OR_HOLD_NOT_ACTIVE");
  }
  const sourceAuthorityExpiresAt = quoteExpiresAt <= holdExpiresAt ? quote.expiresAt : hold.expiresAt;
  const amountMinor = requireAmount(
    input.payableBasis === "TOTAL" ? quote.totalMinor : quote.depositDueMinor,
    "CCLUB_STAY_PAYABLE_AMOUNT_INVALID",
  );
  const currency = requireCurrency(quote.currency);
  requireOpaqueId(taxAuthority.authorityId, "CCLUB_STAY_TAX_AUTHORITY_MISSING");
  requireSha256(taxAuthority.authoritySha256, "CCLUB_STAY_TAX_AUTHORITY_SHA_INVALID");
  if (taxAuthority.qloTaxFinal !== true) fail("CCLUB_STAY_QLO_TAX_NOT_FINAL");
  requireSandboxOnly({ quote, acceptance, hold, taxAuthority }, "CCLUB_STAY_FORBIDDEN_VERTICAL_AUTHORITY");

  const productReadbackSha256 = assertProduct(
    input.productReadback,
    input.productReadback.id,
    taxAuthority.productTaxCode,
    stayProductMetadata(),
  );
  const fingerprintPayload = stayCreationFingerprintPayload({
    sourceAuthorityId: quote.quoteId,
    subjectReference: hold.holdId,
    accountId: quote.accountId,
    pricingSnapshotSha256: quote.pricingSnapshotSha256,
    sellerSnapshotSha256: quote.sellerSnapshotSha256,
    sellerConnectedAccountId: quote.sellerConnectedAccountId,
    holdExpiresAt: hold.expiresAt,
    sourceAuthorityExpiresAt,
    payableBasis: input.payableBasis,
    settlementCoverage: input.payableBasis === "TOTAL" ? "FULL_STAY" : "DEPOSIT_ONLY",
    stripeProductId: input.productReadback.id,
    amountMinor,
    currency,
    productTaxCode: taxAuthority.productTaxCode,
    priceTaxBehavior: taxAuthority.priceTaxBehavior,
    taxAuthorityId: taxAuthority.authorityId,
    taxAuthoritySha256: taxAuthority.authoritySha256,
    productReadbackSha256,
  });
  const priceCreationFingerprint = clubsStripeSha256(fingerprintPayload);
  const expectedPriceMetadata = stayPriceMetadata({
    quoteId: quote.quoteId,
    holdId: hold.holdId,
    pricingSnapshotSha256: quote.pricingSnapshotSha256,
    payableBasis: input.payableBasis,
    priceCreationFingerprint,
  });

  return Object.freeze({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    ...prebindingGuard(),
    paymentKind: "STAY",
    sourceAuthorityKind: "STAY_QUOTE",
    sourceAuthorityId: quote.quoteId,
    subjectReference: hold.holdId,
    accountId: quote.accountId,
    pricingSnapshotSha256: quote.pricingSnapshotSha256,
    sellerSnapshotSha256: quote.sellerSnapshotSha256,
    sellerConnectedAccountId: quote.sellerConnectedAccountId,
    holdExpiresAt: hold.expiresAt,
    sourceAuthorityExpiresAt,
    payableBasis: input.payableBasis,
    settlementCoverage: input.payableBasis === "TOTAL" ? "FULL_STAY" : "DEPOSIT_ONLY",
    stripeProductId: input.productReadback.id,
    stripePriceId: null,
    amountMinor,
    currency,
    productTaxCode: taxAuthority.productTaxCode,
    priceTaxBehavior: taxAuthority.priceTaxBehavior,
    taxAuthorityId: taxAuthority.authorityId,
    taxAuthoritySha256: taxAuthority.authoritySha256,
    productReadbackSha256,
    expectedPriceMetadata,
    priceCreationFingerprint,
    providerIdempotencyKey: `cclub_price_${priceCreationFingerprint}`,
    livemode: false,
    providerSuccessClaimed: false,
    stayFullyPaidClaimed: false,
  });
}

function assertStayIntent(intent: ClubsStripeStayQuotePriceCreationIntentV1): void {
  if (
    intent.version !== CLUBS_STRIPE_PRICE_BINDING_VERSION ||
    intent.state !== "PREBINDING_UNVERIFIED" ||
    intent.authorityLevel !== "PREBINDING_UNVERIFIED" ||
    intent.trustedRepositoryReceiptId !== null ||
    intent.trustedRepositoryReceiptSha256 !== null ||
    intent.requiredTrustedReceiptScope !== "QUOTE_ACCEPTANCE_HOLD_TAX_SELLER_REFUND" ||
    intent.requiresTrustedRepositoryAdapter !== true ||
    intent.persistableTo0256 !== false ||
    intent.providerCallable !== false ||
    intent.persistenceAllowed !== false ||
    intent.providerUseAllowed !== false ||
    intent.livemode !== false ||
    intent.stripePriceId !== null ||
    intent.providerSuccessClaimed !== false
  ) {
    fail("CCLUB_STAY_PRICE_INTENT_STATE_INVALID");
  }
  const recomputedFingerprint = clubsStripeSha256(stayCreationFingerprintPayload(intent));
  if (
    recomputedFingerprint !== intent.priceCreationFingerprint ||
    intent.providerIdempotencyKey !== `cclub_price_${recomputedFingerprint}`
  ) {
    fail("CCLUB_STAY_PRICE_INTENT_FINGERPRINT_INVALID");
  }
  const expectedMetadata = stayPriceMetadata({
    quoteId: intent.sourceAuthorityId,
    holdId: intent.subjectReference,
    pricingSnapshotSha256: intent.pricingSnapshotSha256,
    payableBasis: intent.payableBasis,
    priceCreationFingerprint: intent.priceCreationFingerprint,
  });
  if (clubsStripeSha256(expectedMetadata) !== clubsStripeSha256(intent.expectedPriceMetadata)) {
    fail("CCLUB_STAY_PRICE_INTENT_METADATA_INVALID");
  }
}

export function verifyClubsStripePriceBindingReadbackV1(
  intent: ClubsStripeStayQuotePriceCreationIntentV1,
  priceReadback: ClubsStripePriceReadbackV1,
): ClubsStripeStayPriceBindingV1 {
  assertStayIntent(intent);
  const priceReadbackSha256 = assertPrice(priceReadback, {
    productId: intent.stripeProductId,
    amountMinor: intent.amountMinor,
    currency: intent.currency,
    taxBehavior: intent.priceTaxBehavior,
    metadata: intent.expectedPriceMetadata,
  });
  const bindingFingerprint = clubsStripeSha256({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    paymentKind: "STAY",
    priceCreationFingerprint: intent.priceCreationFingerprint,
    stripeProductId: intent.stripeProductId,
    stripePriceId: priceReadback.id,
    productReadbackSha256: intent.productReadbackSha256,
    priceReadbackSha256,
  });

  return Object.freeze({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    ...prebindingGuard(),
    paymentKind: "STAY",
    sourceAuthorityKind: "STAY_QUOTE",
    sourceAuthorityId: intent.sourceAuthorityId,
    sourceAuthoritySha256: bindingFingerprint,
    subjectReference: intent.subjectReference,
    stripeProductId: intent.stripeProductId,
    stripePriceId: priceReadback.id,
    amountMinor: intent.amountMinor,
    currency: intent.currency,
    productReadbackSha256: intent.productReadbackSha256,
    priceReadbackSha256,
    bindingFingerprint,
    priceCreationFingerprint: intent.priceCreationFingerprint,
    providerIdempotencyKey: intent.providerIdempotencyKey,
    sellerConnectedAccountId: intent.sellerConnectedAccountId,
    payableBasis: intent.payableBasis,
    settlementCoverage: intent.settlementCoverage,
    taxAuthoritySha256: intent.taxAuthoritySha256,
    livemode: false,
    providerSuccessClaimed: false,
    stayFullyPaidClaimed: false,
  });
}

export function resolveClubsStripePriceBindingUnknownOutcomeV1(
  intent: ClubsStripeStayQuotePriceCreationIntentV1,
  candidateReadbacks: readonly ClubsStripePriceReadbackV1[],
): ClubsStripePriceBindingUnknownOutcomeResolutionV1 {
  assertStayIntent(intent);
  if (candidateReadbacks.length === 0) {
    return Object.freeze({
      version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
      ...prebindingGuard(),
      reconciliationState: "UNKNOWN_OUTCOME",
      httpStatus: 503,
      priceCreationFingerprint: intent.priceCreationFingerprint,
      providerIdempotencyKey: intent.providerIdempotencyKey,
      matchingReadbackCount: 0,
      retryWithSameIdempotencyKeyOnly: true,
      providerSuccessClaimed: false,
    });
  }
  const matches: ClubsStripeStayPriceBindingV1[] = [];
  for (const candidate of candidateReadbacks) {
    try {
      matches.push(verifyClubsStripePriceBindingReadbackV1(intent, candidate));
    } catch {
      // Mismatched immutable readback fields remain a conflict signal.
    }
  }
  if (candidateReadbacks.length === 1 && matches.length === 1) {
      const binding = matches[0];
      return Object.freeze({
        version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
        ...prebindingGuard(),
        reconciliationState: "READBACK_MATCH",
        httpStatus: 503,
        priceCreationFingerprint: intent.priceCreationFingerprint,
        providerIdempotencyKey: intent.providerIdempotencyKey,
        matchingReadbackCount: 1,
        retryWithSameIdempotencyKeyOnly: false,
        providerSuccessClaimed: false,
        binding,
      });
  }
  return Object.freeze({
    version: CLUBS_STRIPE_PRICE_BINDING_VERSION,
    ...prebindingGuard(),
    reconciliationState: "CONFLICT",
    httpStatus: 409,
    priceCreationFingerprint: intent.priceCreationFingerprint,
    providerIdempotencyKey: intent.providerIdempotencyKey,
    matchingReadbackCount: matches.length,
    retryWithSameIdempotencyKeyOnly: false,
    providerSuccessClaimed: false,
  });
}
