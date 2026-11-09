import "server-only";

import { createHash } from "node:crypto";

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

export interface Ncrv2PrerequisiteReadModelPool {
  connect(): Promise<Client>;
}

type Row = Record<string, unknown>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

function required(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function iso(value: unknown, field: string): string {
  const parsed = value instanceof Date ? value : new Date(String(value));
  required(Number.isFinite(parsed.getTime()), `NCRV2_PREREQ_READ_INVALID_TIME:${field}`);
  return parsed.toISOString();
}

export type Ncrv2PrerequisiteKind =
  | "VENDURE_STATUS_TRANSPORT"
  | "WORKER_LEASE_RECOVERY"
  | "STRIPE_CUSTOMER_CREATED"
  | "EXTERNAL_CELL_PASS"
  | "REAL_MEDIA"
  | "HUMAN_AAL2_FRESH";

export interface Ncrv2PrerequisiteHashBinding {
  id: string;
  kind: Ncrv2PrerequisiteKind;
  slotOrdinal: number;
  receiptId: string;
  receiptSha256: string;
  authorityKind: string;
  persisted: true;
  synthetic: false;
  state: "PASS";
  observedAt: string;
  validUntil: string | null;
}

export interface Ncrv2PrerequisiteBundleHashInput {
  id: string;
  tenantId: string;
  packageId: string;
  gateEvaluationId: string;
  evaluationScopeSha256: string;
  evaluatedAt: string;
  bindings: readonly Ncrv2PrerequisiteHashBinding[];
  formalRequirementCount: 0;
  formalActionAuthorized: false;
  providerCalled: false;
  externalMutationPerformed: false;
}

function sortedBindings(
  bindings: readonly Ncrv2PrerequisiteHashBinding[],
): Ncrv2PrerequisiteHashBinding[] {
  return [...bindings]
    .map((binding) => ({
      id: binding.id,
      kind: binding.kind,
      slotOrdinal: binding.slotOrdinal,
      receiptId: binding.receiptId,
      receiptSha256: binding.receiptSha256,
      authorityKind: binding.authorityKind,
      persisted: binding.persisted,
      synthetic: binding.synthetic,
      state: binding.state,
      observedAt: iso(binding.observedAt, "binding.observedAt"),
      validUntil:
        binding.validUntil === null
          ? null
          : iso(binding.validUntil, "binding.validUntil"),
    }))
    .sort(
      (left, right) =>
        left.kind.localeCompare(right.kind) ||
        left.slotOrdinal - right.slotOrdinal,
    );
}

export function computeNcrv2PrerequisiteBundleSha256(
  input: Ncrv2PrerequisiteBundleHashInput,
): string {
  const canonical: Ncrv2PrerequisiteBundleHashInput = {
    id: input.id,
    tenantId: input.tenantId,
    packageId: input.packageId,
    gateEvaluationId: input.gateEvaluationId,
    evaluationScopeSha256: input.evaluationScopeSha256,
    evaluatedAt: iso(input.evaluatedAt, "evaluatedAt"),
    bindings: sortedBindings(input.bindings),
    formalRequirementCount: input.formalRequirementCount,
    formalActionAuthorized: input.formalActionAuthorized,
    providerCalled: input.providerCalled,
    externalMutationPerformed: input.externalMutationPerformed,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export type Ncrv2PrerequisiteReadBlocker =
  | "PREREQUISITE_BUNDLE_MISSING"
  | "PREREQUISITE_LINEAGE_MISMATCH"
  | "PREREQUISITE_SIDE_EFFECT_FLAGS_INVALID"
  | "PREREQUISITE_BINDING_COUNT_INVALID"
  | "PREREQUISITE_KIND_CARDINALITY_INVALID"
  | "PREREQUISITE_DUPLICATE_BINDING"
  | "PREREQUISITE_RECEIPT_NOT_REAL_PASS"
  | "PREREQUISITE_SEQUENCE_INVALID"
  | "PREREQUISITE_RECEIPT_EXPIRED"
  | "PREREQUISITE_COMBINED_HASH_MISMATCH"
  | "REAL_EVIDENCE_COMBINATION_NOT_EVALUATED";

export interface Ncrv2PrerequisiteBundleReadModel {
  status:
    | "BLOCKED"
    | "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION";
  blockers: readonly Ncrv2PrerequisiteReadBlocker[];
  tenantId: string;
  packageId: string;
  gateEvaluationId: string;
  evaluationScopeSha256: string;
  bundle: {
    present: boolean;
    bundleId: string | null;
    combinedReceiptSha256: string | null;
    exactBindingCount: 0 | 11;
    exactRealMediaCount: 0 | 6;
    currentAtObservedTime: boolean;
    complete: boolean;
  };
  formalTruth: {
    clubsCompleted: 60;
    clubsTotal: 120;
    clubsPercent: 50;
    ncrv2Satisfied: 0;
    ncrv2Total: 14;
    cclub061: "ACTIVE_BLOCKED";
    cclub063: "NOT_FORMALLY_ACTIVATED";
    formalActionPerformed: false;
    formalStatusUnchanged: true;
  };
}

export async function readNcrv2PrerequisiteBundleStatus(
  pool: Ncrv2PrerequisiteReadModelPool,
  key: {
    tenantId: string;
    packageId: string;
    gateEvaluationId: string;
    evaluationScopeSha256: string;
    observedAt: string;
  },
): Promise<Ncrv2PrerequisiteBundleReadModel> {
  required(UUID.test(key.tenantId), "NCRV2_PREREQ_READ_INVALID_TENANT");
  required(UUID.test(key.packageId), "NCRV2_PREREQ_READ_INVALID_PACKAGE");
  required(UUID.test(key.gateEvaluationId), "NCRV2_PREREQ_READ_INVALID_GATE");
  required(
    SHA256.test(key.evaluationScopeSha256),
    "NCRV2_PREREQ_READ_INVALID_SCOPE_HASH",
  );
  const observedAt = iso(key.observedAt, "observedAt");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [
      key.tenantId,
    ]);
    const bundle =
      (
        await client.query<Row>(
          'SELECT "id","tenant_id","package_id","gate_evaluation_id","evaluation_scope_sha256","expected_binding_count","combined_receipt_sha256","evaluated_at","formal_requirement_count","formal_action_authorized","provider_called","external_mutation_performed" FROM "CraysClubNcrv2PrerequisiteReceiptBundle" WHERE "tenant_id"=$1 AND "package_id"=$2 AND "evaluation_scope_sha256"=$3 ORDER BY "created_at" DESC LIMIT 1',
          [key.tenantId, key.packageId, key.evaluationScopeSha256],
        )
      ).rows[0] ?? null;
    const bindingRows = bundle
      ? (
          await client.query<Row>(
            'SELECT "id","tenant_id","bundle_id","prerequisite_kind","slot_ordinal","receipt_id","receipt_sha256","authority_kind","persisted","synthetic","state","observed_at","valid_until" FROM "CraysClubNcrv2PrerequisiteReceiptBinding" WHERE "tenant_id"=$1 AND "bundle_id"=$2 ORDER BY "prerequisite_kind" ASC,"slot_ordinal" ASC',
            [key.tenantId, String(bundle.id)],
          )
        ).rows
      : [];

    const blockers = new Set<Ncrv2PrerequisiteReadBlocker>();
    if (!bundle) blockers.add("PREREQUISITE_BUNDLE_MISSING");

    const bindings: Ncrv2PrerequisiteHashBinding[] = bindingRows.map((row) => ({
      id: String(row.id),
      kind: String(row.prerequisite_kind) as Ncrv2PrerequisiteKind,
      slotOrdinal: Number(row.slot_ordinal),
      receiptId: String(row.receipt_id),
      receiptSha256: String(row.receipt_sha256),
      authorityKind: String(row.authority_kind),
      persisted: row.persisted as true,
      synthetic: row.synthetic as false,
      state: row.state as "PASS",
      observedAt: iso(row.observed_at, "row.observedAt"),
      validUntil:
        row.valid_until === null
          ? null
          : iso(row.valid_until, "row.validUntil"),
    }));

    if (
      bundle &&
      (String(bundle.tenant_id) !== key.tenantId ||
        String(bundle.package_id) !== key.packageId ||
        String(bundle.gate_evaluation_id) !== key.gateEvaluationId ||
        String(bundle.evaluation_scope_sha256) !== key.evaluationScopeSha256 ||
        bindingRows.some(
          (row) =>
            String(row.tenant_id) !== key.tenantId ||
            String(row.bundle_id) !== String(bundle.id),
        ))
    ) {
      blockers.add("PREREQUISITE_LINEAGE_MISMATCH");
    }
    if (
      bundle &&
      (Number(bundle.formal_requirement_count) !== 0 ||
        bundle.formal_action_authorized !== false ||
        bundle.provider_called !== false ||
        bundle.external_mutation_performed !== false)
    ) {
      blockers.add("PREREQUISITE_SIDE_EFFECT_FLAGS_INVALID");
    }
    if (
      bundle &&
      (Number(bundle.expected_binding_count) !== 11 || bindings.length !== 11)
    ) {
      blockers.add("PREREQUISITE_BINDING_COUNT_INVALID");
    }

    const count = (kind: Ncrv2PrerequisiteKind) =>
      bindings.filter((binding) => binding.kind === kind).length;
    if (
      bundle &&
      (count("VENDURE_STATUS_TRANSPORT") !== 1 ||
        count("WORKER_LEASE_RECOVERY") !== 1 ||
        count("STRIPE_CUSTOMER_CREATED") !== 1 ||
        count("EXTERNAL_CELL_PASS") !== 1 ||
        count("REAL_MEDIA") !== 6 ||
        count("HUMAN_AAL2_FRESH") !== 1)
    ) {
      blockers.add("PREREQUISITE_KIND_CARDINALITY_INVALID");
    }
    if (
      bundle &&
      (new Set(bindings.map((binding) => binding.id)).size !== bindings.length ||
        new Set(bindings.map((binding) => binding.receiptId)).size !==
          bindings.length ||
        new Set(bindings.map((binding) => binding.receiptSha256)).size !==
          bindings.length ||
        new Set(
          bindings.map(
            (binding) => `${binding.kind}:${binding.slotOrdinal}`,
          ),
        ).size !== bindings.length)
    ) {
      blockers.add("PREREQUISITE_DUPLICATE_BINDING");
    }
    if (
      bundle &&
      bindings.some(
        (binding) =>
          binding.persisted !== true ||
          binding.synthetic !== false ||
          binding.state !== "PASS" ||
          !SHA256.test(binding.receiptSha256) ||
          binding.receiptId.trim().length === 0,
      )
    ) {
      blockers.add("PREREQUISITE_RECEIPT_NOT_REAL_PASS");
    }

    const at = (kind: Ncrv2PrerequisiteKind) =>
      bindings.find((binding) => binding.kind === kind)?.observedAt ?? null;
    const vendureAt = at("VENDURE_STATUS_TRANSPORT");
    const workerAt = at("WORKER_LEASE_RECOVERY");
    const stripeAt = at("STRIPE_CUSTOMER_CREATED");
    if (
      bundle &&
      (!vendureAt ||
        !workerAt ||
        !stripeAt ||
        vendureAt > workerAt ||
        workerAt > stripeAt)
    ) {
      blockers.add("PREREQUISITE_SEQUENCE_INVALID");
    }

    const freshnessKinds = new Set<Ncrv2PrerequisiteKind>([
      "EXTERNAL_CELL_PASS",
      "REAL_MEDIA",
      "HUMAN_AAL2_FRESH",
    ]);
    const currentAtObservedTime =
      bundle !== null &&
      bindings
        .filter((binding) => freshnessKinds.has(binding.kind))
        .every(
          (binding) =>
            binding.validUntil !== null && binding.validUntil > observedAt,
        );
    if (bundle && !currentAtObservedTime) {
      blockers.add("PREREQUISITE_RECEIPT_EXPIRED");
    }

    if (bundle) {
      const hashInput: Ncrv2PrerequisiteBundleHashInput = {
        id: String(bundle.id),
        tenantId: String(bundle.tenant_id),
        packageId: String(bundle.package_id),
        gateEvaluationId: String(bundle.gate_evaluation_id),
        evaluationScopeSha256: String(bundle.evaluation_scope_sha256),
        evaluatedAt: iso(bundle.evaluated_at, "row.evaluatedAt"),
        bindings,
        formalRequirementCount: 0,
        formalActionAuthorized: false,
        providerCalled: false,
        externalMutationPerformed: false,
      };
      if (
        computeNcrv2PrerequisiteBundleSha256(hashInput) !==
        String(bundle.combined_receipt_sha256)
      ) {
        blockers.add("PREREQUISITE_COMBINED_HASH_MISMATCH");
      }
    }

    blockers.add("REAL_EVIDENCE_COMBINATION_NOT_EVALUATED");
    const technicallyComplete =
      blockers.size === 1 &&
      blockers.has("REAL_EVIDENCE_COMBINATION_NOT_EVALUATED");
    await client.query("COMMIT");

    return {
      status: technicallyComplete
        ? "PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION"
        : "BLOCKED",
      blockers: Object.freeze([...blockers].sort()),
      tenantId: key.tenantId,
      packageId: key.packageId,
      gateEvaluationId: key.gateEvaluationId,
      evaluationScopeSha256: key.evaluationScopeSha256,
      bundle: {
        present: Boolean(bundle),
        bundleId: bundle ? String(bundle.id) : null,
        combinedReceiptSha256: bundle
          ? String(bundle.combined_receipt_sha256)
          : null,
        exactBindingCount: bindings.length === 11 ? 11 : 0,
        exactRealMediaCount: count("REAL_MEDIA") === 6 ? 6 : 0,
        currentAtObservedTime,
        complete: technicallyComplete,
      },
      formalTruth: {
        clubsCompleted: 60,
        clubsTotal: 120,
        clubsPercent: 50,
        ncrv2Satisfied: 0,
        ncrv2Total: 14,
        cclub061: "ACTIVE_BLOCKED",
        cclub063: "NOT_FORMALLY_ACTIVATED",
        formalActionPerformed: false,
        formalStatusUnchanged: true,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
