import "server-only";

import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import type { CraysRouteContext } from "@/lib/dal/server-trust";

const governanceRoleByCraysRole = {
  admin: "programme_governance",
  "crays-management": "product_owner",
  reviewer: "qa_sre",
} as const;

type GovernanceRole = (typeof governanceRoleByCraysRole)[keyof typeof governanceRoleByCraysRole];

export type OcaGovernanceAccess = Readonly<{
  allowed: boolean;
  reasonCode: "ALLOWED" | "AUTHENTICATION_REQUIRED" | "ROLE_NOT_ADMITTED" | "TENANT_REQUIRED";
  tenantId: string | null;
  actorId: string | null;
  governanceRole: GovernanceRole | null;
}>;

export type OcaGovernanceReadModel = Readonly<{
  status: "ready" | "empty" | "denied" | "unavailable";
  access: OcaGovernanceAccess;
  programme: Record<string, unknown> | null;
  sourceDrift: readonly Record<string, unknown>[];
  decisions: readonly Record<string, unknown>[];
  scopeChanges: readonly Record<string, unknown>[];
  receipts: readonly Record<string, unknown>[];
  denials: readonly Record<string, unknown>[];
  nextSafeAction: string;
  correlationId: string;
}>;

function resolveAccess(context: CraysRouteContext): OcaGovernanceAccess {
  const actorId = context.session.account?.id ?? null;
  if (context.authoritySource !== "auth0-crays-session" || !actorId) {
    return { allowed: false, reasonCode: "AUTHENTICATION_REQUIRED", tenantId: null, actorId: null, governanceRole: null };
  }
  if (!context.tenantId || ["anonymous", "identity-review", "crays-local-review", "crays-portal-bridge"].includes(context.tenantId)) {
    return { allowed: false, reasonCode: "TENANT_REQUIRED", tenantId: null, actorId, governanceRole: null };
  }
  const governanceRole = governanceRoleByCraysRole[context.role as keyof typeof governanceRoleByCraysRole] ?? null;
  if (!governanceRole) return { allowed: false, reasonCode: "ROLE_NOT_ADMITTED", tenantId: context.tenantId, actorId, governanceRole: null };
  return { allowed: true, reasonCode: "ALLOWED", tenantId: context.tenantId, actorId, governanceRole };
}

async function setAuthority(client: PoolClient, access: OcaGovernanceAccess) {
  if (!access.allowed || !access.tenantId || !access.actorId || !access.governanceRole) throw new Error("OCA_GOVERNANCE_AUTHORITY_REQUIRED");
  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("select set_config('crays.tenant_id',$1,true)", [access.tenantId]);
  await client.query("select set_config('crays.actor_role',$1,true)", [access.governanceRole]);
  await client.query("select set_config('crays.actor_id',$1,true)", [access.actorId]);
}

export async function getOcaGovernanceReadModel(
  context: CraysRouteContext,
  correlationId = crypto.randomUUID(),
): Promise<OcaGovernanceReadModel> {
  const access = resolveAccess(context);
  if (!access.allowed) {
    return { status: "denied", access, programme: null, sourceDrift: [], decisions: [], scopeChanges: [], receipts: [], denials: [], nextSafeAction: "Return to your authorized Role Home.", correlationId };
  }
  let client: PoolClient;
  try {
    client = await getCorePgPool().connect();
  } catch {
    return { status: "unavailable", access, programme: null, sourceDrift: [], decisions: [], scopeChanges: [], receipts: [], denials: [], nextSafeAction: "Retry the canonical CRAYS Core read; do not use cached or synthetic governance state.", correlationId };
  }
  try {
    await client.query("begin read only");
    await setAuthority(client, access);
    const programme = await client.query("select * from crays_core.oca_programme_board_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA' order by manifest_version desc limit 1", [access.tenantId]);
    const sourceDrift = await client.query("select * from crays_core.oca_source_drift_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA' order by review_due_at,source_fingerprint_id limit 100", [access.tenantId]);
    const decisions = await client.query("select * from crays_core.oca_decision_register_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA' order by review_due_at,decision_id limit 100", [access.tenantId]);
    const scopeChanges = await client.query("select * from crays_core.oca_scope_change_queue_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA' order by due_at,scope_change_id limit 100", [access.tenantId]);
    const receipts = await client.query("select command_receipt_id,receipt_version,command_name,command_state,result_code,business_completion_state,correlation_id,next_safe_action,receipt_sha256,created_at from crays_core.oca_governance_command_receipt_versions where tenant_id=$1 and programme_key='NCRV2-159-OCA' order by created_at desc limit 100", [access.tenantId]);
    const denials = await client.query("select denial_receipt_id,command_name,reason_code,expected_record_type,expected_record_version,correlation_id,next_safe_action,receipt_sha256,created_at from crays_core.oca_governance_denial_receipt_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA' order by created_at desc limit 100", [access.tenantId]);
    await client.query("commit");
    const manifest = programme.rows[0] ?? null;
    const empty = !manifest && sourceDrift.rows.length === 0 && decisions.rows.length === 0 && scopeChanges.rows.length === 0;
    return {
      status: empty ? "empty" : "ready",
      access,
      programme: manifest,
      sourceDrift: sourceDrift.rows,
      decisions: decisions.rows,
      scopeChanges: scopeChanges.rows,
      receipts: receipts.rows,
      denials: denials.rows,
      nextSafeAction: sourceDrift.rows.length ? "Review the highest-priority missing or drifted canonical source." : scopeChanges.rows.length ? "Open the next due scope change and run its preflight." : "Continue with the current dependency-safe OCA task.",
      correlationId,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return { status: "unavailable", access, programme: null, sourceDrift: [], decisions: [], scopeChanges: [], receipts: [], denials: [], nextSafeAction: "Retry the canonical CRAYS Core read; do not use cached or synthetic governance state.", correlationId };
  } finally {
    client.release();
  }
}

export const ocaGovernanceAuthority = { resolveAccess };
