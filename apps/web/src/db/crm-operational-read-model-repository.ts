import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { readModelCacheGet, readModelCacheSet } from "@/lib/performance/read-model-cache";
import type { ResourceFilter, ResourceSortDirection } from "@/lib/resources";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;

export type CrmOperationalFamily =
  | "companies"
  | "people"
  | "leads"
  | "opportunities"
  | "emails"
  | "calendar-events"
  | "tasks"
  | "activities"
  | "notes";

export type CrmOperationalRow = {
  id: string;
  family: CrmOperationalFamily;
  label: string;
  status: string;
  owner: string;
  priority: string;
  updatedAt: string;
  craysEntityType: string;
  craysEntityId: string;
  fields: Record<string, string | number | boolean | null>;
  [key: string]: string | number | boolean | null | Record<string, string | number | boolean | null>;
};

export type CrmOperationalReadOptions = {
  role: RoleKey;
  family: CrmOperationalFamily;
  search?: string;
  filters?: ResourceFilter[];
  sortField?: string;
  sortDirection?: ResourceSortDirection;
  offset?: number;
  limit?: number;
};

export type CrmOperationalReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "crm_workspace" | "crm_readonly" | "release_blocked" | "forbidden";
    reason: string;
    canStageCrmActivity: boolean;
  };
  status: "ready" | "not_configured" | "release_blocked" | "forbidden";
  family: CrmOperationalFamily;
  summary: {
    records: number;
    companies: number;
    people: number;
    leads: number;
    opportunities: number;
    emails: number;
    calendarEvents: number;
    tasks: number;
    activities: number;
    notes: number;
    blockers: number;
    freshnessMinutes: number | null;
  };
  rows: CrmOperationalRow[];
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    totalReliable: true;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  actions: {
    commandRoute: "/api/crays/core-command/crm-activity";
    confirmationHeader: "stage-crm-activity-command";
    applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY";
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
  };
  provenance: {
    sourceSystem: "twenty";
    schemaStatus: "requires-discovery";
    projectionSource: "crays-core";
    seedBatch: string;
    note: string;
  };
};

type SourceRow = {
  external_entity_type: string;
  external_entity_id: string;
  crays_entity_type: string;
  crays_entity_id: string;
  sync_status: string;
  last_synced_at: string | null;
  updated_at: string | null;
  metadata: JsonRecord | null;
};

type SummaryRow = {
  records: string;
  companies: string;
  people: string;
  leads: string;
  opportunities: string;
  emails: string;
  calendar_events: string;
  tasks: string;
  activities: string;
  notes: string;
  blockers: string;
  latest: string | null;
};

const seedBatch = "crays-operational-realism-20260713-v1";
const externalSystem = "crm-operational-fixture";
const families: CrmOperationalFamily[] = ["companies", "people", "leads", "opportunities", "emails", "calendar-events", "tasks", "activities", "notes"];
const writeRoles: RoleKey[] = ["admin", "crays-management", "deal-manager", "expansion-manager", "reviewer"];
const readRoles: RoleKey[] = [...writeRoles, "finance"];
const cacheTtlMs = 30_000;
const cacheNamespace = "crm-operational";

function accessForRole(role: RoleKey): CrmOperationalReadModel["access"] {
  if (writeRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "crm_workspace",
      reason: "Role can inspect CRM operational records and stage guarded CRAYS activity drafts. Source writes and external sending remain closed.",
      canStageCrmActivity: true,
    };
  }

  if (readRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "crm_readonly",
      reason: "Role can inspect CRM operational records but cannot stage CRM activity drafts from this workspace.",
      canStageCrmActivity: false,
    };
  }

  if (["guest", "franchise-candidate", "franchise-partner", "bank-partner", "landlord", "vendor", "investor", "gym-member", "studio-manager", "hr"].includes(role)) {
    return {
      role,
      allowed: false,
      level: "release_blocked",
      reason: "This role has no released global CRM workspace scope. Use scoped portal/work-queue surfaces instead.",
      canStageCrmActivity: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the CRM operational workspace.",
    canStageCrmActivity: false,
  };
}

function empty(role: RoleKey, family: CrmOperationalFamily, status: CrmOperationalReadModel["status"]): CrmOperationalReadModel {
  const access = accessForRole(role);
  return {
    access,
    status,
    family,
    summary: {
      records: 0,
      companies: 0,
      people: 0,
      leads: 0,
      opportunities: 0,
      emails: 0,
      calendarEvents: 0,
      tasks: 0,
      activities: 0,
      notes: 0,
      blockers: 0,
      freshnessMinutes: null,
    },
    rows: [],
    pageInfo: { offset: 0, limit: 25, total: 0, totalReliable: true, hasNextPage: false, hasPreviousPage: false },
    actions: {
      commandRoute: "/api/crays/core-command/crm-activity",
      confirmationHeader: "stage-crm-activity-command",
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY",
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
    },
    provenance: {
      sourceSystem: "twenty",
      schemaStatus: "requires-discovery",
      projectionSource: "crays-core",
      seedBatch,
      note: "CRM operational records are CRAYS Core test projections mapped to source families. Twenty native schema remains discovery-required and is not exposed to the browser.",
    },
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sourceFieldValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(", ");
  return JSON.stringify(value);
}

function safeFieldName(value: string) {
  return /^[a-zA-Z][a-zA-Z0-9_-]{0,48}$/.test(value);
}

function fieldExpression(field: string) {
  if (field === "id") return "external_entity_id";
  if (field === "family") return "external_entity_type";
  if (field === "label") return "metadata #>> '{row,label}'";
  if (field === "status") return "coalesce(metadata #>> '{row,status}', sync_status)";
  if (field === "owner") return "metadata #>> '{row,owner}'";
  if (field === "priority") return "coalesce(metadata #>> '{row,priority}', metadata #>> '{row,fields,priority}')";
  if (field === "updatedAt") return "coalesce(metadata #>> '{row,modifiedAt}', updated_at::text)";
  if (safeFieldName(field)) return `metadata #>> '{row,fields,${field}}'`;
  return null;
}

function sortExpression(field: string | undefined) {
  const expression = field ? fieldExpression(field) : null;
  return expression ?? "coalesce(metadata #>> '{row,modifiedAt}', updated_at::text)";
}

function pushFilter(clauses: string[], values: unknown[], filter: ResourceFilter) {
  const expression = fieldExpression(filter.field);
  if (!expression) return;
  const operator = filter.operator;
  if (operator === "isNull") {
    clauses.push(`(${expression} is null or ${expression} = '')`);
    return;
  }

  values.push(filter.value ?? "");
  const index = values.length;
  if (operator === "eq") clauses.push(`lower(coalesce(${expression}, '')) = lower($${index}::text)`);
  else if (operator === "neq") clauses.push(`lower(coalesce(${expression}, '')) <> lower($${index}::text)`);
  else if (operator === "contains") clauses.push(`lower(coalesce(${expression}, '')) like '%' || lower($${index}::text) || '%'`);
  else if (operator === "startsWith") clauses.push(`lower(coalesce(${expression}, '')) like lower($${index}::text) || '%'`);
  else if (operator === "gt") clauses.push(`coalesce(${expression}, '') > $${index}::text`);
  else if (operator === "gte") clauses.push(`coalesce(${expression}, '') >= $${index}::text`);
  else if (operator === "lt") clauses.push(`coalesce(${expression}, '') < $${index}::text`);
  else if (operator === "lte") clauses.push(`coalesce(${expression}, '') <= $${index}::text`);
  else if (operator === "in") clauses.push(`coalesce(${expression}, '') = any(string_to_array($${index}::text, ','))`);
}

function rowFromSource(row: SourceRow): CrmOperationalRow {
  const metadata = row.metadata ?? {};
  const source = asRecord(metadata.row);
  const fields = asRecord(source.fields);
  const normalizedFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, sourceFieldValue(value)]));
  const family = families.includes(row.external_entity_type as CrmOperationalFamily) ? (row.external_entity_type as CrmOperationalFamily) : "activities";
  const updatedAt = text(source.modifiedAt, row.updated_at ?? row.last_synced_at ?? new Date(0).toISOString());
  return {
    id: row.external_entity_id,
    family,
    label: text(source.label, row.external_entity_id),
    status: text(source.status, row.sync_status),
    owner: text(source.owner, "Deal Manager"),
    priority: text(source.priority, text(fields.priority, "medium")),
    updatedAt,
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    ...normalizedFields,
    fields: normalizedFields,
  };
}

function totalFor(counts: Map<string, number>, family: CrmOperationalFamily) {
  return counts.get(family) ?? 0;
}

export function normalizeCrmOperationalFamily(input: string | null | undefined): CrmOperationalFamily {
  if (input && families.includes(input as CrmOperationalFamily)) return input as CrmOperationalFamily;
  if (input === "calendar") return "calendar-events";
  if (input === "inbox") return "emails";
  if (input === "pipeline") return "opportunities";
  if (input === "timeline") return "activities";
  if (input === "home") return "opportunities";
  return "opportunities";
}

function normalizedCacheInput(options: CrmOperationalReadOptions) {
  return {
    role: options.role,
    family: options.family,
    search: options.search?.trim() ?? "",
    filters: options.filters ?? [],
    sortField: options.sortField ?? "",
    sortDirection: options.sortDirection ?? "",
    offset: Math.max(0, options.offset ?? 0),
    limit: Math.max(1, Math.min(options.limit ?? 25, 100)),
  };
}

export function getCrmOperationalReadModelCacheKey(options: CrmOperationalReadOptions) {
  return JSON.stringify(normalizedCacheInput(options));
}

export function getCachedCrmOperationalReadModel(options: CrmOperationalReadOptions): CrmOperationalReadModel | null {
  return readModelCacheGet<CrmOperationalReadModel>(cacheNamespace, getCrmOperationalReadModelCacheKey(options));
}

export async function getCrmOperationalReadModel(options: CrmOperationalReadOptions): Promise<CrmOperationalReadModel> {
  const access = accessForRole(options.role);
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const offset = Math.max(0, options.offset ?? 0);
  const base = empty(options.role, options.family, access.allowed ? "ready" : access.level === "release_blocked" ? "release_blocked" : "forbidden");

  if (!getCoreDatabaseRuntimeState().configured) return { ...base, status: "not_configured" };
  if (!access.allowed) return base;

  const cacheKey = getCrmOperationalReadModelCacheKey({ ...options, offset, limit });
  const cached = readModelCacheGet<CrmOperationalReadModel>(cacheNamespace, cacheKey);
  if (cached) return cached;

  const clauses = ["external_system = $1", "metadata ->> 'moduleKey' = 'crm'", "metadata ->> 'seedBatch' = $2", "external_entity_type = $3"];
  const values: unknown[] = [externalSystem, seedBatch, options.family];
  if (options.search?.trim()) {
    values.push(options.search.trim());
    const index = values.length;
    clauses.push(`(
      lower(coalesce(metadata #>> '{row,label}', '')) like '%' || lower($${index}::text) || '%'
      or lower(coalesce(metadata #>> '{row,owner}', '')) like '%' || lower($${index}::text) || '%'
      or lower(coalesce(metadata #>> '{row,status}', '')) like '%' || lower($${index}::text) || '%'
      or lower(coalesce(metadata #>> '{row,fields,company}', '')) like '%' || lower($${index}::text) || '%'
      or lower(coalesce(metadata #>> '{row,fields,city}', '')) like '%' || lower($${index}::text) || '%'
      or lower(coalesce(metadata #>> '{row,fields,subject}', '')) like '%' || lower($${index}::text) || '%'
    )`);
  }

  for (const filter of options.filters ?? []) pushFilter(clauses, values, filter);

  const whereSql = clauses.join(" and ");
  const sortSql = sortExpression(options.sortField);
  const direction = options.sortDirection === "asc" ? "asc" : "desc";
  const hasScopedTotal = Boolean(options.search?.trim()) || Boolean(options.filters?.length);
  const summaryPromise = getCorePgPool().query<SummaryRow>(
      `
        select
          count(*)::text as records,
          count(*) filter (where external_entity_type = 'companies')::text as companies,
          count(*) filter (where external_entity_type = 'people')::text as people,
          count(*) filter (where external_entity_type = 'leads')::text as leads,
          count(*) filter (where external_entity_type = 'opportunities')::text as opportunities,
          count(*) filter (where external_entity_type = 'emails')::text as emails,
          count(*) filter (where external_entity_type = 'calendar-events')::text as calendar_events,
          count(*) filter (where external_entity_type = 'tasks')::text as tasks,
          count(*) filter (where external_entity_type = 'activities')::text as activities,
          count(*) filter (where external_entity_type = 'notes')::text as notes,
          count(*) filter (
            where sync_status = 'conflict'
              or metadata #>> '{row,status}' in ('blocked', 'overdue', 'needs-review')
              or metadata #>> '{row,priority}' in ('critical', 'high')
              or metadata #>> '{row,fields,priority}' in ('critical', 'high')
          )::text as blockers,
          max(updated_at)::text as latest
        from crays_core.external_record_maps
        where external_system = $1
          and metadata ->> 'moduleKey' = 'crm'
          and metadata ->> 'seedBatch' = $2
          and external_entity_type = any($3::text[])
      `,
      [externalSystem, seedBatch, families],
  );
  const totalPromise = hasScopedTotal
    ? getCorePgPool().query<{ count: string }>(`select count(*)::text as count from crays_core.external_record_maps where ${whereSql}`, values)
    : Promise.resolve(null);
  const rowsPromise = getCorePgPool().query<SourceRow>(
      `
        select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at::text, updated_at::text, metadata
        from crays_core.external_record_maps
        where ${whereSql}
        order by ${sortSql} ${direction} nulls last, external_entity_id asc
        offset $${values.length + 1}
        limit $${values.length + 2}
      `,
      [...values, offset, limit],
  );
  const [summaryResult, totalResult, rowsResult] = await Promise.all([summaryPromise, totalPromise, rowsPromise]);

  const summaryRow = summaryResult.rows[0];
  const counts = new Map<CrmOperationalFamily, number>([
    ["companies", Number.parseInt(summaryRow?.companies ?? "0", 10)],
    ["people", Number.parseInt(summaryRow?.people ?? "0", 10)],
    ["leads", Number.parseInt(summaryRow?.leads ?? "0", 10)],
    ["opportunities", Number.parseInt(summaryRow?.opportunities ?? "0", 10)],
    ["emails", Number.parseInt(summaryRow?.emails ?? "0", 10)],
    ["calendar-events", Number.parseInt(summaryRow?.calendar_events ?? "0", 10)],
    ["tasks", Number.parseInt(summaryRow?.tasks ?? "0", 10)],
    ["activities", Number.parseInt(summaryRow?.activities ?? "0", 10)],
    ["notes", Number.parseInt(summaryRow?.notes ?? "0", 10)],
  ]);
  const total = hasScopedTotal ? Number.parseInt(totalResult?.rows[0]?.count ?? "0", 10) : totalFor(counts, options.family);
  const latest = summaryRow?.latest ? Date.parse(summaryRow.latest) : 0;

  return readModelCacheSet(cacheNamespace, cacheKey, {
    ...base,
    rows: rowsResult.rows.map(rowFromSource),
    summary: {
      records: Array.from(counts.values()).reduce((sum, value) => sum + value, 0),
      companies: totalFor(counts, "companies"),
      people: totalFor(counts, "people"),
      leads: totalFor(counts, "leads"),
      opportunities: totalFor(counts, "opportunities"),
      emails: totalFor(counts, "emails"),
      calendarEvents: totalFor(counts, "calendar-events"),
      tasks: totalFor(counts, "tasks"),
      activities: totalFor(counts, "activities"),
      notes: totalFor(counts, "notes"),
      blockers: Number.parseInt(summaryRow?.blockers ?? "0", 10),
      freshnessMinutes: latest ? Math.max(0, Math.round((Date.now() - latest) / 60000)) : null,
    },
    pageInfo: {
      offset,
      limit,
      total,
      totalReliable: true,
      hasNextPage: offset + limit < total,
      hasPreviousPage: offset > 0,
    },
  }, cacheTtlMs);
}
