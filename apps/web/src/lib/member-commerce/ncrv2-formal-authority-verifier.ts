import "server-only";

export const NCRV2_FORMAL_AUTHORITY_VERIFIER_VERSION = 1 as const;
export const NCRV2_FORMAL_ACTION =
  "NCRV2_130_FORMAL_ACTIVATION" as const;
export const NCRV2_FORMAL_AUTHORITY_MAX_AGE_MS = 5 * 60 * 1000;
export const NCRV2_FORMAL_AAL2_MAX_AGE_MS = 5 * 60 * 1000;
export const NCRV2_FORMAL_GATE_MAX_TTL_MS = 2 * 60 * 1000;
export const NCRV2_FORMAL_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type Ncrv2FormalAuthorityBlockReason =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "GATE_WINDOW_INVALID"
  | "REAL_EVIDENCE_RECEIPT_MISSING"
  | "REAL_EVIDENCE_SCOPE_MISMATCH"
  | "REAL_EVIDENCE_NOT_COMPLETE"
  | "REAL_EVIDENCE_STALE"
  | "FORMAL_AUTHORITY_NOT_EXPLICIT"
  | "FORMAL_AUTHORITY_SCOPE_MISMATCH"
  | "FORMAL_AUTHORITY_EVIDENCE_MISMATCH"
  | "FORMAL_AUTHORITY_NOT_SINGLE_USE"
  | "FORMAL_AUTHORITY_STALE"
  | "FORMAL_AAL2_SCOPE_MISMATCH"
  | "FORMAL_AAL2_NOT_FRESH";

export interface PersistedNcrv2RealEvidenceCombinationReceipt {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  synthetic: boolean;
  evidenceClass: string;
  tenantId: string;
  evaluationScopeSha256: string;
  registryReceiptId: string;
  registryReceiptSha256: string;
  requirementCount: number;
  allPass: boolean;
  observedAt: string;
  expiresAt: string;
}

export interface ExplicitNcrv2FormalAuthorityReceipt {
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  authorityClass: string;
  action: string;
  tenantId: string;
  evaluationScopeSha256: string;
  evidenceCombinationReceiptId: string;
  evidenceCombinationReceiptSha256: string;
  registryReceiptId: string;
  registryReceiptSha256: string;
  authorizedByPersonId: string;
  authorizedByAccountReferenceHash: string;
  humanAal2ReceiptId: string;
  humanAal2ReceiptSha256: string;
  humanAal2AuthenticatedAt: string;
  state: string;
  useLimit: number;
  consumedAt: string | null;
  issuedAt: string;
  expiresAt: string;
}

export interface EvaluateNcrv2FormalAuthorityInput {
  tenantId: string;
  evaluationScopeSha256: string;
  requestedAt: string;
  expiresAt: string;
  realEvidence: PersistedNcrv2RealEvidenceCombinationReceipt;
  formalAuthority: ExplicitNcrv2FormalAuthorityReceipt;
}

export interface Ncrv2FormalAuthorityDecision {
  verifierVersion: typeof NCRV2_FORMAL_AUTHORITY_VERIFIER_VERSION;
  eligibleForAtomicConsumption: boolean;
  status: "ELIGIBLE_FOR_SEPARATE_ATOMIC_CONSUMPTION" | "BLOCKED";
  blockReasons: readonly Ncrv2FormalAuthorityBlockReason[];
  tenantId: string;
  evaluationScopeSha256: string;
  evidenceCombinationReceiptId: string;
  formalAuthorityReceiptId: string;
  humanAal2ReceiptId: string;
  evaluatedAt: string;
  expiresAt: string;
  formalRequirementCount: 0;
  authorityConsumed: false;
  formalActionPerformed: false;
  providerCalled: false;
  externalMutationPerformed: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function evaluateNcrv2FormalAuthority(
  input: EvaluateNcrv2FormalAuthorityInput,
  observedAt: Date = new Date(),
): Readonly<Ncrv2FormalAuthorityDecision> {
  const reasons = new Set<Ncrv2FormalAuthorityBlockReason>();
  const add = (reason: Ncrv2FormalAuthorityBlockReason) => reasons.add(reason);
  const nowMs = observedAt.getTime();
  const text = (value: string) =>
    typeof value === "string" && value.trim() !== "";
  const hash = (value: string) => SHA256_PATTERN.test(value);
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  };
  const fresh = (value: string, maxAgeMs: number) => {
    const parsed = date(value);
    return Boolean(
      parsed &&
      parsed.getTime() <= nowMs + NCRV2_FORMAL_MAX_CLOCK_SKEW_MS &&
      nowMs - parsed.getTime() <= maxAgeMs,
    );
  };

  if (!Number.isFinite(nowMs) || !text(input.tenantId)) {
    add("MALFORMED_SCOPE");
  }
  if (!hash(input.evaluationScopeSha256)) {
    add("INVALID_HASH");
  }
  const requestedAt = date(input.requestedAt);
  const gateExpiresAt = date(input.expiresAt);
  if (
    !requestedAt ||
    !gateExpiresAt ||
    requestedAt.getTime() > nowMs + NCRV2_FORMAL_MAX_CLOCK_SKEW_MS ||
    gateExpiresAt.getTime() <= nowMs ||
    gateExpiresAt.getTime() <= requestedAt.getTime() ||
    gateExpiresAt.getTime() - nowMs > NCRV2_FORMAL_GATE_MAX_TTL_MS
  ) {
    add("GATE_WINDOW_INVALID");
  }

  const evidence = input.realEvidence;
  if (
    evidence.persisted !== true ||
    evidence.synthetic !== false ||
    evidence.evidenceClass !== "REAL_EVIDENCE_COMPLETE" ||
    !text(evidence.receiptId) ||
    !hash(evidence.receiptSha256) ||
    !text(evidence.registryReceiptId) ||
    !hash(evidence.registryReceiptSha256)
  ) {
    add("REAL_EVIDENCE_RECEIPT_MISSING");
  }
  if (
    evidence.tenantId !== input.tenantId ||
    evidence.evaluationScopeSha256 !== input.evaluationScopeSha256
  ) {
    add("REAL_EVIDENCE_SCOPE_MISMATCH");
  }
  if (
    evidence.requirementCount !== 14 ||
    evidence.allPass !== true
  ) {
    add("REAL_EVIDENCE_NOT_COMPLETE");
  }
  const evidenceExpiresAt = date(evidence.expiresAt);
  if (
    !fresh(evidence.observedAt, NCRV2_FORMAL_AUTHORITY_MAX_AGE_MS) ||
    !evidenceExpiresAt ||
    evidenceExpiresAt.getTime() <= nowMs ||
    (gateExpiresAt && evidenceExpiresAt.getTime() < gateExpiresAt.getTime())
  ) {
    add("REAL_EVIDENCE_STALE");
  }

  const authority = input.formalAuthority;
  if (
    authority.persisted !== true ||
    authority.authorityClass !== "OWNER_EXPLICIT_FORMAL_AUTHORITY" ||
    authority.action !== NCRV2_FORMAL_ACTION ||
    authority.state !== "AUTHORIZED" ||
    !text(authority.receiptId) ||
    !hash(authority.receiptSha256)
  ) {
    add("FORMAL_AUTHORITY_NOT_EXPLICIT");
  }
  if (
    authority.tenantId !== input.tenantId ||
    authority.evaluationScopeSha256 !== input.evaluationScopeSha256
  ) {
    add("FORMAL_AUTHORITY_SCOPE_MISMATCH");
  }
  if (
    authority.evidenceCombinationReceiptId !== evidence.receiptId ||
    authority.evidenceCombinationReceiptSha256 !== evidence.receiptSha256 ||
    authority.registryReceiptId !== evidence.registryReceiptId ||
    authority.registryReceiptSha256 !== evidence.registryReceiptSha256
  ) {
    add("FORMAL_AUTHORITY_EVIDENCE_MISMATCH");
  }
  if (authority.useLimit !== 1 || authority.consumedAt !== null) {
    add("FORMAL_AUTHORITY_NOT_SINGLE_USE");
  }
  if (
    !text(authority.authorizedByPersonId) ||
    !hash(authority.authorizedByAccountReferenceHash) ||
    !text(authority.humanAal2ReceiptId) ||
    !hash(authority.humanAal2ReceiptSha256)
  ) {
    add("FORMAL_AAL2_SCOPE_MISMATCH");
  }
  const authorityIssuedAt = date(authority.issuedAt);
  const authorityExpiresAt = date(authority.expiresAt);
  if (
    !authorityIssuedAt ||
    !authorityExpiresAt ||
    !fresh(authority.issuedAt, NCRV2_FORMAL_AUTHORITY_MAX_AGE_MS) ||
    authorityExpiresAt.getTime() <= nowMs ||
    authorityExpiresAt.getTime() <= authorityIssuedAt.getTime() ||
    (gateExpiresAt && authorityExpiresAt.getTime() < gateExpiresAt.getTime())
  ) {
    add("FORMAL_AUTHORITY_STALE");
  }
  if (
    !fresh(
      authority.humanAal2AuthenticatedAt,
      NCRV2_FORMAL_AAL2_MAX_AGE_MS,
    )
  ) {
    add("FORMAL_AAL2_NOT_FRESH");
  }

  const blockReasons = Object.freeze([...reasons].sort());
  const eligible = blockReasons.length === 0;
  return Object.freeze({
    verifierVersion: NCRV2_FORMAL_AUTHORITY_VERIFIER_VERSION,
    eligibleForAtomicConsumption: eligible,
    status: eligible
      ? "ELIGIBLE_FOR_SEPARATE_ATOMIC_CONSUMPTION"
      : "BLOCKED",
    blockReasons,
    tenantId: input.tenantId,
    evaluationScopeSha256: input.evaluationScopeSha256,
    evidenceCombinationReceiptId: evidence.receiptId,
    formalAuthorityReceiptId: authority.receiptId,
    humanAal2ReceiptId: authority.humanAal2ReceiptId,
    evaluatedAt: observedAt.toISOString(),
    expiresAt: input.expiresAt,
    formalRequirementCount: 0,
    authorityConsumed: false,
    formalActionPerformed: false,
    providerCalled: false,
    externalMutationPerformed: false,
  });
}

