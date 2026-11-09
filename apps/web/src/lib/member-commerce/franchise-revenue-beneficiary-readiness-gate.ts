import "server-only";

export const FRANCHISE_REVENUE_BENEFICIARY_GATE_VERSION = 1 as const;
export const FRANCHISE_REVENUE_TOTAL_BPS = 10_000 as const;
export const FRANCHISE_REVENUE_LINE_BPS = Object.freeze({
  MARKETING_10: 1_000,
  TECHNOLOGY_5: 500,
  GLOBAL_CONCEPT_0_25: 25,
  OPERATING_84_75: 8_475,
} as const);
export const FRANCHISE_REVENUE_GATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const FRANCHISE_REVENUE_GATE_MAX_TTL_MS = 5 * 60 * 1000;
export const FRANCHISE_REVENUE_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type FranchiseRevenueLineCode =
  keyof typeof FRANCHISE_REVENUE_LINE_BPS;

export type FranchiseRevenueBlockReason =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "GATE_WINDOW_INVALID"
  | "ALLOCATION_RECEIPT_MISSING"
  | "ALLOCATION_SCOPE_MISMATCH"
  | "ALLOCATION_SPLIT_INVALID"
  | "ALLOCATION_AMOUNT_INVALID"
  | "ALLOCATION_STALE"
  | "AMBASSADOR_ATTRIBUTION_INVALID"
  | "AMBASSADOR_MARKETING_BENEFICIARY_MISMATCH"
  | "BENEFICIARY_COUNT_INVALID"
  | "BENEFICIARY_LINE_DUPLICATE"
  | "BENEFICIARY_AUTHORITY_DUPLICATE"
  | "BENEFICIARY_SCOPE_MISMATCH"
  | "BENEFICIARY_AUTHORITY_MISSING"
  | "BENEFICIARY_AUTHORITY_STALE"
  | "GLOBAL_CONCEPT_LEGAL_ENTITY_UNRESOLVED";

export interface FranchiseRevenueAllocationLine {
  lineCode: FranchiseRevenueLineCode;
  basisPoints: number;
  amountMinor: number;
}

export interface FranchiseRevenueAllocationReceipt {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  tenantId: string;
  projectId: string;
  franchiseId: string;
  bookingReferenceHash: string;
  currency: string;
  grossAmountMinor: number;
  lines: readonly FranchiseRevenueAllocationLine[];
  calculatedAt: string;
  expiresAt: string;
}

export interface ConfirmedAmbassadorAttribution {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  tenantId: string;
  projectId: string;
  franchiseId: string;
  bookingReferenceHash: string;
  status: "CONFIRMED" | "NONE";
  ambassadorReferenceHash: string | null;
  confirmedAt: string;
  expiresAt: string;
}

export interface FranchiseRevenueBeneficiaryAuthority {
  lineCode: FranchiseRevenueLineCode;
  authorityReceiptId: string;
  authorityReceiptSha256: string;
  persisted: boolean;
  tenantId: string;
  projectId: string;
  franchiseId: string;
  beneficiaryClass: string;
  beneficiaryReferenceHash: string;
  legalEntityReferenceHash: string;
  payoutScopeSha256: string;
  state: string;
  validFrom: string;
  validUntil: string;
}

export interface EvaluateFranchiseRevenueBeneficiaryInput {
  tenantId: string;
  projectId: string;
  franchiseId: string;
  bookingReferenceHash: string;
  requestedAt: string;
  expiresAt: string;
  allocation: FranchiseRevenueAllocationReceipt;
  ambassadorAttribution: ConfirmedAmbassadorAttribution;
  beneficiaryAuthorities: readonly FranchiseRevenueBeneficiaryAuthority[];
}

export interface FranchiseRevenueBeneficiaryDecision {
  gateVersion: typeof FRANCHISE_REVENUE_BENEFICIARY_GATE_VERSION;
  dispatchEligible: boolean;
  status: "ELIGIBLE_FOR_SEPARATELY_AUTHORIZED_DISPATCH" | "BLOCKED";
  blockReasons: readonly FranchiseRevenueBlockReason[];
  tenantId: string;
  projectId: string;
  franchiseId: string;
  bookingReferenceHash: string;
  allocationReceiptId: string;
  ambassadorAttributionReceiptId: string;
  beneficiaryAuthorityReceiptIds: readonly string[];
  evaluatedAt: string;
  expiresAt: string;
  externalDispatchAuthorized: false;
  externalDispatchPerformed: false;
  stripeCalled: false;
  erpCalled: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EXPECTED_LINES = Object.keys(
  FRANCHISE_REVENUE_LINE_BPS,
) as FranchiseRevenueLineCode[];

export function evaluateFranchiseRevenueBeneficiaryReadiness(
  input: EvaluateFranchiseRevenueBeneficiaryInput,
  observedAt: Date = new Date(),
): Readonly<FranchiseRevenueBeneficiaryDecision> {
  const reasons = new Set<FranchiseRevenueBlockReason>();
  const add = (reason: FranchiseRevenueBlockReason) => reasons.add(reason);
  const nowMs = observedAt.getTime();
  const text = (value: string) =>
    typeof value === "string" && value.trim() !== "";
  const hash = (value: string) => SHA256_PATTERN.test(value);
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  };
  const fresh = (value: string) => {
    const parsed = date(value);
    return Boolean(
      parsed &&
      parsed.getTime() <= nowMs + FRANCHISE_REVENUE_MAX_CLOCK_SKEW_MS &&
      nowMs - parsed.getTime() <= FRANCHISE_REVENUE_GATE_MAX_AGE_MS,
    );
  };

  if (
    !Number.isFinite(nowMs) ||
    !text(input.tenantId) ||
    !text(input.projectId) ||
    !text(input.franchiseId)
  ) {
    add("MALFORMED_SCOPE");
  }
  if (!hash(input.bookingReferenceHash)) {
    add("INVALID_HASH");
  }
  const requestedAt = date(input.requestedAt);
  const gateExpiresAt = date(input.expiresAt);
  if (
    !requestedAt ||
    !gateExpiresAt ||
    requestedAt.getTime() > nowMs + FRANCHISE_REVENUE_MAX_CLOCK_SKEW_MS ||
    gateExpiresAt.getTime() <= nowMs ||
    gateExpiresAt.getTime() <= requestedAt.getTime() ||
    gateExpiresAt.getTime() - nowMs > FRANCHISE_REVENUE_GATE_MAX_TTL_MS
  ) {
    add("GATE_WINDOW_INVALID");
  }

  const allocation = input.allocation;
  if (
    allocation.persisted !== true ||
    !text(allocation.receiptId) ||
    !hash(allocation.receiptSha256)
  ) {
    add("ALLOCATION_RECEIPT_MISSING");
  }
  if (
    allocation.tenantId !== input.tenantId ||
    allocation.projectId !== input.projectId ||
    allocation.franchiseId !== input.franchiseId ||
    allocation.bookingReferenceHash !== input.bookingReferenceHash
  ) {
    add("ALLOCATION_SCOPE_MISMATCH");
  }
  if (
    !/^[A-Z]{3}$/.test(allocation.currency) ||
    !Number.isInteger(allocation.grossAmountMinor) ||
    allocation.grossAmountMinor <= 0
  ) {
    add("ALLOCATION_AMOUNT_INVALID");
  }
  const lineCodes = new Set<FranchiseRevenueLineCode>();
  let basisPointTotal = 0;
  let amountTotal = 0;
  for (const line of allocation.lines) {
    lineCodes.add(line.lineCode);
    basisPointTotal += line.basisPoints;
    amountTotal += line.amountMinor;
    const expectedBps = FRANCHISE_REVENUE_LINE_BPS[line.lineCode];
    if (
      expectedBps === undefined ||
      line.basisPoints !== expectedBps
    ) {
      add("ALLOCATION_SPLIT_INVALID");
    }
    const exactNumerator =
      allocation.grossAmountMinor * (expectedBps ?? 0);
    const floorAmount = Math.floor(
      exactNumerator / FRANCHISE_REVENUE_TOTAL_BPS,
    );
    if (
      !Number.isInteger(line.amountMinor) ||
      line.amountMinor < 0 ||
      (line.amountMinor !== floorAmount &&
        line.amountMinor !== floorAmount + 1)
    ) {
      add("ALLOCATION_AMOUNT_INVALID");
    }
  }
  if (
    allocation.lines.length !== EXPECTED_LINES.length ||
    lineCodes.size !== EXPECTED_LINES.length ||
    EXPECTED_LINES.some((lineCode) => !lineCodes.has(lineCode)) ||
    basisPointTotal !== FRANCHISE_REVENUE_TOTAL_BPS
  ) {
    add("ALLOCATION_SPLIT_INVALID");
  }
  if (amountTotal !== allocation.grossAmountMinor) {
    add("ALLOCATION_AMOUNT_INVALID");
  }
  const allocationExpiresAt = date(allocation.expiresAt);
  if (
    !fresh(allocation.calculatedAt) ||
    !allocationExpiresAt ||
    allocationExpiresAt.getTime() <= nowMs ||
    (gateExpiresAt && allocationExpiresAt.getTime() < gateExpiresAt.getTime())
  ) {
    add("ALLOCATION_STALE");
  }

  const attribution = input.ambassadorAttribution;
  if (
    attribution.persisted !== true ||
    !text(attribution.receiptId) ||
    !hash(attribution.receiptSha256) ||
    attribution.tenantId !== input.tenantId ||
    attribution.projectId !== input.projectId ||
    attribution.franchiseId !== input.franchiseId ||
    attribution.bookingReferenceHash !== input.bookingReferenceHash ||
    !["CONFIRMED", "NONE"].includes(attribution.status)
  ) {
    add("AMBASSADOR_ATTRIBUTION_INVALID");
  }
  if (
    (attribution.status === "CONFIRMED" &&
      !hash(attribution.ambassadorReferenceHash ?? "")) ||
    (attribution.status === "NONE" &&
      attribution.ambassadorReferenceHash !== null)
  ) {
    add("AMBASSADOR_ATTRIBUTION_INVALID");
  }
  const attributionExpiresAt = date(attribution.expiresAt);
  if (
    !fresh(attribution.confirmedAt) ||
    !attributionExpiresAt ||
    attributionExpiresAt.getTime() <= nowMs ||
    (gateExpiresAt && attributionExpiresAt.getTime() < gateExpiresAt.getTime())
  ) {
    add("AMBASSADOR_ATTRIBUTION_INVALID");
  }

  if (input.beneficiaryAuthorities.length !== EXPECTED_LINES.length) {
    add("BENEFICIARY_COUNT_INVALID");
  }
  const beneficiaryLines = new Set<FranchiseRevenueLineCode>();
  const authorityReceipts = new Set<string>();
  const authorityHashes = new Set<string>();
  const beneficiaryAuthorityReceiptIds: string[] = [];
  let marketingAuthority: FranchiseRevenueBeneficiaryAuthority | undefined;

  for (const authority of input.beneficiaryAuthorities) {
    beneficiaryAuthorityReceiptIds.push(authority.authorityReceiptId);
    if (beneficiaryLines.has(authority.lineCode)) {
      add("BENEFICIARY_LINE_DUPLICATE");
    }
    beneficiaryLines.add(authority.lineCode);
    if (authorityReceipts.has(authority.authorityReceiptId)) {
      add("BENEFICIARY_AUTHORITY_DUPLICATE");
    }
    authorityReceipts.add(authority.authorityReceiptId);
    if (authorityHashes.has(authority.authorityReceiptSha256)) {
      add("BENEFICIARY_AUTHORITY_DUPLICATE");
    }
    authorityHashes.add(authority.authorityReceiptSha256);
    if (
      authority.tenantId !== input.tenantId ||
      authority.projectId !== input.projectId ||
      authority.franchiseId !== input.franchiseId
    ) {
      add("BENEFICIARY_SCOPE_MISMATCH");
    }
    if (
      authority.persisted !== true ||
      !text(authority.authorityReceiptId) ||
      !hash(authority.authorityReceiptSha256) ||
      !text(authority.beneficiaryClass) ||
      !hash(authority.beneficiaryReferenceHash) ||
      !hash(authority.legalEntityReferenceHash) ||
      !hash(authority.payoutScopeSha256) ||
      authority.state !== "CONFIRMED"
    ) {
      add("BENEFICIARY_AUTHORITY_MISSING");
    }
    const validFrom = date(authority.validFrom);
    const validUntil = date(authority.validUntil);
    if (
      !validFrom ||
      !validUntil ||
      validFrom.getTime() > nowMs ||
      validUntil.getTime() <= nowMs ||
      (gateExpiresAt && validUntil.getTime() < gateExpiresAt.getTime())
    ) {
      add("BENEFICIARY_AUTHORITY_STALE");
    }
    if (authority.lineCode === "MARKETING_10") {
      marketingAuthority = authority;
    }
    if (
      authority.lineCode === "GLOBAL_CONCEPT_0_25" &&
      !hash(authority.legalEntityReferenceHash)
    ) {
      add("GLOBAL_CONCEPT_LEGAL_ENTITY_UNRESOLVED");
    }
  }
  if (
    beneficiaryLines.size !== EXPECTED_LINES.length ||
    EXPECTED_LINES.some((lineCode) => !beneficiaryLines.has(lineCode))
  ) {
    add("BENEFICIARY_COUNT_INVALID");
  }
  if (
    attribution.status === "CONFIRMED" &&
    (!marketingAuthority ||
      marketingAuthority.beneficiaryClass !== "AMBASSADOR" ||
      marketingAuthority.beneficiaryReferenceHash !==
        attribution.ambassadorReferenceHash)
  ) {
    add("AMBASSADOR_MARKETING_BENEFICIARY_MISMATCH");
  }

  const blockReasons = Object.freeze([...reasons].sort());
  const eligible = blockReasons.length === 0;
  return Object.freeze({
    gateVersion: FRANCHISE_REVENUE_BENEFICIARY_GATE_VERSION,
    dispatchEligible: eligible,
    status: eligible
      ? "ELIGIBLE_FOR_SEPARATELY_AUTHORIZED_DISPATCH"
      : "BLOCKED",
    blockReasons,
    tenantId: input.tenantId,
    projectId: input.projectId,
    franchiseId: input.franchiseId,
    bookingReferenceHash: input.bookingReferenceHash,
    allocationReceiptId: allocation.receiptId,
    ambassadorAttributionReceiptId: attribution.receiptId,
    beneficiaryAuthorityReceiptIds: Object.freeze(
      beneficiaryAuthorityReceiptIds,
    ),
    evaluatedAt: observedAt.toISOString(),
    expiresAt: input.expiresAt,
    externalDispatchAuthorized: false,
    externalDispatchPerformed: false,
    stripeCalled: false,
    erpCalled: false,
  });
}

