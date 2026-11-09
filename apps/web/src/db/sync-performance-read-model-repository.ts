import { getAdapterHealthReadiness } from "./adapter-health-readiness-repository";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { getSyncAdapterReadiness } from "./sync-adapter-readiness-repository";
import type { RoleKey } from "@/lib/roles";

type SyncFreshnessStatus = "fresh" | "aging" | "stale" | "missing";
type LocalityConfidence = "high" | "medium" | "low";

type SyncStatsRow = {
  module_key: string;
  label: string;
  connections: string | null;
  active_connections: string | null;
  connection_health: string | null;
  source_maps: string | null;
  synced_maps: string | null;
  conflict_maps: string | null;
  failed_maps: string | null;
  pending_maps: string | null;
  last_map_sync_at: Date | null;
  sync_jobs: string | null;
  succeeded_jobs: string | null;
  failed_jobs: string | null;
  blocked_jobs: string | null;
  last_successful_sync_at: Date | null;
};

type RecentEventRow = {
  event_id: string;
  event_type: string;
  related_entity_type: string;
  related_entity_id: string;
  role_key: string | null;
  event_status: string;
  occurred_at: Date;
};

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager"];

const moduleTargets: Record<string, { minimumMaps: number; ownerRole: string; expectedRuntime: string }> = {
  crm: { minimumMaps: 22, ownerRole: "Admin", expectedRuntime: "CRM source adapter" },
  project: { minimumMaps: 5, ownerRole: "Admin", expectedRuntime: "Project source adapter" },
  erp: { minimumMaps: 20, ownerRole: "Finance", expectedRuntime: "ERP source adapter" },
  loans: { minimumMaps: 5, ownerRole: "Finance", expectedRuntime: "Loans source adapter" },
  files: { minimumMaps: 5, ownerRole: "Reviewer", expectedRuntime: "Files metadata adapter" },
  operations: { minimumMaps: 17, ownerRole: "Studio Manager", expectedRuntime: "Member App bridge" },
  hr: { minimumMaps: 4, ownerRole: "CRAYS HR", expectedRuntime: "HR staffing projection" },
  learning: { minimumMaps: 4, ownerRole: "CRAYS Management", expectedRuntime: "Learning path projection" },
  support: { minimumMaps: 4, ownerRole: "Reviewer", expectedRuntime: "Support service projection" },
  analytics: { minimumMaps: 1, ownerRole: "CRAYS Management", expectedRuntime: "Portfolio analytics projection" },
  sync: { minimumMaps: 0, ownerRole: "Admin", expectedRuntime: "Core sync projection" },
};

export type SyncPerformanceModule = {
  moduleKey: string;
  label: string;
  ownerRole: string;
  runtimeStatus: string;
  adapterStatus: string;
  expectedRuntime: string;
  connectionHealth: string;
  connections: number;
  activeConnections: number;
  sourceMaps: number;
  syncedMaps: number;
  conflictMaps: number;
  failedMaps: number;
  pendingMaps: number;
  syncJobs: number;
  succeededJobs: number;
  failedJobs: number;
  blockedJobs: number;
  minimumMaps: number;
  missingRecords: number;
  lastMapSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  freshnessMinutes: number | null;
  freshnessStatus: SyncFreshnessStatus;
  localityConfidence: LocalityConfidence;
  localityReason: string;
  nextAction: string;
};

export type SyncPerformanceReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_sync_performance" | "scoped_sync_performance" | "forbidden";
    reason: string;
  };
  summary: {
    modules: number;
    freshModules: number;
    agingModules: number;
    staleModules: number;
    missingModules: number;
    sourceMaps: number;
    conflicts: number;
    failedJobs: number;
    blockedJobs: number;
    missingRecords: number;
    highConfidenceModules: number;
    firstDecisionDurationMs: number;
  };
  modules: SyncPerformanceModule[];
  recentEvents: Array<{
    eventId: string;
    label: string;
    related: string;
    status: string;
    ownerRole: string;
    occurredAt: string;
  }>;
  diagnostics: {
    coreConfigured: boolean;
    syncSchemaReady: boolean;
    adapterDiagnosticsReady: boolean;
    coreOnlyFirstDecision: true;
    liveSourceProbePerformed: false;
    missingTables: string[];
  };
  boundaries: {
    sourceReadsEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveReconciliationEnabled: false;
    retryExecutionEnabled: false;
    mappingOverrideEnabled: false;
    providerCallsEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): SyncPerformanceReadModel["access"] {
  if (internalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "internal_sync_performance",
      reason: "Role can inspect cross-module sync freshness, adapter diagnostics and missing coverage without running source or sync apply actions.",
    };
  }
  if (scopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "scoped_sync_performance",
      reason: "Role can inspect scoped sync health and module-level blockers without raw internal records or control actions.",
    };
  }
  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Sync performance diagnostics require internal or scoped operating access.",
  };
}

function numberFrom(value: string | null | undefined) {
  return Number(value ?? 0);
}

function minutesSince(value: Date | null) {
  if (!value) return null;
  return Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000));
}

function freshnessStatus(minutes: number | null, sourceMaps: number, minimumMaps: number): SyncFreshnessStatus {
  if (minimumMaps === 0) return minutes === null ? "aging" : minutes <= 1440 ? "fresh" : "aging";
  if (sourceMaps === 0 || minutes === null) return "missing";
  if (minutes <= 120) return "fresh";
  if (minutes <= 1440) return "aging";
  return "stale";
}

function localityConfidence(input: {
  sourceMaps: number;
  conflictMaps: number;
  failedJobs: number;
  missingRecords: number;
  freshness: SyncFreshnessStatus;
  adapterStatus: string;
}): { confidence: LocalityConfidence; reason: string } {
  if (input.missingRecords > 0) {
    return { confidence: "low", reason: "Coverage is missing for one or more required source record families." };
  }
  if (input.conflictMaps > 0 || input.failedJobs > 0 || input.freshness === "stale") {
    return { confidence: "medium", reason: "Records exist, but conflict, failure or stale freshness needs review." };
  }
  if (input.adapterStatus.includes("missing") || input.adapterStatus.includes("unavailable")) {
    return { confidence: "medium", reason: "Core maps are present, but source runtime availability still needs confirmation." };
  }
  return { confidence: "high", reason: "Core maps are current enough for the first role decision." };
}

function nextAction(module: SyncPerformanceModule) {
  if (module.minimumMaps === 0) return "Monitor Core sync projection and keep apply controls closed.";
  if (module.sourceMaps === 0) return `Bind ${module.expectedRuntime} and seed realistic source records.`;
  if (module.conflictMaps > 0) return "Open conflict review and classify the affected maps.";
  if (module.failedJobs > 0 || module.blockedJobs > 0) return "Review failed or blocked jobs before any retry policy is opened.";
  if (module.freshnessStatus === "stale") return "Refresh source read snapshot through the safe read-only sync path.";
  if (module.missingRecords > 0) return "Add missing realistic test records or review source filters.";
  return "Use current Core projection for the first decision; secondary details can load after.";
}

function eventLabel(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relatedEventLabel(row: RecentEventRow) {
  if (row.related_entity_type === "sync-job") return "Sync job activity";
  if (row.related_entity_type === "integration") return "Integration activity";
  return eventLabel(row.related_entity_type);
}

async function loadStats(): Promise<SyncStatsRow[]> {
  const result = await getCorePgPool().query<SyncStatsRow>(
    `
      with expected(module_key, label) as (
        values
          ('crm', 'CRM'),
          ('project', 'Project'),
          ('erp', 'ERP'),
          ('loans', 'Loans'),
          ('files', 'Files'),
          ('operations', 'Operations'),
          ('hr', 'HR'),
          ('learning', 'Learning'),
          ('support', 'Support'),
          ('analytics', 'Analytics'),
          ('sync', 'Sync')
      ),
      connection_stats as (
        select
          module_key,
          count(*)::text as connections,
          count(*) filter (where status = 'active')::text as active_connections,
          string_agg(distinct connection_health, ', ' order by connection_health) as connection_health
        from crays_core.integration_connections
        group by module_key
      ),
      map_stats as (
        select
          case
            when external_system = 'member-app' then 'operations'
            else coalesce(metadata ->> 'moduleKey', metadata -> 'fields' ->> 'moduleKey', external_system)
          end as module_key,
          count(*)::text as source_maps,
          count(*) filter (where sync_status = 'synced')::text as synced_maps,
          count(*) filter (where sync_status = 'conflict')::text as conflict_maps,
          count(*) filter (where sync_status = 'failed')::text as failed_maps,
          count(*) filter (where sync_status = 'pending')::text as pending_maps,
          max(last_synced_at) as last_map_sync_at
        from crays_core.external_record_maps
        group by 1
      ),
      job_stats as (
        select
          coalesce(connections.module_key, 'sync') as module_key,
          count(jobs.*)::text as sync_jobs,
          count(jobs.*) filter (where jobs.status = 'succeeded')::text as succeeded_jobs,
          count(jobs.*) filter (where jobs.status = 'failed')::text as failed_jobs,
          count(jobs.*) filter (where jobs.status = 'blocked')::text as blocked_jobs,
          max(jobs.finished_at) filter (where jobs.status = 'succeeded') as last_successful_sync_at
        from crays_core.sync_jobs jobs
        left join crays_core.integration_connections connections
          on connections.connection_id = jobs.connection_id
        group by 1
      )
      select
        expected.module_key,
        expected.label,
        connection_stats.connections,
        connection_stats.active_connections,
        connection_stats.connection_health,
        map_stats.source_maps,
        map_stats.synced_maps,
        map_stats.conflict_maps,
        map_stats.failed_maps,
        map_stats.pending_maps,
        map_stats.last_map_sync_at,
        job_stats.sync_jobs,
        job_stats.succeeded_jobs,
        job_stats.failed_jobs,
        job_stats.blocked_jobs,
        job_stats.last_successful_sync_at
      from expected
      left join connection_stats on connection_stats.module_key = expected.module_key
      left join map_stats on map_stats.module_key = expected.module_key
      left join job_stats on job_stats.module_key = expected.module_key
      order by expected.module_key
    `,
  );
  return result.rows;
}

async function loadRecentEvents(): Promise<RecentEventRow[]> {
  const result = await getCorePgPool().query<RecentEventRow>(
    `
      select event_id, event_type, related_entity_type, related_entity_id, role_key, event_status, occurred_at
      from crays_core.workflow_events
      where related_entity_type in ('integration', 'sync-job')
      order by occurred_at desc
      limit 8
    `,
  );
  return result.rows;
}

function emptyReadModel(role: RoleKey, access: SyncPerformanceReadModel["access"], started: number): SyncPerformanceReadModel {
  return {
    access,
    summary: {
      modules: 0,
      freshModules: 0,
      agingModules: 0,
      staleModules: 0,
      missingModules: 0,
      sourceMaps: 0,
      conflicts: 0,
      failedJobs: 0,
      blockedJobs: 0,
      missingRecords: 0,
      highConfidenceModules: 0,
      firstDecisionDurationMs: Date.now() - started,
    },
    modules: [],
    recentEvents: [],
    diagnostics: {
      coreConfigured: getCoreDatabaseRuntimeState().configured,
      syncSchemaReady: false,
      adapterDiagnosticsReady: false,
      coreOnlyFirstDecision: true,
      liveSourceProbePerformed: false,
      missingTables: [],
    },
    boundaries: boundaries(),
  };
}

function boundaries(): SyncPerformanceReadModel["boundaries"] {
  return {
    sourceReadsEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    destructiveReconciliationEnabled: false,
    retryExecutionEnabled: false,
    mappingOverrideEnabled: false,
    providerCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getSyncPerformanceReadModel(role: RoleKey): Promise<SyncPerformanceReadModel> {
  const started = Date.now();
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role, access, started);

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(role, access, started);

  const [syncReadiness, adapterHealth, statsRows, recentEvents] = await Promise.all([
    getSyncAdapterReadiness(role),
    getAdapterHealthReadiness(role),
    loadStats(),
    loadRecentEvents(),
  ]);

  const adapterStatusByModule = new Map<string, string>(adapterHealth.modules.map((module) => [module.module, module.status]));
  const modules: SyncPerformanceModule[] = statsRows.map((row) => {
    const target = moduleTargets[row.module_key] ?? { minimumMaps: 1, ownerRole: "Admin", expectedRuntime: `${row.label} adapter` };
    const sourceMaps = numberFrom(row.source_maps);
    const conflictMaps = numberFrom(row.conflict_maps);
    const failedJobs = numberFrom(row.failed_jobs);
    const missingRecords = Math.max(0, target.minimumMaps - sourceMaps);
    const freshnessMinutes = minutesSince(row.last_map_sync_at ?? row.last_successful_sync_at);
    const freshness = freshnessStatus(freshnessMinutes, sourceMaps, target.minimumMaps);
    const adapterStatus = adapterStatusByModule.get(row.module_key) ?? (row.module_key === "operations" ? "live_adapter_bound" : "not_configured");
    const confidence = localityConfidence({ sourceMaps, conflictMaps, failedJobs, missingRecords, freshness, adapterStatus });
    const performanceModule: SyncPerformanceModule = {
      moduleKey: row.module_key,
      label: row.label,
      ownerRole: target.ownerRole,
      runtimeStatus: row.active_connections && numberFrom(row.active_connections) > 0 ? "Active connection" : numberFrom(row.connections) > 0 ? "Configured connection" : "Runtime not bound",
      adapterStatus,
      expectedRuntime: target.expectedRuntime,
      connectionHealth: row.connection_health ?? "unknown",
      connections: numberFrom(row.connections),
      activeConnections: numberFrom(row.active_connections),
      sourceMaps,
      syncedMaps: numberFrom(row.synced_maps),
      conflictMaps,
      failedMaps: numberFrom(row.failed_maps),
      pendingMaps: numberFrom(row.pending_maps),
      syncJobs: numberFrom(row.sync_jobs),
      succeededJobs: numberFrom(row.succeeded_jobs),
      failedJobs,
      blockedJobs: numberFrom(row.blocked_jobs),
      minimumMaps: target.minimumMaps,
      missingRecords,
      lastMapSyncAt: row.last_map_sync_at?.toISOString() ?? null,
      lastSuccessfulSyncAt: row.last_successful_sync_at?.toISOString() ?? null,
      freshnessMinutes,
      freshnessStatus: freshness,
      localityConfidence: confidence.confidence,
      localityReason: confidence.reason,
      nextAction: "",
    };
    return { ...performanceModule, nextAction: nextAction(performanceModule) };
  });

  return {
    access,
    summary: {
      modules: modules.length,
      freshModules: modules.filter((module) => module.freshnessStatus === "fresh").length,
      agingModules: modules.filter((module) => module.freshnessStatus === "aging").length,
      staleModules: modules.filter((module) => module.freshnessStatus === "stale").length,
      missingModules: modules.filter((module) => module.freshnessStatus === "missing").length,
      sourceMaps: modules.reduce((total, module) => total + module.sourceMaps, 0),
      conflicts: modules.reduce((total, module) => total + module.conflictMaps, 0),
      failedJobs: modules.reduce((total, module) => total + module.failedJobs, 0),
      blockedJobs: modules.reduce((total, module) => total + module.blockedJobs, 0),
      missingRecords: modules.reduce((total, module) => total + module.missingRecords, 0),
      highConfidenceModules: modules.filter((module) => module.localityConfidence === "high").length,
      firstDecisionDurationMs: Date.now() - started,
    },
    modules,
    recentEvents: recentEvents.map((event) => ({
      eventId: event.event_id,
      label: eventLabel(event.event_type),
      related: relatedEventLabel(event),
      status: eventLabel(event.event_status),
      ownerRole: event.role_key ? eventLabel(event.role_key) : "System",
      occurredAt: event.occurred_at.toISOString(),
    })),
    diagnostics: {
      coreConfigured: runtime.configured,
      syncSchemaReady: syncReadiness.syncSurface.syncTablesReady,
      adapterDiagnosticsReady: adapterHealth.access.allowed,
      coreOnlyFirstDecision: true,
      liveSourceProbePerformed: false,
      missingTables: syncReadiness.syncSurface.missingSyncTables,
    },
    boundaries: boundaries(),
  };
}
