import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ocaGovernanceAuthority } from "@/db/oca-governance-repository";
import type { CraysRouteContext } from "@/lib/dal/server-trust";

type Denial = Readonly<{
  code: string;
  recordType?: string | null;
  recordId?: string | null;
  currentVersion?: number | null;
  nextSafeAction: string;
}>;
type CommandName =
  | "ProposeScopeChange"
  | "ApproveScopeChange"
  | "RejectScopeChange"
  | "RecordDecision"
  | "SupersedeDecision"
  | "AcknowledgeSourceDrift"
  | "ReconcileGovernanceCommand";

const recordTypes = new Set(["ProgrammeManifest", "SourceFingerprint", "Decision", "ScopeChange"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

function canonical(value: Record<string, unknown>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

export async function persistOcaGovernanceDenialReceipt(
  context: CraysRouteContext,
  commandName: CommandName,
  raw: unknown,
  denial: Denial,
  correlationId: string,
): Promise<string | null> {
  const access = ocaGovernanceAuthority.resolveAccess(context);
  if (!access.allowed || !access.tenantId || !access.actorId || !access.governanceRole) return null;
  const idempotencyKey = raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).idempotencyKey === "string"
    ? String((raw as Record<string, unknown>).idempotencyKey)
    : "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 200) return null;
  const reasonCode = /^[A-Z0-9_]{3,100}$/.test(denial.code) ? denial.code : "COMMAND_DENIED";
  const recordType = denial.recordType && recordTypes.has(denial.recordType) ? denial.recordType : null;
  const recordIdSha = recordType && denial.recordId ? digest(denial.recordId) : null;
  const idempotencySha = digest(idempotencyKey);
  const receiptId = randomUUID();
  const receiptSha = digest(canonical({
    tenantId: access.tenantId,
    receiptId,
    actorId: access.actorId,
    actorRole: access.governanceRole,
    commandName,
    idempotencySha,
    reasonCode,
    recordType,
    recordIdSha,
    currentVersion: denial.currentVersion ?? null,
    correlationId,
    nextSafeAction: denial.nextSafeAction,
  }));
  let client: PoolClient;
  try {
    client = await getCorePgPool().connect();
  } catch {
    return null;
  }
  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role','core_service',true)");
    await client.query("select set_config('crays.tenant_id',$1,true)", [access.tenantId]);
    await client.query("select set_config('crays.actor_role',$1,true)", [access.governanceRole]);
    await client.query("select set_config('crays.actor_id',$1,true)", [access.actorId]);
    const inserted = await client.query<{ denial_receipt_id: string }>(
      `insert into crays_core.oca_governance_denial_receipts(tenant_id,denial_receipt_id,programme_key,actor_id,actor_role_key,command_name,idempotency_key_sha256,reason_code,expected_record_type,expected_record_id_sha256,expected_record_version,correlation_id,next_safe_action,receipt_sha256)values($1,$2,'NCRV2-159-OCA',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)on conflict(tenant_id,programme_key,actor_id,command_name,idempotency_key_sha256)do nothing returning denial_receipt_id`,
      [access.tenantId, receiptId, access.actorId, access.governanceRole, commandName, idempotencySha, reasonCode, recordType, recordIdSha, denial.currentVersion ?? null, correlationId, denial.nextSafeAction, receiptSha],
    );
    const effective = inserted.rows[0]?.denial_receipt_id ?? (
      await client.query<{ denial_receipt_id: string }>(
        `select denial_receipt_id from crays_core.oca_governance_denial_receipts where tenant_id=$1 and programme_key='NCRV2-159-OCA'and actor_id=$2 and command_name=$3 and idempotency_key_sha256=$4`,
        [access.tenantId, access.actorId, commandName, idempotencySha],
      )
    ).rows[0]?.denial_receipt_id ?? null;
    await client.query("commit");
    return effective;
  } catch {
    await client.query("rollback").catch(() => undefined);
    return null;
  } finally {
    client.release();
  }
}
