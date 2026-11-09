import { createHash } from "node:crypto";

export const NCRV2_REQUIREMENT_COUNT = 14;

export type Ncrv2RequirementEvidence = Readonly<{
  requirementId: string;
  result: "PASS" | "FAIL" | "PARTIAL" | "MISSING";
  evidenceHash: string;
  authorityKind: string;
  observedAt: Date;
  validUntil?: Date;
}>;

export type Ncrv2TechnicalSequence = Readonly<{
  vendureStatusTransport: Readonly<{ state: "NOT_APPLIED" | "APPLIED"; at?: Date }>;
  workerScheduler: Readonly<{ state: "NOT_PROVEN" | "LEASE_RECOVERY_PROVEN"; at?: Date }>;
  stripeCustomer: Readonly<{ state: "NOT_CREATED" | "CREATED_AFTER_PREREQUISITES"; at?: Date }>;
  externalCell: Readonly<{ state: "MISSING" | "FAIL" | "PASS"; evidenceHash?: string }>;
  realMedia: readonly Readonly<{
    mediaId: string;
    state: "REAL_RIGHTS_RECEIPT_ATTACHED" | "MISSING" | "UNVERIFIED";
    evidenceHash?: string;
  }>[];
  humanAal2: Readonly<{
    state: "MISSING" | "STALE" | "FRESH";
    observedAt?: Date;
    validUntil?: Date;
    evidenceHash?: string;
  }>;
}>;

export type EvaluateNcrv2GateInput = Readonly<{
  scopeKey: string;
  expectedRequirementIds: readonly string[];
  requirementManifestHash: string;
  evidence: readonly Ncrv2RequirementEvidence[];
  sequence: Ncrv2TechnicalSequence;
  evaluatedAt: Date;
}>;

export type Ncrv2GateEvaluation = Readonly<{
  result: "BLOCKED" | "TECHNICALLY_ELIGIBLE";
  counts: Readonly<{ pass: number; fail: number; partial: number; missing: number }>;
  blockerCodes: readonly string[];
  requirementManifestHash: string;
  combinedEvidenceHash: string;
  formalStatusUnchanged: true;
  formalActionExecuted: false;
}>;

type CanonicalSequence = Readonly<{
  vendureStatusTransport: Readonly<{ state: string; at?: string }>;
  workerScheduler: Readonly<{ state: string; at?: string }>;
  stripeCustomer: Readonly<{ state: string; at?: string }>;
  externalCell: Readonly<{ state: string; evidenceHash?: string }>;
  realMedia: readonly Readonly<{ mediaId: string; state: string; evidenceHash?: string }>[];
  humanAal2: Readonly<{
    state: string;
    observedAt?: string;
    validUntil?: string;
    evidenceHash?: string;
  }>;
}>;

function requireHash(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("NCRV2_INVALID_SHA256:" + field);
  return normalized;
}

function requireValidDate(value: Date, field: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("NCRV2_INVALID_TIMESTAMP:" + field);
  }
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("NCRV2_EMPTY_VALUE:" + field);
  return normalized;
}

function requireCanonicalRequirementIds(ids: readonly string[]): readonly string[] {
  if (ids.length !== NCRV2_REQUIREMENT_COUNT) {
    throw new Error("NCRV2_EXPECTED_REQUIREMENT_COUNT:" + NCRV2_REQUIREMENT_COUNT);
  }
  const normalized = ids.map((id) => requireNonEmpty(id, "requirementId"));
  if (new Set(normalized).size !== NCRV2_REQUIREMENT_COUNT) {
    throw new Error("NCRV2_DUPLICATE_REQUIREMENT_ID");
  }
  return normalized;
}

function optionalHash(value: string | undefined, field: string): string | undefined {
  return value === undefined ? undefined : requireHash(value, field);
}

function sequenceEvaluation(
  sequence: Ncrv2TechnicalSequence,
  evaluatedAt: Date,
): { blockers: string[]; canonical: CanonicalSequence } {
  const blockers: string[] = [];
  const validateAppliedAt = (
    stateComplete: boolean,
    at: Date | undefined,
    missingCode: string,
    futureCode: string,
    field: string,
  ): string | undefined => {
    if (!stateComplete || !at) {
      blockers.push(missingCode);
      return undefined;
    }
    requireValidDate(at, field);
    if (at.getTime() > evaluatedAt.getTime()) blockers.push(futureCode);
    return at.toISOString();
  };

  const vendureAt = validateAppliedAt(
    sequence.vendureStatusTransport.state === "APPLIED",
    sequence.vendureStatusTransport.at,
    "VENDURE_STATUS_TRANSPORT_NOT_APPLIED",
    "VENDURE_STATUS_TRANSPORT_FUTURE_DATED",
    "vendureStatusTransport.at",
  );
  const workerAt = validateAppliedAt(
    sequence.workerScheduler.state === "LEASE_RECOVERY_PROVEN",
    sequence.workerScheduler.at,
    "PERSISTED_WORKER_SCHEDULER_NOT_PROVEN",
    "PERSISTED_WORKER_SCHEDULER_FUTURE_DATED",
    "workerScheduler.at",
  );
  const stripeAt = validateAppliedAt(
    sequence.stripeCustomer.state === "CREATED_AFTER_PREREQUISITES",
    sequence.stripeCustomer.at,
    "STRIPE_CUSTOMER_NOT_CREATED_AFTER_PREREQUISITES",
    "STRIPE_CUSTOMER_FUTURE_DATED",
    "stripeCustomer.at",
  );

  if (vendureAt && workerAt && Date.parse(vendureAt) > Date.parse(workerAt)) {
    blockers.push("WORKER_PRECEDES_VENDURE_TRANSPORT");
  }
  if (workerAt && stripeAt && Date.parse(workerAt) > Date.parse(stripeAt)) {
    blockers.push("STRIPE_CUSTOMER_PRECEDES_WORKER_PROOF");
  }

  const externalCellHash = optionalHash(
    sequence.externalCell.evidenceHash,
    "externalCell",
  );
  if (sequence.externalCell.state !== "PASS" || !externalCellHash) {
    blockers.push("EXTERNAL_CELL_NOT_PASSING");
  }

  const canonicalMedia = sequence.realMedia
    .map((media, index) => ({
      mediaId: requireNonEmpty(media.mediaId, "realMedia." + index + ".mediaId"),
      state: media.state,
      evidenceHash: optionalHash(media.evidenceHash, "realMedia." + index),
    }))
    .sort((left, right) => left.mediaId.localeCompare(right.mediaId));
  if (
    canonicalMedia.length !== 6 ||
    new Set(canonicalMedia.map((media) => media.mediaId)).size !== 6 ||
    canonicalMedia.some(
      (media) => media.state !== "REAL_RIGHTS_RECEIPT_ATTACHED" || !media.evidenceHash,
    )
  ) {
    blockers.push("SIX_REAL_RIGHTS_CLEARED_MEDIA_NOT_PROVEN");
  }

  const aal2 = sequence.humanAal2;
  let aal2ObservedAt: string | undefined;
  let aal2ValidUntil: string | undefined;
  const aal2Hash = optionalHash(aal2.evidenceHash, "humanAal2");
  if (aal2.observedAt) {
    requireValidDate(aal2.observedAt, "humanAal2.observedAt");
    aal2ObservedAt = aal2.observedAt.toISOString();
  }
  if (aal2.validUntil) {
    requireValidDate(aal2.validUntil, "humanAal2.validUntil");
    aal2ValidUntil = aal2.validUntil.toISOString();
  }
  if (
    aal2.state !== "FRESH" ||
    !aal2ObservedAt ||
    !aal2ValidUntil ||
    !aal2Hash ||
    Date.parse(aal2ObservedAt) > evaluatedAt.getTime() ||
    Date.parse(aal2ValidUntil) <= evaluatedAt.getTime() ||
    Date.parse(aal2ObservedAt) >= Date.parse(aal2ValidUntil)
  ) {
    blockers.push("FRESH_HUMAN_AAL2_NOT_PROVEN");
  }

  return {
    blockers,
    canonical: {
      vendureStatusTransport: {
        state: sequence.vendureStatusTransport.state,
        at: vendureAt,
      },
      workerScheduler: {
        state: sequence.workerScheduler.state,
        at: workerAt,
      },
      stripeCustomer: {
        state: sequence.stripeCustomer.state,
        at: stripeAt,
      },
      externalCell: {
        state: sequence.externalCell.state,
        evidenceHash: externalCellHash,
      },
      realMedia: canonicalMedia,
      humanAal2: {
        state: aal2.state,
        observedAt: aal2ObservedAt,
        validUntil: aal2ValidUntil,
        evidenceHash: aal2Hash,
      },
    },
  };
}

export function evaluateNcrv2Gate(input: EvaluateNcrv2GateInput): Ncrv2GateEvaluation {
  const scopeKey = requireNonEmpty(input.scopeKey, "scopeKey");
  requireValidDate(input.evaluatedAt, "evaluatedAt");
  const expectedIds = requireCanonicalRequirementIds(input.expectedRequirementIds);
  const expectedSet = new Set(expectedIds);
  const requirementManifestHash = requireHash(
    input.requirementManifestHash,
    "requirementManifestHash",
  );

  if (input.evidence.length !== NCRV2_REQUIREMENT_COUNT) {
    throw new Error("NCRV2_EVIDENCE_COUNT:" + input.evidence.length);
  }
  const evidenceIds = input.evidence.map((item) => item.requirementId.trim());
  if (new Set(evidenceIds).size !== NCRV2_REQUIREMENT_COUNT) {
    throw new Error("NCRV2_DUPLICATE_EVIDENCE_REQUIREMENT_ID");
  }
  if (evidenceIds.some((id) => !expectedSet.has(id))) {
    throw new Error("NCRV2_EVIDENCE_REQUIREMENT_SET_MISMATCH");
  }

  const blockerCodes: string[] = [];
  const counts = { pass: 0, fail: 0, partial: 0, missing: 0 };
  const canonicalEvidence = [...input.evidence]
    .sort((left, right) => left.requirementId.localeCompare(right.requirementId))
    .map((item) => {
      const requirementId = requireNonEmpty(item.requirementId, "evidence.requirementId");
      const authorityKind = requireNonEmpty(
        item.authorityKind,
        requirementId + ".authorityKind",
      );
      requireValidDate(item.observedAt, requirementId + ".observedAt");
      const evidenceHash = requireHash(item.evidenceHash, requirementId);
      counts[item.result.toLowerCase() as "pass" | "fail" | "partial" | "missing"] += 1;
      if (item.result !== "PASS") {
        blockerCodes.push("REQUIREMENT_" + item.result + ":" + requirementId);
      }
      if (item.observedAt.getTime() > input.evaluatedAt.getTime()) {
        blockerCodes.push("REQUIREMENT_FUTURE_DATED:" + requirementId);
      }
      if (item.validUntil) {
        requireValidDate(item.validUntil, requirementId + ".validUntil");
        if (item.validUntil.getTime() <= item.observedAt.getTime()) {
          throw new Error("NCRV2_INVALID_VALIDITY_INTERVAL:" + requirementId);
        }
        if (item.validUntil.getTime() <= input.evaluatedAt.getTime()) {
          blockerCodes.push("REQUIREMENT_EXPIRED:" + requirementId);
        }
      }
      return {
        requirementId,
        result: item.result,
        evidenceHash,
        authorityKind,
        observedAt: item.observedAt.toISOString(),
        validUntil: item.validUntil?.toISOString(),
      };
    });

  const sequence = sequenceEvaluation(input.sequence, input.evaluatedAt);
  blockerCodes.push(...sequence.blockers);
  const uniqueBlockers = [...new Set(blockerCodes)].sort();
  const combinedEvidenceHash = createHash("sha256")
    .update(
      JSON.stringify({
        scopeKey,
        requirementManifestHash,
        evidence: canonicalEvidence,
        sequence: sequence.canonical,
        evaluatedAt: input.evaluatedAt.toISOString(),
      }),
    )
    .digest("hex");

  return {
    result:
      counts.pass === NCRV2_REQUIREMENT_COUNT && uniqueBlockers.length === 0
        ? "TECHNICALLY_ELIGIBLE"
        : "BLOCKED",
    counts,
    blockerCodes: uniqueBlockers,
    requirementManifestHash,
    combinedEvidenceHash,
    formalStatusUnchanged: true,
    formalActionExecuted: false,
  };
}
