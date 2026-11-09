import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/;
const TARGET_ID = /^[a-z0-9][a-z0-9._:-]{2,255}$/;
const DISALLOWED_PRODUCTION_MARKER =
  /(^|[-_.:])(dev|test|preview|staging|sandbox|training|candidate|local)([-_.:]|$)/i;

export const REQUIRED_PRODUCTION_POSTGRES_MAJOR = 16;
export const REQUIRED_PRODUCTION_POSTGRES_PORT = 5432;
export const MAX_PRODUCTION_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
export const REQUIRED_PRODUCTION_MIGRATION_RANGE = Object.freeze({
  latestAppliedBeforeRelease: 166,
  first: 167,
  last: 223,
  count: 57,
});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function validSha256(value: string): boolean {
  return SHA256.test(value);
}

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function requireSha256(value: string, code: string): void {
  if (!validSha256(value)) throw new Error(code);
}

function requireRef(value: string, code: string): void {
  if (!value.trim() || value.length > 256) throw new Error(code);
}

export type ProductionDatabaseEnvironment =
  | "PRODUCTION"
  | "NON_PRODUCTION"
  | "UNKNOWN";

export type ProductionDatabaseProvider =
  | "NEON_POSTGRES"
  | "MANAGED_POSTGRES"
  | "SELF_HOSTED_POSTGRES"
  | "UNKNOWN";

export type ProductionCredentialSourceKind =
  | "SECRET_MANAGER"
  | "RUNTIME_INJECTION"
  | "PROVIDER_INTEGRATION"
  | "UNKNOWN";

export type ProductionTlsMode =
  | "VERIFY_FULL"
  | "REQUIRE"
  | "PREFER"
  | "DISABLED"
  | "UNKNOWN";

export interface ProductionDatabaseTargetCore {
  schemaVersion: "crays.clubs.production-database-target.v1";
  targetId: string;
  environment: ProductionDatabaseEnvironment;
  provider: ProductionDatabaseProvider;
  organizationRef: string;
  projectRef: string;
  branchRef: string;
  databaseName: string;
  hostIdentitySha256: string;
  port: number;
  tlsMode: ProductionTlsMode;
  postgresMajor: number;
  credentialSourceKind: ProductionCredentialSourceKind;
  credentialSourceReceiptSha256: string;
  ownershipReceiptSha256: string;
  connectionProofReceiptSha256: string;
}

export interface SealedProductionDatabaseTarget
  extends ProductionDatabaseTargetCore {
  targetRefSha256: string;
}

export function sealProductionDatabaseTarget(
  input: ProductionDatabaseTargetCore,
): Readonly<SealedProductionDatabaseTarget> {
  if (
    input.schemaVersion !== "crays.clubs.production-database-target.v1" ||
    !TARGET_ID.test(input.targetId)
  )
    throw new Error("PRODUCTION_TARGET_SHAPE_INVALID");
  if (
    !["PRODUCTION", "NON_PRODUCTION", "UNKNOWN"].includes(input.environment) ||
    ![
      "NEON_POSTGRES",
      "MANAGED_POSTGRES",
      "SELF_HOSTED_POSTGRES",
      "UNKNOWN",
    ].includes(input.provider) ||
    ![
      "SECRET_MANAGER",
      "RUNTIME_INJECTION",
      "PROVIDER_INTEGRATION",
      "UNKNOWN",
    ].includes(input.credentialSourceKind) ||
    !["VERIFY_FULL", "REQUIRE", "PREFER", "DISABLED", "UNKNOWN"].includes(
      input.tlsMode,
    )
  )
    throw new Error("PRODUCTION_TARGET_ENUM_INVALID");
  for (const value of [
    input.organizationRef,
    input.projectRef,
    input.branchRef,
    input.databaseName,
  ])
    requireRef(value, "PRODUCTION_TARGET_IDENTITY_INVALID");
  if (
    !Number.isInteger(input.port) ||
    input.port < 0 ||
    input.port > 65535 ||
    !Number.isInteger(input.postgresMajor) ||
    input.postgresMajor < 0 ||
    input.postgresMajor > 99
  )
    throw new Error("PRODUCTION_TARGET_RUNTIME_INVALID");
  for (const value of [
    input.hostIdentitySha256,
    input.credentialSourceReceiptSha256,
    input.ownershipReceiptSha256,
    input.connectionProofReceiptSha256,
  ])
    requireSha256(value, "PRODUCTION_TARGET_RECEIPT_INVALID");

  const core = Object.freeze({ ...input });
  return Object.freeze({ ...core, targetRefSha256: digest(core) });
}

export function verifySealedProductionDatabaseTarget(
  target: SealedProductionDatabaseTarget,
): boolean {
  const { targetRefSha256, ...core } = target;
  return validSha256(targetRefSha256) && digest(core) === targetRefSha256;
}

export interface ProductionReleaseAdmissionBinding {
  releaseCandidateSha256: string;
  observedReleaseCandidateSha256: string;
  releaseCandidateFrozen: boolean;
  immutableBundleMode: "0400" | "OTHER";
  sequentialExecutionPlanSha256: string;
  sequentialPlanTargetRefSha256: string;
  sequentialPlanReleaseCandidateSha256: string;
  sequentialReadinessReceiptSha256: string;
  sequentialReadyForExecution: boolean;
  expectedPreMigrationStateSha256: string;
}

export interface ProductionBaselineAdmissionEvidence {
  latestAppliedMigration: number | null;
  pendingFirstMigration: number | null;
  pendingLastMigration: number | null;
  pendingMigrationCount: number;
  migrationLedgerReceiptSha256: string;
  schemaDigestReceiptSha256: string;
  observedPreMigrationStateSha256: string;
}

export interface ProductionBackupAdmissionEvidence {
  backupManifestSha256: string;
  databaseBackupSha256: string;
  backupTargetRefSha256: string;
  createdAt: string;
  restoreVerificationReceiptSha256: string;
  restoreVerifiedAt: string;
  restoreTargetIsolated: boolean;
  restorePassed: boolean;
}

export interface ProductionExecutionAuthority {
  executionAuthorized: boolean;
  executionAuthorityReceiptSha256: string;
  approvalReceiptSha256: string;
  authorizedTargetRefSha256: string;
  authorizedReleaseCandidateSha256: string;
  authorizedSequentialPlanSha256: string;
  migrationFirst: number;
  migrationLast: number;
  issuedAt: string;
  validUntil: string;
  oneShotNonceSha256: string;
  oneShotNonceConsumed: boolean;
}

export interface ProductionTargetObservation {
  observedTargetRefSha256: string;
  observedProvider: ProductionDatabaseProvider;
  observedOrganizationRef: string;
  observedProjectRef: string;
  observedBranchRef: string;
  observedDatabaseName: string;
  observedHostIdentitySha256: string;
  observedPort: number;
  observedTlsMode: ProductionTlsMode;
  observedPostgresMajor: number;
  observedCredentialSourceKind: ProductionCredentialSourceKind;
  observedCredentialSourceReceiptSha256: string;
  observedOwnershipReceiptSha256: string;
  observedConnectionProofReceiptSha256: string;
  connectionSucceeded: boolean;
  preflightReadOnly: boolean;
  writeProbePerformed: boolean;
}

export interface ProductionMigrationAdmissionInput {
  target: SealedProductionDatabaseTarget;
  observation: ProductionTargetObservation;
  release: ProductionReleaseAdmissionBinding;
  baseline: ProductionBaselineAdmissionEvidence;
  backup: ProductionBackupAdmissionEvidence;
  authority: ProductionExecutionAuthority;
  evaluatedAt: string;
  databaseMutationPerformed: boolean;
  externalMutationPerformed: boolean;
  deploymentMutationPerformed: boolean;
  uiMutationPerformed: boolean;
  formalMutationPerformed: boolean;
}

export type ProductionMigrationAdmissionFailure =
  | "TARGET_SEAL_INVALID"
  | "TARGET_REF_MISMATCH"
  | "ENVIRONMENT_NOT_PRODUCTION"
  | "TARGET_PROVIDER_UNRESOLVED"
  | "DISALLOWED_IDENTITY_MARKER"
  | "TLS_VERIFY_FULL_REQUIRED"
  | "POSTGRES_MAJOR_UNSUPPORTED"
  | "POSTGRES_PORT_INVALID"
  | "OBSERVED_TARGET_IDENTITY_MISMATCH"
  | "CREDENTIAL_SOURCE_UNRESOLVED"
  | "CREDENTIAL_SOURCE_RECEIPT_MISMATCH"
  | "OWNERSHIP_RECEIPT_MISMATCH"
  | "CONNECTION_PROOF_RECEIPT_MISMATCH"
  | "READ_ONLY_CONNECTION_PROOF_MISSING"
  | "WRITE_PROBE_FORBIDDEN"
  | "RELEASE_RECEIPT_INVALID"
  | "RELEASE_CANDIDATE_MISMATCH"
  | "RELEASE_CANDIDATE_NOT_FROZEN"
  | "IMMUTABLE_BUNDLE_MODE_INVALID"
  | "SEQUENTIAL_PLAN_RECEIPT_INVALID"
  | "SEQUENTIAL_PLAN_TARGET_MISMATCH"
  | "SEQUENTIAL_PLAN_RELEASE_MISMATCH"
  | "SEQUENTIAL_PLAN_NOT_READY"
  | "MIGRATION_BASELINE_RECEIPT_INVALID"
  | "MIGRATION_BASELINE_RANGE_MISMATCH"
  | "PRE_MIGRATION_STATE_MISMATCH"
  | "BACKUP_RECEIPT_INVALID"
  | "BACKUP_TARGET_MISMATCH"
  | "BACKUP_TIMESTAMP_INVALID"
  | "BACKUP_STALE"
  | "RESTORE_VERIFICATION_MISSING"
  | "RESTORE_TARGET_NOT_ISOLATED"
  | "AUTHORITY_RECEIPT_INVALID"
  | "EXECUTION_AUTHORITY_MISSING"
  | "AUTHORITY_TARGET_MISMATCH"
  | "AUTHORITY_RELEASE_MISMATCH"
  | "AUTHORITY_PLAN_MISMATCH"
  | "AUTHORITY_MIGRATION_RANGE_MISMATCH"
  | "AUTHORITY_TIMESTAMP_INVALID"
  | "AUTHORITY_NOT_CURRENT"
  | "ONE_SHOT_NONCE_REPLAYED"
  | "PRE_APPLY_MUTATION_ALREADY_PERFORMED";

function identityHasDisallowedMarker(
  target: SealedProductionDatabaseTarget,
): boolean {
  return [
    target.targetId,
    target.organizationRef,
    target.projectRef,
    target.branchRef,
    target.databaseName,
  ].some((value) => DISALLOWED_PRODUCTION_MARKER.test(value));
}

function allValidSha256(values: readonly string[]): boolean {
  return values.every(validSha256);
}

export function assessProductionMigrationAdmission(
  input: ProductionMigrationAdmissionInput,
): Readonly<{
  targetValid: boolean;
  readyForProductionApply: boolean;
  failures: readonly ProductionMigrationAdmissionFailure[];
  admissionReceiptSha256: string;
}> {
  const failures: ProductionMigrationAdmissionFailure[] = [];
  const add = (failure: ProductionMigrationAdmissionFailure): void => {
    if (!failures.includes(failure)) failures.push(failure);
  };
  const targetValid = verifySealedProductionDatabaseTarget(input.target);
  if (!targetValid) add("TARGET_SEAL_INVALID");
  if (input.observation.observedTargetRefSha256 !== input.target.targetRefSha256)
    add("TARGET_REF_MISMATCH");
  if (input.target.environment !== "PRODUCTION")
    add("ENVIRONMENT_NOT_PRODUCTION");
  if (input.target.provider === "UNKNOWN") add("TARGET_PROVIDER_UNRESOLVED");
  if (identityHasDisallowedMarker(input.target))
    add("DISALLOWED_IDENTITY_MARKER");
  if (
    input.target.tlsMode !== "VERIFY_FULL" ||
    input.observation.observedTlsMode !== "VERIFY_FULL"
  )
    add("TLS_VERIFY_FULL_REQUIRED");
  if (
    input.target.postgresMajor !== REQUIRED_PRODUCTION_POSTGRES_MAJOR ||
    input.observation.observedPostgresMajor !==
      REQUIRED_PRODUCTION_POSTGRES_MAJOR
  )
    add("POSTGRES_MAJOR_UNSUPPORTED");
  if (
    input.target.port !== REQUIRED_PRODUCTION_POSTGRES_PORT ||
    input.observation.observedPort !== REQUIRED_PRODUCTION_POSTGRES_PORT
  )
    add("POSTGRES_PORT_INVALID");

  const observedIdentityMatches =
    input.observation.observedProvider === input.target.provider &&
    input.observation.observedOrganizationRef === input.target.organizationRef &&
    input.observation.observedProjectRef === input.target.projectRef &&
    input.observation.observedBranchRef === input.target.branchRef &&
    input.observation.observedDatabaseName === input.target.databaseName &&
    input.observation.observedHostIdentitySha256 ===
      input.target.hostIdentitySha256;
  if (!observedIdentityMatches) add("OBSERVED_TARGET_IDENTITY_MISMATCH");
  if (
    input.target.credentialSourceKind === "UNKNOWN" ||
    input.observation.observedCredentialSourceKind === "UNKNOWN"
  )
    add("CREDENTIAL_SOURCE_UNRESOLVED");
  if (
    input.observation.observedCredentialSourceReceiptSha256 !==
    input.target.credentialSourceReceiptSha256
  )
    add("CREDENTIAL_SOURCE_RECEIPT_MISMATCH");
  if (
    input.observation.observedOwnershipReceiptSha256 !==
    input.target.ownershipReceiptSha256
  )
    add("OWNERSHIP_RECEIPT_MISMATCH");
  if (
    input.observation.observedConnectionProofReceiptSha256 !==
    input.target.connectionProofReceiptSha256
  )
    add("CONNECTION_PROOF_RECEIPT_MISMATCH");
  if (
    !input.observation.connectionSucceeded ||
    !input.observation.preflightReadOnly
  )
    add("READ_ONLY_CONNECTION_PROOF_MISSING");
  if (input.observation.writeProbePerformed) add("WRITE_PROBE_FORBIDDEN");

  if (
    !allValidSha256([
      input.release.releaseCandidateSha256,
      input.release.observedReleaseCandidateSha256,
      input.release.expectedPreMigrationStateSha256,
    ])
  )
    add("RELEASE_RECEIPT_INVALID");
  if (
    input.release.observedReleaseCandidateSha256 !==
    input.release.releaseCandidateSha256
  )
    add("RELEASE_CANDIDATE_MISMATCH");
  if (!input.release.releaseCandidateFrozen)
    add("RELEASE_CANDIDATE_NOT_FROZEN");
  if (input.release.immutableBundleMode !== "0400")
    add("IMMUTABLE_BUNDLE_MODE_INVALID");
  if (
    !allValidSha256([
      input.release.sequentialExecutionPlanSha256,
      input.release.sequentialPlanTargetRefSha256,
      input.release.sequentialPlanReleaseCandidateSha256,
      input.release.sequentialReadinessReceiptSha256,
    ])
  )
    add("SEQUENTIAL_PLAN_RECEIPT_INVALID");
  if (
    input.release.sequentialPlanTargetRefSha256 !==
    input.target.targetRefSha256
  )
    add("SEQUENTIAL_PLAN_TARGET_MISMATCH");
  if (
    input.release.sequentialPlanReleaseCandidateSha256 !==
    input.release.releaseCandidateSha256
  )
    add("SEQUENTIAL_PLAN_RELEASE_MISMATCH");
  if (!input.release.sequentialReadyForExecution)
    add("SEQUENTIAL_PLAN_NOT_READY");

  if (
    !allValidSha256([
      input.baseline.migrationLedgerReceiptSha256,
      input.baseline.schemaDigestReceiptSha256,
      input.baseline.observedPreMigrationStateSha256,
    ])
  )
    add("MIGRATION_BASELINE_RECEIPT_INVALID");
  if (
    input.baseline.latestAppliedMigration !==
      REQUIRED_PRODUCTION_MIGRATION_RANGE.latestAppliedBeforeRelease ||
    input.baseline.pendingFirstMigration !==
      REQUIRED_PRODUCTION_MIGRATION_RANGE.first ||
    input.baseline.pendingLastMigration !==
      REQUIRED_PRODUCTION_MIGRATION_RANGE.last ||
    input.baseline.pendingMigrationCount !==
      REQUIRED_PRODUCTION_MIGRATION_RANGE.count
  )
    add("MIGRATION_BASELINE_RANGE_MISMATCH");
  if (
    input.baseline.observedPreMigrationStateSha256 !==
    input.release.expectedPreMigrationStateSha256
  )
    add("PRE_MIGRATION_STATE_MISMATCH");

  if (
    !allValidSha256([
      input.backup.backupManifestSha256,
      input.backup.databaseBackupSha256,
      input.backup.backupTargetRefSha256,
      input.backup.restoreVerificationReceiptSha256,
    ])
  )
    add("BACKUP_RECEIPT_INVALID");
  if (input.backup.backupTargetRefSha256 !== input.target.targetRefSha256)
    add("BACKUP_TARGET_MISMATCH");
  const evaluatedAt = Date.parse(input.evaluatedAt);
  const backupCreatedAt = Date.parse(input.backup.createdAt);
  const restoreVerifiedAt = Date.parse(input.backup.restoreVerifiedAt);
  if (
    !validTimestamp(input.evaluatedAt) ||
    !validTimestamp(input.backup.createdAt) ||
    !validTimestamp(input.backup.restoreVerifiedAt) ||
    backupCreatedAt > restoreVerifiedAt ||
    restoreVerifiedAt > evaluatedAt
  ) {
    add("BACKUP_TIMESTAMP_INVALID");
  } else if (
    evaluatedAt - backupCreatedAt > MAX_PRODUCTION_BACKUP_AGE_MS
  ) {
    add("BACKUP_STALE");
  }
  if (!input.backup.restorePassed) add("RESTORE_VERIFICATION_MISSING");
  if (!input.backup.restoreTargetIsolated)
    add("RESTORE_TARGET_NOT_ISOLATED");

  if (
    !allValidSha256([
      input.authority.executionAuthorityReceiptSha256,
      input.authority.approvalReceiptSha256,
      input.authority.authorizedTargetRefSha256,
      input.authority.authorizedReleaseCandidateSha256,
      input.authority.authorizedSequentialPlanSha256,
      input.authority.oneShotNonceSha256,
    ])
  )
    add("AUTHORITY_RECEIPT_INVALID");
  if (!input.authority.executionAuthorized)
    add("EXECUTION_AUTHORITY_MISSING");
  if (
    input.authority.authorizedTargetRefSha256 !== input.target.targetRefSha256
  )
    add("AUTHORITY_TARGET_MISMATCH");
  if (
    input.authority.authorizedReleaseCandidateSha256 !==
    input.release.releaseCandidateSha256
  )
    add("AUTHORITY_RELEASE_MISMATCH");
  if (
    input.authority.authorizedSequentialPlanSha256 !==
    input.release.sequentialExecutionPlanSha256
  )
    add("AUTHORITY_PLAN_MISMATCH");
  if (
    input.authority.migrationFirst !==
      REQUIRED_PRODUCTION_MIGRATION_RANGE.first ||
    input.authority.migrationLast !==
      REQUIRED_PRODUCTION_MIGRATION_RANGE.last
  )
    add("AUTHORITY_MIGRATION_RANGE_MISMATCH");
  const issuedAt = Date.parse(input.authority.issuedAt);
  const validUntil = Date.parse(input.authority.validUntil);
  if (
    !validTimestamp(input.authority.issuedAt) ||
    !validTimestamp(input.authority.validUntil) ||
    issuedAt >= validUntil
  ) {
    add("AUTHORITY_TIMESTAMP_INVALID");
  } else if (issuedAt > evaluatedAt || validUntil <= evaluatedAt) {
    add("AUTHORITY_NOT_CURRENT");
  }
  if (input.authority.oneShotNonceConsumed)
    add("ONE_SHOT_NONCE_REPLAYED");

  if (
    input.databaseMutationPerformed ||
    input.externalMutationPerformed ||
    input.deploymentMutationPerformed ||
    input.uiMutationPerformed ||
    input.formalMutationPerformed
  )
    add("PRE_APPLY_MUTATION_ALREADY_PERFORMED");

  const sortedFailures = [...failures].sort();
  const admissionReceiptSha256 = digest({
    targetRefSha256: input.target.targetRefSha256,
    observedTargetRefSha256: input.observation.observedTargetRefSha256,
    releaseCandidateSha256: input.release.releaseCandidateSha256,
    sequentialExecutionPlanSha256:
      input.release.sequentialExecutionPlanSha256,
    sequentialReadinessReceiptSha256:
      input.release.sequentialReadinessReceiptSha256,
    migrationLedgerReceiptSha256:
      input.baseline.migrationLedgerReceiptSha256,
    observedPreMigrationStateSha256:
      input.baseline.observedPreMigrationStateSha256,
    backupManifestSha256: input.backup.backupManifestSha256,
    restoreVerificationReceiptSha256:
      input.backup.restoreVerificationReceiptSha256,
    executionAuthorityReceiptSha256:
      input.authority.executionAuthorityReceiptSha256,
    approvalReceiptSha256: input.authority.approvalReceiptSha256,
    oneShotNonceSha256: input.authority.oneShotNonceSha256,
    evaluatedAt: input.evaluatedAt,
    failures: sortedFailures,
  });
  return Object.freeze({
    targetValid,
    readyForProductionApply: sortedFailures.length === 0,
    failures: Object.freeze(sortedFailures),
    admissionReceiptSha256,
  });
}
