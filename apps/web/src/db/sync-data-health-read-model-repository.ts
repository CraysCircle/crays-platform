import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type AccessLevel = "internal_data_health" | "finance_data_health" | "deal_data_health" | "expansion_data_health" | "studio_data_health" | "forbidden";
type RecordFamily = "connection" | "source-family" | "sync-job" | "identity-health";
type HealthStatus = "healthy" | "attention" | "blocked" | "stale";
type JsonRecord = Record<string, unknown>;

type ConnectionRow = { connection_id: string; module_key: string; system_key: string; connection_name: string; owner_role: string; status: string; connection_mode: string; secret_reference_status: string; connection_health: string; updated_at: Date; metadata: JsonRecord | null };
type SourceFamilyRow = { external_system: string; external_entity_type: string; module_key: string; records: string; conflicts: string; failed: string; pending: string; core_ids: string; missing_core_ids: string; snapshot_records: string; latest_at: Date | null };
type JobRow = { job_id: string; module_key: string; connection_id: string; job_type: string; direction: string; status: string; attempt_count: number; scheduled_at: Date | null; finished_at: Date | null; updated_at: Date; payload_summary: JsonRecord | null };
type IdentityRow = { module_key: string; records: string; valid_core_ids: string; distinct_core_ids: string; cross_source_records: string; source_systems: string };

export type SyncDataHealthRecord = {
  id: string;
  family: RecordFamily;
  label: string;
  moduleKey: string;
  sourceSystem: string | null;
  entityType: string | null;
  owner: string;
  status: HealthStatus;
  sourceStatus: string;
  priority: "critical" | "high" | "medium" | "low";
  provenance: "snapshot" | "live-read" | "mixed" | "core-runtime";
  records: number;
  conflicts: number;
  missingIdentity: number;
  freshnessMinutes: number | null;
  lastObservedAt: string | null;
  currentState: string;
  nextAction: string;
  href: string;
  fields: JsonRecord;
};

export type SyncDataHealthReadModel = {
  access: { role: RoleKey; allowed: boolean; level: AccessLevel; reason: string; canStageReview: boolean; modules: string[] | null };
  summary: { records: number; connections: number; sourceFamilies: number; sourceMaps: number; syncJobs: number; identityModules: number; conflicts: number; failedJobs: number; blockedJobs: number; staleRecords: number; missingIdentity: number; snapshotRecords: number; liveReadRecords: number; crossSourceRecords: number; freshnessMinutes: number | null };
  records: SyncDataHealthRecord[];
  controls: { families: Array<{ key: string; label: string; rows: number }>; modules: Array<{ key: string; label: string; rows: number }>; statuses: Array<{ key: string; label: string; rows: number }>; provenance: Array<{ key: string; label: string; rows: number }> };
  actions: { stageReviewAllowed: boolean; commandRoute: "/api/crays/core-command/sync-preview"; confirmationHeader: "stage-sync-preview-command"; applyGate: "OPEN_DEV_SYNC_APPLY" };
  boundaries: { sourceReadsEnabled: false; sourceWritesEnabled: false; syncApplyEnabled: false; destructiveReconciliationEnabled: false; retryExecutionEnabled: false; mappingOverrideEnabled: false; toolApplyEnabled: false; externalSendingEnabled: false; paymentInitiationEnabled: false; bankActionsEnabled: false; financePostingEnabled: false; releaseEnabled: false; liveAiEnabled: false };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const roleModules: Partial<Record<RoleKey, string[]>> = {
  finance: ["erp", "loans", "files", "analytics", "sync"],
  "deal-manager": ["crm", "project", "files", "analytics", "sync"],
  "expansion-manager": ["crm", "project", "files", "analytics", "sync"],
  "studio-manager": ["operations", "support", "files", "sync"],
};

function accessFor(role: RoleKey): SyncDataHealthReadModel["access"] {
  if (internalRoles.includes(role)) return { role, allowed: true, level: "internal_data_health", reason: "Role can inspect system-wide connection, mapping, job, identity and provenance health and stage guarded review drafts.", canStageReview: true, modules: null };
  const modules = roleModules[role];
  if (modules) return { role, allowed: true, level: role === "finance" ? "finance_data_health" : role === "deal-manager" ? "deal_data_health" : role === "expansion-manager" ? "expansion_data_health" : "studio_data_health", reason: "Role can inspect module-scoped data health without raw cross-module control or apply actions.", canStageReview: false, modules };
  return { role, allowed: false, level: "forbidden", reason: "Sync and adapter data health is internal-only.", canStageReview: false, modules: [] };
}

const number = (value: unknown) => Number(value ?? 0);
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const minutesSince = (value: Date | null) => value ? Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000)) : null;
const href = (moduleKey: string, role: RoleKey) => moduleKey === "sync" ? `/sync?role=${role}` : `/${moduleKey}?role=${role}`;
const priority = (status: HealthStatus): SyncDataHealthRecord["priority"] => status === "blocked" ? "critical" : status === "stale" ? "high" : status === "attention" ? "medium" : "low";
const stale = (minutes: number | null) => minutes === null || minutes > 1440;
const boundaries = (): SyncDataHealthReadModel["boundaries"] => ({ sourceReadsEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, destructiveReconciliationEnabled: false, retryExecutionEnabled: false, mappingOverrideEnabled: false, toolApplyEnabled: false, externalSendingEnabled: false, paymentInitiationEnabled: false, bankActionsEnabled: false, financePostingEnabled: false, releaseEnabled: false, liveAiEnabled: false });

function empty(role: RoleKey, access: SyncDataHealthReadModel["access"], queryStatus: SyncDataHealthReadModel["queryStatus"]): SyncDataHealthReadModel {
  return { access, summary: { records: 0, connections: 0, sourceFamilies: 0, sourceMaps: 0, syncJobs: 0, identityModules: 0, conflicts: 0, failedJobs: 0, blockedJobs: 0, staleRecords: 0, missingIdentity: 0, snapshotRecords: 0, liveReadRecords: 0, crossSourceRecords: 0, freshnessMinutes: null }, records: [], controls: { families: [], modules: [], statuses: [], provenance: [] }, actions: { stageReviewAllowed: access.canStageReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" }, boundaries: boundaries(), queryStatus };
}

function options(records: SyncDataHealthRecord[], selector: (record: SyncDataHealthRecord) => string) { const counts = new Map<string, number>(); for (const record of records) { const key = selector(record); counts.set(key, (counts.get(key) ?? 0) + 1); } return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: title(key), rows })); }

async function connections(): Promise<ConnectionRow[]> { return (await getCorePgPool().query<ConnectionRow>(`select connection_id,module_key,system_key,connection_name,owner_role,status,connection_mode,secret_reference_status,connection_health,updated_at,metadata from crays_core.integration_connections order by module_key,connection_name`)).rows; }
async function sourceFamilies(): Promise<SourceFamilyRow[]> { return (await getCorePgPool().query<SourceFamilyRow>(`select external_system,external_entity_type,case when external_system='member-app' then 'operations' else coalesce(metadata->>'moduleKey',metadata->'fields'->>'moduleKey',external_system) end as module_key,count(*)::text as records,count(*) filter(where sync_status='conflict')::text as conflicts,count(*) filter(where sync_status='failed')::text as failed,count(*) filter(where sync_status='pending')::text as pending,count(distinct crays_entity_id)::text as core_ids,count(*) filter(where crays_entity_id is null or btrim(crays_entity_id)='')::text as missing_core_ids,count(*) filter(where metadata ? 'seedBatch')::text as snapshot_records,max(last_synced_at) as latest_at from crays_core.external_record_maps group by 1,2,3 order by 3,1,2`)).rows; }
async function jobs(): Promise<JobRow[]> { return (await getCorePgPool().query<JobRow>(`select jobs.job_id,coalesce(connections.module_key,'sync') as module_key,jobs.connection_id,jobs.job_type,jobs.direction,jobs.status,jobs.attempt_count,jobs.scheduled_at,jobs.finished_at,jobs.updated_at,jobs.payload_summary from crays_core.sync_jobs jobs left join crays_core.integration_connections connections on connections.connection_id=jobs.connection_id order by jobs.updated_at desc`)).rows; }
async function identities(): Promise<IdentityRow[]> { return (await getCorePgPool().query<IdentityRow>(`with maps as (select case when external_system='member-app' then 'operations' else coalesce(metadata->>'moduleKey',metadata->'fields'->>'moduleKey',external_system) end as module_key,external_system,crays_entity_id from crays_core.external_record_maps), id_counts as (select crays_entity_id,count(distinct external_system) as systems from maps where crays_entity_id is not null and btrim(crays_entity_id)<>'' group by crays_entity_id) select maps.module_key,count(*)::text as records,count(*) filter(where maps.crays_entity_id is not null and btrim(maps.crays_entity_id)<>'')::text as valid_core_ids,count(distinct maps.crays_entity_id)::text as distinct_core_ids,count(*) filter(where id_counts.systems>1)::text as cross_source_records,count(distinct maps.external_system)::text as source_systems from maps left join id_counts on id_counts.crays_entity_id=maps.crays_entity_id group by maps.module_key order by maps.module_key`)).rows; }

export async function getSyncDataHealthReadModel(role: RoleKey): Promise<SyncDataHealthReadModel> {
  const access = accessFor(role); const runtime = getCoreDatabaseRuntimeState(); if (!access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured"); if (!runtime.configured) return empty(role, access, "not_configured");
  const connectionRows = await connections(); const sourceRows = await sourceFamilies(); const jobRows = await jobs(); const identityRows = await identities();
  const records: SyncDataHealthRecord[] = [];
  for (const row of connectionRows) { const age = minutesSince(row.updated_at); const status: HealthStatus = row.status !== "active" ? "blocked" : row.connection_health !== "healthy" ? "attention" : stale(age) ? "stale" : "healthy"; records.push({ id: `connection:${row.connection_id}`, family: "connection", label: row.connection_name, moduleKey: row.module_key, sourceSystem: row.system_key, entityType: null, owner: title(row.owner_role), status, sourceStatus: row.status, priority: priority(status), provenance: "core-runtime", records: 1, conflicts: 0, missingIdentity: 0, freshnessMinutes: age, lastObservedAt: row.updated_at.toISOString(), currentState: `${title(row.connection_mode)} · ${title(row.connection_health)} · credential reference ${title(row.secret_reference_status)}.`, nextAction: status === "healthy" ? "Keep the connection under read-only health monitoring." : "Review runtime configuration and ownership without exposing credential values.", href: href(row.module_key, role), fields: { connectionId: row.connection_id, connectionMode: row.connection_mode, credentialReferenceStatus: row.secret_reference_status, metadataPresent: Boolean(row.metadata) } }); }
  for (const row of sourceRows) { const age = minutesSince(row.latest_at); const conflicts = number(row.conflicts); const missingIdentity = number(row.missing_core_ids); const status: HealthStatus = number(row.failed) > 0 || missingIdentity > 0 ? "blocked" : conflicts > 0 || number(row.pending) > 0 ? "attention" : stale(age) ? "stale" : "healthy"; const total = number(row.records); const snapshots = number(row.snapshot_records); const provenance = snapshots === total ? "snapshot" : snapshots === 0 ? "live-read" : "mixed"; records.push({ id: `source-family:${row.external_system}:${row.external_entity_type}`, family: "source-family", label: `${title(row.external_system)} · ${title(row.external_entity_type)}`, moduleKey: row.module_key, sourceSystem: row.external_system, entityType: row.external_entity_type, owner: row.module_key === "erp" || row.module_key === "loans" ? "CRAYS Finance" : row.module_key === "operations" ? "Studio Manager" : "Admin", status, sourceStatus: status, priority: priority(status), provenance, records: total, conflicts, missingIdentity, freshnessMinutes: age, lastObservedAt: row.latest_at?.toISOString() ?? null, currentState: `${total} mapped records, ${number(row.core_ids)} Core identities, ${conflicts} conflicts and ${number(row.failed)} failed mappings.`, nextAction: status === "healthy" ? "Use the current Core projection and monitor freshness." : conflicts > 0 ? "Classify mapping conflicts in a guarded review draft; do not apply changes." : "Review missing identity or stale provenance before downstream use.", href: href(row.module_key, role), fields: { coreIds: number(row.core_ids), pending: number(row.pending), failed: number(row.failed), snapshotRecords: snapshots } }); }
  for (const row of jobRows) { const observed = row.finished_at ?? row.updated_at; const age = minutesSince(observed); const status: HealthStatus = row.status === "failed" || row.status === "blocked" ? "blocked" : row.status !== "succeeded" ? "attention" : stale(age) ? "stale" : "healthy"; records.push({ id: `sync-job:${row.job_id}`, family: "sync-job", label: `${title(row.job_type)} · ${row.job_id}`, moduleKey: row.module_key, sourceSystem: null, entityType: row.direction, owner: row.module_key === "erp" || row.module_key === "loans" ? "CRAYS Finance" : "Admin", status, sourceStatus: row.status, priority: priority(status), provenance: "core-runtime", records: 1, conflicts: 0, missingIdentity: 0, freshnessMinutes: age, lastObservedAt: observed.toISOString(), currentState: `${title(row.direction)} job is ${title(row.status)} after ${row.attempt_count} attempt${row.attempt_count === 1 ? "" : "s"}.`, nextAction: status === "healthy" ? "Retain the successful job as audit evidence." : "Review job evidence and recovery policy; retry execution remains closed.", href: href(row.module_key, role), fields: { jobId: row.job_id, connectionId: row.connection_id, attempts: row.attempt_count, scheduledAt: row.scheduled_at?.toISOString() ?? null, payloadSummaryPresent: Boolean(row.payload_summary) } }); }
  for (const row of identityRows) { const missingIdentity = number(row.records) - number(row.valid_core_ids); const status: HealthStatus = missingIdentity > 0 ? "blocked" : number(row.cross_source_records) === 0 ? "attention" : "healthy"; records.push({ id: `identity-health:${row.module_key}`, family: "identity-health", label: `${title(row.module_key)} identity coverage`, moduleKey: row.module_key, sourceSystem: null, entityType: "core-identity", owner: "Data Governance", status, sourceStatus: status, priority: priority(status), provenance: "core-runtime", records: number(row.records), conflicts: 0, missingIdentity, freshnessMinutes: null, lastObservedAt: null, currentState: `${number(row.valid_core_ids)} valid mappings resolve to ${number(row.distinct_core_ids)} Core identities across ${number(row.source_systems)} source systems; ${number(row.cross_source_records)} records share cross-source identity.`, nextAction: missingIdentity > 0 ? "Repair missing Core identity references in a reviewed future migration." : number(row.cross_source_records) === 0 ? "Review whether this module needs cross-source identity joins or intentionally owns isolated records." : "Keep cross-source identity joins under audit.", href: href(row.module_key, role), fields: { validCoreIds: number(row.valid_core_ids), distinctCoreIds: number(row.distinct_core_ids), sourceSystems: number(row.source_systems), crossSourceRecords: number(row.cross_source_records) } }); }
  const scoped = access.modules ? records.filter((record) => access.modules?.includes(record.moduleKey)) : records; const latest = Math.max(...scoped.map((record) => record.lastObservedAt ? Date.parse(record.lastObservedAt) : 0), 0); const model = empty(role, access, "schema_ready");
  return { ...model, summary: { records: scoped.length, connections: scoped.filter((record) => record.family === "connection").length, sourceFamilies: scoped.filter((record) => record.family === "source-family").length, sourceMaps: scoped.filter((record) => record.family === "source-family").reduce((sum, record) => sum + record.records, 0), syncJobs: scoped.filter((record) => record.family === "sync-job").length, identityModules: scoped.filter((record) => record.family === "identity-health").length, conflicts: scoped.reduce((sum, record) => sum + record.conflicts, 0), failedJobs: scoped.filter((record) => record.family === "sync-job" && record.sourceStatus === "failed").length, blockedJobs: scoped.filter((record) => record.family === "sync-job" && record.sourceStatus === "blocked").length, staleRecords: scoped.filter((record) => record.status === "stale").length, missingIdentity: scoped.reduce((sum, record) => sum + record.missingIdentity, 0), snapshotRecords: scoped.filter((record) => record.family === "source-family").reduce((sum, record) => sum + number(record.fields.snapshotRecords), 0), liveReadRecords: scoped.filter((record) => record.family === "source-family" && record.provenance === "live-read").reduce((sum, record) => sum + record.records, 0), crossSourceRecords: scoped.filter((record) => record.family === "identity-health").reduce((sum, record) => sum + number(record.fields.crossSourceRecords), 0), freshnessMinutes: latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null }, records: scoped, controls: { families: options(scoped, (record) => record.family), modules: options(scoped, (record) => record.moduleKey), statuses: options(scoped, (record) => record.status), provenance: options(scoped, (record) => record.provenance) } };
}
