import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/;
const MIGRATION_PATH = /^database\/migrations\/([0-9]{4})_[a-z0-9_]+\.sql$/;

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

function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export const REQUIRED_MIGRATION_EXECUTION_PHASES = [
  "AUTHORITY_AND_TARGET_PREFLIGHT",
  "QUIESCENCE_AND_SCHEMA_PREFLIGHT",
  "BACKUP_AND_RESTORE_PROOF",
  "SEQUENTIAL_MIGRATION_APPLY",
  "POST_APPLY_VERIFICATION",
  "ROLLBACK_READINESS_AND_RECOVERY",
] as const;

export const REQUIRED_POST_APPLY_CHECKS = [
  "MIGRATION_LEDGER_MATCH",
  "SCHEMA_DIGEST_MATCH",
  "RLS_POLICY_VERIFIED",
  "BOOKING_FINANCE_INVARIANTS_VERIFIED",
  "APPLICATION_READ_MODEL_SMOKE_VERIFIED",
] as const;

export type MigrationExecutionPhase =
  (typeof REQUIRED_MIGRATION_EXECUTION_PHASES)[number];
export type PostApplyCheck = (typeof REQUIRED_POST_APPLY_CHECKS)[number];
export type MigrationTransactionMode =
  | "SOURCE_TRANSACTION"
  | "EXECUTOR_SINGLE_MIGRATION_TRANSACTION";

export interface SequentialMigrationStep {
  sequence: number;
  path: string;
  dependsOnSequence: number | null;
  forwardSha256: string;
  preApplyVerificationSha256: string;
  postApplyVerificationSha256: string;
  rollbackPlanSha256: string;
  rollbackVerificationSha256: string;
  sourceTransactionWrapped: boolean;
  executionTransactionMode: MigrationTransactionMode;
  rollbackMode: "RESTORE_VERIFIED_BACKUP";
}

export interface SequentialMigrationExecutionPlanCore {
  schemaVersion: "crays.clubs.sequential-production-migration-plan.v1";
  planId: string;
  releaseCandidateSha256: string;
  targetRefSha256: string;
  expectedPreMigrationStateSha256: string;
  expectedPostMigrationStateSha256: string;
  preflightReceiptSha256: string;
  backupManifestSha256: string;
  backupRestoreVerificationReceiptSha256: string;
  rollbackRehearsalReceiptSha256: string;
  productionApplyAuthorized: boolean;
  productionExecutionAuthorityReceiptSha256: string | null;
  phases: readonly MigrationExecutionPhase[];
  migrations: readonly SequentialMigrationStep[];
  postApplyChecks: readonly PostApplyCheck[];
  rollbackOrder: readonly number[];
}

export interface SealedSequentialMigrationExecutionPlan
  extends SequentialMigrationExecutionPlanCore {
  executionPlanSha256: string;
}

function requireDigest(value: string, error: string): void {
  if (!SHA256.test(value)) throw new Error(error);
}

export function sealSequentialMigrationExecutionPlan(
  input: SequentialMigrationExecutionPlanCore,
): Readonly<SealedSequentialMigrationExecutionPlan> {
  if (!input.planId.trim()) throw new Error("MIGRATION_PLAN_ID_INVALID");
  for (const value of [
    input.releaseCandidateSha256,
    input.targetRefSha256,
    input.expectedPreMigrationStateSha256,
    input.expectedPostMigrationStateSha256,
    input.preflightReceiptSha256,
    input.backupManifestSha256,
    input.backupRestoreVerificationReceiptSha256,
    input.rollbackRehearsalReceiptSha256,
  ])
    requireDigest(value, "MIGRATION_PLAN_HEADER_DIGEST_INVALID");
  if (input.expectedPreMigrationStateSha256 === input.expectedPostMigrationStateSha256)
    throw new Error("MIGRATION_PLAN_NOOP_STATE_FORBIDDEN");
  if (input.productionApplyAuthorized) {
    if (
      input.productionExecutionAuthorityReceiptSha256 === null ||
      !SHA256.test(input.productionExecutionAuthorityReceiptSha256)
    )
      throw new Error("MIGRATION_PLAN_AUTHORITY_RECEIPT_REQUIRED");
  } else if (input.productionExecutionAuthorityReceiptSha256 !== null) {
    throw new Error("MIGRATION_PLAN_DORMANT_AUTHORITY_FORBIDDEN");
  }
  if (
    input.phases.join("|") !== REQUIRED_MIGRATION_EXECUTION_PHASES.join("|")
  )
    throw new Error("MIGRATION_PLAN_PHASE_ORDER_INVALID");
  if (input.postApplyChecks.join("|") !== REQUIRED_POST_APPLY_CHECKS.join("|"))
    throw new Error("MIGRATION_PLAN_POST_APPLY_CHECK_SET_INVALID");
  if (input.migrations.length === 0)
    throw new Error("MIGRATION_PLAN_EMPTY_CHAIN_FORBIDDEN");

  const paths = new Set<string>();
  const sequences = new Set<number>();
  for (const [index, migration] of input.migrations.entries()) {
    const match = MIGRATION_PATH.exec(migration.path);
    if (
      !match ||
      !Number.isInteger(migration.sequence) ||
      migration.sequence < 1 ||
      Number(match[1]) !== migration.sequence
    )
      throw new Error("MIGRATION_PLAN_IDENTITY_INVALID");
    if (paths.has(migration.path) || sequences.has(migration.sequence))
      throw new Error("MIGRATION_PLAN_DUPLICATE_MIGRATION");
    paths.add(migration.path);
    sequences.add(migration.sequence);
    if (index > 0 && migration.sequence <= input.migrations[index - 1].sequence)
      throw new Error("MIGRATION_PLAN_FORWARD_ORDER_INVALID");
    const expectedDependency = index === 0 ? null : input.migrations[index - 1].sequence;
    if (migration.dependsOnSequence !== expectedDependency)
      throw new Error("MIGRATION_PLAN_DEPENDENCY_CHAIN_INVALID");
    for (const value of [
      migration.forwardSha256,
      migration.preApplyVerificationSha256,
      migration.postApplyVerificationSha256,
      migration.rollbackPlanSha256,
      migration.rollbackVerificationSha256,
    ])
      requireDigest(value, "MIGRATION_PLAN_STEP_DIGEST_INVALID");
    const expectedTransactionMode: MigrationTransactionMode =
      migration.sourceTransactionWrapped
        ? "SOURCE_TRANSACTION"
        : "EXECUTOR_SINGLE_MIGRATION_TRANSACTION";
    if (migration.executionTransactionMode !== expectedTransactionMode)
      throw new Error("MIGRATION_PLAN_TRANSACTION_BOUNDARY_INVALID");
    if (migration.rollbackMode !== "RESTORE_VERIFIED_BACKUP")
      throw new Error("MIGRATION_PLAN_ROLLBACK_MODE_INVALID");
  }
  const expectedRollbackOrder = [...input.migrations]
    .reverse()
    .map((migration) => migration.sequence);
  if (input.rollbackOrder.join("|") !== expectedRollbackOrder.join("|"))
    throw new Error("MIGRATION_PLAN_ROLLBACK_ORDER_INVALID");

  const core = {
    ...input,
    phases: Object.freeze([...input.phases]),
    migrations: Object.freeze(
      input.migrations.map((migration) => Object.freeze({ ...migration })),
    ),
    postApplyChecks: Object.freeze([...input.postApplyChecks]),
    rollbackOrder: Object.freeze([...input.rollbackOrder]),
  };
  return Object.freeze({ ...core, executionPlanSha256: hash(core) });
}

export type MigrationExecutionReadinessFailure =
  | "MIGRATION_PLAN_HASH_MISMATCH"
  | "TARGET_REF_MISMATCH"
  | "PRE_MIGRATION_STATE_MISMATCH"
  | "PREFLIGHT_RECEIPT_MISMATCH"
  | "BACKUP_MANIFEST_MISMATCH"
  | "BACKUP_RESTORE_PROOF_MISMATCH"
  | "ROLLBACK_REHEARSAL_PROOF_MISMATCH"
  | "PRODUCTION_AUTHORITY_MISSING"
  | "PRODUCTION_AUTHORITY_MISMATCH"
  | "PHASE_RECEIPT_ORDER_INVALID"
  | "PHASE_RECEIPT_INVALID"
  | "OFFLINE_DATABASE_MUTATION_FORBIDDEN"
  | "OFFLINE_EXTERNAL_MUTATION_FORBIDDEN";

export interface MigrationExecutionReadinessInput {
  plan: SealedSequentialMigrationExecutionPlan;
  observedTargetRefSha256: string;
  observedPreMigrationStateSha256: string;
  observedPreflightReceiptSha256: string;
  observedBackupManifestSha256: string;
  observedBackupRestoreVerificationReceiptSha256: string;
  observedRollbackRehearsalReceiptSha256: string;
  observedProductionExecutionAuthorityReceiptSha256: string | null;
  phaseReceipts: readonly {
    phase: MigrationExecutionPhase;
    receiptSha256: string;
  }[];
  databaseMutationPerformed: boolean;
  externalMutationPerformed: boolean;
}

export function assessSequentialMigrationExecutionReadiness(
  input: MigrationExecutionReadinessInput,
): Readonly<{
  planValid: boolean;
  readyForExecution: boolean;
  failures: readonly MigrationExecutionReadinessFailure[];
  readinessReceiptSha256: string;
}> {
  const failures: MigrationExecutionReadinessFailure[] = [];
  const { executionPlanSha256, ...core } = input.plan;
  const planValid = hash(core) === executionPlanSha256;
  if (!planValid) failures.push("MIGRATION_PLAN_HASH_MISMATCH");
  if (input.observedTargetRefSha256 !== input.plan.targetRefSha256)
    failures.push("TARGET_REF_MISMATCH");
  if (
    input.observedPreMigrationStateSha256 !==
    input.plan.expectedPreMigrationStateSha256
  )
    failures.push("PRE_MIGRATION_STATE_MISMATCH");
  if (input.observedPreflightReceiptSha256 !== input.plan.preflightReceiptSha256)
    failures.push("PREFLIGHT_RECEIPT_MISMATCH");
  if (input.observedBackupManifestSha256 !== input.plan.backupManifestSha256)
    failures.push("BACKUP_MANIFEST_MISMATCH");
  if (
    input.observedBackupRestoreVerificationReceiptSha256 !==
    input.plan.backupRestoreVerificationReceiptSha256
  )
    failures.push("BACKUP_RESTORE_PROOF_MISMATCH");
  if (
    input.observedRollbackRehearsalReceiptSha256 !==
    input.plan.rollbackRehearsalReceiptSha256
  )
    failures.push("ROLLBACK_REHEARSAL_PROOF_MISMATCH");
  if (
    !input.plan.productionApplyAuthorized ||
    input.plan.productionExecutionAuthorityReceiptSha256 === null
  ) {
    failures.push("PRODUCTION_AUTHORITY_MISSING");
  } else if (
    input.observedProductionExecutionAuthorityReceiptSha256 !==
    input.plan.productionExecutionAuthorityReceiptSha256
  ) {
    failures.push("PRODUCTION_AUTHORITY_MISMATCH");
  }
  if (
    input.phaseReceipts.map((item) => item.phase).join("|") !==
    REQUIRED_MIGRATION_EXECUTION_PHASES.join("|")
  )
    failures.push("PHASE_RECEIPT_ORDER_INVALID");
  if (input.phaseReceipts.some((item) => !SHA256.test(item.receiptSha256)))
    failures.push("PHASE_RECEIPT_INVALID");
  if (input.databaseMutationPerformed)
    failures.push("OFFLINE_DATABASE_MUTATION_FORBIDDEN");
  if (input.externalMutationPerformed)
    failures.push("OFFLINE_EXTERNAL_MUTATION_FORBIDDEN");

  const receiptCore = {
    executionPlanSha256,
    observedTargetRefSha256: input.observedTargetRefSha256,
    observedPreMigrationStateSha256: input.observedPreMigrationStateSha256,
    phaseReceipts: input.phaseReceipts,
    databaseMutationPerformed: input.databaseMutationPerformed,
    externalMutationPerformed: input.externalMutationPerformed,
    failures: [...failures].sort(),
  };
  return Object.freeze({
    planValid,
    readyForExecution: failures.length === 0,
    failures: Object.freeze(failures),
    readinessReceiptSha256: hash(receiptCore),
  });
}

export function verifySealedSequentialMigrationExecutionPlan(
  plan: SealedSequentialMigrationExecutionPlan,
): boolean {
  const { executionPlanSha256, ...core } = plan;
  return hash(core) === executionPlanSha256;
}
