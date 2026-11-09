import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const IP_LITERAL = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[[0-9a-f:]+\]$/i;

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

function requireDigest(value: string, error: string): void {
  if (!SHA256.test(value)) throw new Error(error);
}

export const REQUIRED_AUTH0_ALLOWLIST_SURFACES = [
  "CALLBACKS",
  "WEB_ORIGINS",
  "LOGOUT_URLS",
] as const;

export const REQUIRED_AUTH0_CHANGE_PHASES = [
  "TENANT_CLIENT_HOSTNAME_AND_AUTHORITY_PREFLIGHT",
  "BEFORE_STATE_CAPTURED",
  "CALLBACKS_CHANGE_PLANNED",
  "WEB_ORIGINS_CHANGE_PLANNED",
  "LOGOUT_URLS_CHANGE_PLANNED",
  "LOCAL_CONFIGURATION_VALIDATION_PLANNED",
  "POST_CHANGE_LOGIN_LOGOUT_VERIFICATION_PLANNED",
  "ROLLBACK_VERIFIED",
] as const;

export const REQUIRED_AUTH0_POST_CHANGE_VERIFICATIONS = [
  "CALLBACK_ROUND_TRIP_SUCCEEDS",
  "SILENT_SESSION_ORIGIN_SUCCEEDS",
  "LOGOUT_RETURN_SUCCEEDS",
  "UNLISTED_CALLBACK_DENIED",
  "UNLISTED_ORIGIN_DENIED",
  "UNLISTED_LOGOUT_URL_DENIED",
  "OPEN_REDIRECT_DENIED",
  "ROLLBACK_RESTORES_EXACT_BEFORE_STATE",
] as const;

export type Auth0AllowlistSurface =
  (typeof REQUIRED_AUTH0_ALLOWLIST_SURFACES)[number];
export type Auth0ChangePhase = (typeof REQUIRED_AUTH0_CHANGE_PHASES)[number];
export type Auth0PostChangeVerification =
  (typeof REQUIRED_AUTH0_POST_CHANGE_VERIFICATIONS)[number];

export interface Auth0AllowlistSurfaceChange {
  surface: Auth0AllowlistSurface;
  beforeUrls: readonly string[];
  afterUrls: readonly string[];
  requiredAdds: readonly string[];
  requiredRemovals: readonly string[];
  beforeSetSha256: string;
  afterSetSha256: string;
  rollbackSetSha256: string;
}

function sortedUnique(values: readonly string[]): string[] {
  const sorted = [...values].sort();
  if (new Set(sorted).size !== sorted.length)
    throw new Error("AUTH0_ALLOWLIST_DUPLICATE_URL");
  return sorted;
}

export function buildAuth0AllowlistSurfaceChange(
  surface: Auth0AllowlistSurface,
  beforeUrls: readonly string[],
  afterUrls: readonly string[],
): Readonly<Auth0AllowlistSurfaceChange> {
  const before = sortedUnique(beforeUrls);
  const after = sortedUnique(afterUrls);
  if (after.length === 0) throw new Error("AUTH0_ALLOWLIST_AFTER_SET_EMPTY");
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const requiredAdds = after.filter((value) => !beforeSet.has(value));
  const requiredRemovals = before.filter((value) => !afterSet.has(value));
  if (requiredAdds.length === 0 && requiredRemovals.length === 0)
    throw new Error("AUTH0_ALLOWLIST_NOOP_CHANGE_FORBIDDEN");
  const beforeSetSha256 = hash({ surface, urls: before });
  const afterSetSha256 = hash({ surface, urls: after });
  return Object.freeze({
    surface,
    beforeUrls: Object.freeze(before),
    afterUrls: Object.freeze(after),
    requiredAdds: Object.freeze(requiredAdds),
    requiredRemovals: Object.freeze(requiredRemovals),
    beforeSetSha256,
    afterSetSha256,
    rollbackSetSha256: beforeSetSha256,
  });
}

function validateAllowlistUrl(
  raw: string,
  surface: Auth0AllowlistSurface,
  approvedHostname: string | null,
): void {
  if (raw.includes("*") || /localhost/i.test(raw))
    throw new Error("AUTH0_ALLOWLIST_UNSAFE_URL");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("AUTH0_ALLOWLIST_URL_INVALID");
  }
  if (
    parsed.protocol !== "https:" ||
    (approvedHostname !== null && parsed.hostname !== approvedHostname) ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    IP_LITERAL.test(parsed.hostname)
  )
    throw new Error("AUTH0_ALLOWLIST_UNSAFE_URL");
  if (surface === "WEB_ORIGINS" && parsed.pathname !== "/")
    throw new Error("AUTH0_WEB_ORIGIN_PATH_FORBIDDEN");
}

export interface Auth0AllowlistChangePlanCore {
  schemaVersion: "crays.clubs.auth0-allowlist-change-plan.v1";
  planId: string;
  auth0TenantRefSha256: string;
  auth0ClientRefSha256: string;
  auth0ClientType: "REGULAR_WEB_APPLICATION";
  approvedHostname: string;
  hostnameApproved: boolean;
  hostnameApprovalReceiptSha256: string | null;
  auth0MutationAuthorized: boolean;
  auth0ExecutionAuthorityReceiptSha256: string | null;
  beforeClientConfigurationSha256: string;
  expectedAfterClientConfigurationSha256: string;
  rollbackClientConfigurationSha256: string;
  changes: readonly Auth0AllowlistSurfaceChange[];
  phases: readonly Auth0ChangePhase[];
  postChangeVerifications: readonly Auth0PostChangeVerification[];
  rollbackOrder: readonly Auth0AllowlistSurface[];
}

export interface SealedAuth0AllowlistChangePlan extends Auth0AllowlistChangePlanCore {
  changePlanSha256: string;
}

export function sealAuth0AllowlistChangePlan(
  input: Auth0AllowlistChangePlanCore,
): Readonly<SealedAuth0AllowlistChangePlan> {
  if (!input.planId.trim() || !HOSTNAME.test(input.approvedHostname))
    throw new Error("AUTH0_CHANGE_PLAN_IDENTITY_INVALID");
  for (const value of [
    input.auth0TenantRefSha256,
    input.auth0ClientRefSha256,
    input.beforeClientConfigurationSha256,
    input.expectedAfterClientConfigurationSha256,
    input.rollbackClientConfigurationSha256,
  ])
    requireDigest(value, "AUTH0_CHANGE_PLAN_DIGEST_INVALID");
  if (input.beforeClientConfigurationSha256 === input.expectedAfterClientConfigurationSha256)
    throw new Error("AUTH0_CHANGE_PLAN_NOOP_CONFIGURATION_FORBIDDEN");
  if (input.rollbackClientConfigurationSha256 !== input.beforeClientConfigurationSha256)
    throw new Error("AUTH0_CHANGE_PLAN_ROLLBACK_CONFIGURATION_MISMATCH");
  if (input.hostnameApproved) {
    if (
      input.hostnameApprovalReceiptSha256 === null ||
      !SHA256.test(input.hostnameApprovalReceiptSha256)
    )
      throw new Error("AUTH0_CHANGE_PLAN_HOSTNAME_APPROVAL_REQUIRED");
  } else if (input.hostnameApprovalReceiptSha256 !== null) {
    throw new Error("AUTH0_CHANGE_PLAN_DORMANT_HOSTNAME_APPROVAL_FORBIDDEN");
  }
  if (input.auth0MutationAuthorized) {
    if (
      input.auth0ExecutionAuthorityReceiptSha256 === null ||
      !SHA256.test(input.auth0ExecutionAuthorityReceiptSha256)
    )
      throw new Error("AUTH0_CHANGE_PLAN_EXECUTION_AUTHORITY_REQUIRED");
  } else if (input.auth0ExecutionAuthorityReceiptSha256 !== null) {
    throw new Error("AUTH0_CHANGE_PLAN_DORMANT_EXECUTION_AUTHORITY_FORBIDDEN");
  }
  if (
    input.changes.length !== REQUIRED_AUTH0_ALLOWLIST_SURFACES.length ||
    input.changes.map((change) => change.surface).join("|") !==
      REQUIRED_AUTH0_ALLOWLIST_SURFACES.join("|")
  )
    throw new Error("AUTH0_CHANGE_PLAN_SURFACE_SET_INVALID");
  for (const change of input.changes) {
    const rebuilt = buildAuth0AllowlistSurfaceChange(
      change.surface,
      change.beforeUrls,
      change.afterUrls,
    );
    for (const url of change.beforeUrls)
      validateAllowlistUrl(url, change.surface, null);
    for (const url of change.afterUrls)
      validateAllowlistUrl(url, change.surface, input.approvedHostname);
    if (
      change.requiredAdds.join("|") !== rebuilt.requiredAdds.join("|") ||
      change.requiredRemovals.join("|") !== rebuilt.requiredRemovals.join("|") ||
      change.beforeSetSha256 !== rebuilt.beforeSetSha256 ||
      change.afterSetSha256 !== rebuilt.afterSetSha256 ||
      change.rollbackSetSha256 !== rebuilt.rollbackSetSha256
    )
      throw new Error("AUTH0_CHANGE_PLAN_SURFACE_MANIFEST_MISMATCH");
  }
  if (input.phases.join("|") !== REQUIRED_AUTH0_CHANGE_PHASES.join("|"))
    throw new Error("AUTH0_CHANGE_PLAN_PHASE_ORDER_INVALID");
  if (
    input.postChangeVerifications.join("|") !==
    REQUIRED_AUTH0_POST_CHANGE_VERIFICATIONS.join("|")
  )
    throw new Error("AUTH0_CHANGE_PLAN_VERIFICATION_SET_INVALID");
  const expectedRollback = [...REQUIRED_AUTH0_ALLOWLIST_SURFACES].reverse();
  if (input.rollbackOrder.join("|") !== expectedRollback.join("|"))
    throw new Error("AUTH0_CHANGE_PLAN_ROLLBACK_ORDER_INVALID");
  const core = {
    ...input,
    changes: Object.freeze(input.changes.map((change) => Object.freeze({ ...change }))),
    phases: Object.freeze([...input.phases]),
    postChangeVerifications: Object.freeze([...input.postChangeVerifications]),
    rollbackOrder: Object.freeze([...input.rollbackOrder]),
  };
  return Object.freeze({ ...core, changePlanSha256: hash(core) });
}

export type Auth0ChangeReadinessFailure =
  | "AUTH0_CHANGE_PLAN_HASH_MISMATCH"
  | "HOSTNAME_APPROVAL_MISSING"
  | "AUTH0_EXECUTION_AUTHORITY_MISSING"
  | "AUTH0_EXECUTION_AUTHORITY_MISMATCH"
  | "AUTH0_TENANT_MISMATCH"
  | "AUTH0_CLIENT_MISMATCH"
  | "AUTH0_BEFORE_STATE_MISMATCH"
  | "PHASE_RECEIPT_ORDER_INVALID"
  | "PHASE_RECEIPT_INVALID"
  | "OFFLINE_AUTH0_MUTATION_FORBIDDEN";

export interface Auth0ChangeReadinessInput {
  plan: SealedAuth0AllowlistChangePlan;
  observedAuth0TenantRefSha256: string;
  observedAuth0ClientRefSha256: string;
  observedBeforeClientConfigurationSha256: string;
  observedAuth0ExecutionAuthorityReceiptSha256: string | null;
  phaseReceipts: readonly { phase: Auth0ChangePhase; receiptSha256: string }[];
  auth0MutationPerformed: boolean;
}

export function assessAuth0AllowlistChangeReadiness(
  input: Auth0ChangeReadinessInput,
): Readonly<{
  planValid: boolean;
  readyForAuth0Mutation: boolean;
  failures: readonly Auth0ChangeReadinessFailure[];
  readinessReceiptSha256: string;
}> {
  const failures: Auth0ChangeReadinessFailure[] = [];
  const { changePlanSha256, ...core } = input.plan;
  const planValid = hash(core) === changePlanSha256;
  if (!planValid) failures.push("AUTH0_CHANGE_PLAN_HASH_MISMATCH");
  if (!input.plan.hostnameApproved || input.plan.hostnameApprovalReceiptSha256 === null)
    failures.push("HOSTNAME_APPROVAL_MISSING");
  if (
    !input.plan.auth0MutationAuthorized ||
    input.plan.auth0ExecutionAuthorityReceiptSha256 === null
  ) {
    failures.push("AUTH0_EXECUTION_AUTHORITY_MISSING");
  } else if (
    input.observedAuth0ExecutionAuthorityReceiptSha256 !==
    input.plan.auth0ExecutionAuthorityReceiptSha256
  ) {
    failures.push("AUTH0_EXECUTION_AUTHORITY_MISMATCH");
  }
  if (input.observedAuth0TenantRefSha256 !== input.plan.auth0TenantRefSha256)
    failures.push("AUTH0_TENANT_MISMATCH");
  if (input.observedAuth0ClientRefSha256 !== input.plan.auth0ClientRefSha256)
    failures.push("AUTH0_CLIENT_MISMATCH");
  if (
    input.observedBeforeClientConfigurationSha256 !==
    input.plan.beforeClientConfigurationSha256
  )
    failures.push("AUTH0_BEFORE_STATE_MISMATCH");
  if (
    input.phaseReceipts.map((item) => item.phase).join("|") !==
    REQUIRED_AUTH0_CHANGE_PHASES.join("|")
  )
    failures.push("PHASE_RECEIPT_ORDER_INVALID");
  if (input.phaseReceipts.some((item) => !SHA256.test(item.receiptSha256)))
    failures.push("PHASE_RECEIPT_INVALID");
  if (input.auth0MutationPerformed)
    failures.push("OFFLINE_AUTH0_MUTATION_FORBIDDEN");
  const receiptCore = {
    changePlanSha256,
    observedAuth0TenantRefSha256: input.observedAuth0TenantRefSha256,
    observedAuth0ClientRefSha256: input.observedAuth0ClientRefSha256,
    phaseReceipts: input.phaseReceipts,
    failures: [...failures].sort(),
  };
  return Object.freeze({
    planValid,
    readyForAuth0Mutation: failures.length === 0,
    failures: Object.freeze(failures),
    readinessReceiptSha256: hash(receiptCore),
  });
}

export function verifySealedAuth0AllowlistChangePlan(
  plan: SealedAuth0AllowlistChangePlan,
): boolean {
  const { changePlanSha256, ...core } = plan;
  return hash(core) === changePlanSha256;
}
