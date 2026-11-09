import { createHash } from "node:crypto";

import type { BookingRevenueAllocation } from "./franchise-revenue-allocation-contract";

export const STRIPE_AUTOMATIC_BOOKING_SPLIT_VERSION =
  "cclub.stripe-direct-charge-automatic-split.v1" as const;

type AllocationCode =
  | "PROJECT_MARKETING_CONTRIBUTION"
  | "TECHNOLOGY_MARKETING_FEE"
  | "GLOBAL_CONCEPT_TRANSACTION_FEE";

export type StripeRecipientBinding = Readonly<{
  allocationCode: AllocationCode;
  beneficiaryPartyId: string;
  beneficiaryLedgerAccountId: string;
  connectedAccountId: string;
  accountBindingVersion: string;
  countryCode: string;
  currency: string;
  recipientCapabilityStatus: "ACTIVE";
  capabilityReceiptId: string;
  capabilityReceiptHash: string;
  requirementsReceiptId: string;
  requirementsReceiptHash: string;
  crossBorderAuthority:
    | "SAME_REGION"
    | "STRIPE_APPROVED_CROSS_BORDER";
  crossBorderAuthorityReceiptId: string;
  crossBorderAuthorityReceiptHash: string;
}>;

export type StripeAutomaticBookingSplitInput = Readonly<{
  allocation: BookingRevenueAllocation;
  paymentCommandId: string;
  paymentCommandHash: string;
  operatorConnectedAccountId: string;
  operatorAccountBindingVersion: string;
  operatorCountryCode: string;
  operatorMerchantCapabilityStatus: "ACTIVE";
  operatorCapabilityReceiptId: string;
  operatorCapabilityReceiptHash: string;
  platformCountryCode: string;
  stripeApiVersion: "2026-07-29.dahlia";
  recipientBindings: readonly StripeRecipientBinding[];
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const ACCOUNT = /^acct_[A-Za-z0-9]+$/;
const HASH = /^[a-f0-9]{64}$/;
const COUNTRY = /^[A-Z]{2}$/;
const CURRENCY = /^[A-Z]{3}$/;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return (
      "{" +
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => JSON.stringify(key) + ":" + canonicalJson(entry))
        .join(",") +
      "}"
    );
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("STRIPE_SPLIT_CANONICAL_VALUE_INVALID");
  return serialized;
}

function digest(value: object): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function exact(value: string, pattern: RegExp, code: string): string {
  if (typeof value !== "string" || !pattern.test(value.trim())) {
    throw new Error(code);
  }
  return value.trim();
}

function freeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function prepareStripeAutomaticBookingSplit(
  input: StripeAutomaticBookingSplitInput,
) {
  const allocation = input.allocation;
  if (
    allocation.state !== "PREPARED_PENDING_SETTLEMENT_EXECUTION" ||
    allocation.performsProviderMutation !== false ||
    allocation.performsPayout !== false ||
    allocation.associationReference.amountMinor !== 0 ||
    allocation.allocatedMinor <= 0 ||
    allocation.allocationBaseMinor <= 0
  ) {
    throw new Error("STRIPE_SPLIT_ALLOCATION_INVALID");
  }

  exact(input.paymentCommandId, ID, "STRIPE_SPLIT_PAYMENT_COMMAND_INVALID");
  exact(input.paymentCommandHash, HASH, "STRIPE_SPLIT_PAYMENT_COMMAND_INVALID");
  exact(
    input.operatorConnectedAccountId,
    ACCOUNT,
    "STRIPE_SPLIT_OPERATOR_ACCOUNT_INVALID",
  );
  exact(
    input.operatorAccountBindingVersion,
    ID,
    "STRIPE_SPLIT_OPERATOR_BINDING_INVALID",
  );
  exact(input.operatorCountryCode, COUNTRY, "STRIPE_SPLIT_COUNTRY_INVALID");
  exact(input.platformCountryCode, COUNTRY, "STRIPE_SPLIT_COUNTRY_INVALID");
  exact(
    input.operatorCapabilityReceiptId,
    ID,
    "STRIPE_SPLIT_OPERATOR_CAPABILITY_INVALID",
  );
  exact(
    input.operatorCapabilityReceiptHash,
    HASH,
    "STRIPE_SPLIT_OPERATOR_CAPABILITY_INVALID",
  );

  if (
    input.operatorMerchantCapabilityStatus !== "ACTIVE" ||
    input.stripeApiVersion !== "2026-07-29.dahlia" ||
    !CURRENCY.test(allocation.currency)
  ) {
    throw new Error("STRIPE_SPLIT_OPERATOR_NOT_READY");
  }

  const expectedCodes = new Set<AllocationCode>([
    "PROJECT_MARKETING_CONTRIBUTION",
    "TECHNOLOGY_MARKETING_FEE",
    "GLOBAL_CONCEPT_TRANSACTION_FEE",
  ]);
  if (
    allocation.lines.length !== 3 ||
    input.recipientBindings.length !== 3
  ) {
    throw new Error("STRIPE_SPLIT_THREE_LINES_REQUIRED");
  }

  const bindingByCode = new Map<AllocationCode, StripeRecipientBinding>();
  for (const binding of input.recipientBindings) {
    if (!expectedCodes.has(binding.allocationCode)) {
      throw new Error("STRIPE_SPLIT_BINDING_CODE_INVALID");
    }
    if (bindingByCode.has(binding.allocationCode)) {
      throw new Error("STRIPE_SPLIT_BINDING_DUPLICATE");
    }
    exact(
      binding.beneficiaryPartyId,
      ID,
      "STRIPE_SPLIT_BENEFICIARY_INVALID",
    );
    exact(
      binding.beneficiaryLedgerAccountId,
      ID,
      "STRIPE_SPLIT_BENEFICIARY_INVALID",
    );
    exact(
      binding.connectedAccountId,
      ACCOUNT,
      "STRIPE_SPLIT_RECIPIENT_ACCOUNT_INVALID",
    );
    exact(
      binding.accountBindingVersion,
      ID,
      "STRIPE_SPLIT_RECIPIENT_BINDING_INVALID",
    );
    exact(binding.countryCode, COUNTRY, "STRIPE_SPLIT_COUNTRY_INVALID");
    exact(binding.currency, CURRENCY, "STRIPE_SPLIT_CURRENCY_INVALID");
    exact(
      binding.capabilityReceiptId,
      ID,
      "STRIPE_SPLIT_RECIPIENT_CAPABILITY_INVALID",
    );
    exact(
      binding.capabilityReceiptHash,
      HASH,
      "STRIPE_SPLIT_RECIPIENT_CAPABILITY_INVALID",
    );
    exact(
      binding.requirementsReceiptId,
      ID,
      "STRIPE_SPLIT_RECIPIENT_REQUIREMENTS_INVALID",
    );
    exact(
      binding.requirementsReceiptHash,
      HASH,
      "STRIPE_SPLIT_RECIPIENT_REQUIREMENTS_INVALID",
    );
    exact(
      binding.crossBorderAuthorityReceiptId,
      ID,
      "STRIPE_SPLIT_CROSS_BORDER_AUTHORITY_INVALID",
    );
    exact(
      binding.crossBorderAuthorityReceiptHash,
      HASH,
      "STRIPE_SPLIT_CROSS_BORDER_AUTHORITY_INVALID",
    );

    if (
      binding.recipientCapabilityStatus !== "ACTIVE" ||
      binding.currency !== allocation.currency ||
      (binding.countryCode !== input.platformCountryCode &&
        binding.crossBorderAuthority !==
          "STRIPE_APPROVED_CROSS_BORDER") ||
      (binding.countryCode === input.platformCountryCode &&
        binding.crossBorderAuthority !== "SAME_REGION")
    ) {
      throw new Error("STRIPE_SPLIT_RECIPIENT_NOT_READY");
    }
    bindingByCode.set(binding.allocationCode, binding);
  }

  const transferGroup =
    "booking-" +
    digest({
      projectId: allocation.projectId,
      bookingId: allocation.bookingId,
      paymentCommandId: input.paymentCommandId,
      allocationReceiptHash: allocation.allocationReceiptHash,
    }).slice(0, 48);

  const transfers = allocation.lines.map((line) => {
    if (!expectedCodes.has(line.code)) {
      throw new Error("STRIPE_SPLIT_ALLOCATION_CODE_INVALID");
    }
    if (line.amountMinor < 1) {
      throw new Error("STRIPE_SPLIT_LINE_BELOW_PROVIDER_MINIMUM");
    }
    const binding = bindingByCode.get(line.code);
    if (
      !binding ||
      binding.beneficiaryPartyId !== line.beneficiary.partyId ||
      binding.beneficiaryLedgerAccountId !==
        line.beneficiary.ledgerAccountId
    ) {
      throw new Error("STRIPE_SPLIT_BENEFICIARY_BINDING_CONFLICT");
    }

    const body = {
      allocationCode: line.code,
      amountMinor: line.amountMinor,
      currency: allocation.currency.toLowerCase(),
      destinationConnectedAccountId: binding.connectedAccountId,
      transferGroup,
      sourceAuthority: "APPLICATION_FEE_PROCEEDS" as const,
      allocationReceiptHash: allocation.allocationReceiptHash,
      paymentCommandId: input.paymentCommandId,
      accountBindingVersion: binding.accountBindingVersion,
      capabilityReceiptHash: binding.capabilityReceiptHash,
      requirementsReceiptHash: binding.requirementsReceiptHash,
      crossBorderAuthority: binding.crossBorderAuthority,
      crossBorderAuthorityReceiptHash:
        binding.crossBorderAuthorityReceiptHash,
    };
    return Object.freeze({
      ...body,
      transferIdempotencyKey: "transfer-" + digest(body),
      performsProviderMutation: false as const,
    });
  });

  if (new Set(transfers.map((entry) => entry.destinationConnectedAccountId)).size !== 3) {
    throw new Error("STRIPE_SPLIT_DISTINCT_RECIPIENT_ACCOUNTS_REQUIRED");
  }
  const transferTotal = transfers.reduce(
    (total, transfer) => total + transfer.amountMinor,
    0,
  );
  if (transferTotal !== allocation.allocatedMinor) {
    throw new Error("STRIPE_SPLIT_APPLICATION_FEE_PARITY_CONFLICT");
  }

  const paymentIntent = Object.freeze({
    createOnConnectedAccountId: input.operatorConnectedAccountId,
    chargeType: "DIRECT_CHARGE" as const,
    amountMinor: allocation.allocationBaseMinor,
    currency: allocation.currency.toLowerCase(),
    applicationFeeAmountMinor: allocation.allocatedMinor,
    transferGroup,
    idempotencyKey: "payment-" + digest({
      paymentCommandId: input.paymentCommandId,
      paymentCommandHash: input.paymentCommandHash,
      allocationReceiptHash: allocation.allocationReceiptHash,
      operatorConnectedAccountId: input.operatorConnectedAccountId,
    }),
    paymentMethodTypesConfigured: false as const,
    merchantOfRecordLegalEntityId:
      allocation.merchantOfRecordLegalEntityId,
    operatorCapabilityReceiptHash:
      input.operatorCapabilityReceiptHash,
    performsProviderMutation: false as const,
  });

  const body = {
    contractVersion: STRIPE_AUTOMATIC_BOOKING_SPLIT_VERSION,
    state: "READY_FOR_ATOMIC_COMMAND_AND_OUTBOX_PERSISTENCE" as const,
    projectId: allocation.projectId,
    partnerTenantId: allocation.partnerTenantId,
    operatorLegalEntityId: allocation.operatorLegalEntityId,
    bookingId: allocation.bookingId,
    orderId: allocation.orderId,
    allocationReceiptHash: allocation.allocationReceiptHash,
    stripeApiVersion: input.stripeApiVersion,
    paymentIntent,
    transfers: freeze(transfers),
    platformContractualRetentionMinor: 0,
    executionRule:
      "DIRECT_CHARGE_APPLICATION_FEE_THEN_THREE_AUTOMATIC_TRANSFERS" as const,
    providerSuccessIsBusinessCompletion: false as const,
    requiresErpReconciliation: true as const,
    performsProviderMutation: false as const,
  };
  return freeze({ ...body, splitPlanHash: digest(body) });
}

export type StripeAutomaticBookingSplitPlan = ReturnType<
  typeof prepareStripeAutomaticBookingSplit
>;

