import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export const PRODUCTION_NORTH_STAR_EDGE_SPECS = {
  CCLUB_117: {
    roadmapBlock: "CCLUB-117",
    schemaVersion: "crays.clubs.production-smoke-execution-plan.v1",
    phases: [
      "AUTHORITY_AND_RELEASE_PREFLIGHT",
      "PUBLIC_NETWORK_AND_TLS_SMOKE",
      "DATABASE_MIGRATION_LEDGER_SMOKE",
      "BACKEND_HEALTH_AND_READ_MODEL_SMOKE",
      "WORKER_AND_LEASE_RECOVERY_SMOKE",
      "PROVIDER_READ_ONLY_CORRELATION_SMOKE",
      "ROLLBACK_TRIGGER_VERIFICATION",
    ],
    evidenceKinds: [
      "RELEASE_CANDIDATE",
      "MIGRATION_APPLY_RECEIPT",
      "REVERSE_PROXY_TLS_RECEIPT",
      "AUTH0_ALLOWLIST_RECEIPT",
      "BACKEND_HEALTH_CONTRACT",
      "WORKER_LEASE_RECOVERY_RECEIPT",
      "ROLLBACK_REHEARSAL_RECEIPT",
    ],
  },
  CCLUB_118: {
    roadmapBlock: "CCLUB-118",
    schemaVersion: "crays.clubs.production-checks-plan.v1",
    phases: [
      "SOURCE_AND_RELEASE_IDENTITY_CHECKS",
      "SECURITY_AND_TENANT_ISOLATION_CHECKS",
      "BOOKING_AND_PRICING_INVARIANT_CHECKS",
      "PAYMENT_PROVIDER_AND_ERP_CORRELATION_CHECKS",
      "WORKER_OBSERVABILITY_AND_RECOVERY_CHECKS",
      "UI_EXTERNAL_EVIDENCE_REFERENCE_CHECKS",
      "PRODUCTION_CHECKS_SIGNOFF",
    ],
    evidenceKinds: [
      "PRODUCTION_SMOKE_RECEIPT",
      "SECURITY_TENANT_ISOLATION_RECEIPT",
      "BOOKING_PRICING_INVARIANT_RECEIPT",
      "PAYMENT_PROVIDER_CORRELATION_RECEIPT",
      "ERP_CORRELATION_RECEIPT",
      "WORKER_OBSERVABILITY_RECEIPT",
      "UI_VERCEL_EXTERNAL_RECEIPT",
    ],
  },
  CCLUB_119: {
    roadmapBlock: "CCLUB-119",
    schemaVersion: "crays.clubs.destructive-retirement-plan.v1",
    phases: [
      "DESTRUCTIVE_AUTHORITY_PREFLIGHT",
      "BACKUP_RESTORE_AND_ROLLBACK_PROOF",
      "TRAFFIC_DRAIN_AND_WRITE_QUIESCENCE",
      "LEGACY_TARGET_IDENTITY_CONFIRMATION",
      "BOUNDED_DESTRUCTIVE_RETIREMENT",
      "POST_RETIREMENT_OBSERVABILITY",
      "RECOVERY_OR_FINALIZE_DECISION",
    ],
    evidenceKinds: [
      "PRODUCTION_CHECKS_RECEIPT",
      "BACKUP_RESTORE_RECEIPT",
      "ROLLBACK_REHEARSAL_RECEIPT",
      "TRAFFIC_DRAIN_RECEIPT",
      "WRITE_QUIESCENCE_RECEIPT",
      "LEGACY_TARGET_INVENTORY_RECEIPT",
      "POST_RETIREMENT_OBSERVABILITY_CONTRACT",
    ],
  },
  CCLUB_120: {
    roadmapBlock: "CCLUB-120",
    schemaVersion: "crays.clubs.final-parity-gate-plan.v1",
    phases: [
      "TECHNICAL_EDGE_CHAIN_VERIFICATION",
      "UI_AND_EXTERNAL_EDGE_VERIFICATION",
      "PRODUCTION_EXECUTION_RECEIPT_VERIFICATION",
      "DESTRUCTIVE_RETIREMENT_RECEIPT_VERIFICATION",
      "NCRV2_ALL_OR_NOTHING_VERIFICATION",
      "FORMAL_AUTHORITY_VERIFICATION",
      "FINAL_PARITY_DECISION",
    ],
    evidenceKinds: [
      "CCLUB_101_TO_115_TECHNICAL_CHAIN",
      "CCLUB_116_UI_VERCEL_RECEIPT",
      "CCLUB_117_PRODUCTION_SMOKE_RECEIPT",
      "CCLUB_118_PRODUCTION_CHECKS_RECEIPT",
      "CCLUB_119_RETIREMENT_RECEIPT",
      "NCRV2_130_COMBINED_14_OF_14_RECEIPT",
      "FORMAL_APPLY_AUTHORITY_RECEIPT",
    ],
  },
} as const;

export type ProductionNorthStarEdge = keyof typeof PRODUCTION_NORTH_STAR_EDGE_SPECS;

export interface ProductionNorthStarEvidenceRequirement {
  kind: string;
  receiptSha256: string | null;
}

export interface ProductionNorthStarPlanCore {
  schemaVersion: string;
  edge: ProductionNorthStarEdge;
  planId: string;
  releaseCandidateSha256: string;
  targetRefSha256: string;
  rollbackPlanSha256: string;
  releaseCandidateFrozen: boolean;
  executionAuthorized: boolean;
  executionAuthorityReceiptSha256: string | null;
  destructiveActionAuthorized: boolean;
  destructiveAuthorityReceiptSha256: string | null;
  formalActionAuthorized: boolean;
  formalAuthorityReceiptSha256: string | null;
  phases: readonly string[];
  evidence: readonly ProductionNorthStarEvidenceRequirement[];
}

export interface SealedProductionNorthStarPlan extends ProductionNorthStarPlanCore {
  planSha256: string;
}

function requireDigest(value: string, code: string): void {
  if (!SHA256.test(value)) throw new Error(code);
}

function requireAuthorityPair(enabled: boolean, receiptSha256: string | null, code: string): void {
  if (enabled !== (receiptSha256 !== null)) throw new Error(code);
  if (receiptSha256 !== null) requireDigest(receiptSha256, code);
}

export function sealProductionNorthStarPlan(
  input: ProductionNorthStarPlanCore,
): Readonly<SealedProductionNorthStarPlan> {
  const spec = PRODUCTION_NORTH_STAR_EDGE_SPECS[input.edge];
  if (!spec || input.schemaVersion !== spec.schemaVersion)
    throw new Error("PRODUCTION_NORTH_STAR_SCHEMA_EDGE_MISMATCH");
  if (!input.planId.trim()) throw new Error("PRODUCTION_NORTH_STAR_PLAN_ID_INVALID");
  requireDigest(input.releaseCandidateSha256, "PRODUCTION_NORTH_STAR_RELEASE_DIGEST_INVALID");
  requireDigest(input.targetRefSha256, "PRODUCTION_NORTH_STAR_TARGET_DIGEST_INVALID");
  requireDigest(input.rollbackPlanSha256, "PRODUCTION_NORTH_STAR_ROLLBACK_DIGEST_INVALID");
  requireAuthorityPair(
    input.executionAuthorized,
    input.executionAuthorityReceiptSha256,
    "PRODUCTION_NORTH_STAR_EXECUTION_AUTHORITY_PAIR_INVALID",
  );
  requireAuthorityPair(
    input.destructiveActionAuthorized,
    input.destructiveAuthorityReceiptSha256,
    "PRODUCTION_NORTH_STAR_DESTRUCTIVE_AUTHORITY_PAIR_INVALID",
  );
  requireAuthorityPair(
    input.formalActionAuthorized,
    input.formalAuthorityReceiptSha256,
    "PRODUCTION_NORTH_STAR_FORMAL_AUTHORITY_PAIR_INVALID",
  );
  if (input.phases.join("|") !== spec.phases.join("|"))
    throw new Error("PRODUCTION_NORTH_STAR_PHASE_ORDER_INVALID");
  if (input.evidence.map((item) => item.kind).join("|") !== spec.evidenceKinds.join("|"))
    throw new Error("PRODUCTION_NORTH_STAR_EVIDENCE_ORDER_INVALID");
  if (new Set(input.evidence.map((item) => item.kind)).size !== input.evidence.length)
    throw new Error("PRODUCTION_NORTH_STAR_EVIDENCE_DUPLICATE");
  for (const item of input.evidence) {
    if (item.receiptSha256 !== null)
      requireDigest(item.receiptSha256, "PRODUCTION_NORTH_STAR_EVIDENCE_DIGEST_INVALID");
  }
  if (input.executionAuthorized) {
    if (!input.releaseCandidateFrozen)
      throw new Error("PRODUCTION_NORTH_STAR_AUTHORIZED_RELEASE_NOT_FROZEN");
    if (input.evidence.some((item) => item.receiptSha256 === null))
      throw new Error("PRODUCTION_NORTH_STAR_AUTHORIZED_EVIDENCE_INCOMPLETE");
  }
  if (input.edge === "CCLUB_119") {
    if (input.destructiveActionAuthorized !== input.executionAuthorized)
      throw new Error("PRODUCTION_NORTH_STAR_RETIREMENT_AUTHORITY_INCOMPLETE");
  } else if (input.destructiveActionAuthorized || input.destructiveAuthorityReceiptSha256 !== null) {
    throw new Error("PRODUCTION_NORTH_STAR_DESTRUCTIVE_AUTHORITY_OUT_OF_SCOPE");
  }
  if (input.edge === "CCLUB_120") {
    if (input.formalActionAuthorized !== input.executionAuthorized)
      throw new Error("PRODUCTION_NORTH_STAR_FORMAL_AUTHORITY_INCOMPLETE");
  } else if (input.formalActionAuthorized || input.formalAuthorityReceiptSha256 !== null) {
    throw new Error("PRODUCTION_NORTH_STAR_FORMAL_AUTHORITY_OUT_OF_SCOPE");
  }
  const core = {
    ...input,
    phases: Object.freeze([...input.phases]),
    evidence: Object.freeze(input.evidence.map((item) => Object.freeze({ ...item }))),
  };
  return Object.freeze({ ...core, planSha256: digest(core) });
}

export interface ProductionNorthStarReadinessInput {
  plan: SealedProductionNorthStarPlan;
  observedReleaseCandidateSha256: string;
  observedTargetRefSha256: string;
  observedReleaseCandidateFrozen: boolean;
  observedExecutionAuthorityReceiptSha256: string | null;
  observedDestructiveAuthorityReceiptSha256: string | null;
  observedFormalAuthorityReceiptSha256: string | null;
  observedEvidence: readonly ProductionNorthStarEvidenceRequirement[];
  phaseReceipts: readonly { phase: string; receiptSha256: string }[];
  productionMutationPerformed: boolean;
  databaseMutationPerformed: boolean;
  externalMutationPerformed: boolean;
  uiMutationPerformed: boolean;
  destructiveMutationPerformed: boolean;
  formalMutationPerformed: boolean;
}

export function assessProductionNorthStarReadiness(
  input: ProductionNorthStarReadinessInput,
): Readonly<{
  planValid: boolean;
  readyForExecution: boolean;
  failures: readonly string[];
  readinessReceiptSha256: string;
}> {
  const spec = PRODUCTION_NORTH_STAR_EDGE_SPECS[input.plan.edge];
  const { planSha256, ...core } = input.plan;
  const planValid = digest(core) === planSha256;
  const failures: string[] = [];
  if (!planValid) failures.push("PLAN_HASH_MISMATCH");
  if (input.observedReleaseCandidateSha256 !== input.plan.releaseCandidateSha256)
    failures.push("RELEASE_CANDIDATE_MISMATCH");
  if (input.observedTargetRefSha256 !== input.plan.targetRefSha256)
    failures.push("TARGET_REF_MISMATCH");
  if (!input.plan.releaseCandidateFrozen || !input.observedReleaseCandidateFrozen)
    failures.push("RELEASE_CANDIDATE_NOT_FROZEN");
  if (!input.plan.executionAuthorized || input.plan.executionAuthorityReceiptSha256 === null) {
    failures.push("EXECUTION_AUTHORITY_MISSING");
  } else if (
    input.observedExecutionAuthorityReceiptSha256 !==
    input.plan.executionAuthorityReceiptSha256
  ) {
    failures.push("EXECUTION_AUTHORITY_MISMATCH");
  }
  if (input.plan.edge === "CCLUB_119") {
    if (!input.plan.destructiveActionAuthorized || input.plan.destructiveAuthorityReceiptSha256 === null)
      failures.push("DESTRUCTIVE_AUTHORITY_MISSING");
    else if (
      input.observedDestructiveAuthorityReceiptSha256 !==
      input.plan.destructiveAuthorityReceiptSha256
    )
      failures.push("DESTRUCTIVE_AUTHORITY_MISMATCH");
  }
  if (input.plan.edge === "CCLUB_120") {
    if (!input.plan.formalActionAuthorized || input.plan.formalAuthorityReceiptSha256 === null)
      failures.push("FORMAL_AUTHORITY_MISSING");
    else if (input.observedFormalAuthorityReceiptSha256 !== input.plan.formalAuthorityReceiptSha256)
      failures.push("FORMAL_AUTHORITY_MISMATCH");
  }
  if (input.observedEvidence.map((item) => item.kind).join("|") !== spec.evidenceKinds.join("|")) {
    failures.push("OBSERVED_EVIDENCE_ORDER_INVALID");
  } else {
    for (const [index, planned] of input.plan.evidence.entries()) {
      const observed = input.observedEvidence[index];
      if (planned.receiptSha256 === null || observed.receiptSha256 === null)
        failures.push(`REAL_EVIDENCE_MISSING:${planned.kind}`);
      else if (observed.receiptSha256 !== planned.receiptSha256)
        failures.push(`EVIDENCE_MISMATCH:${planned.kind}`);
    }
  }
  if (input.phaseReceipts.map((item) => item.phase).join("|") !== spec.phases.join("|"))
    failures.push("PHASE_RECEIPT_ORDER_INVALID");
  if (input.phaseReceipts.some((item) => !SHA256.test(item.receiptSha256)))
    failures.push("PHASE_RECEIPT_DIGEST_INVALID");
  for (const [performed, code] of [
    [input.productionMutationPerformed, "OFFLINE_PRODUCTION_MUTATION_FORBIDDEN"],
    [input.databaseMutationPerformed, "OFFLINE_DATABASE_MUTATION_FORBIDDEN"],
    [input.externalMutationPerformed, "OFFLINE_EXTERNAL_MUTATION_FORBIDDEN"],
    [input.uiMutationPerformed, "OFFLINE_UI_MUTATION_FORBIDDEN"],
    [input.destructiveMutationPerformed, "OFFLINE_DESTRUCTIVE_MUTATION_FORBIDDEN"],
    [input.formalMutationPerformed, "OFFLINE_FORMAL_MUTATION_FORBIDDEN"],
  ] as const) {
    if (performed) failures.push(code);
  }
  return Object.freeze({
    planValid,
    readyForExecution: failures.length === 0,
    failures: Object.freeze(failures),
    readinessReceiptSha256: digest({
      planSha256,
      observedReleaseCandidateSha256: input.observedReleaseCandidateSha256,
      observedTargetRefSha256: input.observedTargetRefSha256,
      observedEvidence: input.observedEvidence,
      phaseReceipts: input.phaseReceipts,
      failures: [...failures].sort(),
    }),
  });
}

export function verifySealedProductionNorthStarPlan(
  plan: SealedProductionNorthStarPlan,
): boolean {
  const { planSha256, ...core } = plan;
  return digest(core) === planSha256;
}
