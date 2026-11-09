import {createHash} from "node:crypto";

export const COMMERCE_EXCEPTION_QUEUE_VERSION = "ncrv2-139.v2" as const;
const digest = (value: object) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Kind = "payment" | "fulfillment" | "return" | "refund";
type Authority = "partner_operator" | "finance" | "customer" | "crays_aggregate";
type Snapshot = Readonly<{
  snapshotId: string; snapshotSha256: string; orderId: string;
  partnerTenantId: string; operatorLegalEntityId: string; storeId: string;
  sellerLegalName: string; stripeConnectedAccountId: string; erpSiteId: string;
}>;
type Evidence = Readonly<{
  evidenceId: string; kind: string; partnerTenantId: string;
  operatorLegalEntityId: string; storeId: string;
  state: "verified" | "pending" | "revoked";
}>;

const attentionPolicy: Record<Kind, Readonly<{slaSeconds: number; expirySeconds: number}>> = {
  payment: {slaSeconds: 900, expirySeconds: 3600},
  fulfillment: {slaSeconds: 1800, expirySeconds: 7200},
  return: {slaSeconds: 3600, expirySeconds: 14400},
  refund: {slaSeconds: 1800, expirySeconds: 7200},
};

export function createCommerceException(input: Readonly<{
  kind: Kind; snapshot: Snapshot; sourceRecordId: string; sourceState: string;
  providerState: string; reasonCode: string; firstObservedAt: string;
  lastObservedAt: string; ownerRole: "partner_operator" | "finance";
  ownerAssignmentId: string; evidence: readonly Evidence[];
  originalIdempotencyKey: string;
  reconciliationState: "required" | "matched_no_effect" | "matched_effect" | "mismatch";
  nextSafeAction: "reconcile" | "retry" | "quarantine" | "acknowledge";
}>) {
  if (!/^[a-f0-9]{64}$/.test(input.snapshot.snapshotSha256) ||
      !input.sourceRecordId.trim() || !input.reasonCode.trim() ||
      !input.originalIdempotencyKey.trim() || !input.ownerAssignmentId.trim()) {
    throw new Error("COMMERCE_EXCEPTION_INPUT_INVALID");
  }
  const first = Date.parse(input.firstObservedAt);
  const last = Date.parse(input.lastObservedAt);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) {
    throw new Error("COMMERCE_EXCEPTION_TIME_INVALID");
  }
  for (const evidence of input.evidence) {
    if (evidence.state !== "verified" ||
        evidence.partnerTenantId !== input.snapshot.partnerTenantId ||
        evidence.operatorLegalEntityId !== input.snapshot.operatorLegalEntityId ||
        evidence.storeId !== input.snapshot.storeId) {
      throw new Error("COMMERCE_EXCEPTION_EVIDENCE_SCOPE_MISMATCH");
    }
  }
  if (input.nextSafeAction === "retry" && input.reconciliationState !== "matched_no_effect") {
    throw new Error("COMMERCE_EXCEPTION_RETRY_UNSAFE");
  }
  const policy = attentionPolicy[input.kind];
  const requiredInformation = input.reconciliationState === "required"
    ? "reconciliation_observation"
    : input.reconciliationState === "matched_no_effect"
      ? "provider_no_effect_proof"
      : input.reconciliationState === "matched_effect"
        ? "provider_effect_proof"
        : "mismatch_resolution";
  const body = {
    contractVersion: COMMERCE_EXCEPTION_QUEUE_VERSION,
    kind: input.kind,
    ...input.snapshot,
    sourceRecordId: input.sourceRecordId,
    sourceState: input.sourceState,
    providerState: input.providerState,
    reasonCode: input.reasonCode,
    firstObservedAt: new Date(first).toISOString(),
    lastObservedAt: new Date(last).toISOString(),
    ageSeconds: Math.floor((last - first) / 1000),
    ownerRole: input.ownerRole,
    ownerAssignmentId: input.ownerAssignmentId,
    requiredInformation,
    slaSeconds: policy.slaSeconds,
    dueAt: new Date(first + policy.slaSeconds * 1000).toISOString(),
    expiresAt: new Date(first + policy.expirySeconds * 1000).toISOString(),
    escalationOwnerRole: input.ownerRole === "finance" ? "partner_finance_manager" as const : "partner_owner" as const,
    attentionState: "UNACKNOWLEDGED" as "UNACKNOWLEDGED" | "ACKNOWLEDGED",
    attentionAcknowledgedAt: null,
    attentionAcknowledgedByAssignmentId: null,
    evidenceRefs: Object.freeze(input.evidence.map((evidence) => Object.freeze({
      evidenceId: evidence.evidenceId,
      kind: evidence.kind,
    }))),
    originalIdempotencyKey: input.originalIdempotencyKey,
    reconciliationState: input.reconciliationState,
    nextSafeAction: input.nextSafeAction,
    state: "OPEN" as const,
  };
  return Object.freeze({...body, exceptionSha256: digest(body)});
}

export function reconstructExceptionAttention(
  item: ReturnType<typeof createCommerceException>,
  now: string,
) {
  const current = Date.parse(now);
  if (!Number.isFinite(current)) throw new Error("COMMERCE_EXCEPTION_ATTENTION_TIME_INVALID");
  const expired = current >= Date.parse(item.expiresAt);
  const escalated = current >= Date.parse(item.dueAt) && item.attentionState !== "ACKNOWLEDGED";
  return Object.freeze({
    exceptionSha256: item.exceptionSha256,
    ownerRole: item.ownerRole,
    ownerAssignmentId: item.ownerAssignmentId,
    requiredInformation: item.requiredInformation,
    dueAt: item.dueAt,
    expiresAt: item.expiresAt,
    attentionState: expired ? "EXPIRED" as const : escalated ? "ESCALATED" as const : item.attentionState,
    escalationOwnerRole: item.escalationOwnerRole,
    nextSafeAction: item.nextSafeAction,
    reconstructableFromCanonicalRecord: true as const,
    notificationDeliveryRequiredForReconstruction: false as const,
  });
}

export function projectExceptionQueue(
  item: ReturnType<typeof createCommerceException>,
  viewer: Readonly<{authority: Authority; partnerTenantId?: string; operatorLegalEntityId?: string; storeId?: string}>,
) {
  if (viewer.authority === "customer") throw new Error("COMMERCE_EXCEPTION_QUEUE_DENIED");
  if (viewer.authority === "crays_aggregate") return Object.freeze({
    kind: item.kind,
    state: item.state,
    ageSeconds: item.ageSeconds,
    reconciliationState: item.reconciliationState,
    attentionState: item.attentionState,
    dueAt: item.dueAt,
    expiresAt: item.expiresAt,
    partnerPseudonym: digest({partnerTenantId: item.partnerTenantId}).slice(0, 16),
    actionable: false,
    privateEvidenceVisible: false,
    sellerBooksVisible: false,
  });
  if (viewer.partnerTenantId !== item.partnerTenantId ||
      viewer.operatorLegalEntityId !== item.operatorLegalEntityId ||
      viewer.storeId !== item.storeId) {
    throw new Error("COMMERCE_EXCEPTION_QUEUE_SCOPE_MISMATCH");
  }
  return Object.freeze({...item, actionable: true, privateEvidenceVisible: true, sellerBooksVisible: viewer.authority === "finance"});
}

export function executeExceptionAction(
  item: ReturnType<typeof createCommerceException>,
  input: Readonly<{
    authority: Authority; partnerTenantId: string; operatorLegalEntityId: string;
    storeId: string; actorAssignmentId: string;
    action: "reconcile" | "retry" | "quarantine" | "acknowledge";
    expectedExceptionSha256: string; idempotencyKey: string; occurredAt?: string;
  }>,
) {
  if (input.authority === "customer" || input.authority === "crays_aggregate") throw new Error("COMMERCE_EXCEPTION_ACTION_DENIED");
  if (input.partnerTenantId !== item.partnerTenantId ||
      input.operatorLegalEntityId !== item.operatorLegalEntityId || input.storeId !== item.storeId) {
    throw new Error("COMMERCE_EXCEPTION_ACTION_SCOPE_MISMATCH");
  }
  if (input.expectedExceptionSha256 !== item.exceptionSha256) throw new Error("COMMERCE_EXCEPTION_CONFLICT");
  if (input.action !== item.nextSafeAction) throw new Error("COMMERCE_EXCEPTION_ACTION_NOT_SAFE");
  if (input.action === "retry" && item.reconciliationState !== "matched_no_effect") throw new Error("COMMERCE_EXCEPTION_RETRY_UNSAFE");
  if (!input.idempotencyKey.trim() || !input.actorAssignmentId.trim()) throw new Error("COMMERCE_EXCEPTION_ACTION_INVALID");
  const occurredAt = input.occurredAt ?? item.lastObservedAt;
  if (!Number.isFinite(Date.parse(occurredAt))) throw new Error("COMMERCE_EXCEPTION_ACTION_TIME_INVALID");
  const body = {
    exceptionSha256: item.exceptionSha256,
    kind: item.kind,
    action: input.action,
    actorAssignmentId: input.actorAssignmentId,
    occurredAt: new Date(occurredAt).toISOString(),
    partnerTenantId: item.partnerTenantId,
    operatorLegalEntityId: item.operatorLegalEntityId,
    storeId: item.storeId,
    providerAccount: item.stripeConnectedAccountId,
    erpSiteId: item.erpSiteId,
    originalIdempotencyKey: item.originalIdempotencyKey,
    actionIdempotencyKey: input.idempotencyKey,
    attentionAcknowledged: input.action === "acknowledge",
    businessState: input.action === "acknowledge" ? "PENDING_RECONCILIATION" as const : "COMMAND_COMMITTED" as const,
    state: "COMMAND_COMMITTED" as const,
  };
  return Object.freeze({...body, receiptSha256: digest(body)});
}
