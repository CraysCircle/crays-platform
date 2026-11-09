import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { getCorePgPool } from "@/db/client";
import { ocaGovernanceAuthority } from "@/db/oca-governance-repository";
import { persistOcaGovernanceDenialReceipt } from "@/db/oca-governance-denial-receipt-service";
import type { CraysRouteContext } from "@/lib/dal/server-trust";

const authorityDimension = z.enum([
  "query_authority",
  "processing_authority",
  "disclosure_authority",
  "command_authority",
]);
const decisionClass = z.enum([
  "north_star",
  "architecture",
  "authority",
  "privacy",
  "security",
  "health_food",
  "finance_legal",
  "model",
  "skill_plugin",
  "channel",
  "commercial",
  "release_production",
]);
const decisionState = z.enum([
  "proposed",
  "accepted",
  "conditional",
  "rejected",
  "deferred",
]);
const idempotency = z.string().min(16).max(200);
const sha = z.string().regex(/^[0-9a-f]{64}$/);
const block = z.string().regex(/^OCA-PB-\d{2}$/);

const recordDecisionSchema = z.object({
  idempotencyKey: idempotency,
  expectedManifestVersion: z.number().int().positive(),
  decisionKey: z
    .string()
    .trim()
    .regex(/^OCA-DEC-[A-Z0-9][A-Z0-9_-]{2,80}$/),
  title: z.string().trim().min(5).max(300),
  decisionClass,
  rationale: z.string().trim().min(10).max(8000),
  alternativesConsidered: z
    .array(z.string().trim().min(1).max(1000))
    .min(1)
    .max(30),
  affectedBlocks: z.array(block).min(1).max(54),
  affectedAuthorityDimensions: z.array(authorityDimension).max(4),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
  state: decisionState,
  decidedByActorIds: z.array(z.string().trim().min(1).max(200)).max(30),
  reviewDueAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().optional(),
});
const supersedeDecisionSchema = z.object({
  idempotencyKey: idempotency,
  decisionId: z.string().uuid(),
  expectedDecisionVersion: z.number().int().positive(),
  expectedDecisionSha256: sha,
  reason: z.string().trim().min(10).max(4000),
  evidenceRef: z.string().trim().min(1).max(500),
});
const transitionScopeSchema = z.object({
  idempotencyKey: idempotency,
  scopeChangeId: z.string().uuid(),
  expectedScopeChangeVersion: z.number().int().positive(),
  expectedScopeChangeSha256: sha,
  decisionId: z.string().uuid(),
  decisionVersion: z.number().int().positive(),
  decisionSha256: sha,
});
const acknowledgeSourceSchema = z.object({
  idempotencyKey: idempotency,
  sourceFingerprintId: z.string().uuid(),
  expectedSourceSha256: sha,
  newSourceVersion: z.string().trim().min(1).max(200),
  newBytes: z.number().int().nonnegative().nullable().optional(),
  newSha256: sha,
  reviewDueAt: z.string().datetime(),
  disposition: z.enum(["current", "drifted", "rejected"]),
});
const reconcileSchema = z.object({
  idempotencyKey: idempotency,
  originalIdempotencyKey: idempotency,
  expectedReceiptId: z.string().uuid(),
  expectedReceiptVersion: z.number().int().positive(),
  expectedReceiptSha256: sha,
  outcome: z.enum(["reconciled", "failed"]),
  reason: z.string().trim().min(10).max(4000),
});

export type RecordOcaDecisionInput = z.infer<typeof recordDecisionSchema>;
export type SupersedeOcaDecisionInput = z.infer<typeof supersedeDecisionSchema>;
export type TransitionOcaScopeChangeInput = z.infer<
  typeof transitionScopeSchema
>;
export type AcknowledgeOcaSourceDriftInput = z.infer<
  typeof acknowledgeSourceSchema
>;
export type ReconcileOcaGovernanceCommandInput = z.infer<
  typeof reconcileSchema
>;

type Access = Readonly<{
  tenantId: string;
  actorId: string;
  governanceRole: string;
  assignmentId: string;
  assignmentVersion: number;
  assignmentSha256: string;
}>;
export type OcaRecordPreflight = Readonly<{
  allowed: boolean;
  code: string;
  recordType: string | null;
  recordId: string | null;
  currentVersion: number | null;
  currentSha256: string | null;
  actorAssignmentId: string | null;
  actorAssignmentVersion: number | null;
  nextSafeAction: string;
}>;
type Consequence = Readonly<{
  type: string | null;
  id: string | null;
  version: number | null;
  sha256: string | null;
}>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const payloadHash = (input: { idempotencyKey: string }) =>
  hash(canonical({ ...input, idempotencyKey: undefined }));
const denied = (
  code: string,
  nextSafeAction: string,
  recordType: string | null = null,
  recordId: string | null = null,
  currentVersion: number | null = null,
  currentSha256: string | null = null,
): OcaRecordPreflight => ({
  allowed: false,
  code,
  recordType,
  recordId,
  currentVersion,
  currentSha256,
  actorAssignmentId: null,
  actorAssignmentVersion: null,
  nextSafeAction,
});

async function setAuthority(
  client: PoolClient,
  tenantId: string,
  role: string,
  actorId: string,
) {
  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("select set_config('crays.tenant_id',$1,true)", [
    tenantId,
  ]);
  await client.query("select set_config('crays.actor_role',$1,true)", [role]);
  await client.query("select set_config('crays.actor_id',$1,true)", [actorId]);
}
async function resolveAccess(
  client: PoolClient,
  context: CraysRouteContext,
  allowedRoles: readonly string[],
): Promise<Access | OcaRecordPreflight> {
  const resolved = ocaGovernanceAuthority.resolveAccess(context);
  if (
    !resolved.allowed ||
    !resolved.tenantId ||
    !resolved.actorId ||
    !resolved.governanceRole
  )
    return denied(
      resolved.reasonCode,
      "Return to an authorized governance Role Home.",
    );
  if (!allowedRoles.includes(resolved.governanceRole))
    return denied(
      "ROLE_NOT_AUTHORIZED_FOR_COMMAND",
      "Return to the queue and request the exact governance owner.",
    );
  await setAuthority(
    client,
    resolved.tenantId,
    resolved.governanceRole,
    resolved.actorId,
  );
  const assignment = await client.query<{
    assignment_id: string;
    assignment_version: number;
    assignment_sha256: string;
  }>(
    `select assignment_id,assignment_version,assignment_sha256 from crays_core.oca_governance_actor_assignment_versions where tenant_id=$1 and programme_key='NCRV2-159-OCA'and actor_id=$2 and role_key=$3 and assignment_state='active'and effective_at<=now()and(expires_at is null or expires_at>now())order by assignment_version desc limit 2`,
    [resolved.tenantId, resolved.actorId, resolved.governanceRole],
  );
  if (assignment.rows.length !== 1)
    return denied(
      assignment.rows.length
        ? "AMBIGUOUS_ACTOR_ASSIGNMENT"
        : "ACTOR_ASSIGNMENT_REQUIRED",
      "Resolve the exact active governance actor assignment.",
    );
  return {
    tenantId: resolved.tenantId,
    actorId: resolved.actorId,
    governanceRole: resolved.governanceRole,
    assignmentId: assignment.rows[0].assignment_id,
    assignmentVersion: assignment.rows[0].assignment_version,
    assignmentSha256: assignment.rows[0].assignment_sha256,
  };
}
function isAccess(value: Access | OcaRecordPreflight): value is Access {
  return "tenantId" in value;
}
function allowed(
  access: Access,
  type: string,
  id: string,
  version: number,
  sha256: string,
  nextSafeAction: string,
): OcaRecordPreflight {
  return {
    allowed: true,
    code: "ALLOWED",
    recordType: type,
    recordId: id,
    currentVersion: version,
    currentSha256: sha256,
    actorAssignmentId: access.assignmentId,
    actorAssignmentVersion: access.assignmentVersion,
    nextSafeAction,
  };
}
async function withPreflight<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  work: (client: PoolClient, input: T) => Promise<OcaRecordPreflight>,
) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return denied(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Correct the command input.",
    );
  let client: PoolClient;
  try {
    client = await getCorePgPool().connect();
  } catch {
    return denied(
      "PREFLIGHT_UNAVAILABLE",
      "Retry against CRAYS Core; do not submit without a successful preflight.",
    );
  }
  try {
    await client.query("begin read only");
    const result = await work(client, parsed.data);
    await client.query("commit");
    return result;
  } catch {
    await client.query("rollback").catch(() => undefined);
    return denied(
      "PREFLIGHT_UNAVAILABLE",
      "Retry against CRAYS Core; do not submit without a successful preflight.",
    );
  } finally {
    client.release();
  }
}

const decisionRoles: Record<
  z.infer<typeof decisionClass>,
  readonly string[]
> = {
  north_star: ["crays_owner", "product_owner", "architecture"],
  architecture: ["crays_owner", "architecture"],
  authority: ["crays_owner", "architecture", "security", "dpo_legal"],
  privacy: ["crays_owner", "product_owner", "dpo_legal"],
  security: ["crays_owner", "architecture", "security"],
  health_food: ["crays_owner", "product_owner", "dpo_legal"],
  finance_legal: ["crays_owner", "product_owner", "dpo_legal"],
  model: ["product_owner", "architecture", "security", "dpo_legal"],
  skill_plugin: ["product_owner", "architecture", "security", "dpo_legal"],
  channel: ["product_owner", "architecture", "security", "dpo_legal"],
  commercial: ["crays_owner", "product_owner"],
  release_production: [
    "crays_owner",
    "product_owner",
    "architecture",
    "security",
  ],
};
async function approversCover(
  client: PoolClient,
  access: Access,
  input: RecordOcaDecisionInput,
) {
  if (!["accepted", "conditional", "rejected"].includes(input.state))
    return true;
  if (!input.decidedByActorIds.includes(access.actorId)) return false;
  const roles = decisionRoles[input.decisionClass];
  const result = await client.query<{ role_key: string }>(
    `select distinct role_key from crays_core.oca_governance_actor_assignment_versions where tenant_id=$1 and programme_key='NCRV2-159-OCA'and actor_id=any($2::text[])and role_key=any($3::text[])and assignment_state='active'and effective_at<=now()and(expires_at is null or expires_at>now())`,
    [access.tenantId, input.decidedByActorIds, roles],
  );
  return roles.every((role) =>
    result.rows.some((row) => row.role_key === role),
  );
}

async function findPrior(
  client: PoolClient,
  access: Access,
  idempotencyKey: string,
) {
  return (
    (
      await client.query<{
        canonical_payload_sha256: string;
        command_receipt_id: string;
        consequence_record_type: string | null;
        consequence_record_id: string | null;
        consequence_record_version: number | null;
        consequence_sha256: string | null;
        next_safe_action: string;
      }>(
        `select root.canonical_payload_sha256,receipt.command_receipt_id,receipt.consequence_record_type,receipt.consequence_record_id,receipt.consequence_record_version,receipt.consequence_sha256,receipt.next_safe_action from crays_core.oca_governance_command_roots root join lateral(select * from crays_core.oca_governance_command_receipt_versions receipt where receipt.tenant_id=root.tenant_id and receipt.idempotency_root_id=root.idempotency_root_id order by receipt_version desc limit 1)receipt on true where root.tenant_id=$1 and root.programme_key='NCRV2-159-OCA'and root.actor_id=$2 and root.idempotency_key_sha256=$3`,
        [access.tenantId, access.actorId, hash(idempotencyKey)],
      )
    ).rows[0] ?? null
  );
}
async function insertRoot(
  client: PoolClient,
  access: Access,
  commandName: string,
  idempotencyKey: string,
  payloadSha: string,
  expected: { type: string; id: string; version: number; sha256: string },
) {
  const id = randomUUID();
  await client.query(
    `insert into crays_core.oca_governance_command_roots(tenant_id,idempotency_root_id,programme_key,actor_id,actor_role_key,actor_assignment_id,actor_assignment_version,actor_assignment_sha256,command_name,idempotency_key_sha256,canonical_payload_sha256,expected_record_type,expected_record_id,expected_record_version,expected_record_sha256,root_state)values($1,$2,'NCRV2-159-OCA',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'accepted')`,
    [
      access.tenantId,
      id,
      access.actorId,
      access.governanceRole,
      access.assignmentId,
      access.assignmentVersion,
      access.assignmentSha256,
      commandName,
      hash(idempotencyKey),
      payloadSha,
      expected.type,
      expected.id,
      expected.version,
      expected.sha256,
    ],
  );
  return id;
}
async function insertReceipt(
  client: PoolClient,
  access: Access,
  rootId: string,
  commandName: string,
  payloadSha: string,
  expected: { type: string; id: string; version: number; sha256: string },
  consequence: Consequence,
  correlationId: string,
  resultCode: string,
  nextSafeAction: string,
  businessCompletionState = "pending",
) {
  const receiptId = randomUUID(),
    receiptSha = hash(
      canonical({
        receiptId,
        rootId,
        commandName,
        payloadSha,
        expected,
        consequence,
        resultCode,
        businessCompletionState,
      }),
    );
  await client.query(
    `insert into crays_core.oca_governance_command_receipt_versions(tenant_id,command_receipt_id,receipt_version,idempotency_root_id,programme_key,actor_id,command_name,canonical_payload_sha256,expected_record_type,expected_record_id,expected_record_version,expected_record_sha256,command_state,result_code,consequence_record_type,consequence_record_id,consequence_record_version,consequence_sha256,business_completion_state,correlation_id,next_safe_action,receipt_sha256)values($1,$2,1,$3,'NCRV2-159-OCA',$4,$5,$6,$7,$8,$9,$10,'applied',$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
      access.tenantId,
      receiptId,
      rootId,
      access.actorId,
      commandName,
      payloadSha,
      expected.type,
      expected.id,
      expected.version,
      expected.sha256,
      resultCode,
      consequence.type,
      consequence.id,
      consequence.version,
      consequence.sha256,
      businessCompletionState,
      correlationId,
      nextSafeAction,
      receiptSha,
    ],
  );
  return { receiptId, receiptSha };
}
const replay = (
  prior: NonNullable<Awaited<ReturnType<typeof findPrior>>>,
  expectedPayloadHash: string,
  correlationId: string,
) =>
  prior.canonical_payload_sha256 !== expectedPayloadHash
    ? {
        status: "idempotency_conflict",
        replayed: false,
        recordType: null,
        recordId: null,
        recordVersion: null,
        receiptId: prior.command_receipt_id,
        preflight: null,
        nextSafeAction:
          "Reuse the original payload or create a new idempotency key after review.",
        correlationId,
      }
    : {
        status: "replayed",
        replayed: true,
        recordType: prior.consequence_record_type,
        recordId: prior.consequence_record_id,
        recordVersion: prior.consequence_record_version,
        receiptId: prior.command_receipt_id,
        preflight: null,
        nextSafeAction: prior.next_safe_action,
        correlationId,
      };
const deniedResult = async (
  preflight: OcaRecordPreflight,
  correlationId: string,
  context: CraysRouteContext,
  command:
    | "ApproveScopeChange"
    | "RejectScopeChange"
    | "RecordDecision"
    | "SupersedeDecision"
    | "AcknowledgeSourceDrift"
    | "ReconcileGovernanceCommand",
  input: unknown,
) => ({
  status: "preflight_denied",
  replayed: false,
  recordType: null,
  recordId: null,
  recordVersion: null,
  receiptId: await persistOcaGovernanceDenialReceipt(
    context,
    command,
    input,
    preflight,
    correlationId,
  ),
  preflight,
  nextSafeAction: preflight.nextSafeAction,
  correlationId,
});
const unknown = (correlationId: string) => ({
  status: "unknown_outcome",
  replayed: false,
  recordType: null,
  recordId: null,
  recordVersion: null,
  receiptId: null,
  preflight: null,
  nextSafeAction:
    "Reconcile or replay using the exact original idempotency key before any new command.",
  correlationId,
});

async function preflightRecordDecisionWithClient(
  client: PoolClient,
  context: CraysRouteContext,
  input: RecordOcaDecisionInput,
) {
  const access = await resolveAccess(client, context, [
    "crays_owner",
    "programme_governance",
    "product_owner",
    "architecture",
    "security",
    "dpo_legal",
  ]);
  if (!isAccess(access)) return access;
  const manifest = await client.query<{
    manifest_version: number;
    manifest_sha256: string;
  }>(
    `select manifest_version,manifest_sha256 from crays_core.oca_programme_board_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA'limit 1`,
    [access.tenantId],
  );
  const current = manifest.rows[0];
  if (!current)
    return denied(
      "PROGRAMME_MANIFEST_REQUIRED",
      "Create the canonical ProgrammeManifest first.",
      "ProgrammeManifest",
      "NCRV2-159-OCA",
    );
  if (current.manifest_version !== input.expectedManifestVersion)
    return denied(
      "MANIFEST_VERSION_CONFLICT",
      "Reload and review the current ProgrammeManifest.",
      "ProgrammeManifest",
      "NCRV2-159-OCA",
      current.manifest_version,
      current.manifest_sha256,
    );
  const duplicate = await client.query(
    `select 1 from crays_core.oca_decision_register_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA'and decision_key=$2 limit 1`,
    [access.tenantId, input.decisionKey],
  );
  if (duplicate.rowCount)
    return denied(
      "DECISION_KEY_EXISTS",
      "Open and version the existing Decision instead.",
      "Decision",
      input.decisionKey,
    );
  if (!(await approversCover(client, access, input)))
    return denied(
      "REQUIRED_APPROVERS_MISSING",
      "Obtain active assignments for every server-required specialist role.",
      "ProgrammeManifest",
      "NCRV2-159-OCA",
      current.manifest_version,
      current.manifest_sha256,
    );
  return allowed(
    access,
    "ProgrammeManifest",
    "NCRV2-159-OCA",
    current.manifest_version,
    current.manifest_sha256,
    "Record the exact Decision and durable receipt.",
  );
}
export const preflightRecordOcaDecision = (
  context: CraysRouteContext,
  raw: unknown,
) =>
  withPreflight(recordDecisionSchema, raw, (client, input) =>
    preflightRecordDecisionWithClient(client, context, input),
  );

export async function recordOcaDecision(
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const command = "RecordDecision" as const;
  const parsed = recordDecisionSchema.safeParse(raw);
  if (!parsed.success)
    return deniedResult(
      denied("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Correct the command input."),
      correlationId, context, command, raw,
    );
  const input = parsed.data, pHash = payloadHash(input);
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); } catch { return unknown(correlationId); }
  try {
    await client.query("begin");
    const access = await resolveAccess(client, context, [
      "crays_owner",
      "programme_governance",
      "product_owner",
      "architecture",
      "security",
      "dpo_legal",
    ]);
    if (!isAccess(access)) {
      await client.query("rollback");
      return deniedResult(access, correlationId, context, command, input);
    }
    const prior = await findPrior(client, access, input.idempotencyKey);
    if (prior) {
      await client.query("commit");
      return replay(prior, pHash, correlationId);
    }
    const preflight = await preflightRecordDecisionWithClient(
      client,
      context,
      input,
    );
    if (!preflight.allowed || !preflight.currentSha256) {
      await client.query("rollback");
      return deniedResult(preflight, correlationId, context, command, input);
    }
    const decisionId = randomUUID(),
      requiredRoles = decisionRoles[input.decisionClass],
      decisionSha = hash(
        canonical({
          decisionId,
          input,
          requiredRoles,
          ownerActorId: access.actorId,
        }),
      );
    const root = await insertRoot(
      client,
      access,
      "RecordDecision",
      input.idempotencyKey,
      pHash,
      {
        type: "ProgrammeManifest",
        id: "NCRV2-159-OCA",
        version: input.expectedManifestVersion,
        sha256: preflight.currentSha256,
      },
    );
    await client.query(
      `insert into crays_core.oca_decision_versions(tenant_id,decision_id,decision_version,programme_key,decision_key,title,decision_class,state,rationale,alternatives_considered,affected_blocks,affected_authority_dimensions,evidence_refs,owner_actor_id,owner_role_key,owner_assignment_id,owner_assignment_version,owner_assignment_sha256,required_approver_roles,decided_by_actor_ids,effective_at,review_due_at,expires_at,decision_sha256)values($1,$2,1,'NCRV2-159-OCA',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        access.tenantId,
        decisionId,
        input.decisionKey,
        input.title,
        input.decisionClass,
        input.state,
        input.rationale,
        JSON.stringify(input.alternativesConsidered),
        input.affectedBlocks,
        input.affectedAuthorityDimensions,
        input.evidenceRefs,
        access.actorId,
        access.governanceRole,
        access.assignmentId,
        access.assignmentVersion,
        access.assignmentSha256,
        requiredRoles,
        input.decidedByActorIds,
        ["accepted", "conditional", "rejected"].includes(input.state)
          ? new Date().toISOString()
          : null,
        input.reviewDueAt,
        input.expiresAt ?? null,
        decisionSha,
      ],
    );
    const next =
      input.state === "accepted"
        ? "Open the linked ScopeChange and run its exact approval preflight."
        : "Continue the Decision review until every required approver and evidence item is present.";
    const receipt = await insertReceipt(
      client,
      access,
      root,
      "RecordDecision",
      pHash,
      {
        type: "ProgrammeManifest",
        id: "NCRV2-159-OCA",
        version: input.expectedManifestVersion,
        sha256: preflight.currentSha256,
      },
      { type: "Decision", id: decisionId, version: 1, sha256: decisionSha },
      correlationId,
      "decision_recorded",
      next,
    );
    await client.query("commit");
    return {
      status: "applied",
      replayed: false,
      recordType: "Decision",
      recordId: decisionId,
      recordVersion: 1,
      receiptId: receipt.receiptId,
      preflight,
      nextSafeAction: next,
      correlationId,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return unknown(correlationId);
  } finally {
    client.release();
  }
}

async function getDecision(client: PoolClient, tenantId: string, id: string) {
  return (
    (
      await client.query<Record<string, unknown>>(
        `select register.*,versions.alternatives_considered,versions.owner_role_key,versions.owner_assignment_id,versions.owner_assignment_version,versions.owner_assignment_sha256 from crays_core.oca_decision_register_read_model register join crays_core.oca_decision_versions versions using(tenant_id,decision_id,decision_version)where register.tenant_id=$1 and register.programme_key='NCRV2-159-OCA'and register.decision_id=$2 limit 1`,
        [tenantId, id],
      )
    ).rows[0] ?? null
  );
}
async function preflightSupersedeWithClient(
  client: PoolClient,
  context: CraysRouteContext,
  input: SupersedeOcaDecisionInput,
) {
  const access = await resolveAccess(client, context, [
    "crays_owner",
    "programme_governance",
    "product_owner",
    "architecture",
    "security",
    "dpo_legal",
  ]);
  if (!isAccess(access)) return access;
  const row = await getDecision(client, access.tenantId, input.decisionId);
  if (!row)
    return denied(
      "DECISION_NOT_FOUND",
      "Return to the authorized Decision register.",
      "Decision",
      input.decisionId,
    );
  const version = Number(row.decision_version),
    sha256 = String(row.decision_sha256);
  if (
    version !== input.expectedDecisionVersion ||
    sha256 !== input.expectedDecisionSha256
  )
    return denied(
      "DECISION_VERSION_CONFLICT",
      "Reload the Decision and review its current version.",
      "Decision",
      input.decisionId,
      version,
      sha256,
    );
  if (["superseded", "expired", "revoked"].includes(String(row.state)))
    return denied(
      "DECISION_NOT_SUPERSEDABLE",
      "Open the current effective Decision.",
      "Decision",
      input.decisionId,
      version,
      sha256,
    );
  return allowed(
    access,
    "Decision",
    input.decisionId,
    version,
    sha256,
    "Append the immutable superseded Decision version and receipt.",
  );
}
export const preflightSupersedeOcaDecision = (
  context: CraysRouteContext,
  raw: unknown,
) =>
  withPreflight(supersedeDecisionSchema, raw, (client, input) =>
    preflightSupersedeWithClient(client, context, input),
  );

export async function supersedeOcaDecision(
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const command = "SupersedeDecision" as const;
  const parsed = supersedeDecisionSchema.safeParse(raw);
  if (!parsed.success)
    return deniedResult(
      denied("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Correct the command input."),
      correlationId, context, command, raw,
    );
  const input = parsed.data, pHash = payloadHash(input);
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); } catch { return unknown(correlationId); }
  try {
    await client.query("begin");
    const access = await resolveAccess(client, context, [
      "crays_owner",
      "programme_governance",
      "product_owner",
      "architecture",
      "security",
      "dpo_legal",
    ]);
    if (!isAccess(access)) {
      await client.query("rollback");
      return deniedResult(access, correlationId, context, command, input);
    }
    const prior = await findPrior(client, access, input.idempotencyKey);
    if (prior) {
      await client.query("commit");
      return replay(prior, pHash, correlationId);
    }
    const preflight = await preflightSupersedeWithClient(
      client,
      context,
      input,
    );
    if (!preflight.allowed || !preflight.currentSha256) {
      await client.query("rollback");
      return deniedResult(preflight, correlationId, context, command, input);
    }
    const row = await getDecision(client, access.tenantId, input.decisionId);
    if (!row) throw new Error("DECISION_DISAPPEARED");
    const nextVersion = input.expectedDecisionVersion + 1,
      decisionSha = hash(
        canonical({
          previousSha: input.expectedDecisionSha256,
          nextVersion,
          state: "superseded",
          reason: input.reason,
          evidenceRef: input.evidenceRef,
          actorId: access.actorId,
        }),
      );
    const root = await insertRoot(
      client,
      access,
      "SupersedeDecision",
      input.idempotencyKey,
      pHash,
      {
        type: "Decision",
        id: input.decisionId,
        version: input.expectedDecisionVersion,
        sha256: input.expectedDecisionSha256,
      },
    );
    await client.query(
      `insert into crays_core.oca_decision_versions(tenant_id,decision_id,decision_version,programme_key,decision_key,title,decision_class,state,rationale,alternatives_considered,affected_blocks,affected_authority_dimensions,evidence_refs,owner_actor_id,owner_role_key,owner_assignment_id,owner_assignment_version,owner_assignment_sha256,required_approver_roles,decided_by_actor_ids,effective_at,review_due_at,expires_at,supersedes_decision_version,decision_sha256)values($1,$2,$3,'NCRV2-159-OCA',$4,$5,$6,'superseded',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [
        access.tenantId,
        input.decisionId,
        nextVersion,
        row.decision_key,
        row.title,
        row.decision_class,
        `${String(row.rationale)}\nSuperseded: ${input.reason}`,
        JSON.stringify(row.alternatives_considered),
        row.affected_blocks,
        row.affected_authority_dimensions,
        [...(row.evidence_refs as string[]), input.evidenceRef],
        row.owner_actor_id,
        row.owner_role_key,
        row.owner_assignment_id,
        row.owner_assignment_version,
        row.owner_assignment_sha256,
        row.required_approver_roles,
        Array.from(
          new Set([...(row.decided_by_actor_ids as string[]), access.actorId]),
        ),
        row.effective_at,
        row.review_due_at,
        row.expires_at,
        input.expectedDecisionVersion,
        decisionSha,
      ],
    );
    const next =
      "Record the replacement Decision under a new decision key before dependent work continues.";
    const receipt = await insertReceipt(
      client,
      access,
      root,
      "SupersedeDecision",
      pHash,
      {
        type: "Decision",
        id: input.decisionId,
        version: input.expectedDecisionVersion,
        sha256: input.expectedDecisionSha256,
      },
      {
        type: "Decision",
        id: input.decisionId,
        version: nextVersion,
        sha256: decisionSha,
      },
      correlationId,
      "decision_superseded",
      next,
    );
    await client.query("commit");
    return {
      status: "applied",
      replayed: false,
      recordType: "Decision",
      recordId: input.decisionId,
      recordVersion: nextVersion,
      receiptId: receipt.receiptId,
      preflight,
      nextSafeAction: next,
      correlationId,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return unknown(correlationId);
  } finally {
    client.release();
  }
}

async function getScope(client: PoolClient, tenantId: string, id: string) {
  return (
    (
      await client.query<Record<string, unknown>>(
        `select queue.*,versions.requested_by_role_key,versions.requested_by_assignment_id,versions.requested_by_assignment_version,versions.requested_by_assignment_sha256 from crays_core.oca_scope_change_queue_read_model queue join crays_core.oca_scope_change_versions versions using(tenant_id,scope_change_id,scope_change_version)where queue.tenant_id=$1 and queue.programme_key='NCRV2-159-OCA'and queue.scope_change_id=$2 limit 1`,
        [tenantId, id],
      )
    ).rows[0] ?? null
  );
}
async function preflightTransitionWithClient(
  client: PoolClient,
  context: CraysRouteContext,
  input: TransitionOcaScopeChangeInput,
  target: "approved" | "rejected",
) {
  const access = await resolveAccess(client, context, [
    "crays_owner",
    "programme_governance",
    "product_owner",
    "architecture",
    "security",
    "dpo_legal",
    "qa_sre",
  ]);
  if (!isAccess(access)) return access;
  const scope = await getScope(client, access.tenantId, input.scopeChangeId);
  if (!scope)
    return denied(
      "SCOPE_CHANGE_NOT_FOUND",
      "Return to the authorized Scope Change queue.",
      "ScopeChange",
      input.scopeChangeId,
    );
  const version = Number(scope.scope_change_version),
    sha256 = String(scope.scope_change_sha256);
  if (
    version !== input.expectedScopeChangeVersion ||
    sha256 !== input.expectedScopeChangeSha256
  )
    return denied(
      "SCOPE_CHANGE_VERSION_CONFLICT",
      "Reload and review the current ScopeChange.",
      "ScopeChange",
      input.scopeChangeId,
      version,
      sha256,
    );
  if (!["impact_review", "approval_required"].includes(String(scope.state)))
    return denied(
      "SCOPE_CHANGE_NOT_REVIEWABLE",
      "Open a ScopeChange awaiting impact or approval review.",
      "ScopeChange",
      input.scopeChangeId,
      version,
      sha256,
    );
  const decision = await getDecision(client, access.tenantId, input.decisionId);
  if (!decision)
    return denied(
      "DECISION_NOT_FOUND",
      "Record the required Decision first.",
      "ScopeChange",
      input.scopeChangeId,
      version,
      sha256,
    );
  if (
    Number(decision.decision_version) !== input.decisionVersion ||
    String(decision.decision_sha256) !== input.decisionSha256
  )
    return denied(
      "DECISION_VERSION_CONFLICT",
      "Reload the linked Decision.",
      "ScopeChange",
      input.scopeChangeId,
      version,
      sha256,
    );
  if (
    String(decision.state) !== (target === "approved" ? "accepted" : "rejected")
  )
    return denied(
      "DECISION_STATE_MISMATCH",
      `A ${target === "approved" ? "accepted" : "rejected"} Decision is required.`,
      "ScopeChange",
      input.scopeChangeId,
      version,
      sha256,
    );
  const decisionBlocks = decision.affected_blocks as string[],
    decisionDimensions = decision.affected_authority_dimensions as string[];
  if (
    !(scope.affected_blocks as string[]).every((value) =>
      decisionBlocks.includes(value),
    ) ||
    !(scope.affected_authority_dimensions as string[]).every((value) =>
      decisionDimensions.includes(value),
    )
  )
    return denied(
      "DECISION_COVERAGE_INCOMPLETE",
      "Record a Decision covering every affected block and authority dimension.",
      "ScopeChange",
      input.scopeChangeId,
      version,
      sha256,
    );
  return allowed(
    access,
    "ScopeChange",
    input.scopeChangeId,
    version,
    sha256,
    `${target === "approved" ? "Approve" : "Reject"} the exact ScopeChange and persist its next version and receipt.`,
  );
}
export const preflightApproveOcaScopeChange = (
  context: CraysRouteContext,
  raw: unknown,
) =>
  withPreflight(transitionScopeSchema, raw, (client, input) =>
    preflightTransitionWithClient(client, context, input, "approved"),
  );
export const preflightRejectOcaScopeChange = (
  context: CraysRouteContext,
  raw: unknown,
) =>
  withPreflight(transitionScopeSchema, raw, (client, input) =>
    preflightTransitionWithClient(client, context, input, "rejected"),
  );

async function transitionScope(
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
  target: "approved" | "rejected",
) {
  const command = target === "approved" ? "ApproveScopeChange" : "RejectScopeChange";
  const parsed = transitionScopeSchema.safeParse(raw);
  if (!parsed.success)
    return deniedResult(
      denied("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Correct the command input."),
      correlationId, context, command, raw,
    );
  const input = parsed.data, pHash = payloadHash(input);
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); } catch { return unknown(correlationId); }
  try {
    await client.query("begin");
    const access = await resolveAccess(client, context, [
      "crays_owner",
      "programme_governance",
      "product_owner",
      "architecture",
      "security",
      "dpo_legal",
      "qa_sre",
    ]);
    if (!isAccess(access)) {
      await client.query("rollback");
      return deniedResult(access, correlationId, context, command, input);
    }
    const prior = await findPrior(client, access, input.idempotencyKey);
    if (prior) {
      await client.query("commit");
      return replay(prior, pHash, correlationId);
    }
    const preflight = await preflightTransitionWithClient(
      client,
      context,
      input,
      target,
    );
    if (!preflight.allowed) {
      await client.query("rollback");
      return deniedResult(preflight, correlationId, context, command, input);
    }
    const row = await getScope(client, access.tenantId, input.scopeChangeId);
    if (!row) throw new Error("SCOPE_DISAPPEARED");
    const nextVersion = input.expectedScopeChangeVersion + 1,
      scopeSha = hash(
        canonical({
          previousSha: input.expectedScopeChangeSha256,
          nextVersion,
          state: target,
          decisionId: input.decisionId,
          decisionVersion: input.decisionVersion,
          actorId: access.actorId,
        }),
      );
    const root = await insertRoot(
      client,
      access,
      command,
      input.idempotencyKey,
      pHash,
      {
        type: "ScopeChange",
        id: input.scopeChangeId,
        version: input.expectedScopeChangeVersion,
        sha256: input.expectedScopeChangeSha256,
      },
    );
    await client.query(
      `insert into crays_core.oca_scope_change_versions(tenant_id,scope_change_id,scope_change_version,programme_key,change_class,proposal,reason,requested_by_actor_id,requested_by_role_key,requested_by_assignment_id,requested_by_assignment_version,requested_by_assignment_sha256,affected_blocks,affected_sources,affected_records,affected_roles,affected_verticals,affected_authority_dimensions,risk_class,migration_required,rollback_plan_ref,test_plan_ref,decision_id,decision_version,state,expected_manifest_version,effective_manifest_version,due_at,supersedes_scope_change_version,scope_change_sha256)values($1,$2,$3,'NCRV2-159-OCA',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
      [
        access.tenantId,
        input.scopeChangeId,
        nextVersion,
        row.change_class,
        row.proposal,
        row.reason,
        row.requested_by_actor_id,
        row.requested_by_role_key,
        row.requested_by_assignment_id,
        row.requested_by_assignment_version,
        row.requested_by_assignment_sha256,
        row.affected_blocks,
        row.affected_sources,
        row.affected_records,
        row.affected_roles,
        row.affected_verticals,
        row.affected_authority_dimensions,
        row.risk_class,
        row.migration_required,
        row.rollback_plan_ref,
        row.test_plan_ref,
        input.decisionId,
        input.decisionVersion,
        target,
        row.expected_manifest_version,
        row.effective_manifest_version,
        row.due_at,
        input.expectedScopeChangeVersion,
        scopeSha,
      ],
    );
    const next =
      target === "approved"
        ? "Approval is durable but not applied; execute the owning migration/release task under its separate preflight."
        : "Return to the proposal owner with the durable rejection receipt and required correction.";
    const receipt = await insertReceipt(
      client,
      access,
      root,
      command,
      pHash,
      {
        type: "ScopeChange",
        id: input.scopeChangeId,
        version: input.expectedScopeChangeVersion,
        sha256: input.expectedScopeChangeSha256,
      },
      {
        type: "ScopeChange",
        id: input.scopeChangeId,
        version: nextVersion,
        sha256: scopeSha,
      },
      correlationId,
      target === "approved" ? "scope_change_approved" : "scope_change_rejected",
      next,
    );
    await client.query("commit");
    return {
      status: "applied",
      replayed: false,
      recordType: "ScopeChange",
      recordId: input.scopeChangeId,
      recordVersion: nextVersion,
      receiptId: receipt.receiptId,
      preflight,
      nextSafeAction: next,
      correlationId,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return unknown(correlationId);
  } finally {
    client.release();
  }
}
export const approveOcaScopeChange = (
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) => transitionScope(context, raw, correlationId, "approved");
export const rejectOcaScopeChange = (
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) => transitionScope(context, raw, correlationId, "rejected");

async function preflightAcknowledgeWithClient(
  client: PoolClient,
  context: CraysRouteContext,
  input: AcknowledgeOcaSourceDriftInput,
) {
  const access = await resolveAccess(client, context, [
    "programme_governance",
    "architecture",
    "security",
    "dpo_legal",
  ]);
  if (!isAccess(access)) return access;
  const source = (
    await client.query<Record<string, unknown>>(
      `select * from crays_core.oca_source_drift_read_model where tenant_id=$1 and programme_key='NCRV2-159-OCA'and source_fingerprint_id=$2 limit 1`,
      [access.tenantId, input.sourceFingerprintId],
    )
  ).rows[0];
  if (!source)
    return denied(
      "SOURCE_DRIFT_NOT_FOUND",
      "Return to the current Source Register.",
      "SourceFingerprint",
      input.sourceFingerprintId,
    );
  if (String(source.sha256) !== input.expectedSourceSha256)
    return denied(
      "SOURCE_FINGERPRINT_CONFLICT",
      "Reload and review the current fingerprint.",
      "SourceFingerprint",
      input.sourceFingerprintId,
      0,
      String(source.sha256),
    );
  if (
    input.disposition === "current" &&
    input.newSha256 === input.expectedSourceSha256
  )
    return denied(
      "UNCHANGED_DRIFT_CANNOT_BE_ACCEPTED",
      "Use byte-identical fingerprint refresh policy or provide the reviewed new artifact hash.",
      "SourceFingerprint",
      input.sourceFingerprintId,
      0,
      String(source.sha256),
    );
  if (new Date(input.reviewDueAt) <= new Date())
    return denied(
      "REVIEW_DUE_AT_INVALID",
      "Select a future review date.",
      "SourceFingerprint",
      input.sourceFingerprintId,
      0,
      String(source.sha256),
    );
  return allowed(
    access,
    "SourceFingerprint",
    input.sourceFingerprintId,
    0,
    String(source.sha256),
    "Append the reviewed source fingerprint and durable receipt; changed meaning is never auto-approved.",
  );
}
export const preflightAcknowledgeOcaSourceDrift = (
  context: CraysRouteContext,
  raw: unknown,
) =>
  withPreflight(acknowledgeSourceSchema, raw, (client, input) =>
    preflightAcknowledgeWithClient(client, context, input),
  );

export async function acknowledgeOcaSourceDrift(
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const command = "AcknowledgeSourceDrift" as const;
  const parsed = acknowledgeSourceSchema.safeParse(raw);
  if (!parsed.success)
    return deniedResult(
      denied("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Correct the command input."),
      correlationId, context, command, raw,
    );
  const input = parsed.data, pHash = payloadHash(input);
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); } catch { return unknown(correlationId); }
  try {
    await client.query("begin");
    const access = await resolveAccess(client, context, [
      "programme_governance",
      "architecture",
      "security",
      "dpo_legal",
    ]);
    if (!isAccess(access)) {
      await client.query("rollback");
      return deniedResult(access, correlationId, context, command, input);
    }
    const prior = await findPrior(client, access, input.idempotencyKey);
    if (prior) {
      await client.query("commit");
      return replay(prior, pHash, correlationId);
    }
    const preflight = await preflightAcknowledgeWithClient(
      client,
      context,
      input,
    );
    if (!preflight.allowed) {
      await client.query("rollback");
      return deniedResult(preflight, correlationId, context, command, input);
    }
    const source = (
      await client.query<Record<string, unknown>>(
        `select * from crays_core.oca_source_drift_read_model where tenant_id=$1 and source_fingerprint_id=$2`,
        [access.tenantId, input.sourceFingerprintId],
      )
    ).rows[0];
    if (!source) throw new Error("SOURCE_DISAPPEARED");
    const sourceId = randomUUID();
    const root = await insertRoot(
      client,
      access,
      "AcknowledgeSourceDrift",
      input.idempotencyKey,
      pHash,
      {
        type: "SourceFingerprint",
        id: input.sourceFingerprintId,
        version: 0,
        sha256: input.expectedSourceSha256,
      },
    );
    await client.query(
      `insert into crays_core.oca_source_fingerprints(tenant_id,source_fingerprint_id,programme_key,source_path_or_origin_key,source_class,source_version,bytes,sha256,captured_at,review_due_at,volatility_class,authority_class,status,supersedes_fingerprint_id,reviewed_by_actor_id,reviewed_by_role_key,reviewed_by_assignment_id,reviewed_by_assignment_version,reviewed_by_assignment_sha256,reviewed_at)values($1,$2,'NCRV2-159-OCA',$3,$4,$5,$6,$7,now(),$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())`,
      [
        access.tenantId,
        sourceId,
        source.source_path_or_origin_key,
        source.source_class,
        input.newSourceVersion,
        input.newBytes ?? null,
        input.newSha256,
        input.reviewDueAt,
        source.volatility_class,
        source.authority_class,
        input.disposition,
        input.sourceFingerprintId,
        access.actorId,
        access.governanceRole,
        access.assignmentId,
        access.assignmentVersion,
        access.assignmentSha256,
      ],
    );
    const next =
      input.disposition === "current"
        ? "Run the OCA resolver and affected validators before admitting dependent work."
        : "Keep affected tasks fail-closed and route the source correction to its owner.";
    const receipt = await insertReceipt(
      client,
      access,
      root,
      "AcknowledgeSourceDrift",
      pHash,
      {
        type: "SourceFingerprint",
        id: input.sourceFingerprintId,
        version: 0,
        sha256: input.expectedSourceSha256,
      },
      {
        type: "SourceFingerprint",
        id: sourceId,
        version: 0,
        sha256: input.newSha256,
      },
      correlationId,
      "source_drift_acknowledged",
      next,
    );
    await client.query("commit");
    return {
      status: "applied",
      replayed: false,
      recordType: "SourceFingerprint",
      recordId: sourceId,
      recordVersion: 0,
      receiptId: receipt.receiptId,
      preflight,
      nextSafeAction: next,
      correlationId,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return unknown(correlationId);
  } finally {
    client.release();
  }
}

async function preflightReconcileWithClient(
  client: PoolClient,
  context: CraysRouteContext,
  input: ReconcileOcaGovernanceCommandInput,
) {
  const access = await resolveAccess(client, context, [
    "crays_owner",
    "programme_governance",
    "product_owner",
    "architecture",
    "engineering",
    "security",
    "dpo_legal",
    "qa_sre",
  ]);
  if (!isAccess(access)) return access;
  const row = (
    await client.query<Record<string, unknown>>(
      `select receipt.*,root.expected_record_type,root.expected_record_id,root.expected_record_version,root.expected_record_sha256 from crays_core.oca_governance_command_roots root join lateral(select * from crays_core.oca_governance_command_receipt_versions receipt where receipt.tenant_id=root.tenant_id and receipt.idempotency_root_id=root.idempotency_root_id order by receipt_version desc limit 1)receipt on true where root.tenant_id=$1 and root.programme_key='NCRV2-159-OCA'and root.actor_id=$2 and root.idempotency_key_sha256=$3`,
      [access.tenantId, access.actorId, hash(input.originalIdempotencyKey)],
    )
  ).rows[0];
  if (!row)
    return denied(
      "ORIGINAL_COMMAND_NOT_FOUND",
      "Use the original actor and exact original idempotency key.",
    );
  if (
    String(row.command_receipt_id) !== input.expectedReceiptId ||
    Number(row.receipt_version) !== input.expectedReceiptVersion ||
    String(row.receipt_sha256) !== input.expectedReceiptSha256
  )
    return denied(
      "RECEIPT_VERSION_CONFLICT",
      "Reload the receipt timeline and reconcile its latest version.",
      "ScopeChange",
      String(row.expected_record_id),
      Number(row.expected_record_version),
      String(row.expected_record_sha256),
    );
  if (["reconciled", "failed"].includes(String(row.business_completion_state)))
    return denied(
      "COMMAND_ALREADY_RECONCILED",
      "Follow the persisted next safe action.",
      String(row.expected_record_type),
      String(row.expected_record_id),
      Number(row.expected_record_version),
      String(row.expected_record_sha256),
    );
  return allowed(
    access,
    String(row.expected_record_type),
    String(row.expected_record_id),
    Number(row.expected_record_version),
    String(row.expected_record_sha256),
    "Persist reconciliation against the exact original receipt and a separate idempotent reconciliation root.",
  );
}
export const preflightReconcileOcaGovernanceCommand = (
  context: CraysRouteContext,
  raw: unknown,
) =>
  withPreflight(reconcileSchema, raw, (client, input) =>
    preflightReconcileWithClient(client, context, input),
  );

export async function reconcileOcaGovernanceCommand(
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const command = "ReconcileGovernanceCommand" as const;
  const parsed = reconcileSchema.safeParse(raw);
  if (!parsed.success)
    return deniedResult(
      denied("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Correct the command input."),
      correlationId, context, command, raw,
    );
  const input = parsed.data, pHash = payloadHash(input);
  let client: PoolClient;
  try { client = await getCorePgPool().connect(); } catch { return unknown(correlationId); }
  try {
    await client.query("begin");
    const access = await resolveAccess(client, context, [
      "crays_owner",
      "programme_governance",
      "product_owner",
      "architecture",
      "engineering",
      "security",
      "dpo_legal",
      "qa_sre",
    ]);
    if (!isAccess(access)) {
      await client.query("rollback");
      return deniedResult(access, correlationId, context, command, input);
    }
    const prior = await findPrior(client, access, input.idempotencyKey);
    if (prior) {
      await client.query("commit");
      return replay(prior, pHash, correlationId);
    }
    const preflight = await preflightReconcileWithClient(
      client,
      context,
      input,
    );
    if (
      !preflight.allowed ||
      !preflight.recordType ||
      !preflight.recordId ||
      preflight.currentVersion === null ||
      !preflight.currentSha256
    ) {
      await client.query("rollback");
      return deniedResult(preflight, correlationId, context, command, input);
    }
    const original = (
      await client.query<Record<string, unknown>>(
        `select receipt.*,root.idempotency_root_id from crays_core.oca_governance_command_roots root join lateral(select * from crays_core.oca_governance_command_receipt_versions receipt where receipt.tenant_id=root.tenant_id and receipt.idempotency_root_id=root.idempotency_root_id order by receipt_version desc limit 1)receipt on true where root.tenant_id=$1 and root.actor_id=$2 and root.idempotency_key_sha256=$3`,
        [access.tenantId, access.actorId, hash(input.originalIdempotencyKey)],
      )
    ).rows[0];
    if (!original) throw new Error("ORIGINAL_COMMAND_DISAPPEARED");
    const consequence: Consequence = {
      type: original.consequence_record_type as string | null,
      id: original.consequence_record_id as string | null,
      version: original.consequence_record_version as number | null,
      sha256: original.consequence_sha256 as string | null,
    };
    const expected = {
      type: preflight.recordType,
      id: preflight.recordId,
      version: preflight.currentVersion,
      sha256: preflight.currentSha256,
    };
    const root = await insertRoot(
      client,
      access,
      "ReconcileGovernanceCommand",
      input.idempotencyKey,
      pHash,
      expected,
    );
    const next =
      input.outcome === "reconciled"
        ? `Business outcome confirmed: ${input.reason}`
        : `Business outcome failed: ${input.reason}`;
    const newOriginalVersion = input.expectedReceiptVersion + 1,
      originalReceiptSha = hash(
        canonical({
          previous: input.expectedReceiptSha256,
          version: newOriginalVersion,
          outcome: input.outcome,
          reason: input.reason,
          actorId: access.actorId,
        }),
      );
    await client.query(
      `insert into crays_core.oca_governance_command_receipt_versions(tenant_id,command_receipt_id,receipt_version,idempotency_root_id,programme_key,actor_id,command_name,canonical_payload_sha256,expected_record_type,expected_record_id,expected_record_version,expected_record_sha256,command_state,result_code,consequence_record_type,consequence_record_id,consequence_record_version,consequence_sha256,business_completion_state,correlation_id,next_safe_action,supersedes_receipt_version,receipt_sha256)values($1,$2,$3,$4,'NCRV2-159-OCA',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        access.tenantId,
        input.expectedReceiptId,
        newOriginalVersion,
        original.idempotency_root_id,
        access.actorId,
        original.command_name,
        original.canonical_payload_sha256,
        original.expected_record_type,
        original.expected_record_id,
        original.expected_record_version,
        original.expected_record_sha256,
        input.outcome,
        input.outcome === "reconciled"
          ? "business_outcome_reconciled"
          : "business_outcome_failed",
        consequence.type,
        consequence.id,
        consequence.version,
        consequence.sha256,
        input.outcome,
        correlationId,
        next,
        input.expectedReceiptVersion,
        originalReceiptSha,
      ],
    );
    const receipt = await insertReceipt(
      client,
      access,
      root,
      "ReconcileGovernanceCommand",
      pHash,
      expected,
      consequence,
      correlationId,
      input.outcome === "reconciled" ? "command_reconciled" : "command_failed",
      next,
      input.outcome,
    );
    await client.query("commit");
    return {
      status: "applied",
      replayed: false,
      recordType: consequence.type,
      recordId: consequence.id,
      recordVersion: consequence.version,
      receiptId: receipt.receiptId,
      preflight,
      nextSafeAction: next,
      correlationId,
    };
  } catch {
    await client.query("rollback").catch(() => undefined);
    return unknown(correlationId);
  } finally {
    client.release();
  }
}
