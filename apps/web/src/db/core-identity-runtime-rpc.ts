import {createHash, randomBytes, randomUUID} from "node:crypto";

import type {IdentityBundle} from "./core-identity-repository";
// Isolated Club release adapter: same two persisted aliases as the adopted Core source.
// This parser does not add permissions or modify the shared UI role registry.
type RoleKey = string;
function normalizeRoleKey(key: string) {
  return key === "holiday-manager" || key === "clubs-marketing-community-manager" ? "club-manager" : key;
}
import {getCoreIdentityRuntimeRpcPool} from "./core-identity-runtime-pool";

const AUTH0_IDENTITY_BUNDLE_SCHEMA = "crays.core.identity-bundle.v1";
const TENANT_SESSION_SCHEMA = "crays.core.tenant-session.v1";
const TENANT_CONTEXT_CHOICES_SCHEMA = "crays.core.tenant-context-choices.v1";
const TENANT_SESSION_SELECTION_SCHEMA = "crays.core.tenant-session-selection.v1";
const AUTH_METHOD_TYPES = new Set(["contact", "social", "passkey", "mfa", "signer", "nostr"]);
const ACCOUNT_STATUSES = new Set(["active", "review", "blocked"]);
const CONTACT_TYPES = new Set(["contact", "nip05", "npub"]);
const MEMBERSHIP_STATUSES = new Set(["invited", "active", "review", "suspended"]);
const ASSIGNMENT_STATUSES = new Set(["active", "review", "revoked"]);
const NOSTR_BINDING_STATUSES = new Set(["missing", "pending", "verified", "system_attested", "revoked"]);
const NIP05_STATUSES = new Set(["not_claimed", "claimed", "resolved", "mismatch", "verified"]);
const NOSTR_ISSUERS = new Set(["crays", "external"]);
const ISSUANCE_STATUSES = new Set(["required", "queued", "issued", "handoff_pending", "active", "revoked"]);
const PRIVATE_KEY_HANDOFFS = new Set(["not_created", "one_time_pending", "confirmed", "not_applicable"]);
const PROOF_METHODS = new Set(["nip07", "nip46", "nip98", "server_generated_once"]);
const SIGNER_STATUSES = new Set(["not_connected", "pending", "connected", "verified"]);
const ENTITY_TYPES = new Set([
  "portfolio", "studio", "deal", "project", "property", "property-case",
  "partner", "bank-package", "loan-case", "member", "document",
]);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const KNOWN_ROLE_KEYS = new Set<RoleKey>([
  "crays-management", "admin", "deal-manager", "expansion-manager",
  "finance", "hr", "franchise-candidate", "franchise-partner",
  "studio-manager", "club-manager", "bank-partner", "investor",
  "landlord", "vendor", "reviewer", "gym-member", "guest",
  // Existing explicit Clubs role keys; parsing never grants an assignment or entitlement.
  "clubs-ambassador", "clubs-member",
]);

type RpcQueryResult = {rowCount: number | null; rows: unknown[]};

export type CoreIdentityRuntimeRpcQuery = (
  text: string,
  values: readonly unknown[],
) => Promise<RpcQueryResult>;

export type CoreTenantSessionV1 = {
  sessionId: string;
  accountId: string;
  organizationId: string;
  roleKey: RoleKey;
  expiresAt: string;
};

export type CoreTenantContextChoiceV1 = Readonly<{
  choiceRef: string;
  expectedVersion: string;
  organizationId: string;
  organizationName: string;
  roleContextId: string;
  roleKey: RoleKey;
  verticalRoot: "coffee" | "retail" | "gym" | "clubs";
  partnerTenantId: string;
  operatorDisplayName: string;
  operatorLegalEntityId: string;
  legalEntityDisplayName: string;
  storeId: string | null;
  siteDisplayName: string;
  relationshipId: string;
  purpose: string;
  policyVersion: string;
  freshnessAt: string;
}>;

export type CoreTenantContextChoicesV1 = Readonly<{
  accountId: string;
  issuedAt: string;
  expiresAt: string;
  contexts: readonly CoreTenantContextChoiceV1[];
}>;

export type CoreTenantSessionSelectionState =
  | "selected"
  | "replayed"
  | "denied"
  | "stale"
  | "conflict"
  | "rate_limited";

export type CoreTenantSessionSelectionV1 = Readonly<{
  state: CoreTenantSessionSelectionState;
  sessionId: string | null;
  accountId: string;
  organizationId: string | null;
  roleKey: RoleKey | null;
  expiresAt: string | null;
  receiptId: string | null;
  selectedContext: CoreTenantContextChoiceV1 | null;
  sessionToken: string | null;
}>;

export class CoreIdentityRuntimeRpcContractError extends Error {
  readonly code: "INVALID_RPC_INPUT" | "INVALID_RPC_ROW" | "INVALID_RPC_PAYLOAD";

  constructor(code: CoreIdentityRuntimeRpcContractError["code"]) {
    super(code);
    this.name = "CoreIdentityRuntimeRpcContractError";
    this.code = code;
  }
}

function fail(code: CoreIdentityRuntimeRpcContractError["code"]): never {
  throw new CoreIdentityRuntimeRpcContractError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function requiredString(
  row: Record<string, unknown>,
  key: string,
  maximumLength = 512,
) {
  const value = row[key];
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value
  ) fail("INVALID_RPC_PAYLOAD");
  return value;
}

function nullableString(
  row: Record<string, unknown>,
  key: string,
  maximumLength = 2048,
) {
  if (row[key] === null) return null;
  return requiredString(row, key, maximumLength);
}

function requiredBoolean(row: Record<string, unknown>, key: string) {
  if (typeof row[key] !== "boolean") fail("INVALID_RPC_PAYLOAD");
  return row[key] as boolean;
}

function requiredTimestamp(row: Record<string, unknown>, key: string) {
  const value = requiredString(row, key, 64);
  if (!ISO_TIMESTAMP.test(value) || !Number.isFinite(Date.parse(value))) {
    fail("INVALID_RPC_PAYLOAD");
  }
  return value;
}

function nullableTimestamp(row: Record<string, unknown>, key: string) {
  return row[key] === null ? null : requiredTimestamp(row, key);
}

function nullableRequiredString(
  row: Record<string, unknown>,
  key: string,
  maximumLength = 512,
) {
  return row[key] === null ? null : requiredString(row, key, maximumLength);
}

function requiredRoleKey(row: Record<string, unknown>, key: string) {
  const value = requiredString(row, key, 64);
  const canonicalValue = normalizeRoleKey(value);
  if (!canonicalValue || !KNOWN_ROLE_KEYS.has(canonicalValue as RoleKey)) fail("INVALID_RPC_PAYLOAD");
  return canonicalValue as RoleKey;
}

function requiredEnum(
  row: Record<string, unknown>,
  key: string,
  allowed: ReadonlySet<string>,
) {
  const value = requiredString(row, key, 64);
  if (!allowed.has(value)) fail("INVALID_RPC_PAYLOAD");
  return value;
}

function nullableEnum(
  row: Record<string, unknown>,
  key: string,
  allowed: ReadonlySet<string>,
) {
  if (row[key] === null) return null;
  return requiredEnum(row, key, allowed);
}

function requiredStringArray(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (
    !Array.isArray(value) ||
    value.some((item) =>
      typeof item !== "string" ||
      item.length === 0 ||
      item.length > 256 ||
      item.trim() !== item
    )
  ) fail("INVALID_RPC_PAYLOAD");
  return [...new Set(value as string[])];
}

function exactRecord(value: unknown, keys: readonly string[]) {
  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    fail("INVALID_RPC_PAYLOAD");
  }
  return value;
}

function parseAccount(value: unknown) {
  const row = exactRecord(value, [
    "account_id", "display_name", "primary_contact", "primary_contact_type",
    "status", "crays_id", "default_role",
  ]);
  requiredString(row, "account_id");
  requiredString(row, "display_name");
  nullableString(row, "primary_contact");
  requiredEnum(row, "primary_contact_type", CONTACT_TYPES);
  requiredEnum(row, "status", ACCOUNT_STATUSES);
  requiredString(row, "crays_id");
  requiredRoleKey(row, "default_role");
  return row;
}

function parseAccessIdentity(value: unknown, accountId: string) {
  const row = exactRecord(value, [
    "identity_id", "account_id", "method_type", "provider_key", "verified",
    "last_used_at",
  ]);
  requiredString(row, "identity_id");
  if (requiredString(row, "account_id") !== accountId) fail("INVALID_RPC_PAYLOAD");
  requiredEnum(row, "method_type", AUTH_METHOD_TYPES);
  if (requiredString(row, "provider_key", 128) !== "auth0") {
    fail("INVALID_RPC_PAYLOAD");
  }
  if (!requiredBoolean(row, "verified")) fail("INVALID_RPC_PAYLOAD");
  nullableTimestamp(row, "last_used_at");
  return row;
}

function parseNostrIdentity(value: unknown, accountId: string) {
  if (value === null) return null;
  const row = exactRecord(value, [
    "account_id", "npub", "pubkey_hex", "nip05", "nip05_status", "issuer",
    "issuance_status", "private_key_handoff", "access_enabled", "proof_method",
    "signer_status", "linked_at", "last_signed_event_at",
  ]);
  if (requiredString(row, "account_id") !== accountId) fail("INVALID_RPC_PAYLOAD");
  nullableString(row, "npub");
  nullableString(row, "pubkey_hex");
  nullableString(row, "nip05");
  requiredEnum(row, "nip05_status", NIP05_STATUSES);
  requiredEnum(row, "issuer", NOSTR_ISSUERS);
  requiredEnum(row, "issuance_status", ISSUANCE_STATUSES);
  requiredEnum(row, "private_key_handoff", PRIVATE_KEY_HANDOFFS);
  requiredBoolean(row, "access_enabled");
  nullableEnum(row, "proof_method", PROOF_METHODS);
  requiredEnum(row, "signer_status", SIGNER_STATUSES);
  nullableTimestamp(row, "linked_at");
  nullableTimestamp(row, "last_signed_event_at");
  return row;
}

function parseMembership(value: unknown, accountId: string) {
  const row = exactRecord(value, [
    "account_id", "organization_id", "role_key", "status", "scopes",
  ]);
  if (requiredString(row, "account_id") !== accountId) fail("INVALID_RPC_PAYLOAD");
  requiredString(row, "organization_id");
  requiredRoleKey(row, "role_key");
  requiredEnum(row, "status", MEMBERSHIP_STATUSES);
  row.scopes = requiredStringArray(row, "scopes");
  return row;
}

function parseRoleAssignment(value: unknown, accountId: string) {
  const row = exactRecord(value, [
    "assignment_id", "account_id", "role_key", "nostr_binding_status",
    "nostr_pubkey_hex", "nostr_nip05", "nostr_verified_at", "organization_id",
    "entity_type", "entity_id", "granted_by_account_id", "status",
  ]);
  requiredString(row, "assignment_id");
  if (requiredString(row, "account_id") !== accountId) fail("INVALID_RPC_PAYLOAD");
  requiredRoleKey(row, "role_key");
  requiredEnum(row, "nostr_binding_status", NOSTR_BINDING_STATUSES);
  nullableString(row, "nostr_pubkey_hex");
  nullableString(row, "nostr_nip05");
  nullableTimestamp(row, "nostr_verified_at");
  nullableString(row, "organization_id");
  nullableEnum(row, "entity_type", ENTITY_TYPES);
  nullableString(row, "entity_id");
  nullableString(row, "granted_by_account_id");
  requiredEnum(row, "status", ASSIGNMENT_STATUSES);
  return row;
}

function parseArray<T>(
  value: unknown,
  maximumLength: number,
  parser: (item: unknown) => T,
) {
  if (!Array.isArray(value) || value.length > maximumLength) {
    fail("INVALID_RPC_PAYLOAD");
  }
  return value.map(parser);
}

export function parseAuth0IdentityBundleRpcV1(value: unknown): IdentityBundle | null {
  if (value === null) return null;
  const payload = exactRecord(value, [
    "schema_version", "account", "access_identities", "nostr_identity",
    "memberships", "role_assignments",
  ]);
  if (payload.schema_version !== AUTH0_IDENTITY_BUNDLE_SCHEMA) {
    fail("INVALID_RPC_PAYLOAD");
  }
  const account = parseAccount(payload.account);
  const accountId = requiredString(account, "account_id");
  return {
    account,
    accessIdentities: parseArray(
      payload.access_identities,
      64,
      (item) => parseAccessIdentity(item, accountId),
    ),
    nostrIdentity: parseNostrIdentity(payload.nostr_identity, accountId),
    nip05Handles: [],
    memberships: parseArray(
      payload.memberships,
      256,
      (item) => parseMembership(item, accountId),
    ),
    roleAssignments: parseArray(
      payload.role_assignments,
      256,
      (item) => parseRoleAssignment(item, accountId),
    ),
  };
}

export function parseAuth0LoginContextRpcV1(value: unknown, subject: string): IdentityBundle | null {
  validateSubject(subject);
  if (value === null) return null;
  const payload = exactRecord(value, ["schema_version", "source_auth_identity_id", "bundle"]);
  if (payload.schema_version !== "crays.core.auth0-login-context.v1") fail("INVALID_RPC_PAYLOAD");
  const sourceId = requiredString(payload, "source_auth_identity_id");
  const bundle = parseAuth0IdentityBundleRpcV1(payload.bundle);
  if (!bundle) fail("INVALID_RPC_PAYLOAD");
  const matches = bundle.accessIdentities.filter(identity =>
    identity.identity_id === sourceId && identity.provider_key === "auth0" && identity.verified === true,
  );
  if (matches.length !== 1) fail("INVALID_RPC_PAYLOAD");
  // Only the database-selected login link receives the already verified session subject.
  // Other linked identities remain intact; never infer the source from array order.
  return {
    ...bundle,
    accessIdentities: bundle.accessIdentities.map(identity => identity.identity_id === sourceId
      ? {...identity, provider_subject: subject}
      : identity),
  };
}

export function parseTenantSessionRpcV1(
  value: unknown,
  expectedAccountId: string,
): CoreTenantSessionV1 | null {
  if (value === null) return null;
  const payload = exactRecord(value, [
    "schema_version", "session_id", "account_id", "organization_id", "role_key",
    "expires_at",
  ]);
  if (payload.schema_version !== TENANT_SESSION_SCHEMA) fail("INVALID_RPC_PAYLOAD");
  const accountId = requiredString(payload, "account_id");
  if (accountId !== expectedAccountId) fail("INVALID_RPC_PAYLOAD");
  const expiresAt = requiredTimestamp(payload, "expires_at");
  if (Date.parse(expiresAt) <= Date.now()) fail("INVALID_RPC_PAYLOAD");
  return {
    sessionId: requiredString(payload, "session_id"),
    accountId,
    organizationId: requiredString(payload, "organization_id"),
    roleKey: requiredRoleKey(payload, "role_key"),
    expiresAt,
  };
}

const TENANT_VERTICALS = new Set(["coffee", "retail", "gym", "clubs"]);
const TENANT_SELECTION_STATES = new Set<CoreTenantSessionSelectionState>([
  "selected", "replayed", "denied", "stale", "conflict", "rate_limited",
]);
const CHOICE_REF = /^[A-Za-z0-9_-]{43}$/;
const POSITIVE_VERSION = /^[1-9][0-9]{0,18}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9_.:-]{15,199}$/;

function parseTenantContextChoice(value: unknown): CoreTenantContextChoiceV1 {
  const row = exactRecord(value, [
    "choice_ref", "expected_version", "organization_id", "organization_name",
    "role_context_id", "role_key", "vertical_root", "partner_tenant_id",
    "operator_display_name", "operator_legal_entity_id",
    "legal_entity_display_name", "store_id", "site_display_name",
    "relationship_id", "purpose", "policy_version", "freshness_at",
  ]);
  const choiceRef = requiredString(row, "choice_ref", 43);
  const expectedVersion = requiredString(row, "expected_version", 19);
  if (!CHOICE_REF.test(choiceRef) || !POSITIVE_VERSION.test(expectedVersion)) {
    fail("INVALID_RPC_PAYLOAD");
  }
  const verticalRoot = requiredEnum(row, "vertical_root", TENANT_VERTICALS) as
    CoreTenantContextChoiceV1["verticalRoot"];
  return Object.freeze({
    choiceRef,
    expectedVersion,
    organizationId: requiredString(row, "organization_id"),
    organizationName: requiredString(row, "organization_name"),
    roleContextId: requiredString(row, "role_context_id"),
    roleKey: requiredRoleKey(row, "role_key"),
    verticalRoot,
    partnerTenantId: requiredString(row, "partner_tenant_id"),
    operatorDisplayName: requiredString(row, "operator_display_name"),
    operatorLegalEntityId: requiredString(row, "operator_legal_entity_id"),
    legalEntityDisplayName: requiredString(row, "legal_entity_display_name"),
    storeId: nullableRequiredString(row, "store_id"),
    siteDisplayName: requiredString(row, "site_display_name"),
    relationshipId: requiredString(row, "relationship_id"),
    purpose: requiredString(row, "purpose", 128),
    policyVersion: requiredString(row, "policy_version", 128),
    freshnessAt: requiredTimestamp(row, "freshness_at"),
  });
}

export function parseTenantContextChoicesRpcV1(
  value: unknown,
  expectedAccountId: string,
): CoreTenantContextChoicesV1 {
  const payload = exactRecord(value, [
    "schema_version", "account_id", "issued_at", "expires_at", "contexts",
  ]);
  if (payload.schema_version !== TENANT_CONTEXT_CHOICES_SCHEMA) {
    fail("INVALID_RPC_PAYLOAD");
  }
  const accountId = requiredString(payload, "account_id");
  if (accountId !== expectedAccountId) fail("INVALID_RPC_PAYLOAD");
  const issuedAt = requiredTimestamp(payload, "issued_at");
  const expiresAt = requiredTimestamp(payload, "expires_at");
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) fail("INVALID_RPC_PAYLOAD");
  return Object.freeze({
    accountId,
    issuedAt,
    expiresAt,
    contexts: parseArray(payload.contexts, 50, parseTenantContextChoice),
  });
}

export function parseTenantSessionSelectionRpcV1(
  value: unknown,
  expectedAccountId: string,
): Omit<CoreTenantSessionSelectionV1, "sessionToken"> {
  const payload = exactRecord(value, [
    "schema_version", "state", "session_id", "account_id", "organization_id",
    "role_key", "expires_at", "receipt_id", "selected_context",
  ]);
  if (payload.schema_version !== TENANT_SESSION_SELECTION_SCHEMA) {
    fail("INVALID_RPC_PAYLOAD");
  }
  const accountId = requiredString(payload, "account_id");
  if (accountId !== expectedAccountId) fail("INVALID_RPC_PAYLOAD");
  const state = requiredEnum(
    payload,
    "state",
    TENANT_SELECTION_STATES,
  ) as CoreTenantSessionSelectionState;
  const selectedContext = payload.selected_context === null
    ? null
    : parseTenantContextChoice(payload.selected_context);
  const sessionId = nullableRequiredString(payload, "session_id");
  const organizationId = nullableRequiredString(payload, "organization_id");
  const roleKey = payload.role_key === null
    ? null
    : requiredRoleKey(payload, "role_key");
  const expiresAt = nullableTimestamp(payload, "expires_at");
  const receiptId = nullableRequiredString(payload, "receipt_id");
  const accepted = state === "selected" || state === "replayed";
  if (
    accepted !== Boolean(
      sessionId && organizationId && roleKey && expiresAt && receiptId &&
      selectedContext,
    )
  ) fail("INVALID_RPC_PAYLOAD");
  return Object.freeze({
    state,
    sessionId,
    accountId,
    organizationId,
    roleKey,
    expiresAt,
    receiptId,
    selectedContext,
  });
}

function validateOpaqueIdentifier(value: string, maximumLength = 512) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function validateSubject(subject: string) {
  if (!validateOpaqueIdentifier(subject, 512)) fail("INVALID_RPC_INPUT");
  return subject;
}

function validateIssuer(issuer: string) {
  if (!validateOpaqueIdentifier(issuer, 512)) fail("INVALID_RPC_INPUT");
  try {
    const url = new URL(issuer);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.origin.toLowerCase() !== url.origin ||
      `${url.origin}/` !== issuer
    ) fail("INVALID_RPC_INPUT");
  } catch {
    fail("INVALID_RPC_INPUT");
  }
  return issuer;
}

function hashClientId(clientId: string) {
  if (!validateOpaqueIdentifier(clientId, 512)) fail("INVALID_RPC_INPUT");
  return createHash("sha256").update(clientId, "utf8").digest("hex");
}

function validateAccountId(accountId: string) {
  if (!validateOpaqueIdentifier(accountId, 512)) fail("INVALID_RPC_INPUT");
  return accountId;
}

function validateChoiceRef(choiceRef: string) {
  if (typeof choiceRef !== "string" || !CHOICE_REF.test(choiceRef)) {
    fail("INVALID_RPC_INPUT");
  }
  return choiceRef;
}

function validateExpectedVersion(expectedVersion: string) {
  if (
    typeof expectedVersion !== "string" ||
    !POSITIVE_VERSION.test(expectedVersion)
  ) fail("INVALID_RPC_INPUT");
  return expectedVersion;
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (
    typeof idempotencyKey !== "string" ||
    !IDEMPOTENCY_KEY.test(idempotencyKey)
  ) fail("INVALID_RPC_INPUT");
  return idempotencyKey;
}

function validateInactivitySeconds(inactivitySeconds: number) {
  if (
    !Number.isSafeInteger(inactivitySeconds) ||
    inactivitySeconds < 60 ||
    inactivitySeconds > 86_400
  ) fail("INVALID_RPC_INPUT");
  return inactivitySeconds;
}

function hashTenantSessionToken(rawToken: string) {
  if (
    typeof rawToken !== "string" ||
    rawToken.length < 32 ||
    rawToken.length > 4096
  ) fail("INVALID_RPC_INPUT");
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function payloadFromSingleRow(result: RpcQueryResult) {
  if (
    result.rowCount !== 1 ||
    result.rows.length !== 1 ||
    !isRecord(result.rows[0]) ||
    !hasExactKeys(result.rows[0], ["payload"])
  ) fail("INVALID_RPC_ROW");
  return result.rows[0].payload;
}

function defaultQuery(
  text: string,
  values: readonly unknown[],
): Promise<RpcQueryResult> {
  return getCoreIdentityRuntimeRpcPool().query(text, [...values]);
}

export function createCoreIdentityRuntimeRpcClient(
  query: CoreIdentityRuntimeRpcQuery = defaultQuery,
) {
  return {
    async resolveAuth0LoginContextV1(subject: string) {
      const validatedSubject = validateSubject(subject);
      const result = await query(
        "select crays_core_rpc.resolve_auth0_login_context_v1($1::text) as payload",
        [validatedSubject],
      );
      return parseAuth0LoginContextRpcV1(payloadFromSingleRow(result), validatedSubject);
    },

    async resolveAuth0IdentityBundleV1(subject: string) {
      const result = await query(
        "select crays_core_rpc.resolve_auth0_identity_bundle_v1($1::text) as payload",
        [validateSubject(subject)],
      );
      return parseAuth0IdentityBundleRpcV1(payloadFromSingleRow(result));
    },

    async resolveAuth0IdentityBundleV2(
      issuer: string,
      subject: string,
      clientId: string,
    ) {
      const result = await query(
        "select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as payload",
        [validateIssuer(issuer), validateSubject(subject), hashClientId(clientId)],
      );
      return parseAuth0IdentityBundleRpcV1(payloadFromSingleRow(result));
    },

    async resolveTenantSessionV1(
      rawToken: string,
      expectedAccountId: string,
      inactivitySeconds: number,
    ) {
      const accountId = validateAccountId(expectedAccountId);
      const tokenSha256 = hashTenantSessionToken(rawToken);
      const result = await query(
        "select crays_core_rpc.resolve_tenant_session_v1($1::text,$2::text,$3::integer) as payload",
        [tokenSha256, accountId, validateInactivitySeconds(inactivitySeconds)],
      );
      return parseTenantSessionRpcV1(payloadFromSingleRow(result), accountId);
    },

    async listAdmissibleTenantContextsV1(accountIdInput: string) {
      const accountId = validateAccountId(accountIdInput);
      const result = await query(
        "select crays_core_rpc.list_admissible_tenant_contexts_v1($1::text) as payload",
        [accountId],
      );
      return parseTenantContextChoicesRpcV1(
        payloadFromSingleRow(result),
        accountId,
      );
    },

    async issueTenantSessionFromChoiceV1(input: {
      accountId: string;
      choiceRef: string;
      expectedVersion: string;
      idempotencyKey: string;
      ttlSeconds: number;
    }): Promise<CoreTenantSessionSelectionV1> {
      const accountId = validateAccountId(input.accountId);
      const choiceRef = validateChoiceRef(input.choiceRef);
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
      const ttlSeconds = validateInactivitySeconds(input.ttlSeconds);
      const sessionToken = randomBytes(32).toString("base64url");
      const sessionId = `tenant_session_${randomUUID()}`;
      const choiceRefSha256 = createHash("sha256")
        .update(choiceRef, "utf8").digest("hex");
      const idempotencyKeySha256 = createHash("sha256")
        .update(idempotencyKey, "utf8").digest("hex");
      const requestSha256 = createHash("sha256").update(JSON.stringify([
        "crays.core.tenant-session-selection.v1", accountId,
        choiceRefSha256, expectedVersion, idempotencyKeySha256, ttlSeconds,
      ])).digest("hex");
      const result = await query(
        "select crays_core_rpc.issue_tenant_session_from_choice_v1($1::text,$2::text,$3::bigint,$4::text,$5::text,$6::text,$7::text,$8::integer) as payload",
        [
          accountId,
          choiceRefSha256,
          expectedVersion,
          idempotencyKeySha256,
          requestSha256,
          sessionId,
          hashTenantSessionToken(sessionToken),
          ttlSeconds,
        ],
      );
      const parsed = parseTenantSessionSelectionRpcV1(
        payloadFromSingleRow(result),
        accountId,
      );
      return Object.freeze({
        ...parsed,
        sessionToken: parsed.state === "selected" ? sessionToken : null,
      });
    },
  };
}

export async function resolveAuth0IdentityBundleV1(subject: string) {
  return createCoreIdentityRuntimeRpcClient().resolveAuth0IdentityBundleV1(subject);
}

export async function resolveAuth0IdentityBundleV2(
  issuer: string,
  subject: string,
  clientId: string,
) {
  return createCoreIdentityRuntimeRpcClient().resolveAuth0IdentityBundleV2(
    issuer,
    subject,
    clientId,
  );
}

export async function resolveTenantSessionV1(
  rawToken: string,
  expectedAccountId: string,
  inactivitySeconds: number,
) {
  return createCoreIdentityRuntimeRpcClient().resolveTenantSessionV1(
    rawToken,
    expectedAccountId,
    inactivitySeconds,
  );
}

export async function listAdmissibleTenantContextsV1(accountId: string) {
  return createCoreIdentityRuntimeRpcClient()
    .listAdmissibleTenantContextsV1(accountId);
}

export async function issueTenantSessionFromChoiceV1(input: {
  accountId: string;
  choiceRef: string;
  expectedVersion: string;
  idempotencyKey: string;
  ttlSeconds: number;
}) {
  return createCoreIdentityRuntimeRpcClient()
    .issueTenantSessionFromChoiceV1(input);
}

/**
 * Source-integrated fail-closed runtime boundary.
 * Deployment remains blocked until the exact SQL package and dedicated runtime binding are admitted.
 * There is no fallback to the broad CRAYS_DATABASE_URL pool.
 */

/** NEXT_DEPLOYMENT private candidate. This envelope must come from the protected
 * selected-identity V2 SQL projection. Old V1/subject-only envelopes are denied.
 * Current binding table permits auth0 only; no issuer-provider namespace widening. */
export function parseAuth0IdentityBundleRpcV2(
  value: unknown, issuer: string, subject: string, clientId: string,
): IdentityBundle | null {
  const expectedIssuer = validateIssuer(issuer);
  const expectedSubject = validateSubject(subject);
  const expectedClientHash = hashClientId(clientId);
  if (value === null) return null;
  const envelope = exactRecord(value, ["schema_version", "source_auth_identity_id", "exact_binding", "bundle"]);
  if (envelope.schema_version !== "crays.core.auth0-login-context.v2") fail("INVALID_RPC_PAYLOAD");
  const sourceIdentityId = requiredString(envelope, "source_auth_identity_id");
  const b = exactRecord(envelope.exact_binding, [
    "issuer_binding_id", "identity_id", "account_id", "account_security_version",
    "binding_version", "provider_key", "issuer", "client_id_sha256", "provider_subject_sha256",
    "approval_record_sha256", "approval_purpose", "policy_version", "status",
    "valid_from", "valid_until", "revoked_at",
  ]);
  requiredString(b, "issuer_binding_id");
  if (requiredString(b, "identity_id") !== sourceIdentityId || requiredString(b, "provider_key", 128) !== "auth0"
      || requiredString(b, "issuer") !== expectedIssuer || requiredString(b, "client_id_sha256", 64) !== expectedClientHash
      || requiredString(b, "provider_subject_sha256", 64) !== createHash("sha256").update(expectedSubject, "utf8").digest("hex")
      || requiredString(b, "approval_purpose") !== "approve-exact-identity-binding"
      || requiredString(b, "status") !== "active" || b.revoked_at !== null) fail("INVALID_RPC_PAYLOAD");
  for (const field of ["binding_version", "account_security_version"] as const) {
    const version = requiredString(b, field, 19);
    if (!/^[1-9][0-9]{0,18}$/.test(version) || BigInt(version) > 9223372036854775807n) fail("INVALID_RPC_PAYLOAD");
  }
  if (!/^[a-f0-9]{64}$/.test(requiredString(b, "approval_record_sha256", 64))) fail("INVALID_RPC_PAYLOAD");
  requiredString(b, "policy_version");
  const now = Date.now(), from = Date.parse(requiredTimestamp(b, "valid_from"));
  const until = nullableTimestamp(b, "valid_until");
  if (from > now || until !== null && (Date.parse(until) <= now || Date.parse(until) <= from)) fail("INVALID_RPC_PAYLOAD");
  const bundle = parseAuth0IdentityBundleRpcV1(envelope.bundle);
  if (!bundle || bundle.account.status !== "active" || bundle.account.account_id !== requiredString(b, "account_id")) fail("INVALID_RPC_PAYLOAD");
  if (bundle.accessIdentities.filter(i => i.identity_id === sourceIdentityId && i.account_id === bundle.account.account_id
      && i.provider_key === "auth0" && i.verified === true).length !== 1) fail("INVALID_RPC_PAYLOAD");
  // Only the protected selected identity receives the authenticated SDK subject.
  return {...bundle, accessIdentities: bundle.accessIdentities.map(i => i.identity_id === sourceIdentityId
    ? {...i, provider_subject: expectedSubject} : i)};
}


export function createCoreOriginalMemberIdentityRuntimeRpcClient(query:CoreIdentityRuntimeRpcQuery){
 return Object.freeze({
  async resolveAuth0IdentityBundleV2(issuer:string,subject:string,clientId:string){
   const result=await query("select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as payload",
    [validateIssuer(issuer),validateSubject(subject),hashClientId(clientId)]);
   return parseAuth0IdentityBundleRpcV2(payloadFromSingleRow(result),issuer,subject,clientId);
  }
 });
}
