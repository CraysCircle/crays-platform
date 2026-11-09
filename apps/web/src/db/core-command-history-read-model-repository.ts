import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;

export type CoreCommandHistoryQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
  limit?: number;
};

export type CoreCommandHistoryRecord = {
  commandId: string;
  commandKey: string;
  moduleKey: "project" | "crm" | "files" | "erp" | "loans" | "sync" | "operations";
  moduleLabel: "Project" | "CRM" | "Files" | "ERP" | "Loans" | "Sync" | "Operations";
  actorRole: string;
  label: string;
  commandStatus: string;
  validationStatus: string;
  dryRunStatus: string;
  targetApplyStatus: "blocked" | "not_configured";
  applyGate: string;
  applyGateStatus: string;
  targetObject: string;
  preparedOfferId: string | null;
  dealId: string | null;
  propertyCaseId: string | null;
  preflight: string;
  rollbackPolicy: string;
  auditEvent: string;
  createdAt: string;
  updatedAt: string;
  source: "persisted";
};

export type CoreCommandHistoryReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_history" | "forbidden";
  };
  query: {
    preparedOfferId: string | null;
    dealId: string | null;
    propertyCaseId: string | null;
    limit: number;
  };
  summary: {
    total: number;
    returned: number;
    modules: string[];
    latestCommandId: string | null;
    latestCreatedAt: string | null;
  };
  records: CoreCommandHistoryRecord[];
  queryStatus: "not_configured" | "schema_ready" | "forbidden";
  persistedCommandHistoryReturned: boolean;
  externalRecordsReturned: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  uploadsEnabled: false;
  externalSendingEnabled: false;
  financeActionsEnabled: false;
  bankActionsEnabled: false;
  releaseActionsEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

const allowedHistoryRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "reviewer",
  "franchise-partner",
  "studio-manager",
];

const oversightRoles: RoleKey[] = ["crays-management", "admin", "reviewer"];

const moduleLabels: Record<CoreCommandHistoryRecord["moduleKey"], CoreCommandHistoryRecord["moduleLabel"]> = {
  project: "Project",
  crm: "CRM",
  files: "Files",
  erp: "ERP",
  loans: "Loans",
  sync: "Sync",
  operations: "Operations",
};

function boundedLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function labelFromPayload(commandKey: string, payload: JsonRecord) {
  return text(payload.title) ?? text(payload.subject) ?? commandKey.replaceAll(".", " ");
}

function rollbackPolicy(summary: JsonRecord) {
  return text(summary.policy) ?? "Supersede or cancel before target apply.";
}

function auditEvent(summary: JsonRecord) {
  return text(summary.eventName) ?? "core.command.draft_visible";
}

function targetObject(entityType: string, entityId: string | null, entityScope: JsonRecord) {
  const scopedId = text(entityScope.preparedOfferId) ?? text(entityScope.dealId) ?? text(entityScope.propertyCaseId);
  return `${entityType}${entityId ? ` ${entityId}` : scopedId ? ` ${scopedId}` : ""}`;
}

function emptyReadModel(query: CoreCommandHistoryQuery, allowed: boolean, status: CoreCommandHistoryReadModel["queryStatus"]): CoreCommandHistoryReadModel {
  const limit = boundedLimit(query.limit);
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "internal_history" : "forbidden",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
      limit,
    },
    summary: {
      total: 0,
      returned: 0,
      modules: [],
      latestCommandId: null,
      latestCreatedAt: null,
    },
    records: [],
    queryStatus: status,
    persistedCommandHistoryReturned: false,
    externalRecordsReturned: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    releaseActionsEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getCoreCommandHistoryReadModel(query: CoreCommandHistoryQuery): Promise<CoreCommandHistoryReadModel> {
  const allowed = allowedHistoryRoles.includes(query.role);
  if (!allowed) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const limit = boundedLimit(query.limit);
  const canSeeAllRoles = oversightRoles.includes(query.role);
  const pool = getCorePgPool();
  const result = await pool.query<{
    command_id: string;
    command_key: string;
    module_key: CoreCommandHistoryRecord["moduleKey"];
    actor_role: string;
    entity_type: string;
    entity_id: string | null;
    entity_scope: JsonRecord;
    command_status: string;
    validation_status: string;
    dry_run_status: string;
    target_apply_status: CoreCommandHistoryRecord["targetApplyStatus"];
    apply_gate: string;
    apply_gate_status: string;
    input_payload: JsonRecord;
    rollback_summary: JsonRecord;
    audit_summary: JsonRecord;
    created_at: Date;
    updated_at: Date;
    total_count: string;
  }>(
    `
      select
        command_id,
        command_key,
        module_key,
        actor_role,
        entity_type,
        entity_id,
        entity_scope,
        command_status,
        validation_status,
        dry_run_status,
        target_apply_status,
        apply_gate,
        apply_gate_status,
        input_payload,
        rollback_summary,
        audit_summary,
        created_at,
        updated_at,
        count(*) over()::text as total_count
      from crays_core.core_command_requests
      where ($1::text is null or entity_scope ->> 'preparedOfferId' = $1 or entity_id = $1)
        and ($2::text is null or entity_scope ->> 'dealId' = $2 or entity_id = $2)
        and ($3::text is null or entity_scope ->> 'propertyCaseId' = $3 or entity_id = $3)
        and ($4::boolean = true or actor_role = $5 or actor_role = 'system')
      order by created_at desc, id desc
      limit $6
    `,
    [
      query.preparedOfferId ?? null,
      query.dealId ?? null,
      query.propertyCaseId ?? null,
      canSeeAllRoles,
      query.role,
      limit,
    ],
  );

  const records: CoreCommandHistoryRecord[] = result.rows.map((row) => {
    const entityScope = jsonObject(row.entity_scope);
    const inputPayload = jsonObject(row.input_payload);
    const rollbackSummary = jsonObject(row.rollback_summary);
    const auditSummary = jsonObject(row.audit_summary);

    return {
      commandId: row.command_id,
      commandKey: row.command_key,
      moduleKey: row.module_key,
      moduleLabel: moduleLabels[row.module_key],
      actorRole: row.actor_role,
      label: labelFromPayload(row.command_key, inputPayload),
      commandStatus: row.command_status,
      validationStatus: row.validation_status,
      dryRunStatus: row.dry_run_status,
      targetApplyStatus: row.target_apply_status,
      applyGate: row.apply_gate,
      applyGateStatus: row.apply_gate_status,
      targetObject: targetObject(row.entity_type, row.entity_id, entityScope),
      preparedOfferId: text(entityScope.preparedOfferId),
      dealId: text(entityScope.dealId),
      propertyCaseId: text(entityScope.propertyCaseId),
      preflight: `${row.validation_status} validation, ${row.dry_run_status} dry run, ${row.apply_gate_status} apply gate`,
      rollbackPolicy: rollbackPolicy(rollbackSummary),
      auditEvent: auditEvent(auditSummary),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      source: "persisted",
    };
  });
  const modules = [...new Set(records.map((record) => record.moduleLabel))];

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "internal_history",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
      limit,
    },
    summary: {
      total: Number(result.rows[0]?.total_count ?? 0),
      returned: records.length,
      modules,
      latestCommandId: records[0]?.commandId ?? null,
      latestCreatedAt: records[0]?.createdAt ?? null,
    },
    records,
    queryStatus: "schema_ready",
    persistedCommandHistoryReturned: records.length > 0,
    externalRecordsReturned: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    releaseActionsEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
