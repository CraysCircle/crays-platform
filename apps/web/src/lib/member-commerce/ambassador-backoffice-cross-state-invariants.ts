import "server-only";

export const AMBASSADOR_BACKOFFICE_INVARIANT_VERSION = 1 as const;
export const AMBASSADOR_BACKOFFICE_DOMAINS = Object.freeze([
  "PAPERWORK",
  "ERP",
  "SPONSOR",
  "MANAGEMENT",
  "ADMISSION",
  "BOOKING",
  "PAYMENT",
  "AUDIT",
] as const);
export type AmbassadorBackofficeDomain =
  (typeof AMBASSADOR_BACKOFFICE_DOMAINS)[number];
export const AMBASSADOR_BACKOFFICE_MAX_AGE_MS =
  24 * 60 * 60 * 1000;
export const AMBASSADOR_BACKOFFICE_GATE_MAX_TTL_MS =
  5 * 60 * 1000;
export const AMBASSADOR_BACKOFFICE_MAX_CLOCK_SKEW_MS =
  30 * 1000;

export type AmbassadorBackofficeBlockReason =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "GATE_WINDOW_INVALID"
  | "STATE_RECEIPT_COUNT_INVALID"
  | "STATE_DOMAIN_UNKNOWN"
  | "STATE_DOMAIN_DUPLICATE"
  | "STATE_RECEIPT_DUPLICATE"
  | "STATE_SCHEMA_DUPLICATE"
  | "STATE_SCOPE_MISMATCH"
  | "STATE_NOT_CANONICAL_CURRENT"
  | "STATE_NOT_INDEPENDENT"
  | "STATE_STALE"
  | "ADMISSION_DOMAIN_MISSING"
  | "ADMISSION_AUTHORITY_INVALID"
  | "AMBASSADOR_ROLE_INVALID"
  | "NON_ADMISSION_EFFECT_INVALID"
  | "AUDIT_COVERAGE_INVALID";

export interface AmbassadorBackofficeStateReceipt {
  domain: AmbassadorBackofficeDomain;
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  tenantId: string;
  projectId: string;
  franchiseId: string;
  ambassadorReferenceHash: string;
  subjectReferenceHash: string;
  stateSchemaId: string;
  stateSchemaSha256: string;
  stateVersion: number;
  stateValue: string;
  lifecycleState: string;
  stateDerivation: string;
  sourceAuthority: string;
  finalDecision: boolean;
  decisionAuthorityClass: string | null;
  ambassadorDecisionRole: string;
  admissionEffect: string;
  auditCoverageReceiptIds: readonly string[];
  updatedAt: string;
  validUntil: string;
}

export interface EvaluateAmbassadorBackofficeInvariantInput {
  tenantId: string;
  projectId: string;
  franchiseId: string;
  ambassadorReferenceHash: string;
  subjectReferenceHash: string;
  requestedAt: string;
  expiresAt: string;
  stateReceipts: readonly AmbassadorBackofficeStateReceipt[];
}

export interface AmbassadorBackofficeInvariantDecision {
  invariantVersion: typeof AMBASSADOR_BACKOFFICE_INVARIANT_VERSION;
  invariantsSatisfied: boolean;
  status: "INDEPENDENT_STATE_CONTRACT_SATISFIED" | "BLOCKED";
  blockReasons: readonly AmbassadorBackofficeBlockReason[];
  tenantId: string;
  projectId: string;
  franchiseId: string;
  ambassadorReferenceHash: string;
  subjectReferenceHash: string;
  stateReceiptIdsByDomain: Readonly<Record<string, string>>;
  evaluatedAt: string;
  expiresAt: string;
  admissionDecisionPerformed: false;
  bookingPerformed: false;
  paymentPerformed: false;
  erpMutated: false;
  emailSent: false;
  externalMutationPerformed: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DOMAIN_SET = new Set<string>(AMBASSADOR_BACKOFFICE_DOMAINS);

export function evaluateAmbassadorBackofficeInvariants(
  input: EvaluateAmbassadorBackofficeInvariantInput,
  observedAt: Date = new Date(),
): Readonly<AmbassadorBackofficeInvariantDecision> {
  const reasons = new Set<AmbassadorBackofficeBlockReason>();
  const add = (reason: AmbassadorBackofficeBlockReason) =>
    reasons.add(reason);
  const nowMs = observedAt.getTime();
  const text = (value: string) =>
    typeof value === "string" && value.trim() !== "";
  const hash = (value: string) => SHA256_PATTERN.test(value);
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  };

  if (
    !Number.isFinite(nowMs) ||
    !text(input.tenantId) ||
    !text(input.projectId) ||
    !text(input.franchiseId)
  ) {
    add("MALFORMED_SCOPE");
  }
  if (
    !hash(input.ambassadorReferenceHash) ||
    !hash(input.subjectReferenceHash)
  ) {
    add("INVALID_HASH");
  }
  const requestedAt = date(input.requestedAt);
  const gateExpiresAt = date(input.expiresAt);
  if (
    !requestedAt ||
    !gateExpiresAt ||
    requestedAt.getTime() >
      nowMs + AMBASSADOR_BACKOFFICE_MAX_CLOCK_SKEW_MS ||
    gateExpiresAt.getTime() <= nowMs ||
    gateExpiresAt.getTime() <= requestedAt.getTime() ||
    gateExpiresAt.getTime() - nowMs >
      AMBASSADOR_BACKOFFICE_GATE_MAX_TTL_MS
  ) {
    add("GATE_WINDOW_INVALID");
  }

  if (
    input.stateReceipts.length !==
    AMBASSADOR_BACKOFFICE_DOMAINS.length
  ) {
    add("STATE_RECEIPT_COUNT_INVALID");
  }
  const domains = new Set<string>();
  const receiptIds = new Set<string>();
  const receiptHashes = new Set<string>();
  const schemaHashes = new Set<string>();
  const receiptIdsByDomain: Record<string, string> = {};
  let admission: AmbassadorBackofficeStateReceipt | undefined;
  let audit: AmbassadorBackofficeStateReceipt | undefined;

  for (const state of input.stateReceipts) {
    if (!DOMAIN_SET.has(state.domain)) {
      add("STATE_DOMAIN_UNKNOWN");
    }
    if (domains.has(state.domain)) {
      add("STATE_DOMAIN_DUPLICATE");
    }
    domains.add(state.domain);
    receiptIdsByDomain[state.domain] = state.receiptId;

    if (
      !text(state.receiptId) ||
      receiptIds.has(state.receiptId) ||
      !hash(state.receiptSha256) ||
      receiptHashes.has(state.receiptSha256)
    ) {
      add("STATE_RECEIPT_DUPLICATE");
    }
    receiptIds.add(state.receiptId);
    receiptHashes.add(state.receiptSha256);

    if (
      !text(state.stateSchemaId) ||
      !hash(state.stateSchemaSha256) ||
      schemaHashes.has(state.stateSchemaSha256)
    ) {
      add("STATE_SCHEMA_DUPLICATE");
    }
    schemaHashes.add(state.stateSchemaSha256);

    if (
      state.tenantId !== input.tenantId ||
      state.projectId !== input.projectId ||
      state.franchiseId !== input.franchiseId ||
      state.ambassadorReferenceHash !==
        input.ambassadorReferenceHash ||
      state.subjectReferenceHash !== input.subjectReferenceHash
    ) {
      add("STATE_SCOPE_MISMATCH");
    }
    if (
      state.persisted !== true ||
      !Number.isInteger(state.stateVersion) ||
      state.stateVersion < 1 ||
      !text(state.stateValue) ||
      state.lifecycleState !== "CURRENT" ||
      !text(state.sourceAuthority)
    ) {
      add("STATE_NOT_CANONICAL_CURRENT");
    }
    if (state.stateDerivation !== "INDEPENDENT") {
      add("STATE_NOT_INDEPENDENT");
    }

    const updatedAt = date(state.updatedAt);
    const validUntil = date(state.validUntil);
    if (
      !updatedAt ||
      !validUntil ||
      updatedAt.getTime() >
        nowMs + AMBASSADOR_BACKOFFICE_MAX_CLOCK_SKEW_MS ||
      nowMs - updatedAt.getTime() >
        AMBASSADOR_BACKOFFICE_MAX_AGE_MS ||
      validUntil.getTime() <= nowMs ||
      (gateExpiresAt &&
        validUntil.getTime() < gateExpiresAt.getTime())
    ) {
      add("STATE_STALE");
    }

    if (state.domain === "ADMISSION") {
      admission = state;
      if (
        state.ambassadorDecisionRole !==
        "PREQUALIFICATION_ONLY"
      ) {
        add("AMBASSADOR_ROLE_INVALID");
      }
      if (
        state.finalDecision === true &&
        state.decisionAuthorityClass !== "CRAYS_TEAM"
      ) {
        add("ADMISSION_AUTHORITY_INVALID");
      }
      if (
        state.finalDecision === false &&
        state.decisionAuthorityClass !== null
      ) {
        add("ADMISSION_AUTHORITY_INVALID");
      }
    } else {
      if (
        state.finalDecision !== false ||
        state.decisionAuthorityClass !== null ||
        state.admissionEffect !== "NONE"
      ) {
        add("NON_ADMISSION_EFFECT_INVALID");
      }
      if (
        state.ambassadorDecisionRole !==
        "NO_FINAL_DECISION"
      ) {
        add("AMBASSADOR_ROLE_INVALID");
      }
    }

    if (state.domain === "AUDIT") {
      audit = state;
    }
  }

  if (!admission) {
    add("ADMISSION_DOMAIN_MISSING");
  }
  for (const domain of AMBASSADOR_BACKOFFICE_DOMAINS) {
    if (!domains.has(domain)) {
      add("STATE_RECEIPT_COUNT_INVALID");
    }
  }

  if (audit) {
    const expectedAuditCoverage = input.stateReceipts
      .filter((state) => state.domain !== "AUDIT")
      .map((state) => state.receiptId);
    const actual = new Set(audit.auditCoverageReceiptIds);
    if (
      actual.size !== expectedAuditCoverage.length ||
      expectedAuditCoverage.some((receiptId) => !actual.has(receiptId))
    ) {
      add("AUDIT_COVERAGE_INVALID");
    }
  } else {
    add("AUDIT_COVERAGE_INVALID");
  }

  const blockReasons = Object.freeze([...reasons].sort());
  const satisfied = blockReasons.length === 0;
  return Object.freeze({
    invariantVersion: AMBASSADOR_BACKOFFICE_INVARIANT_VERSION,
    invariantsSatisfied: satisfied,
    status: satisfied
      ? "INDEPENDENT_STATE_CONTRACT_SATISFIED"
      : "BLOCKED",
    blockReasons,
    tenantId: input.tenantId,
    projectId: input.projectId,
    franchiseId: input.franchiseId,
    ambassadorReferenceHash: input.ambassadorReferenceHash,
    subjectReferenceHash: input.subjectReferenceHash,
    stateReceiptIdsByDomain: Object.freeze(receiptIdsByDomain),
    evaluatedAt: observedAt.toISOString(),
    expiresAt: input.expiresAt,
    admissionDecisionPerformed: false,
    bookingPerformed: false,
    paymentPerformed: false,
    erpMutated: false,
    emailSent: false,
    externalMutationPerformed: false,
  });
}

