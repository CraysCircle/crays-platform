import { createHash } from "node:crypto";

export const FRANCHISE_REVENUE_ALLOCATION_CONTRACT_VERSION =
  "crays.franchise-revenue-allocation.v1" as const;

export const FOREST_CITY_FRANCHISE_COMMERCIAL_DECISION = deepFreeze({
  decisionVersion: "forest-city-commercial-decision.2026-08-23.v1",
  status: "RECORDED_NOT_SETTLEMENT_ACTIVE",
  franchiseSystem: "CRAYS.PRO",
  verticalRoot: "CLUBS",
  projectCode: "FOREST_CITY_MY",
  franchisePartner: {
    displayName: "Isabel Maria Jeworski",
    contact: "isabel@crays.org",
    relationship: "PROJECT_LEAD_AND_FRANCHISE_PARTNER",
  },
  operator: {
    invoiceIssuer: "ISABEL_CONTRACTING_COMPANY_PENDING_CANONICAL_ID",
    merchantOfRecord: "ISABEL_CONTRACTING_COMPANY_PENDING_CANONICAL_ID",
  },
  association: {
    organization: "CRAYS Association",
    agreementReferenceRequired: true,
    revenueShareBps: 0,
  },
  ratesBps: {
    projectMarketingContribution: 1000,
    technologyMarketingFee: 500,
    globalConceptTransactionFee: 25,
  },
  attributedBookingTotalBpsIfCommonBase: 1525,
  interpretation:
    "AMBASSADOR_10_PERCENT_IS_THE_MARKETING_CONTRIBUTION_NOT_A_SECOND_10_PERCENT",
  performsProviderMutation: false,
} as const);

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const CURRENCY = /^[A-Z]{3}$/;
const BPS_DENOMINATOR = 10_000n;

export type CanonicalBeneficiary = Readonly<{
  partyId: string;
  beneficiaryKind: "PERSON" | "LEGAL_ENTITY" | "PROJECT_RESERVE";
  ledgerAccountId: string;
  payoutBindingVersion: string;
}>;

export type ActiveFranchiseRevenuePolicy = Readonly<{
  status: "ACTIVE";
  policyId: string;
  policyVersion: number;
  policyHash: string;
  franchiseNetworkId: string;
  verticalRoot: "CLUBS";
  projectId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  invoiceIssuerLegalEntityId: string;
  merchantOfRecordLegalEntityId: string;
  amountBasisDefinitionId: string;
  amountBasisDefinitionHash: string;
  roundingPolicy: "LARGEST_REMAINDER_BPS_V1";
  commercialScheduleReceiptId: string;
  commercialScheduleReceiptHash: string;
  refundAndDisputePolicyVersion: string;
  taxAndWithholdingPolicyVersion: string;
  technologyMarketingBeneficiary: CanonicalBeneficiary &
    Readonly<{ beneficiaryKind: "PERSON" }>;
  globalConceptBeneficiary: CanonicalBeneficiary &
    Readonly<{ beneficiaryKind: "LEGAL_ENTITY" }>;
  unattributedMarketingBeneficiary: CanonicalBeneficiary | null;
  association: Readonly<{
    organizationId: string;
    agreementReferenceId: string;
    revenueShareBps: 0;
  }>;
  ratesBps: Readonly<{
    projectMarketingContribution: 1000;
    technologyMarketingFee: 500;
    globalConceptTransactionFee: 25;
  }>;
}>;

export type ConfirmedAmbassadorAttribution = Readonly<{
  state: "CONFIRMED";
  projectId: string;
  bookingId: string;
  ambassadorPartyId: string;
  ambassadorRelationshipVersion: number;
  beneficiaryLedgerAccountId: string;
  payoutBindingVersion: string;
  attributionPolicyVersion: string;
  confirmationReceiptId: string;
  confirmationReceiptHash: string;
}>;

export type BookingRevenueAllocationInput = Readonly<{
  policy: ActiveFranchiseRevenuePolicy;
  projectId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  invoiceIssuerLegalEntityId: string;
  merchantOfRecordLegalEntityId: string;
  storeId: string;
  bookingId: string;
  orderId: string;
  currency: string;
  allocationBaseMinor: number;
  revenueBaseCertificationReceiptId: string;
  revenueBaseCertificationReceiptHash: string;
  paymentSettlementReceiptId: string;
  paymentSettlementReceiptHash: string;
  ambassadorAttribution: ConfirmedAmbassadorAttribution | null;
}>;

type AllocationCode =
  | "PROJECT_MARKETING_CONTRIBUTION"
  | "TECHNOLOGY_MARKETING_FEE"
  | "GLOBAL_CONCEPT_TRANSACTION_FEE";

export type BookingRevenueAllocationLine = Readonly<{
  code: AllocationCode;
  rateBps: number;
  amountMinor: number;
  beneficiary: CanonicalBeneficiary;
  state: "HELD_PENDING_RECONCILIATION";
}>;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
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
  if (serialized === undefined) {
    throw new Error("FRANCHISE_REVENUE_CANONICAL_VALUE_INVALID");
  }
  return serialized;
}

function digest(value: object): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function exactId(value: string, code: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!ID.test(normalized)) throw new Error(code);
  return normalized;
}

function exactHash(value: string, code: string): string {
  if (typeof value !== "string" || !HASH.test(value)) throw new Error(code);
  return value;
}

function exactVersion(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(code);
  return value;
}

function validateBeneficiary(
  value: CanonicalBeneficiary,
  expectedKind?: CanonicalBeneficiary["beneficiaryKind"],
): CanonicalBeneficiary {
  if (expectedKind && value.beneficiaryKind !== expectedKind) {
    throw new Error("FRANCHISE_REVENUE_BENEFICIARY_KIND_INVALID");
  }
  return Object.freeze({
    partyId: exactId(value.partyId, "FRANCHISE_REVENUE_BENEFICIARY_INVALID"),
    beneficiaryKind: value.beneficiaryKind,
    ledgerAccountId: exactId(
      value.ledgerAccountId,
      "FRANCHISE_REVENUE_BENEFICIARY_INVALID",
    ),
    payoutBindingVersion: exactId(
      value.payoutBindingVersion,
      "FRANCHISE_REVENUE_BENEFICIARY_INVALID",
    ),
  });
}

function validatePolicy(policy: ActiveFranchiseRevenuePolicy): void {
  exactId(policy.policyId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactVersion(policy.policyVersion, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactHash(policy.policyHash, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(policy.franchiseNetworkId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(policy.projectId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(policy.partnerTenantId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(policy.operatorLegalEntityId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(policy.amountBasisDefinitionId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactHash(policy.amountBasisDefinitionHash, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(policy.commercialScheduleReceiptId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactHash(
    policy.commercialScheduleReceiptHash,
    "FRANCHISE_REVENUE_POLICY_INVALID",
  );
  exactId(
    policy.refundAndDisputePolicyVersion,
    "FRANCHISE_REVENUE_POLICY_INVALID",
  );
  exactId(
    policy.taxAndWithholdingPolicyVersion,
    "FRANCHISE_REVENUE_POLICY_INVALID",
  );

  if (
    policy.verticalRoot !== "CLUBS" ||
    policy.status !== "ACTIVE" ||
    policy.roundingPolicy !== "LARGEST_REMAINDER_BPS_V1" ||
    policy.invoiceIssuerLegalEntityId !== policy.operatorLegalEntityId ||
    policy.merchantOfRecordLegalEntityId !== policy.operatorLegalEntityId ||
    policy.ratesBps.projectMarketingContribution !== 1000 ||
    policy.ratesBps.technologyMarketingFee !== 500 ||
    policy.ratesBps.globalConceptTransactionFee !== 25 ||
    policy.association.revenueShareBps !== 0
  ) {
    throw new Error("FRANCHISE_REVENUE_POLICY_CONFLICT");
  }

  exactId(policy.association.organizationId, "FRANCHISE_REVENUE_POLICY_INVALID");
  exactId(
    policy.association.agreementReferenceId,
    "FRANCHISE_REVENUE_POLICY_INVALID",
  );
  validateBeneficiary(policy.technologyMarketingBeneficiary, "PERSON");
  validateBeneficiary(policy.globalConceptBeneficiary, "LEGAL_ENTITY");
  if (policy.unattributedMarketingBeneficiary) {
    validateBeneficiary(policy.unattributedMarketingBeneficiary);
  }
}

function marketingBeneficiary(
  input: BookingRevenueAllocationInput,
): CanonicalBeneficiary {
  const attribution = input.ambassadorAttribution;
  if (attribution === null) {
    if (input.policy.unattributedMarketingBeneficiary === null) {
      throw new Error(
        "FRANCHISE_REVENUE_UNATTRIBUTED_MARKETING_BENEFICIARY_REQUIRED",
      );
    }
    return validateBeneficiary(input.policy.unattributedMarketingBeneficiary);
  }

  if (
    attribution.state !== "CONFIRMED" ||
    attribution.projectId !== input.projectId ||
    attribution.bookingId !== input.bookingId
  ) {
    throw new Error("FRANCHISE_REVENUE_ATTRIBUTION_SCOPE_CONFLICT");
  }

  exactVersion(
    attribution.ambassadorRelationshipVersion,
    "FRANCHISE_REVENUE_ATTRIBUTION_INVALID",
  );
  exactId(
    attribution.attributionPolicyVersion,
    "FRANCHISE_REVENUE_ATTRIBUTION_INVALID",
  );
  exactId(
    attribution.confirmationReceiptId,
    "FRANCHISE_REVENUE_ATTRIBUTION_INVALID",
  );
  exactHash(
    attribution.confirmationReceiptHash,
    "FRANCHISE_REVENUE_ATTRIBUTION_INVALID",
  );

  return validateBeneficiary(
    {
      partyId: attribution.ambassadorPartyId,
      beneficiaryKind: "PERSON",
      ledgerAccountId: attribution.beneficiaryLedgerAccountId,
      payoutBindingVersion: attribution.payoutBindingVersion,
    },
    "PERSON",
  );
}

function allocate(
  baseMinor: number,
  definitions: ReadonlyArray<
    Readonly<{
      code: AllocationCode;
      rateBps: number;
      beneficiary: CanonicalBeneficiary;
    }>
  >,
): BookingRevenueAllocationLine[] {
  const base = BigInt(baseMinor);
  const raw = definitions.map((definition) => {
    const numerator = base * BigInt(definition.rateBps);
    return {
      ...definition,
      floorMinor: numerator / BPS_DENOMINATOR,
      remainder: numerator % BPS_DENOMINATOR,
    };
  });
  const totalBps = raw.reduce(
    (total, line) => total + BigInt(line.rateBps),
    0n,
  );
  const target =
    (base * totalBps + BPS_DENOMINATOR / 2n) / BPS_DENOMINATOR;
  const floors = raw.reduce((total, line) => total + line.floorMinor, 0n);
  let remaining = Number(target - floors);
  const ranked = raw
    .map((line, index) => ({ line, index }))
    .sort(
      (left, right) =>
        Number(right.line.remainder - left.line.remainder) ||
        left.line.code.localeCompare(right.line.code),
    );
  const additions = new Array(raw.length).fill(0n) as bigint[];
  for (const candidate of ranked) {
    if (remaining === 0) break;
    additions[candidate.index] = 1n;
    remaining -= 1;
  }

  return raw.map((line, index) => {
    const amount = line.floorMinor + additions[index];
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("FRANCHISE_REVENUE_ALLOCATION_OVERFLOW");
    }
    return Object.freeze({
      code: line.code,
      rateBps: line.rateBps,
      amountMinor: Number(amount),
      beneficiary: line.beneficiary,
      state: "HELD_PENDING_RECONCILIATION" as const,
    });
  });
}

export function prepareBookingRevenueAllocation(
  input: BookingRevenueAllocationInput,
) {
  validatePolicy(input.policy);
  [
    input.storeId,
    input.bookingId,
    input.orderId,
    input.revenueBaseCertificationReceiptId,
    input.paymentSettlementReceiptId,
  ].forEach((value) => exactId(value, "FRANCHISE_REVENUE_INPUT_INVALID"));
  exactHash(
    input.revenueBaseCertificationReceiptHash,
    "FRANCHISE_REVENUE_INPUT_INVALID",
  );
  exactHash(
    input.paymentSettlementReceiptHash,
    "FRANCHISE_REVENUE_INPUT_INVALID",
  );

  if (
    input.projectId !== input.policy.projectId ||
    input.partnerTenantId !== input.policy.partnerTenantId ||
    input.operatorLegalEntityId !== input.policy.operatorLegalEntityId ||
    input.invoiceIssuerLegalEntityId !== input.policy.operatorLegalEntityId ||
    input.merchantOfRecordLegalEntityId !== input.policy.operatorLegalEntityId
  ) {
    throw new Error("FRANCHISE_REVENUE_PROJECT_OR_OPERATOR_SCOPE_CONFLICT");
  }
  if (
    !CURRENCY.test(input.currency) ||
    !Number.isSafeInteger(input.allocationBaseMinor) ||
    input.allocationBaseMinor < 0
  ) {
    throw new Error("FRANCHISE_REVENUE_AMOUNT_INVALID");
  }

  const lines = allocate(input.allocationBaseMinor, [
    {
      code: "PROJECT_MARKETING_CONTRIBUTION",
      rateBps: 1000,
      beneficiary: marketingBeneficiary(input),
    },
    {
      code: "TECHNOLOGY_MARKETING_FEE",
      rateBps: 500,
      beneficiary: validateBeneficiary(
        input.policy.technologyMarketingBeneficiary,
        "PERSON",
      ),
    },
    {
      code: "GLOBAL_CONCEPT_TRANSACTION_FEE",
      rateBps: 25,
      beneficiary: validateBeneficiary(
        input.policy.globalConceptBeneficiary,
        "LEGAL_ENTITY",
      ),
    },
  ]);
  const allocatedMinor = lines.reduce(
    (total, line) => total + line.amountMinor,
    0,
  );

  const body = {
    contractVersion: FRANCHISE_REVENUE_ALLOCATION_CONTRACT_VERSION,
    state: "PREPARED_PENDING_SETTLEMENT_EXECUTION" as const,
    policyId: input.policy.policyId,
    policyVersion: input.policy.policyVersion,
    policyHash: input.policy.policyHash,
    franchiseNetworkId: input.policy.franchiseNetworkId,
    verticalRoot: input.policy.verticalRoot,
    projectId: input.projectId,
    partnerTenantId: input.partnerTenantId,
    operatorLegalEntityId: input.operatorLegalEntityId,
    invoiceIssuerLegalEntityId: input.invoiceIssuerLegalEntityId,
    merchantOfRecordLegalEntityId: input.merchantOfRecordLegalEntityId,
    storeId: input.storeId,
    bookingId: input.bookingId,
    orderId: input.orderId,
    currency: input.currency,
    allocationBaseMinor: input.allocationBaseMinor,
    allocatedMinor,
    operatorResidualMinor: input.allocationBaseMinor - allocatedMinor,
    amountBasisDefinitionId: input.policy.amountBasisDefinitionId,
    amountBasisDefinitionHash: input.policy.amountBasisDefinitionHash,
    revenueBaseCertificationReceiptId:
      input.revenueBaseCertificationReceiptId,
    revenueBaseCertificationReceiptHash:
      input.revenueBaseCertificationReceiptHash,
    paymentSettlementReceiptId: input.paymentSettlementReceiptId,
    paymentSettlementReceiptHash: input.paymentSettlementReceiptHash,
    ambassadorAttribution: input.ambassadorAttribution,
    lines: deepFreeze(lines),
    associationReference: Object.freeze({
      ...input.policy.association,
      amountMinor: 0,
      state: "NON_BENEFICIARY_CONTRACT_REFERENCE" as const,
    }),
    roundingPolicy: input.policy.roundingPolicy,
    refundAndDisputePolicyVersion:
      input.policy.refundAndDisputePolicyVersion,
    taxAndWithholdingPolicyVersion:
      input.policy.taxAndWithholdingPolicyVersion,
    performsProviderMutation: false as const,
    performsPayout: false as const,
  };
  return deepFreeze({
    ...body,
    allocationReceiptHash: digest(body),
  });
}

export type BookingRevenueAllocation = ReturnType<
  typeof prepareBookingRevenueAllocation
>;

