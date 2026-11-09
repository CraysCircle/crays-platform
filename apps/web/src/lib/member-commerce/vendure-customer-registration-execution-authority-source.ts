import "server-only";

export const VENDURE_EXECUTION_AUTHORITY_CONTRACT_VERSION = 1 as const;
export const VENDURE_EXECUTION_REQUESTED_ACTION =
  "vendure.customer-registration.status-reconciliation.authorize" as const;
export const VENDURE_EXECUTION_CAPABILITY =
  "vendure.customer-registration.status.read" as const;
export const VENDURE_EXECUTION_PURPOSE =
  "vendure-customer-registration-reconciliation" as const;
export const VENDURE_EXECUTION_TARGET_RESOURCE_TYPE =
  "vendure_customer_registration_scheduler" as const;
export const VENDURE_EXECUTION_MAX_APPROVAL_AGE_MS = 5 * 60 * 1000;
export const VENDURE_EXECUTION_MAX_AAL2_AGE_MS = 5 * 60 * 1000;
export const VENDURE_EXECUTION_MAX_GRANT_WINDOW_MS = 15 * 60 * 1000;
export const VENDURE_EXECUTION_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type VendureExecutionAuthorityErrorCode =
  | "MALFORMED_SCOPE"
  | "INVALID_HASH"
  | "ACTION_SCOPE_MISMATCH"
  | "APPROVAL_NOT_RECONCILED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_STALE"
  | "RECEIPT_MISMATCH"
  | "ACTOR_BINDING_MISMATCH"
  | "AAL2_SESSION_MISMATCH"
  | "AAL2_NOT_FRESH"
  | "AUTHORIZATION_WINDOW_INVALID";

export class VendureExecutionAuthorityError extends Error {
  readonly code: VendureExecutionAuthorityErrorCode;

  constructor(code: VendureExecutionAuthorityErrorCode, message: string) {
    super(message);
    this.name = "VendureExecutionAuthorityError";
    this.code = code;
  }
}

export interface CanonicalVendureActionIntent {
  actionIntentId: string;
  schemaVersion: number;
  actorPersonId: string;
  craysTenantId: string;
  relationshipId: string;
  roleAssignmentId: string;
  purpose: string;
  contextUrn: string;
  capability: string;
  targetResourceType: string;
  targetResourceId: string;
  requestedAction: string;
  policyVersion: string;
  preflightHash: string;
  issuedAt: string;
  expiresAt: string;
  correlationId: string;
  state: string;
}

export interface CanonicalVendureActionReceipt {
  receiptId: string;
  actionIntentId: string;
  requestHash: string;
  effectiveContextHash: string;
  policyVersion: string;
  finalComparison: string;
  reconciliationState: string;
  createdAt: string;
  correlationId: string;
}

export interface CanonicalVendureActorBinding {
  tenantId: string;
  actorPersonId: string;
  accountReferenceHash: string;
  relationshipId: string;
  roleAssignmentId: string;
  lifecycleState: string;
  validFrom: string;
  validUntil: string | null;
}

export interface CanonicalHumanAssuranceSession {
  deviceSessionId: string;
  tenantId: string;
  accountReferenceHash: string;
  assuranceLevel: string;
  state: string;
  issuedAt: string;
  expiresAt: string;
}

export interface PrepareVendureExecutionAuthorizationInput {
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  authorizationId: string;
  authorizationSha256: string;
  expiresAt: string;
  approval: {
    intent: CanonicalVendureActionIntent;
    receipt: CanonicalVendureActionReceipt;
    receiptSha256: string;
  };
  actorBinding: CanonicalVendureActorBinding;
  humanAal2: {
    session: CanonicalHumanAssuranceSession;
    sessionReceiptId: string;
    sessionReceiptSha256: string;
  };
}

export interface PreparedVendureExecutionAuthorizationGrant {
  contractVersion: typeof VENDURE_EXECUTION_AUTHORITY_CONTRACT_VERSION;
  authorizationId: string;
  authorizationSha256: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  approvalReceiptId: string;
  approvalReceiptSha256: string;
  humanAal2ReceiptId: string;
  humanAal2ReceiptSha256: string;
  humanAal2AuthenticatedAt: string;
  authorizedAt: string;
  expiresAt: string;
  actorPersonId: string;
  actorAccountReferenceHash: string;
  policyVersion: string;
  sourceActionIntentId: string;
  sourceDeviceSessionId: string;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function fail(
  code: VendureExecutionAuthorityErrorCode,
  message: string,
): never {
  throw new VendureExecutionAuthorityError(code, message);
}

function requireText(
  value: string,
  field: string,
  code: VendureExecutionAuthorityErrorCode = "MALFORMED_SCOPE",
): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(code, field + " must be a non-empty string");
  }
  return value;
}

function requireSha256(value: string, field: string): string {
  if (!SHA256_PATTERN.test(value)) {
    fail("INVALID_HASH", field + " must be a lowercase SHA-256");
  }
  return value;
}

function requireDate(
  value: string,
  field: string,
  code: VendureExecutionAuthorityErrorCode,
): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    fail(code, field + " must be an ISO timestamp");
  }
  return parsed;
}

function equalExact(
  actual: string,
  expected: string,
  field: string,
  code: VendureExecutionAuthorityErrorCode,
): void {
  if (actual !== expected) {
    fail(code, field + " does not match the exact execution scope");
  }
}

function expectedContextUrn(
  schedulerId: string,
  vendureEndpointSha256: string,
): string {
  return "urn:crays:clubs:vendure-customer-registration-reconciliation:" +
    schedulerId + ":" + vendureEndpointSha256;
}

export function prepareVendureExecutionAuthorizationGrant(
  input: PrepareVendureExecutionAuthorizationInput,
  observedAt: Date = new Date(),
): Readonly<PreparedVendureExecutionAuthorizationGrant> {
  const tenantId = requireText(input.tenantId, "tenantId");
  const schedulerId = requireText(input.schedulerId, "schedulerId");
  const authorizationId = requireText(input.authorizationId, "authorizationId");
  const vendureEndpointSha256 = requireSha256(
    input.vendureEndpointSha256,
    "vendureEndpointSha256",
  );
  const authorizationSha256 = requireSha256(
    input.authorizationSha256,
    "authorizationSha256",
  );
  const approvalReceiptSha256 = requireSha256(
    input.approval.receiptSha256,
    "approval.receiptSha256",
  );
  const sessionReceiptSha256 = requireSha256(
    input.humanAal2.sessionReceiptSha256,
    "humanAal2.sessionReceiptSha256",
  );

  if (!Number.isFinite(observedAt.getTime())) {
    fail("MALFORMED_SCOPE", "observedAt must be a valid date");
  }

  const intent = input.approval.intent;
  const receipt = input.approval.receipt;
  const actor = input.actorBinding;
  const session = input.humanAal2.session;
  const nowMs = observedAt.getTime();

  requireText(intent.actionIntentId, "approval.intent.actionIntentId");
  requireText(receipt.receiptId, "approval.receipt.receiptId");
  requireText(session.deviceSessionId, "humanAal2.session.deviceSessionId");
  const sessionReceiptId = requireText(
    input.humanAal2.sessionReceiptId,
    "humanAal2.sessionReceiptId",
  );
  equalExact(
    sessionReceiptId,
    "identity-device-session:" + session.deviceSessionId,
    "humanAal2.sessionReceiptId",
    "AAL2_SESSION_MISMATCH",
  );

  if (!Number.isInteger(intent.schemaVersion) || intent.schemaVersion < 1) {
    fail("ACTION_SCOPE_MISMATCH", "action intent schema version is invalid");
  }

  equalExact(intent.craysTenantId, tenantId, "intent tenant", "ACTION_SCOPE_MISMATCH");
  equalExact(
    intent.requestedAction,
    VENDURE_EXECUTION_REQUESTED_ACTION,
    "requested action",
    "ACTION_SCOPE_MISMATCH",
  );
  equalExact(
    intent.capability,
    VENDURE_EXECUTION_CAPABILITY,
    "capability",
    "ACTION_SCOPE_MISMATCH",
  );
  equalExact(
    intent.purpose,
    VENDURE_EXECUTION_PURPOSE,
    "purpose",
    "ACTION_SCOPE_MISMATCH",
  );
  equalExact(
    intent.targetResourceType,
    VENDURE_EXECUTION_TARGET_RESOURCE_TYPE,
    "target resource type",
    "ACTION_SCOPE_MISMATCH",
  );
  equalExact(
    intent.targetResourceId,
    schedulerId,
    "target resource id",
    "ACTION_SCOPE_MISMATCH",
  );
  equalExact(
    intent.contextUrn,
    expectedContextUrn(schedulerId, vendureEndpointSha256),
    "context URN",
    "ACTION_SCOPE_MISMATCH",
  );
  requireSha256(intent.preflightHash, "approval.intent.preflightHash");

  if (intent.state !== "reconciled") {
    fail(
      "APPROVAL_NOT_RECONCILED",
      "action intent must be reconciled before it can authorize execution",
    );
  }

  const intentIssuedAt = requireDate(
    intent.issuedAt,
    "approval.intent.issuedAt",
    "APPROVAL_EXPIRED",
  );
  const intentExpiresAt = requireDate(
    intent.expiresAt,
    "approval.intent.expiresAt",
    "APPROVAL_EXPIRED",
  );
  if (
    intentIssuedAt.getTime() > nowMs + VENDURE_EXECUTION_MAX_CLOCK_SKEW_MS ||
    intentExpiresAt.getTime() <= nowMs ||
    intentExpiresAt.getTime() <= intentIssuedAt.getTime()
  ) {
    fail("APPROVAL_EXPIRED", "action intent is outside its valid time window");
  }

  equalExact(
    receipt.actionIntentId,
    intent.actionIntentId,
    "receipt action intent",
    "RECEIPT_MISMATCH",
  );
  equalExact(
    receipt.policyVersion,
    intent.policyVersion,
    "receipt policy version",
    "RECEIPT_MISMATCH",
  );
  equalExact(
    receipt.correlationId,
    intent.correlationId,
    "receipt correlation",
    "RECEIPT_MISMATCH",
  );
  requireSha256(receipt.requestHash, "approval.receipt.requestHash");
  requireSha256(
    receipt.effectiveContextHash,
    "approval.receipt.effectiveContextHash",
  );
  if (
    receipt.reconciliationState !== "matched" ||
    receipt.finalComparison.toLowerCase() !== "authorized"
  ) {
    fail(
      "APPROVAL_NOT_RECONCILED",
      "receipt must be matched with final comparison authorized",
    );
  }

  const receiptCreatedAt = requireDate(
    receipt.createdAt,
    "approval.receipt.createdAt",
    "APPROVAL_STALE",
  );
  if (
    receiptCreatedAt.getTime() < intentIssuedAt.getTime() ||
    receiptCreatedAt.getTime() > nowMs + VENDURE_EXECUTION_MAX_CLOCK_SKEW_MS ||
    nowMs - receiptCreatedAt.getTime() > VENDURE_EXECUTION_MAX_APPROVAL_AGE_MS
  ) {
    fail("APPROVAL_STALE", "approval receipt is not fresh");
  }

  equalExact(actor.tenantId, tenantId, "actor tenant", "ACTOR_BINDING_MISMATCH");
  equalExact(
    actor.actorPersonId,
    intent.actorPersonId,
    "actor person",
    "ACTOR_BINDING_MISMATCH",
  );
  equalExact(
    actor.relationshipId,
    intent.relationshipId,
    "actor relationship",
    "ACTOR_BINDING_MISMATCH",
  );
  equalExact(
    actor.roleAssignmentId,
    intent.roleAssignmentId,
    "actor role assignment",
    "ACTOR_BINDING_MISMATCH",
  );
  requireSha256(actor.accountReferenceHash, "actorBinding.accountReferenceHash");
  if (actor.lifecycleState.toLowerCase() !== "active") {
    fail("ACTOR_BINDING_MISMATCH", "actor binding must be active");
  }
  const actorValidFrom = requireDate(
    actor.validFrom,
    "actorBinding.validFrom",
    "ACTOR_BINDING_MISMATCH",
  );
  const actorValidUntil = actor.validUntil
    ? requireDate(
        actor.validUntil,
        "actorBinding.validUntil",
        "ACTOR_BINDING_MISMATCH",
      )
    : null;
  if (
    actorValidFrom.getTime() > nowMs ||
    (actorValidUntil && actorValidUntil.getTime() <= nowMs)
  ) {
    fail("ACTOR_BINDING_MISMATCH", "actor binding is outside its valid window");
  }

  equalExact(
    session.tenantId,
    tenantId,
    "AAL2 session tenant",
    "AAL2_SESSION_MISMATCH",
  );
  equalExact(
    session.accountReferenceHash,
    actor.accountReferenceHash,
    "AAL2 account reference",
    "AAL2_SESSION_MISMATCH",
  );
  requireSha256(
    session.accountReferenceHash,
    "humanAal2.session.accountReferenceHash",
  );
  if (!["aal2", "aal3"].includes(session.assuranceLevel.toLowerCase())) {
    fail("AAL2_SESSION_MISMATCH", "session must have AAL2 or AAL3 assurance");
  }
  if (session.state.toLowerCase() !== "active") {
    fail("AAL2_SESSION_MISMATCH", "session must be active");
  }
  const sessionIssuedAt = requireDate(
    session.issuedAt,
    "humanAal2.session.issuedAt",
    "AAL2_NOT_FRESH",
  );
  const sessionExpiresAt = requireDate(
    session.expiresAt,
    "humanAal2.session.expiresAt",
    "AAL2_SESSION_MISMATCH",
  );
  if (
    sessionIssuedAt.getTime() > nowMs + VENDURE_EXECUTION_MAX_CLOCK_SKEW_MS ||
    nowMs - sessionIssuedAt.getTime() > VENDURE_EXECUTION_MAX_AAL2_AGE_MS
  ) {
    fail("AAL2_NOT_FRESH", "AAL2 authentication is not fresh");
  }
  if (sessionExpiresAt.getTime() <= nowMs) {
    fail("AAL2_SESSION_MISMATCH", "AAL2 session has expired");
  }

  const grantExpiresAt = requireDate(
    input.expiresAt,
    "expiresAt",
    "AUTHORIZATION_WINDOW_INVALID",
  );
  if (
    grantExpiresAt.getTime() <= nowMs ||
    grantExpiresAt.getTime() - nowMs > VENDURE_EXECUTION_MAX_GRANT_WINDOW_MS ||
    grantExpiresAt.getTime() > intentExpiresAt.getTime() ||
    grantExpiresAt.getTime() > sessionExpiresAt.getTime()
  ) {
    fail(
      "AUTHORIZATION_WINDOW_INVALID",
      "execution grant exceeds an authoritative time boundary",
    );
  }

  return Object.freeze({
    contractVersion: VENDURE_EXECUTION_AUTHORITY_CONTRACT_VERSION,
    authorizationId,
    authorizationSha256,
    tenantId,
    schedulerId,
    vendureEndpointSha256,
    approvalReceiptId: receipt.receiptId,
    approvalReceiptSha256,
    humanAal2ReceiptId: sessionReceiptId,
    humanAal2ReceiptSha256: sessionReceiptSha256,
    humanAal2AuthenticatedAt: sessionIssuedAt.toISOString(),
    authorizedAt: observedAt.toISOString(),
    expiresAt: grantExpiresAt.toISOString(),
    actorPersonId: actor.actorPersonId,
    actorAccountReferenceHash: actor.accountReferenceHash,
    policyVersion: intent.policyVersion,
    sourceActionIntentId: intent.actionIntentId,
    sourceDeviceSessionId: session.deviceSessionId,
  });
}

