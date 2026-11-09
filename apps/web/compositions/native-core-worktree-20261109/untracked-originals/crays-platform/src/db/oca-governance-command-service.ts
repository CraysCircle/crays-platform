import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { getCorePgPool } from "@/db/client";
import { ocaGovernanceAuthority } from "@/db/oca-governance-repository";
import { persistOcaGovernanceDenialReceipt } from "@/db/oca-governance-denial-receipt-service";
import type { CraysRouteContext } from "@/lib/dal/server-trust";

const proposeSchema = z.object({
  idempotencyKey: z.string().min(16).max(200),
  expectedManifestVersion: z.number().int().positive(),
  changeClass: z.enum(["clarification", "additive_implementation", "source_drift", "scope", "authority", "privacy_safety", "commercial", "release_production"]),
  proposal: z.string().trim().min(10).max(4000),
  reason: z.string().trim().min(10).max(4000),
  affectedBlocks: z.array(z.string().regex(/^OCA-PB-\d{2}$/)).min(1).max(54),
  affectedSources: z.array(z.string().min(1).max(500)).max(100),
  affectedRecords: z.array(z.enum(["ProgrammeManifest", "SourceFingerprint", "Decision", "ScopeChange"])).min(1).max(4),
  affectedRoles: z.array(z.string().min(1).max(100)).max(50),
  affectedVerticals: z.array(z.enum(["coffee", "retail", "gym", "clubs"])).max(4),
  affectedAuthorityDimensions: z.array(z.enum(["query_authority", "processing_authority", "disclosure_authority", "command_authority"])).max(4),
  riskClass: z.enum(["low", "medium", "high", "critical"]),
  migrationRequired: z.boolean(),
  rollbackPlanRef: z.string().trim().min(3).max(500),
  testPlanRef: z.string().trim().min(3).max(500),
  dueAt: z.string().datetime(),
});

export type ProposeOcaScopeChangeInput = z.infer<typeof proposeSchema>;
type PreflightResult = Readonly<{
  allowed: boolean;
  code: string;
  currentManifestVersion: number | null;
  currentManifestSha256: string | null;
  actorAssignmentId: string | null;
  actorAssignmentVersion: number | null;
  actorAssignmentSha256: string | null;
  nextSafeAction: string;
}>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(",")}}`;
  return JSON.stringify(value);
}
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function setAuthority(client: PoolClient, tenantId: string, actorRole: string, actorId: string) {
  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("select set_config('crays.tenant_id',$1,true)", [tenantId]);
  await client.query("select set_config('crays.actor_role',$1,true)", [actorRole]);
  await client.query("select set_config('crays.actor_id',$1,true)", [actorId]);
}

async function preflightWithClient(client: PoolClient, context: CraysRouteContext, input: ProposeOcaScopeChangeInput): Promise<PreflightResult> {
  const access = ocaGovernanceAuthority.resolveAccess(context);
  if (!access.allowed || !access.tenantId || !access.actorId || !access.governanceRole) return { allowed: false, code: access.reasonCode, currentManifestVersion: null, currentManifestSha256: null, actorAssignmentId: null, actorAssignmentVersion: null, actorAssignmentSha256: null, nextSafeAction: "Return to an authorized governance Role Home." };
  await setAuthority(client, access.tenantId, access.governanceRole, access.actorId);
  const assignment = await client.query<{ assignment_id: string; assignment_version: number; assignment_sha256: string }>(
    `select assignment_id,assignment_version,assignment_sha256 from crays_core.oca_governance_actor_assignment_versions
     where tenant_id=$1 and programme_key='NCRV2-159-OCA'and actor_id=$2 and role_key=$3 and assignment_state='active'
       and effective_at<=now()and(expires_at is null or expires_at>now())order by assignment_version desc limit 2`,
    [access.tenantId, access.actorId, access.governanceRole],
  );
  const manifest = await client.query<{ manifest_version: number; manifest_sha256: string }>(
    `select manifest_version,manifest_sha256 from crays_core.oca_programme_board_read_model
     where tenant_id=$1 and programme_key='NCRV2-159-OCA'limit 1`, [access.tenantId],
  );
  const current = manifest.rows[0] ?? null;
  if (assignment.rows.length !== 1) return { allowed: false, code: assignment.rows.length ? "AMBIGUOUS_ACTOR_ASSIGNMENT" : "ACTOR_ASSIGNMENT_REQUIRED", currentManifestVersion: current?.manifest_version ?? null, currentManifestSha256: current?.manifest_sha256 ?? null, actorAssignmentId: null, actorAssignmentVersion: null, actorAssignmentSha256: null, nextSafeAction: "Resolve the exact active governance actor assignment." };
  if (!current) return { allowed: false, code: "PROGRAMME_MANIFEST_REQUIRED", currentManifestVersion: null, currentManifestSha256: null, actorAssignmentId: assignment.rows[0].assignment_id, actorAssignmentVersion: assignment.rows[0].assignment_version, actorAssignmentSha256: assignment.rows[0].assignment_sha256, nextSafeAction: "Create and approve the canonical ProgrammeManifest before proposing changes." };
  if (current.manifest_version !== input.expectedManifestVersion) return { allowed: false, code: "MANIFEST_VERSION_CONFLICT", currentManifestVersion: current.manifest_version, currentManifestSha256: current.manifest_sha256, actorAssignmentId: assignment.rows[0].assignment_id, actorAssignmentVersion: assignment.rows[0].assignment_version, actorAssignmentSha256: assignment.rows[0].assignment_sha256, nextSafeAction: "Reload the ProgrammeManifest and review the proposal against its current version." };
  return { allowed: true, code: "ALLOWED", currentManifestVersion: current.manifest_version, currentManifestSha256: current.manifest_sha256, actorAssignmentId: assignment.rows[0].assignment_id, actorAssignmentVersion: assignment.rows[0].assignment_version, actorAssignmentSha256: assignment.rows[0].assignment_sha256, nextSafeAction: "Submit the exact proposal with the same expected manifest version and idempotency key." };
}

export async function preflightProposeOcaScopeChange(context: CraysRouteContext, raw: unknown): Promise<PreflightResult> {
  const parsed = proposeSchema.safeParse(raw);
  if (!parsed.success) return { allowed: false, code: "VALIDATION_FAILED", currentManifestVersion: null, currentManifestSha256: null, actorAssignmentId: null, actorAssignmentVersion: null, actorAssignmentSha256: null, nextSafeAction: parsed.error.issues[0]?.message ?? "Correct the proposal." };
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); }
  catch { return { allowed: false, code: "PREFLIGHT_UNAVAILABLE", currentManifestVersion: null, currentManifestSha256: null, actorAssignmentId: null, actorAssignmentVersion: null, actorAssignmentSha256: null, nextSafeAction: "Retry preflight against CRAYS Core; do not submit without it." }; }
  try { await client.query("begin read only"); const result = await preflightWithClient(client, context, parsed.data); await client.query("commit"); return result; }
  catch { await client.query("rollback").catch(() => undefined); return { allowed: false, code: "PREFLIGHT_UNAVAILABLE", currentManifestVersion: null, currentManifestSha256: null, actorAssignmentId: null, actorAssignmentVersion: null, actorAssignmentSha256: null, nextSafeAction: "Retry preflight against CRAYS Core; do not submit without it." }; }
  finally { client.release(); }
}

export async function proposeOcaScopeChange(context: CraysRouteContext, raw: unknown, correlationId: string) {
  const parsed = proposeSchema.safeParse(raw);
  if (!parsed.success) {
    const preflight = { allowed: false, code: "VALIDATION_FAILED", currentManifestVersion: null, currentManifestSha256: null, actorAssignmentId: null, actorAssignmentVersion: null, actorAssignmentSha256: null, nextSafeAction: parsed.error.issues[0]?.message ?? "Correct the proposal." };
    const receiptId = await persistOcaGovernanceDenialReceipt(context, "ProposeScopeChange", raw, preflight, correlationId);
    return { status: "preflight_denied", replayed: false, scopeChangeId: null, scopeChangeVersion: null, receiptId, preflight, nextSafeAction: preflight.nextSafeAction, correlationId };
  }
  const input = parsed.data;
  const access = ocaGovernanceAuthority.resolveAccess(context);
  if (!access.allowed || !access.tenantId || !access.actorId || !access.governanceRole) return { status: "denied", replayed: false, scopeChangeId: null, scopeChangeVersion: null, receiptId: null, preflight: await preflightProposeOcaScopeChange(context, input), nextSafeAction: "Return to an authorized governance Role Home.", correlationId };
  const payloadHash = sha256(canonical({ ...input, idempotencyKey: undefined }));
  const idempotencyHash = sha256(input.idempotencyKey);
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); }
  catch { return {status:"unknown_outcome",replayed:false,scopeChangeId:null,scopeChangeVersion:null,receiptId:null,preflight:null,nextSafeAction:"CRAYS Core is unavailable. Preserve the exact original idempotency key and correlation ID; reconcile or replay only with that key before any new command.",correlationId}; }
  try {
    await client.query("begin"); await setAuthority(client, access.tenantId, access.governanceRole, access.actorId);
    const prior = await client.query<{ canonical_payload_sha256: string; command_receipt_id: string; consequence_record_id: string; consequence_record_version: number; next_safe_action: string }>(
      `select r.canonical_payload_sha256,c.command_receipt_id,c.consequence_record_id,c.consequence_record_version,c.next_safe_action
       from crays_core.oca_governance_command_roots r join lateral(select * from crays_core.oca_governance_command_receipt_versions c where c.tenant_id=r.tenant_id and c.idempotency_root_id=r.idempotency_root_id order by receipt_version desc limit 1)c on true
       where r.tenant_id=$1 and r.programme_key='NCRV2-159-OCA'and r.actor_id=$2 and r.idempotency_key_sha256=$3`,
      [access.tenantId, access.actorId, idempotencyHash],
    );
    if (prior.rows[0]) { await client.query("commit"); if (prior.rows[0].canonical_payload_sha256 !== payloadHash) return { status: "idempotency_conflict", replayed: false, scopeChangeId: null, scopeChangeVersion: null, receiptId: prior.rows[0].command_receipt_id, preflight: null, nextSafeAction: "Reuse the original payload or create a new idempotency key after review.", correlationId }; return { status: "replayed", replayed: true, scopeChangeId: prior.rows[0].consequence_record_id, scopeChangeVersion: prior.rows[0].consequence_record_version, receiptId: prior.rows[0].command_receipt_id, preflight: null, nextSafeAction: prior.rows[0].next_safe_action, correlationId }; }
    const preflight = await preflightWithClient(client, context, input);
    if (!preflight.allowed || !preflight.actorAssignmentId || !preflight.actorAssignmentVersion || !preflight.actorAssignmentSha256 || !preflight.currentManifestSha256) { await client.query("rollback"); const receiptId=await persistOcaGovernanceDenialReceipt(context,"ProposeScopeChange",input,preflight,correlationId); return { status: "preflight_denied", replayed: false, scopeChangeId: null, scopeChangeVersion: null, receiptId, preflight, nextSafeAction: preflight.nextSafeAction, correlationId }; }
    const rootId=randomUUID(),scopeId=randomUUID(),receiptId=randomUUID(),scopeHash=sha256(canonical({scopeId,input,actorId:access.actorId}));
    await client.query(`insert into crays_core.oca_governance_command_roots(tenant_id,idempotency_root_id,programme_key,actor_id,actor_role_key,actor_assignment_id,actor_assignment_version,actor_assignment_sha256,command_name,idempotency_key_sha256,canonical_payload_sha256,expected_record_type,expected_record_id,expected_record_version,expected_record_sha256,root_state)values($1,$2,'NCRV2-159-OCA',$3,$4,$5,$6,$7,'ProposeScopeChange',$8,$9,'ProgrammeManifest','NCRV2-159-OCA',$10,$11,'accepted')`,[access.tenantId,rootId,access.actorId,access.governanceRole,preflight.actorAssignmentId,preflight.actorAssignmentVersion,preflight.actorAssignmentSha256,idempotencyHash,payloadHash,input.expectedManifestVersion,preflight.currentManifestSha256]);
    await client.query(`insert into crays_core.oca_scope_change_versions(tenant_id,scope_change_id,scope_change_version,programme_key,change_class,proposal,reason,requested_by_actor_id,requested_by_role_key,requested_by_assignment_id,requested_by_assignment_version,requested_by_assignment_sha256,affected_blocks,affected_sources,affected_records,affected_roles,affected_verticals,affected_authority_dimensions,risk_class,migration_required,rollback_plan_ref,test_plan_ref,state,expected_manifest_version,due_at,scope_change_sha256)values($1,$2,1,'NCRV2-159-OCA',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'impact_review',$21,$22,$23)`,[access.tenantId,scopeId,input.changeClass,input.proposal,input.reason,access.actorId,access.governanceRole,preflight.actorAssignmentId,preflight.actorAssignmentVersion,preflight.actorAssignmentSha256,input.affectedBlocks,input.affectedSources,input.affectedRecords,input.affectedRoles,input.affectedVerticals,input.affectedAuthorityDimensions,input.riskClass,input.migrationRequired,input.rollbackPlanRef,input.testPlanRef,input.expectedManifestVersion,input.dueAt,scopeHash]);
    const nextSafeAction="Open the persisted ScopeChange, complete impact review and obtain the required Decision before approval.";
    await client.query(`insert into crays_core.oca_governance_command_receipt_versions(tenant_id,command_receipt_id,receipt_version,idempotency_root_id,programme_key,actor_id,command_name,canonical_payload_sha256,expected_record_type,expected_record_id,expected_record_version,expected_record_sha256,command_state,result_code,consequence_record_type,consequence_record_id,consequence_record_version,consequence_sha256,business_completion_state,correlation_id,next_safe_action,receipt_sha256)values($1,$2,1,$3,'NCRV2-159-OCA',$4,'ProposeScopeChange',$5,'ProgrammeManifest','NCRV2-159-OCA',$6,$7,'applied','scope_change_proposed','ScopeChange',$8,1,$9,'pending',$10,$11,$12)`,[access.tenantId,receiptId,rootId,access.actorId,payloadHash,input.expectedManifestVersion,preflight.currentManifestSha256,scopeId,scopeHash,correlationId,nextSafeAction,sha256(canonical({receiptId,rootId,scopeId,payloadHash}))]);
    await client.query("commit");return {status:"applied",replayed:false,scopeChangeId:scopeId,scopeChangeVersion:1,receiptId,preflight,nextSafeAction,correlationId};
  } catch { await client.query("rollback").catch(()=>undefined);return {status:"unknown_outcome",replayed:false,scopeChangeId:null,scopeChangeVersion:null,receiptId:null,preflight:null,nextSafeAction:"Reconcile using the exact original idempotency key before any retry.",correlationId}; }
  finally { client.release(); }
}
