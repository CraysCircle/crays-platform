import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import type { CraysRouteContext } from "@/lib/dal/server-trust";
import {
  getOcaSecretCustodyConsole as baseConsole,
  preflightIssueOcaCredentialGrant as baseIssuePre,
  issueOcaCredentialGrant as baseIssue,
  preflightRotateOcaSecretRef as baseRotatePre,
  rotateOcaSecretRef as baseRotate,
  preflightRevokeOcaSecretAccess as baseRevokePre,
  revokeOcaSecretAccess as baseRevoke,
  reconcileOcaSecretCommand as baseReconcile,
} from "@/db/oca-secret-lifecycle-service";
const roles = {
    admin: "programme_governance",
    "crays-management": "architecture",
    reviewer: "dpo_legal",
  } as const,
  safeId = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,199}$/,
  safePurpose = /^[a-z][a-z0-9_:-]{2,99}$/,
  families = new Set([
    "AUTHENTICATION_REQUIRED",
    "TENANT_REQUIRED",
    "ROLE_NOT_ADMITTED",
    "VALIDATION_FAILED",
    "SECRET_REF_REQUIRED",
    "SECRET_REF_NOT_ACTIVE",
    "SECRET_REF_EXPIRED",
    "SECRET_REF_REVOKED",
    "PURPOSE_NOT_ALLOWED",
    "OPERATION_NOT_ALLOWED",
    "GRANT_EXPIRED",
    "GRANT_CONSUMED",
    "ROTATION_REQUIRED",
    "DUAL_CONTROL_REQUIRED",
    "APPROVER_SEPARATION_REQUIRED",
    "EXPECTED_VERSION_CONFLICT",
    "EXPECTED_DIGEST_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "APPROVAL_REQUIRED",
    "PREFLIGHT_UNAVAILABLE",
    "COMMAND_UNAVAILABLE",
    "CUSTODY_PROVIDER_UNAVAILABLE",
    "PROVIDER_OUTCOME_UNKNOWN",
    "UNKNOWN_OUTCOME",
    "ORIGINAL_COMMAND_NOT_FOUND",
    "RECONCILIATION_UNAVAILABLE",
    "EXFILTRATION_ATTEMPT",
    "POLICY_DRIFT",
  ]),
  sha = (v: string) => createHash("sha256").update(v).digest("hex"),
  canon = (v: unknown): string =>
    Array.isArray(v)
      ? "[" + v.map(canon).join(",") + "]"
      : v && typeof v === "object"
        ? "{" +
          Object.entries(v as Record<string, unknown>)
            .filter(([, x]) => x !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => JSON.stringify(k) + ":" + canon(x))
            .join(",") +
          "}"
        : JSON.stringify(v);
type Authority = {
  allowed: boolean;
  tenantId: string | null;
  actorId: string | null;
  actorRole: string | null;
};
function authority(route: CraysRouteContext): Authority {
  const actorId = route.session.account?.id ?? null,
    actorRole = roles[route.role as keyof typeof roles] ?? null,
    tenantId =
      route.tenantId &&
      !["anonymous", "crays-local-review", "crays-portal-bridge"].includes(
        route.tenantId,
      )
        ? route.tenantId
        : null;
  return {
    allowed:
      route.authoritySource === "auth0-crays-session" &&
      Boolean(actorId && actorRole && tenantId),
    tenantId,
    actorId,
    actorRole,
  };
}
async function scope(c: PoolClient, a: Authority) {
  if (!a.allowed || !a.tenantId || !a.actorId || !a.actorRole)
    throw Error("OCA_SECRET_RESILIENCE_AUTHORITY_REQUIRED");
  await c.query("set local role oca_app");
  await c.query(
    "select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true),set_config('crays.actor_id',$2,true),set_config('crays.actor_role',$3,true)",
    [a.tenantId, a.actorId, a.actorRole],
  );
}
function bounded(raw: unknown) {
  const v =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idempotencyKey:
      typeof v.idempotencyKey === "string" ? v.idempotencyKey : "invalid-input",
    secretRefId:
      typeof v.secretRefId === "string" ? v.secretRefId : "unknown-secret-ref",
    expectedDigest:
      typeof v.expectedDigest === "string" &&
      /^[0-9a-f]{64}$/.test(v.expectedDigest)
        ? v.expectedDigest
        : sha("invalid-digest"),
  };
}
function safeInput(raw: unknown) {
  if (!raw || typeof raw !== "object") return false;
  const v = raw as Record<string, unknown>;
  return (
    typeof v.secretRefId === "string" &&
    safeId.test(v.secretRefId) &&
    typeof v.purposeCode === "string" &&
    safePurpose.test(v.purposeCode) &&
    typeof v.idempotencyKey === "string" &&
    safeId.test(v.idempotencyKey)
  );
}
const denial = (code: string, id: string, next: string) => ({
  allowed: false,
  code,
  actionPreview: null,
  businessMutationPerformed: false,
  secretMaterialExposed: false,
  providerCallPerformed: false,
  nextSafeAction: next,
  correlationId: id,
});
async function persistDenial(
  route: CraysRouteContext,
  raw: unknown,
  result: Record<string, unknown>,
  correlationId: string,
  override?: string,
) {
  const code = override ?? String(result.code ?? ""),
    a = authority(route);
  if (!a.allowed || !families.has(code)) return false;
  const v = bounded(raw),
    key = sha(v.idempotencyKey),
    id = randomUUID(),
    next = String(
      result.nextSafeAction ?? "Stop and use the next safe action.",
    ),
    digest = sha(
      canon({
        id,
        key,
        secretRef: sha(v.secretRefId),
        expected: v.expectedDigest,
        code,
        correlationId,
      }),
    );
  let c: PoolClient | null = null;
  try {
    c = await getCorePgPool().connect();
    await c.query("begin");
    await scope(c, a);
    await c.query(
      "insert into crays_core.oca_secret_denial_receipt_versions(tenant_id,denial_id,denial_version,actor_id,actor_role_key,original_idempotency_key_sha256,secret_ref_id_sha256,expected_secret_ref_sha256,denial_family,safe_reason_codes,retryable,next_safe_action_sha256,expires_at,denial_sha256,correlation_id)values($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
      [
        a.tenantId,
        id,
        a.actorId,
        a.actorRole,
        key,
        sha(v.secretRefId),
        v.expectedDigest,
        code,
        [code],
        code.endsWith("UNAVAILABLE"),
        sha(next),
        new Date(Date.now() + 86400000).toISOString(),
        digest,
        correlationId,
      ],
    );
    await c.query("commit");
    return true;
  } catch {
    await c?.query("rollback").catch(() => {});
    return false;
  } finally {
    c?.release();
  }
}
async function securityCheck(
  route: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  if (!safeInput(raw))
    return denial(
      "VALIDATION_FAILED",
      correlationId,
      "Use bounded opaque identifiers and a registered purpose code.",
    );
  const a = authority(route);
  if (!a.allowed) return null;
  const v = raw as Record<string, unknown>;
  let c: PoolClient | null = null;
  try {
    c = await getCorePgPool().connect();
    await c.query("begin");
    await scope(c, a);
    const row = (
      await c.query(
        "select secret_state,valid_until,allowed_purpose_codes from crays_core.oca_secret_ref_versions where secret_ref_id=$1 and secret_ref_version=$2 and secret_ref_sha256=$3",
        [v.secretRefId, v.expectedVersion, v.expectedDigest],
      )
    ).rows[0];
    await c.query("rollback");
    if (!row) return null;
    if (row.secret_state === "revoked")
      return denial(
        "SECRET_REF_REVOKED",
        correlationId,
        "Select a new authorized SecretRef.",
      );
    if (
      row.secret_state === "expired" ||
      new Date(row.valid_until).getTime() <= Date.now()
    )
      return denial(
        "SECRET_REF_EXPIRED",
        correlationId,
        "Rotate and authorize a current SecretRef.",
      );
    if (!row.allowed_purpose_codes.includes(v.purposeCode))
      return denial(
        "PURPOSE_NOT_ALLOWED",
        correlationId,
        "Use an admitted purpose code.",
      );
    return null;
  } catch {
    await c?.query("rollback").catch(() => {});
    return denial(
      "PREFLIGHT_UNAVAILABLE",
      correlationId,
      "Retry without inferring authority.",
    );
  } finally {
    c?.release();
  }
}
async function guardedPreflight(
  base: typeof baseIssuePre,
  route: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const check = await securityCheck(route, raw, correlationId);
  if (check) {
    await persistDenial(
      route,
      raw,
      check,
      correlationId,
      !safeInput(raw) ? "EXFILTRATION_ATTEMPT" : undefined,
    );
    return check;
  }
  const result = await base(route, raw, correlationId);
  if (!result.allowed)
    await persistDenial(
      route,
      raw,
      result,
      correlationId,
      result.code === "EXPECTED_DIGEST_CONFLICT" ? "POLICY_DRIFT" : undefined,
    );
  return result;
}
async function guardedCommand(
  base: typeof baseIssue,
  route: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const check = await securityCheck(route, raw, correlationId);
  if (check) {
    const result = {
      status: "denied",
      code: check.code,
      replayed: false,
      grant: null,
      rotation: null,
      revocation: null,
      receipt: null,
      secretMaterialExposed: false,
      providerCallPerformed: false,
      nextSafeAction: check.nextSafeAction,
      correlationId,
    };
    await persistDenial(
      route,
      raw,
      result,
      correlationId,
      !safeInput(raw) ? "EXFILTRATION_ATTEMPT" : undefined,
    );
    return result;
  }
  const result = await base(route, raw, correlationId);
  if (result.code !== "ALLOWED")
    await persistDenial(route, raw, result, correlationId);
  return result;
}
async function persistObservation(
  route: CraysRouteContext,
  key: string,
  result: Record<string, unknown>,
  correlationId: string,
) {
  const a = authority(route);
  if (!a.allowed) return false;
  const receipt =
      result.receipt && typeof result.receipt === "object"
        ? (result.receipt as Record<string, unknown>)
        : null,
    outcome = String(result.status ?? "unavailable"),
    id = randomUUID(),
    digest = sha(
      canon({
        id,
        key: sha(key),
        receipt: receipt?.receiptSha256,
        outcome,
        correlationId,
      }),
    );
  let c: PoolClient | null = null;
  try {
    c = await getCorePgPool().connect();
    await c.query("begin");
    await scope(c, a);
    await c.query(
      "insert into crays_core.oca_secret_reconciliation_observation_versions(tenant_id,observation_id,observation_version,actor_id,actor_role_key,original_idempotency_key_sha256,access_receipt_sha256,authoritative_outcome,secret_ref_state,grant_state,rotation_state,revocation_state,replacement_command_prohibited,provider_call_performed,secret_material_exposed,observation_sha256,correlation_id,observed_at)values($1,$2,1,$3,$4,$5,$6,$7,'unknown','unknown','unknown','unknown',true,false,false,$8,$9,$10)",
      [
        a.tenantId,
        id,
        a.actorId,
        a.actorRole,
        sha(key),
        receipt?.receiptSha256 ?? null,
        ["reconciled", "not_found", "unknown_outcome", "unavailable"].includes(
          outcome,
        )
          ? outcome
          : "unavailable",
        digest,
        correlationId,
        new Date().toISOString(),
      ],
    );
    await c.query("commit");
    return true;
  } catch {
    await c?.query("rollback").catch(() => {});
    return false;
  } finally {
    c?.release();
  }
}
export const getOcaSecretCustodyConsole = baseConsole;
export const preflightIssueOcaCredentialGrant = (
  r: CraysRouteContext,
  x: unknown,
  c: string = randomUUID(),
) => guardedPreflight(baseIssuePre, r, x, c);
export const preflightRotateOcaSecretRef = (
  r: CraysRouteContext,
  x: unknown,
  c: string = randomUUID(),
) => guardedPreflight(baseRotatePre, r, x, c);
export const preflightRevokeOcaSecretAccess = (
  r: CraysRouteContext,
  x: unknown,
  c: string = randomUUID(),
) => guardedPreflight(baseRevokePre, r, x, c);
export const issueOcaCredentialGrant = (
  r: CraysRouteContext,
  x: unknown,
  c: string = randomUUID(),
) => guardedCommand(baseIssue, r, x, c);
export const rotateOcaSecretRef = (
  r: CraysRouteContext,
  x: unknown,
  c: string = randomUUID(),
) => guardedCommand(baseRotate, r, x, c);
export const revokeOcaSecretAccess = (
  r: CraysRouteContext,
  x: unknown,
  c: string = randomUUID(),
) => guardedCommand(baseRevoke, r, x, c);
export async function reconcileOcaSecretCommand(
  route: CraysRouteContext,
  key: string,
  correlationId: string = randomUUID(),
) {
  const result = await baseReconcile(route, key, correlationId);
  await persistObservation(
    route,
    key,
    result as unknown as Record<string, unknown>,
    correlationId,
  );
  return result;
}
