import "server-only";

import type {
  ClubsStayStep4PayableBasis,
  ClubsStayStep4PropertyId,
} from "./clubs-stay-step4-contract";
import type { ClubsStripePriceTaxBehaviorV1 } from "./clubs-stripe-price-binding-v1";

export const CLUBS_STRIPE_TRUSTED_STAY_ADAPTER_VERSION =
  "cclub-t5-trusted-stay-adapter.v1" as const;
export const CLUBS_STRIPE_STAY_OWNER_SETUP_VERSION =
  "cclub-t5-trusted-stay-owner-setup.v1" as const;
export const CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID =
  "acct_1TvjKnPonqvDpQ1m" as const;

export const CLUBS_STRIPE_STAY_OWNER_INPUTS = Object.freeze([
  "Immutable owner setup authority ID and SHA-256",
  "Exact Crays Pro Sandbox STAY Product ID and Product tax code",
  "Exact quote-bound one-time STAY Price ID, currency, amount and tax behavior",
  "Exact operator/franchise Stripe TEST connected-account binding in the accepted seller snapshot",
  "Exact Ambassador Stripe TEST connected-account ID",
  "Exact Software Stripe TEST connected-account ID",
  "Exact Global Concept Stripe TEST connected-account ID",
] as const);

export type ClubsStripeTrustedStaySourceInput = Readonly<{
  propertyId: ClubsStayStep4PropertyId;
  quoteId: string;
  holdId: string;
  teamGoEvidenceId: string;
  payableBasis: ClubsStayStep4PayableBasis;
}>;

export type ClubsStripeTrustedStayProvisioningAuthority = Readonly<{
  version: typeof CLUBS_STRIPE_STAY_OWNER_SETUP_VERSION;
  ownerAuthorityId: string;
  ownerAuthoritySha256: string;
  approvedAt: string;
  expiresAt: string;
  projectId: string;
  stripeProductId: string;
  stripePriceId: string;
  productTaxCode: string;
  priceTaxBehavior: ClubsStripePriceTaxBehaviorV1;
  ambassadorConnectedAccountId: string;
  softwareConnectedAccountId: string;
  globalConceptTestConnectedAccountId: string;
}>;

export type ClubsStripeTrustedStayAdapterReceipt = Readonly<{
  version: typeof CLUBS_STRIPE_TRUSTED_STAY_ADAPTER_VERSION;
  state: "TRUSTED_ADAPTER_RECEIPT_VERIFIED";
  adapterReceiptId: string;
  adapterReceiptSha256: string;
  paymentAuthorityId: string;
  memberAccountId: string;
  projectId: string;
  quoteId: string;
  holdId: string;
  teamGoEvidenceId: string;
  t3SourceReceiptSha256: string;
  pricingSnapshotSha256: string;
  taxSnapshotSha256: string;
  feeSnapshotSha256: string;
  depositSnapshotSha256: string;
  sellerSnapshotSha256: string;
  cancellationSnapshotSha256: string;
  refundBoundarySha256: string;
  payableBasis: ClubsStayStep4PayableBasis;
  settlementCoverage: "FULL_STAY" | "DEPOSIT_ONLY";
  stayFullyPaidClaimed: false;
  amountMinor: number;
  currency: string;
  sourceExpiresAt: string;
  stripePlatformAccountId: typeof CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID;
  stripeProductId: string;
  stripePriceId: string;
  productReadbackSha256: string;
  priceReadbackSha256: string;
  providerReadbackSha256: string;
  operatorConnectedAccountId: string;
  ambassadorConnectedAccountId: string;
  softwareConnectedAccountId: string;
  globalConceptTestConnectedAccountId: string;
  beneficiaryBindingSha256: string;
  priceCreationFingerprint: string;
  bindingFingerprint: string;
  ownerAuthorityId: string;
  ownerAuthoritySha256: string;
  providerReadbackVerified: true;
  persistableTo0256: true;
  providerCallable: true;
  persistenceAllowed: true;
  providerUseAllowed: true;
  providerSuccessClaimed: false;
  paymentSuccessClaimed: false;
  livemode: false;
  providerObservedAt: string;
  createdAt: string;
}>;

export type ClubsStripePaymentSetupPending = Readonly<{
  status: "payment_setup_pending";
  reason:
    | "TRUSTED_STAY_ADAPTER_SCHEMA_NOT_READY"
    | "CANONICAL_STAY_AUTHORITY_NOT_READY"
    | "TRUSTED_STAY_ADAPTER_RECEIPT_MISSING"
    | "MEMBERSHIP_CATALOG_BINDING_MISSING";
  paymentKind: "MEMBERSHIP" | "STAY";
  livemode: false;
  providerCalled: false;
  providerSuccessClaimed: false;
  paymentSuccessClaimed: false;
  persistableTo0256: false;
  providerCallable: false;
  requiredOwnerInputs: readonly string[];
}>;

export function clubsStripePaymentSetupPending(
  paymentKind: "MEMBERSHIP" | "STAY",
  reason: ClubsStripePaymentSetupPending["reason"],
): ClubsStripePaymentSetupPending {
  const membershipInputs = Object.freeze([
    "Immutable owner Membership plan/tier authority ID and SHA-256",
    "Exact one-time Membership fee amount, currency and tax behavior",
    "Exact Crays Pro Sandbox Membership Product and Price IDs",
    "Exact four Stripe TEST beneficiary account bindings",
  ] as const);
  return Object.freeze({
    status: "payment_setup_pending",
    reason,
    paymentKind,
    livemode: false,
    providerCalled: false,
    providerSuccessClaimed: false,
    paymentSuccessClaimed: false,
    persistableTo0256: false,
    providerCallable: false,
    requiredOwnerInputs:
      paymentKind === "STAY" ? CLUBS_STRIPE_STAY_OWNER_INPUTS : membershipInputs,
  });
}
