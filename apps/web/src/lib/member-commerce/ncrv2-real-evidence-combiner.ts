import "server-only";

export const NCRV2_REAL_EVIDENCE_COMBINER_VERSION = 1 as const;
export const NCRV2_REAL_EVIDENCE_REQUIRED_COUNT = 14 as const;
export const NCRV2_REAL_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const NCRV2_REAL_EVIDENCE_GATE_MAX_TTL_MS = 2 * 60 * 1000;
export const NCRV2_REAL_EVIDENCE_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type Ncrv2RealEvidenceBlockReason =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "GATE_WINDOW_INVALID"
  | "REGISTRY_NOT_CANONICAL"
  | "REGISTRY_SCOPE_MISMATCH"
  | "REGISTRY_WINDOW_INVALID"
  | "REGISTRY_REQUIREMENT_COUNT_NOT_FOURTEEN"
  | "REGISTRY_REQUIREMENT_DUPLICATE"
  | "EVIDENCE_COUNT_NOT_FOURTEEN"
  | "EVIDENCE_REQUIREMENT_UNKNOWN"
  | "EVIDENCE_REQUIREMENT_DUPLICATE"
  | "EVIDENCE_RECEIPT_DUPLICATE"
  | "EVIDENCE_HASH_DUPLICATE"
  | "EVIDENCE_SCOPE_MISMATCH"
  | "EVIDENCE_NOT_REAL"
  | "EVIDENCE_NOT_PASS"
  | "EVIDENCE_STALE"
  | "EVIDENCE_MISSING";

export interface CanonicalNcrv2RequirementRegistryReceipt {
  registryReceiptId: string;
  registryReceiptSha256: string;
  persisted: boolean;
  authorityClass: string;
  tenantId: string;
  evaluationScopeSha256: string;
  registryVersion: number;
  lifecycleState: string;
  requirementKeys: readonly string[];
  validFrom: string;
  validUntil: string;
}

export interface Ncrv2RealRequirementEvidence {
  requirementKey: string;
  receiptId: string;
  receiptSha256: string;
  persisted: boolean;
  synthetic: boolean;
  evidenceClass: string;
  sourceAuthority: string;
  tenantId: string;
  evaluationScopeSha256: string;
  status: string;
  observedAt: string;
  expiresAt: string;
}

export interface EvaluateNcrv2RealEvidenceInput {
  tenantId: string;
  evaluationScopeSha256: string;
  requestedAt: string;
  expiresAt: string;
  registry: CanonicalNcrv2RequirementRegistryReceipt;
  evidence: readonly Ncrv2RealRequirementEvidence[];
}

export interface Ncrv2RealEvidenceDecision {
  combinerVersion: typeof NCRV2_REAL_EVIDENCE_COMBINER_VERSION;
  realEvidenceComplete: boolean;
  status:
    | "REAL_EVIDENCE_COMPLETE_AWAITING_SEPARATE_FORMAL_AUTHORITY"
    | "BLOCKED";
  blockReasons: readonly Ncrv2RealEvidenceBlockReason[];
  tenantId: string;
  evaluationScopeSha256: string;
  registryReceiptId: string;
  registryVersion: number;
  canonicalRequirementKeys: readonly string[];
  evidenceReceiptIds: readonly string[];
  evaluatedAt: string;
  expiresAt: string;
  evaluatedEvidenceSlots: number;
  formalRequirementCount: 0;
  formalActionAuthorized: false;
  providerCalled: false;
  externalMutationPerformed: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const REAL_CLASSES = new Set([
  "REAL_INTERNAL",
  "REAL_EXTERNAL",
  "REAL_HUMAN",
]);

export function evaluateNcrv2RealEvidence(
  input: EvaluateNcrv2RealEvidenceInput,
  observedAt: Date = new Date(),
): Readonly<Ncrv2RealEvidenceDecision> {
  const reasons = new Set<Ncrv2RealEvidenceBlockReason>();
  const add = (reason: Ncrv2RealEvidenceBlockReason) => reasons.add(reason);
  const nowMs = observedAt.getTime();
  const text = (value: string) =>
    typeof value === "string" && value.trim() !== "";
  const hash = (value: string) => SHA256_PATTERN.test(value);
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
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
    requestedAt.getTime() > nowMs + NCRV2_REAL_EVIDENCE_MAX_CLOCK_SKEW_MS ||
    gateExpiresAt.getTime() <= nowMs ||
    gateExpiresAt.getTime() <= requestedAt.getTime() ||
    gateExpiresAt.getTime() - nowMs > NCRV2_REAL_EVIDENCE_GATE_MAX_TTL_MS
  ) {
    add("GATE_WINDOW_INVALID");
  }

  const registry = input.registry;
  if (
    registry.persisted !== true ||
    registry.authorityClass !== "CANONICAL_NCRV2_130_REGISTRY" ||
    registry.lifecycleState !== "ACTIVE" ||
    !text(registry.registryReceiptId) ||
    !hash(registry.registryReceiptSha256) ||
    !Number.isInteger(registry.registryVersion) ||
    registry.registryVersion < 1
  ) {
    add("REGISTRY_NOT_CANONICAL");
  }
  if (
    registry.tenantId !== input.tenantId ||
    registry.evaluationScopeSha256 !== input.evaluationScopeSha256
  ) {
    add("REGISTRY_SCOPE_MISMATCH");
  }
  const registryValidFrom = date(registry.validFrom);
  const registryValidUntil = date(registry.validUntil);
  if (
    !registryValidFrom ||
    !registryValidUntil ||
    registryValidFrom.getTime() > nowMs ||
    registryValidUntil.getTime() <= nowMs ||
    (gateExpiresAt && registryValidUntil.getTime() < gateExpiresAt.getTime())
  ) {
    add("REGISTRY_WINDOW_INVALID");
  }

  const canonicalKeys = registry.requirementKeys;
  if (canonicalKeys.length !== NCRV2_REAL_EVIDENCE_REQUIRED_COUNT) {
    add("REGISTRY_REQUIREMENT_COUNT_NOT_FOURTEEN");
  }
  const keySet = new Set<string>();
  for (const key of canonicalKeys) {
    if (!text(key) || keySet.has(key)) {
      add("REGISTRY_REQUIREMENT_DUPLICATE");
    }
    keySet.add(key);
  }

  if (input.evidence.length !== NCRV2_REAL_EVIDENCE_REQUIRED_COUNT) {
    add("EVIDENCE_COUNT_NOT_FOURTEEN");
  }
  const evidenceKeys = new Set<string>();
  const receiptIds = new Set<string>();
  const receiptHashes = new Set<string>();
  const evidenceReceiptIds: string[] = [];

  for (const evidence of input.evidence) {
    evidenceReceiptIds.push(evidence.receiptId);
    if (!keySet.has(evidence.requirementKey)) {
      add("EVIDENCE_REQUIREMENT_UNKNOWN");
    }
    if (evidenceKeys.has(evidence.requirementKey)) {
      add("EVIDENCE_REQUIREMENT_DUPLICATE");
    }
    evidenceKeys.add(evidence.requirementKey);

    if (!text(evidence.receiptId) || receiptIds.has(evidence.receiptId)) {
      add("EVIDENCE_RECEIPT_DUPLICATE");
    }
    receiptIds.add(evidence.receiptId);
    if (!hash(evidence.receiptSha256)) {
      add("INVALID_HASH");
    } else if (receiptHashes.has(evidence.receiptSha256)) {
      add("EVIDENCE_HASH_DUPLICATE");
    }
    receiptHashes.add(evidence.receiptSha256);

    if (
      evidence.tenantId !== input.tenantId ||
      evidence.evaluationScopeSha256 !== input.evaluationScopeSha256
    ) {
      add("EVIDENCE_SCOPE_MISMATCH");
    }
    if (
      evidence.persisted !== true ||
      evidence.synthetic !== false ||
      !REAL_CLASSES.has(evidence.evidenceClass) ||
      !text(evidence.sourceAuthority)
    ) {
      add("EVIDENCE_NOT_REAL");
    }
    if (evidence.status !== "PASS") {
      add("EVIDENCE_NOT_PASS");
    }
    const observed = date(evidence.observedAt);
    const expires = date(evidence.expiresAt);
    if (
      !observed ||
      !expires ||
      observed.getTime() > nowMs + NCRV2_REAL_EVIDENCE_MAX_CLOCK_SKEW_MS ||
      nowMs - observed.getTime() > NCRV2_REAL_EVIDENCE_MAX_AGE_MS ||
      expires.getTime() <= nowMs ||
      (gateExpiresAt && expires.getTime() < gateExpiresAt.getTime())
    ) {
      add("EVIDENCE_STALE");
    }
  }

  for (const canonicalKey of canonicalKeys) {
    if (!evidenceKeys.has(canonicalKey)) {
      add("EVIDENCE_MISSING");
    }
  }

  const blockReasons = Object.freeze([...reasons].sort());
  const complete = blockReasons.length === 0;
  return Object.freeze({
    combinerVersion: NCRV2_REAL_EVIDENCE_COMBINER_VERSION,
    realEvidenceComplete: complete,
    status: complete
      ? "REAL_EVIDENCE_COMPLETE_AWAITING_SEPARATE_FORMAL_AUTHORITY"
      : "BLOCKED",
    blockReasons,
    tenantId: input.tenantId,
    evaluationScopeSha256: input.evaluationScopeSha256,
    registryReceiptId: registry.registryReceiptId,
    registryVersion: registry.registryVersion,
    canonicalRequirementKeys: Object.freeze([...canonicalKeys]),
    evidenceReceiptIds: Object.freeze(evidenceReceiptIds),
    evaluatedAt: observedAt.toISOString(),
    expiresAt: input.expiresAt,
    evaluatedEvidenceSlots: input.evidence.length,
    formalRequirementCount: 0,
    formalActionAuthorized: false,
    providerCalled: false,
    externalMutationPerformed: false,
  });
}

