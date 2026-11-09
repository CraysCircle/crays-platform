import "server-only";

import { createHash } from "node:crypto";
import type { Ncrv2PrerequisiteEligibilityRecord } from "./ncrv2-prerequisite-combination-eligibility-repository";
import type { Ncrv2RealEvidenceCombinationRecord } from "./ncrv2-real-evidence-combination-repository";

interface QueryResult<R = Record<string, unknown>> {
  rows: R[];
}
interface Client {
  query<R = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<R>>;
  release(): void;
}
export interface Ncrv2EligibilityCombinationBindingPool {
  connect(): Promise<Client>;
}
type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
function required(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
const uuid = (value: string, field: string) => {
  required(UUID.test(value), `NCRV2_ELIGIBILITY_COMBO_INVALID_UUID:${field}`);
  return value;
};
const hash = (value: string, field: string) => {
  required(SHA256.test(value), `NCRV2_ELIGIBILITY_COMBO_INVALID_HASH:${field}`);
  return value;
};
const iso = (value: unknown, field: string) => {
  const parsed = value instanceof Date ? value : new Date(String(value));
  required(Number.isFinite(parsed.getTime()), `NCRV2_ELIGIBILITY_COMBO_INVALID_TIME:${field}`);
  return parsed.toISOString();
};
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export interface PersistNcrv2EligibilityCombinationBindingInput {
  id: string;
  eligibility: Ncrv2PrerequisiteEligibilityRecord;
  combination: Ncrv2RealEvidenceCombinationRecord;
  bindingVersion: 1;
  bindingStatus: "REAL_EVIDENCE_COMBINATION_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY";
  boundAt: string;
  expiresAt: string;
  formalRequirementCount: 0;
  formalActionAuthorized: false;
  providerCalled: false;
  externalMutationPerformed: false;
}

export interface Ncrv2EligibilityCombinationBindingRecord {
  id: string;
  tenantId: string;
  packageId: string;
  gateEvaluationId: string;
  eligibilityReceiptId: string;
  evidenceCombinationReceiptId: string;
  evaluationScopeSha256: string;
  eligibilitySha256: string;
  evidenceCombinationSha256: string;
  bindingVersion: 1;
  bindingStatus: "REAL_EVIDENCE_COMBINATION_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY";
  evaluatedEvidenceSlots: 14;
  boundAt: string;
  expiresAt: string;
  formalRequirementCount: 0;
  formalActionAuthorized: false;
  providerCalled: false;
  externalMutationPerformed: false;
  bindingSha256: string;
  replayed: boolean;
}

function canonical(input: PersistNcrv2EligibilityCombinationBindingInput): Omit<Ncrv2EligibilityCombinationBindingRecord, "replayed"> {
  uuid(input.id, "id");
  const eligibility = input.eligibility;
  const combination = input.combination;
  uuid(eligibility.id, "eligibilityReceiptId");
  uuid(eligibility.tenantId, "tenantId");
  uuid(eligibility.packageId, "packageId");
  uuid(eligibility.gateEvaluationId, "gateEvaluationId");
  uuid(combination.id, "evidenceCombinationReceiptId");
  hash(eligibility.evaluationScopeSha256, "evaluationScopeSha256");
  hash(eligibility.eligibilitySha256, "eligibilitySha256");
  hash(combination.decisionSha256, "evidenceCombinationSha256");
  required(
    eligibility.eligibilityStatus === "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION" &&
      eligibility.eligibleForRealEvidenceCombination === true &&
      eligibility.prerequisiteBindingCount === 11 &&
      eligibility.registryRequirementCount === 14 &&
      eligibility.formalRequirementCount === 0 &&
      !eligibility.formalActionAuthorized &&
      !eligibility.providerCalled &&
      !eligibility.externalMutationPerformed,
    "NCRV2_ELIGIBILITY_COMBO_ELIGIBILITY_INVALID",
  );
  const decision = combination.decision;
  required(
    decision.realEvidenceComplete === true &&
      decision.status === "REAL_EVIDENCE_COMPLETE_AWAITING_SEPARATE_FORMAL_AUTHORITY" &&
      decision.evaluatedEvidenceSlots === 14 &&
      combination.evidence.length === 14 &&
      decision.canonicalRequirementKeys.length === 14 &&
      decision.evidenceReceiptIds.length === 14 &&
      decision.blockReasons.length === 0 &&
      decision.formalRequirementCount === 0 &&
      !decision.formalActionAuthorized &&
      !decision.providerCalled &&
      !decision.externalMutationPerformed,
    "NCRV2_ELIGIBILITY_COMBO_COMBINATION_INVALID",
  );
  required(
    eligibility.tenantId === decision.tenantId &&
      eligibility.packageId === combination.packageId &&
      eligibility.gateEvaluationId === combination.gateEvaluationId &&
      eligibility.evaluationScopeSha256 === decision.evaluationScopeSha256 &&
      eligibility.registryReceiptSha256 === combination.registryReceiptSha256,
    "NCRV2_ELIGIBILITY_COMBO_LINEAGE_MISMATCH",
  );
  required(
    input.bindingVersion === 1 &&
      input.bindingStatus === "REAL_EVIDENCE_COMBINATION_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY" &&
      input.formalRequirementCount === 0 &&
      !input.formalActionAuthorized &&
      !input.providerCalled &&
      !input.externalMutationPerformed,
    "NCRV2_ELIGIBILITY_COMBO_SIDE_EFFECT_FLAG",
  );
  const boundAt = iso(input.boundAt, "boundAt");
  const expiresAt = iso(input.expiresAt, "expiresAt");
  const eligibilityEvaluatedAt = iso(eligibility.evaluatedAt, "eligibility.evaluatedAt");
  const eligibilityExpiresAt = iso(eligibility.expiresAt, "eligibility.expiresAt");
  const combinationEvaluatedAt = iso(decision.evaluatedAt, "combination.evaluatedAt");
  const combinationExpiresAt = iso(decision.expiresAt, "combination.expiresAt");
  required(
    eligibilityEvaluatedAt <= boundAt &&
      combinationEvaluatedAt <= boundAt &&
      boundAt < expiresAt &&
      expiresAt <= eligibilityExpiresAt &&
      expiresAt <= combinationExpiresAt &&
      Date.parse(expiresAt) - Date.parse(boundAt) <= 5 * 60 * 1000,
    "NCRV2_ELIGIBILITY_COMBO_WINDOW_INVALID",
  );
  const bound = {
    id: input.id,
    tenantId: eligibility.tenantId,
    packageId: eligibility.packageId,
    gateEvaluationId: eligibility.gateEvaluationId,
    eligibilityReceiptId: eligibility.id,
    evidenceCombinationReceiptId: combination.id,
    evaluationScopeSha256: eligibility.evaluationScopeSha256,
    eligibilitySha256: eligibility.eligibilitySha256,
    evidenceCombinationSha256: combination.decisionSha256,
    bindingVersion: 1 as const,
    bindingStatus: "REAL_EVIDENCE_COMBINATION_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY" as const,
    evaluatedEvidenceSlots: 14 as const,
    boundAt,
    expiresAt,
    formalRequirementCount: 0 as const,
    formalActionAuthorized: false as const,
    providerCalled: false as const,
    externalMutationPerformed: false as const,
  };
  return {
    ...bound,
    bindingSha256: createHash("sha256").update(JSON.stringify(bound)).digest("hex"),
  };
}

export async function persistNcrv2EligibilityRealEvidenceCombinationBinding(
  pool: Ncrv2EligibilityCombinationBindingPool,
  input: PersistNcrv2EligibilityCombinationBindingInput,
): Promise<Ncrv2EligibilityCombinationBindingRecord> {
  const candidate = canonical(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [candidate.tenantId]);
    const inserted = await client.query<Row>(
      'INSERT INTO "CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt" ("id","tenant_id","package_id","gate_evaluation_id","eligibility_receipt_id","evidence_combination_receipt_id","evaluation_scope_sha256","eligibility_sha256","evidence_combination_sha256","binding_version","binding_status","evaluated_evidence_slots","binding_sha256","bound_at","expires_at","formal_requirement_count","formal_action_authorized","provider_called","external_mutation_performed") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,14,$11,$12,$13,0,false,false,false) ON CONFLICT DO NOTHING RETURNING *',
      [candidate.id,candidate.tenantId,candidate.packageId,candidate.gateEvaluationId,candidate.eligibilityReceiptId,candidate.evidenceCombinationReceiptId,candidate.evaluationScopeSha256,candidate.eligibilitySha256,candidate.evidenceCombinationSha256,candidate.bindingStatus,candidate.bindingSha256,candidate.boundAt,candidate.expiresAt],
    );
    const selected = await client.query<Row>(
      'SELECT * FROM "CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt" WHERE "tenant_id"=$1 AND "package_id"=$2 AND "evaluation_scope_sha256"=$3',
      [candidate.tenantId,candidate.packageId,candidate.evaluationScopeSha256],
    );
    required(selected.rows.length === 1, "NCRV2_ELIGIBILITY_COMBO_READBACK_MISSING");
    const row = selected.rows[0];
    const output: Omit<Ncrv2EligibilityCombinationBindingRecord, "replayed"> = {
      id:String(row.id),tenantId:String(row.tenant_id),packageId:String(row.package_id),gateEvaluationId:String(row.gate_evaluation_id),eligibilityReceiptId:String(row.eligibility_receipt_id),evidenceCombinationReceiptId:String(row.evidence_combination_receipt_id),evaluationScopeSha256:String(row.evaluation_scope_sha256),eligibilitySha256:String(row.eligibility_sha256),evidenceCombinationSha256:String(row.evidence_combination_sha256),bindingVersion:Number(row.binding_version) as 1,bindingStatus:String(row.binding_status) as Ncrv2EligibilityCombinationBindingRecord["bindingStatus"],evaluatedEvidenceSlots:Number(row.evaluated_evidence_slots) as 14,boundAt:iso(row.bound_at,"row.boundAt"),expiresAt:iso(row.expires_at,"row.expiresAt"),formalRequirementCount:0,formalActionAuthorized:false,providerCalled:false,externalMutationPerformed:false,bindingSha256:String(row.binding_sha256),
    };
    required(equal(output, candidate), "NCRV2_ELIGIBILITY_COMBO_REPLAY_CONFLICT");
    await client.query("COMMIT");
    return { ...output, replayed: inserted.rows.length === 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
