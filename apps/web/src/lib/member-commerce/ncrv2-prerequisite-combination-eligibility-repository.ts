import "server-only";

import { createHash } from "node:crypto";
import type { Ncrv2PrerequisiteBundleReadModel } from "./ncrv2-prerequisite-bundle-read-model";

interface QueryResult<R = Record<string, unknown>> {
  rows: R[];
}

interface Client {
  query<R = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<R>>;
  release(): void;
}

export interface Ncrv2PrerequisiteEligibilityPool {
  connect(): Promise<Client>;
}

type Row = Record<string, unknown>;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

function required(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function uuid(value: string, field: string): string {
  required(UUID.test(value), `NCRV2_PREREQ_ELIGIBILITY_INVALID_UUID:${field}`);
  return value;
}

function hash(value: string, field: string): string {
  required(SHA256.test(value), `NCRV2_PREREQ_ELIGIBILITY_INVALID_HASH:${field}`);
  return value;
}

function iso(value: unknown, field: string): string {
  const parsed = value instanceof Date ? value : new Date(String(value));
  required(Number.isFinite(parsed.getTime()), `NCRV2_PREREQ_ELIGIBILITY_INVALID_TIME:${field}`);
  return parsed.toISOString();
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export interface PersistNcrv2PrerequisiteEligibilityInput {
  id: string;
  prerequisiteReadModel: Ncrv2PrerequisiteBundleReadModel;
  registry: {
    id: string;
    registryReceiptSha256: string;
    authorityClass: "CANONICAL_NCRV2_130_REGISTRY";
    lifecycleState: "ACTIVE";
    requirementCount: 14;
    persisted: true;
    synthetic: false;
    validFrom: string;
    validUntil: string;
  };
  eligibilityVersion: 1;
  eligibilityStatus: "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION";
  eligibleForRealEvidenceCombination: true;
  evaluatedAt: string;
  expiresAt: string;
  formalRequirementCount: 0;
  formalActionAuthorized: false;
  providerCalled: false;
  externalMutationPerformed: false;
}

export interface Ncrv2PrerequisiteEligibilityRecord {
  id: string;
  tenantId: string;
  packageId: string;
  gateEvaluationId: string;
  prerequisiteBundleId: string;
  canonicalRegistryId: string;
  evaluationScopeSha256: string;
  prerequisiteBundleSha256: string;
  registryReceiptSha256: string;
  eligibilityVersion: 1;
  eligibilityStatus: "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION";
  eligibleForRealEvidenceCombination: true;
  prerequisiteBindingCount: 11;
  registryRequirementCount: 14;
  evaluatedAt: string;
  expiresAt: string;
  formalRequirementCount: 0;
  formalActionAuthorized: false;
  providerCalled: false;
  externalMutationPerformed: false;
  eligibilitySha256: string;
  replayed: boolean;
}

function canonical(
  input: PersistNcrv2PrerequisiteEligibilityInput,
): Omit<Ncrv2PrerequisiteEligibilityRecord, "replayed"> {
  uuid(input.id, "id");
  const model = input.prerequisiteReadModel;
  uuid(model.tenantId, "tenantId");
  uuid(model.packageId, "packageId");
  uuid(model.gateEvaluationId, "gateEvaluationId");
  hash(model.evaluationScopeSha256, "evaluationScopeSha256");
  required(
    model.status ===
      "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION" &&
      model.blockers.length === 1 &&
      model.blockers[0] === "REAL_EVIDENCE_COMBINATION_NOT_EVALUATED" &&
      model.bundle.present &&
      model.bundle.complete &&
      model.bundle.exactBindingCount === 11 &&
      model.bundle.exactRealMediaCount === 6 &&
      model.bundle.currentAtObservedTime &&
      model.bundle.bundleId !== null &&
      model.bundle.combinedReceiptSha256 !== null,
    "NCRV2_PREREQ_ELIGIBILITY_READ_MODEL_BLOCKED",
  );
  uuid(model.bundle.bundleId, "prerequisiteBundleId");
  hash(model.bundle.combinedReceiptSha256, "prerequisiteBundleSha256");
  uuid(input.registry.id, "canonicalRegistryId");
  hash(input.registry.registryReceiptSha256, "registryReceiptSha256");
  required(
    input.registry.authorityClass === "CANONICAL_NCRV2_130_REGISTRY" &&
      input.registry.lifecycleState === "ACTIVE" &&
      input.registry.requirementCount === 14 &&
      input.registry.persisted === true &&
      input.registry.synthetic === false,
    "NCRV2_PREREQ_ELIGIBILITY_REGISTRY_INVALID",
  );
  required(
    input.eligibilityVersion === 1 &&
      input.eligibilityStatus ===
        "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION" &&
      input.eligibleForRealEvidenceCombination === true,
    "NCRV2_PREREQ_ELIGIBILITY_STATUS_INVALID",
  );
  required(
    input.formalRequirementCount === 0 &&
      input.formalActionAuthorized === false &&
      input.providerCalled === false &&
      input.externalMutationPerformed === false,
    "NCRV2_PREREQ_ELIGIBILITY_SIDE_EFFECT_FLAG",
  );
  const evaluatedAt = iso(input.evaluatedAt, "evaluatedAt");
  const expiresAt = iso(input.expiresAt, "expiresAt");
  const validFrom = iso(input.registry.validFrom, "registry.validFrom");
  const validUntil = iso(input.registry.validUntil, "registry.validUntil");
  required(
    validFrom <= evaluatedAt &&
      evaluatedAt < expiresAt &&
      expiresAt <= validUntil &&
      Date.parse(expiresAt) - Date.parse(evaluatedAt) <= 5 * 60 * 1000,
    "NCRV2_PREREQ_ELIGIBILITY_WINDOW_INVALID",
  );
  required(
    model.formalTruth.clubsCompleted === 60 &&
      model.formalTruth.clubsTotal === 120 &&
      model.formalTruth.ncrv2Satisfied === 0 &&
      model.formalTruth.ncrv2Total === 14 &&
      model.formalTruth.formalStatusUnchanged &&
      !model.formalTruth.formalActionPerformed,
    "NCRV2_PREREQ_ELIGIBILITY_FORMAL_TRUTH_INVALID",
  );

  const bound = {
    id: input.id,
    tenantId: model.tenantId,
    packageId: model.packageId,
    gateEvaluationId: model.gateEvaluationId,
    prerequisiteBundleId: model.bundle.bundleId,
    canonicalRegistryId: input.registry.id,
    evaluationScopeSha256: model.evaluationScopeSha256,
    prerequisiteBundleSha256: model.bundle.combinedReceiptSha256,
    registryReceiptSha256: input.registry.registryReceiptSha256,
    eligibilityVersion: 1 as const,
    eligibilityStatus:
      "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION" as const,
    eligibleForRealEvidenceCombination: true as const,
    prerequisiteBindingCount: 11 as const,
    registryRequirementCount: 14 as const,
    evaluatedAt,
    expiresAt,
    formalRequirementCount: 0 as const,
    formalActionAuthorized: false as const,
    providerCalled: false as const,
    externalMutationPerformed: false as const,
  };
  return {
    ...bound,
    eligibilitySha256: createHash("sha256")
      .update(JSON.stringify(bound))
      .digest("hex"),
  };
}

export async function persistNcrv2PrerequisiteCombinationEligibility(
  pool: Ncrv2PrerequisiteEligibilityPool,
  input: PersistNcrv2PrerequisiteEligibilityInput,
): Promise<Ncrv2PrerequisiteEligibilityRecord> {
  const candidate = canonical(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [
      candidate.tenantId,
    ]);
    const inserted = await client.query<Row>(
      'INSERT INTO "CraysClubNcrv2PrerequisiteCombinationEligibilityReceipt" ("id","tenant_id","package_id","gate_evaluation_id","prerequisite_bundle_id","canonical_registry_id","evaluation_scope_sha256","prerequisite_bundle_sha256","registry_receipt_sha256","eligibility_version","eligibility_status","eligible_for_real_evidence_combination","prerequisite_binding_count","registry_requirement_count","eligibility_sha256","evaluated_at","expires_at","formal_requirement_count","formal_action_authorized","provider_called","external_mutation_performed") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,true,11,14,$11,$12,$13,0,false,false,false) ON CONFLICT DO NOTHING RETURNING *',
      [
        candidate.id,
        candidate.tenantId,
        candidate.packageId,
        candidate.gateEvaluationId,
        candidate.prerequisiteBundleId,
        candidate.canonicalRegistryId,
        candidate.evaluationScopeSha256,
        candidate.prerequisiteBundleSha256,
        candidate.registryReceiptSha256,
        candidate.eligibilityStatus,
        candidate.eligibilitySha256,
        candidate.evaluatedAt,
        candidate.expiresAt,
      ],
    );
    const rows = await client.query<Row>(
      'SELECT * FROM "CraysClubNcrv2PrerequisiteCombinationEligibilityReceipt" WHERE "tenant_id"=$1 AND "package_id"=$2 AND "evaluation_scope_sha256"=$3',
      [candidate.tenantId, candidate.packageId, candidate.evaluationScopeSha256],
    );
    required(rows.rows.length === 1, "NCRV2_PREREQ_ELIGIBILITY_READBACK_MISSING");
    const row = rows.rows[0];
    const output: Omit<Ncrv2PrerequisiteEligibilityRecord, "replayed"> = {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      packageId: String(row.package_id),
      gateEvaluationId: String(row.gate_evaluation_id),
      prerequisiteBundleId: String(row.prerequisite_bundle_id),
      canonicalRegistryId: String(row.canonical_registry_id),
      evaluationScopeSha256: String(row.evaluation_scope_sha256),
      prerequisiteBundleSha256: String(row.prerequisite_bundle_sha256),
      registryReceiptSha256: String(row.registry_receipt_sha256),
      eligibilityVersion: Number(row.eligibility_version) as 1,
      eligibilityStatus: String(row.eligibility_status) as Ncrv2PrerequisiteEligibilityRecord["eligibilityStatus"],
      eligibleForRealEvidenceCombination: row.eligible_for_real_evidence_combination as true,
      prerequisiteBindingCount: Number(row.prerequisite_binding_count) as 11,
      registryRequirementCount: Number(row.registry_requirement_count) as 14,
      evaluatedAt: iso(row.evaluated_at, "row.evaluatedAt"),
      expiresAt: iso(row.expires_at, "row.expiresAt"),
      formalRequirementCount: 0,
      formalActionAuthorized: false,
      providerCalled: false,
      externalMutationPerformed: false,
      eligibilitySha256: String(row.eligibility_sha256),
    };
    required(equal(output, candidate), "NCRV2_PREREQ_ELIGIBILITY_REPLAY_CONFLICT");
    await client.query("COMMIT");
    return { ...output, replayed: inserted.rows.length === 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
