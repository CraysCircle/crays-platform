import "server-only";

export const STRIPE_CUSTOMER_SEQUENCE_GATE_VERSION = 1 as const;
export const STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_TTL_MS = 2 * 60 * 1000;
export const STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_VENDURE_AGE_MS = 5 * 60 * 1000;
export const STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_LEASE_AGE_MS = 5 * 60 * 1000;
export const STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_ABSENCE_AGE_MS = 2 * 60 * 1000;
export const STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type StripeCustomerSequenceBlockReason =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "VENDURE_SCOPE_MISMATCH"
  | "VENDURE_REAL_PROVIDER_EVIDENCE_MISSING"
  | "VENDURE_SUBJECT_NOT_CONFIRMED"
  | "VENDURE_EVIDENCE_STALE"
  | "AUTHORIZATION_LINEAGE_MISSING"
  | "LEASE_SCOPE_MISMATCH"
  | "LEASE_RECOVERY_EVIDENCE_MISSING"
  | "LEASE_EVIDENCE_STALE"
  | "STRIPE_ABSENCE_SCOPE_MISMATCH"
  | "STRIPE_ABSENCE_NOT_CONFIRMED"
  | "STRIPE_ABSENCE_EVIDENCE_STALE"
  | "GATE_WINDOW_INVALID";

export interface RealVendureStatusRunEvidence {
  runReceiptId: string;
  runReceiptSha256: string;
  persisted: boolean;
  evidenceClass: string;
  transport: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  workerRunId: string;
  authorizationConsumptionReceiptId: string;
  authorizationConsumptionReceiptSha256: string;
  runStatus: string;
  customerSubjectReferenceHash: string;
  subjectStatus: string;
  providerCustomerReferenceHash: string;
  providerCreateReplay: boolean;
  completedAt: string;
}

export interface PersistedLeaseRecoveryEvidence {
  leaseRecoveryReceiptId: string;
  leaseRecoveryReceiptSha256: string;
  persisted: boolean;
  tenantId: string;
  schedulerId: string;
  workerRunId: string;
  state: string;
  recoveryCapable: boolean;
  observedAt: string;
  leaseExpiresAt: string;
}

export interface StripeCustomerAbsenceEvidence {
  absenceReceiptId: string;
  absenceReceiptSha256: string;
  persisted: boolean;
  source: string;
  tenantId: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  state: string;
  checkedAt: string;
  externalProviderCalls: number;
}

export interface EvaluateStripeCustomerSequenceGateInput {
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  requestedAt: string;
  expiresAt: string;
  vendure: RealVendureStatusRunEvidence;
  leaseRecovery: PersistedLeaseRecoveryEvidence;
  stripeCustomerAbsence: StripeCustomerAbsenceEvidence;
}

export interface StripeCustomerSequenceGateDecision {
  gateVersion: typeof STRIPE_CUSTOMER_SEQUENCE_GATE_VERSION;
  eligible: boolean;
  status:
    | "ELIGIBLE_FOR_SEPARATELY_AUTHORIZED_CREATE"
    | "BLOCKED";
  blockReasons: readonly StripeCustomerSequenceBlockReason[];
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  evaluatedAt: string;
  expiresAt: string;
  vendureRunReceiptId: string;
  leaseRecoveryReceiptId: string;
  stripeAbsenceReceiptId: string;
  stripeApiCalled: false;
  stripeCustomerCreated: false;
  externalMutationAuthorized: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function evaluateStripeCustomerSequenceGate(
  input: EvaluateStripeCustomerSequenceGateInput,
  observedAt: Date = new Date(),
): Readonly<StripeCustomerSequenceGateDecision> {
  const reasons = new Set<StripeCustomerSequenceBlockReason>();
  const nowMs = observedAt.getTime();
  const add = (reason: StripeCustomerSequenceBlockReason) => reasons.add(reason);
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
      parsed.getTime() <= nowMs + STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_CLOCK_SKEW_MS &&
      nowMs - parsed.getTime() <= maxAgeMs,
    );
  };

  if (
    !Number.isFinite(nowMs) ||
    !text(input.tenantId) ||
    !text(input.schedulerId)
  ) {
    add("MALFORMED_SCOPE");
  }
  if (
    !hash(input.vendureEndpointSha256) ||
    !hash(input.stripeAccountScopeSha256) ||
    !hash(input.customerSubjectReferenceHash) ||
    !hash(input.idempotencyKeySha256)
  ) {
    add("INVALID_HASH");
  }

  const requestedAt = date(input.requestedAt);
  const expiresAt = date(input.expiresAt);
  if (
    !requestedAt ||
    !expiresAt ||
    requestedAt.getTime() > nowMs + STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_CLOCK_SKEW_MS ||
    expiresAt.getTime() <= nowMs ||
    expiresAt.getTime() <= requestedAt.getTime() ||
    expiresAt.getTime() - nowMs > STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_TTL_MS
  ) {
    add("GATE_WINDOW_INVALID");
  }

  const vendure = input.vendure;
  if (
    vendure.tenantId !== input.tenantId ||
    vendure.schedulerId !== input.schedulerId ||
    vendure.vendureEndpointSha256 !== input.vendureEndpointSha256 ||
    !hash(vendure.runReceiptSha256)
  ) {
    add("VENDURE_SCOPE_MISMATCH");
  }
  if (
    vendure.persisted !== true ||
    vendure.evidenceClass !== "REAL_PROVIDER" ||
    vendure.transport !== "HTTPS" ||
    vendure.runStatus !== "COMPLETED" ||
    vendure.providerCreateReplay !== false
  ) {
    add("VENDURE_REAL_PROVIDER_EVIDENCE_MISSING");
  }
  if (
    vendure.customerSubjectReferenceHash !== input.customerSubjectReferenceHash ||
    vendure.subjectStatus !== "CONFIRMED" ||
    !hash(vendure.providerCustomerReferenceHash)
  ) {
    add("VENDURE_SUBJECT_NOT_CONFIRMED");
  }
  if (!fresh(vendure.completedAt, STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_VENDURE_AGE_MS)) {
    add("VENDURE_EVIDENCE_STALE");
  }
  if (
    !text(vendure.authorizationConsumptionReceiptId) ||
    !hash(vendure.authorizationConsumptionReceiptSha256)
  ) {
    add("AUTHORIZATION_LINEAGE_MISSING");
  }

  const lease = input.leaseRecovery;
  if (
    lease.tenantId !== input.tenantId ||
    lease.schedulerId !== input.schedulerId ||
    lease.workerRunId !== vendure.workerRunId ||
    !hash(lease.leaseRecoveryReceiptSha256)
  ) {
    add("LEASE_SCOPE_MISMATCH");
  }
  if (
    lease.persisted !== true ||
    lease.state !== "COMPLETED" ||
    lease.recoveryCapable !== true
  ) {
    add("LEASE_RECOVERY_EVIDENCE_MISSING");
  }
  const leaseExpiresAt = date(lease.leaseExpiresAt);
  const vendureCompletedAt = date(vendure.completedAt);
  if (
    !fresh(lease.observedAt, STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_LEASE_AGE_MS) ||
    !leaseExpiresAt ||
    !vendureCompletedAt ||
    leaseExpiresAt.getTime() < vendureCompletedAt.getTime()
  ) {
    add("LEASE_EVIDENCE_STALE");
  }

  const absence = input.stripeCustomerAbsence;
  if (
    absence.tenantId !== input.tenantId ||
    absence.stripeAccountScopeSha256 !== input.stripeAccountScopeSha256 ||
    absence.customerSubjectReferenceHash !== input.customerSubjectReferenceHash ||
    !hash(absence.absenceReceiptSha256)
  ) {
    add("STRIPE_ABSENCE_SCOPE_MISMATCH");
  }
  if (
    absence.persisted !== true ||
    absence.source !== "INTERNAL_PROJECTION" ||
    absence.state !== "ABSENT" ||
    absence.externalProviderCalls !== 0
  ) {
    add("STRIPE_ABSENCE_NOT_CONFIRMED");
  }
  if (
    !fresh(
      absence.checkedAt,
      STRIPE_CUSTOMER_SEQUENCE_GATE_MAX_ABSENCE_AGE_MS,
    )
  ) {
    add("STRIPE_ABSENCE_EVIDENCE_STALE");
  }

  const blockReasons = Object.freeze([...reasons].sort());
  const eligible = blockReasons.length === 0;
  return Object.freeze({
    gateVersion: STRIPE_CUSTOMER_SEQUENCE_GATE_VERSION,
    eligible,
    status: eligible
      ? "ELIGIBLE_FOR_SEPARATELY_AUTHORIZED_CREATE"
      : "BLOCKED",
    blockReasons,
    tenantId: input.tenantId,
    schedulerId: input.schedulerId,
    vendureEndpointSha256: input.vendureEndpointSha256,
    stripeAccountScopeSha256: input.stripeAccountScopeSha256,
    customerSubjectReferenceHash: input.customerSubjectReferenceHash,
    idempotencyKeySha256: input.idempotencyKeySha256,
    evaluatedAt: observedAt.toISOString(),
    expiresAt: input.expiresAt,
    vendureRunReceiptId: vendure.runReceiptId,
    leaseRecoveryReceiptId: lease.leaseRecoveryReceiptId,
    stripeAbsenceReceiptId: absence.absenceReceiptId,
    stripeApiCalled: false,
    stripeCustomerCreated: false,
    externalMutationAuthorized: false,
  });
}

