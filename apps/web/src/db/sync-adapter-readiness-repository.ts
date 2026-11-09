import type { RoleKey } from "@/lib/roles";
import { integrationProfileForModule } from "@/modules/common/integration-modes";
import { adapterContractForModule } from "@/modules/common/registry";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const internalSyncRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedReadinessRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];
const expectedSyncTables = ["integration_connections", "external_record_maps", "sync_jobs", "workflow_events"] as const;

export type SyncAdapterAccessLevel = "internal_sync_readiness" | "scoped_readiness_shell" | "forbidden";

export type SyncAdapterReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: SyncAdapterAccessLevel;
    reason: string;
  };
  adapter: {
    module: "sync";
    label: "Sync";
    sourceOwner: "sync-engine";
    status: "contract_ready" | "schema_ready" | "not_configured" | "schema_incomplete";
    contractRoute: "/api/crays/modules/sync";
    readinessRoute: "/api/crays/sync/adapter/readiness";
    integrationBoundary: string;
    profileRule: string;
    capabilities: {
      read: "contract_ready";
      dryRun: "contract_ready";
      write: "blocked";
      reconciliation: "blocked";
      retryExecution: "blocked";
      sourceWrite: "blocked";
      providerCall: "blocked";
      controlAction: "blocked";
      event: "contract_only";
    };
  };
  firstEntities: Array<{
    key: string;
    label: string;
    sourceEntity: string;
    craysTarget: string;
    firstReadScope: string;
  }>;
  readModels: Array<{
    key: string;
    label: string;
    ownerRole: RoleKey;
    status: "contract_ready" | "future_scoped";
  }>;
  allowedReadScopes: Array<{
    role: RoleKey;
    scope: string;
    records: string[];
  }>;
  blockedWriteScopes: Array<{
    key: string;
    label: string;
    blockedUntil: string;
  }>;
  syncSurface: {
    syncTablesReady: boolean;
    missingSyncTables: string[];
    internalCountsReturned: boolean;
    currentIntegrationConnections: number;
    currentExternalRecordMaps: number;
    currentSyncJobs: number;
    currentWorkflowEvents: number;
    activeConnections: number;
    failedSyncJobs: number;
    blockedSyncJobs: number;
    conflictExternalMaps: number;
    staleExternalMaps: number;
    liveSyncRowsReturned: false;
  };
  moduleCoverage: {
    internalCountsReturned: boolean;
    modules: Array<{
      moduleKey: string;
      connections: number;
      externalMaps: number;
      syncJobs: number;
    }>;
  };
  statusBreakdown: {
    syncJobs: Array<{ status: string; count: number }>;
    externalMaps: Array<{ status: string; count: number }>;
    integrationConnections: Array<{ status: string; count: number }>;
  };
  health: {
    coreDbConfigured: boolean;
    syncTablesReady: boolean;
    missingSyncTables: string[];
    liveSourceProbePerformed: false;
    sourceApiCalled: false;
    sourceUiEmbedded: false;
    dryRunOnly: true;
    lastReadOnlySmokeAt: null;
    operationalRisk: "vps_inventory_required" | "reconciliation_policy_required" | "schema_incomplete";
  };
  boundaries: {
    readOnly: true;
    dryRunOnly: true;
    syncWriteEnabled: false;
    destructiveReconciliationEnabled: false;
    mappingOverrideEnabled: false;
    retryExecutionEnabled: false;
    commandSyncEnabled: false;
    webhookDeliveryEnabled: false;
    sourceWriteEnabled: false;
    sourceUiExposureEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    controlActionsEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
  };
  liveSyncRecordsReturned: false;
  liveExternalRecordMapsReturned: false;
  liveIntegrationRecordsReturned: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type SyncTableName = (typeof expectedSyncTables)[number];
type CountRow = { row_count: string };
type BreakdownRow = { status: string; row_count: string };
type ModuleCoverageRow = {
  module_key: string;
  connections: string;
  external_maps: string;
  sync_jobs: string;
};

function accessForRole(role: RoleKey): SyncAdapterReadiness["access"] {
  if (internalSyncRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_sync_readiness",
      reason: "Role can read Sync readiness, aggregate counts and dry-run scaffolding before any sync writes or reconciliation actions are enabled.",
    };
  }

  if (scopedReadinessRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_readiness_shell",
      reason: "Role can read a scoped Sync readiness shell without aggregate cross-module rows or control actions.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Sync readiness requires internal platform, review or scoped module-readiness access.",
  };
}

function countsAllowed(level: SyncAdapterAccessLevel) {
  return level === "internal_sync_readiness";
}

function firstEntities(): SyncAdapterReadiness["firstEntities"] {
  return [
    {
      key: "integration-connections",
      label: "Integration connections",
      sourceEntity: "IntegrationConnection",
      craysTarget: "Module adapter registry and status summary",
      firstReadScope: "Module key, mode, owner role and health status only.",
    },
    {
      key: "external-record-maps",
      label: "External record maps",
      sourceEntity: "ExternalRecordMap",
      craysTarget: "CRAYS-to-module entity mapping coverage",
      firstReadScope: "Entity type, sync direction and status counts only.",
    },
    {
      key: "sync-jobs",
      label: "Sync jobs",
      sourceEntity: "SyncJob",
      craysTarget: "Readiness, retry and freshness status",
      firstReadScope: "Job type, direction and status counts only.",
    },
    {
      key: "workflow-events",
      label: "Workflow events",
      sourceEntity: "WorkflowEvent",
      craysTarget: "Sync and integration audit trail",
      firstReadScope: "Integration and sync-job event counts only.",
    },
  ];
}

function readModels(): SyncAdapterReadiness["readModels"] {
  return [
    {
      key: "adapter-status-summary",
      label: "Adapter status summary",
      ownerRole: "admin",
      status: "contract_ready",
    },
    {
      key: "external-map-coverage",
      label: "External map coverage",
      ownerRole: "reviewer",
      status: "contract_ready",
    },
    {
      key: "sync-job-queue",
      label: "Sync job queue",
      ownerRole: "admin",
      status: "contract_ready",
    },
    {
      key: "conflict-review",
      label: "Conflict review",
      ownerRole: "reviewer",
      status: "future_scoped",
    },
    {
      key: "retry-readiness",
      label: "Retry readiness",
      ownerRole: "admin",
      status: "future_scoped",
    },
  ];
}

function allowedReadScopes(): SyncAdapterReadiness["allowedReadScopes"] {
  return [
    {
      role: "admin",
      scope: "Cross-module integration connection, mapping and sync-job readiness aggregates.",
      records: ["Integration connections", "External record maps", "Sync jobs", "Workflow events"],
    },
    {
      role: "crays-management",
      scope: "Portfolio-level adapter readiness, freshness and risk summary.",
      records: ["Adapter status summary", "External map coverage", "Sync job queue"],
    },
    {
      role: "reviewer",
      scope: "Mapping conflicts, failed jobs and audit readiness aggregates.",
      records: ["Conflict review", "Retry readiness", "Workflow events"],
    },
    {
      role: "finance",
      scope: "Finance-related sync readiness shell only until scoped module filters are approved.",
      records: ["Scoped readiness shell", "Status summary"],
    },
    {
      role: "deal-manager",
      scope: "Deal and project handoff sync readiness shell only until scoped module filters are approved.",
      records: ["Scoped readiness shell", "Status summary"],
    },
  ];
}

function blockedWriteScopes(): SyncAdapterReadiness["blockedWriteScopes"] {
  return [
    {
      key: "sync-write",
      label: "Execute sync write",
      blockedUntil: "Idempotency, audit, retry and rollback policy are approved.",
    },
    {
      key: "destructive-reconciliation",
      label: "Run destructive reconciliation",
      blockedUntil: "Conflict policy, backup/restore plan and human review workflow are approved.",
    },
    {
      key: "mapping-override",
      label: "Override external record maps",
      blockedUntil: "Ownership, conflict resolution and revocation rules are approved.",
    },
    {
      key: "retry-execution",
      label: "Execute job retries",
      blockedUntil: "Retry limits, error classes and escalation rules are approved.",
    },
    {
      key: "webhook-delivery",
      label: "Deliver webhooks or provider events",
      blockedUntil: "Provider contracts, signatures, consent and failure handling are approved.",
    },
    {
      key: "control-action",
      label: "Pause, resume or modify adapters",
      blockedUntil: "Operational runbook, permissions and audit requirements are approved.",
    },
  ];
}

function zeroSurfaceCounts() {
  return {
    currentIntegrationConnections: 0,
    currentExternalRecordMaps: 0,
    currentSyncJobs: 0,
    currentWorkflowEvents: 0,
    activeConnections: 0,
    failedSyncJobs: 0,
    blockedSyncJobs: 0,
    conflictExternalMaps: 0,
    staleExternalMaps: 0,
  };
}

async function existingTables() {
  const pool = getCorePgPool();
  const result = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedSyncTables],
  );

  return new Set(result.rows.map((row) => row.table_name));
}

async function count(query: string) {
  const result = await getCorePgPool().query<CountRow>(query);
  return Number(result.rows[0]?.row_count ?? 0);
}

async function statusBreakdown(tableName: SyncTableName, statusColumn: string) {
  const result = await getCorePgPool().query<BreakdownRow>(
    `
      select ${statusColumn} as status, count(*)::text as row_count
      from crays_core.${tableName}
      group by ${statusColumn}
      order by ${statusColumn}
    `,
  );

  return result.rows.map((row) => ({ status: row.status, count: Number(row.row_count) }));
}

async function moduleCoverage() {
  const result = await getCorePgPool().query<ModuleCoverageRow>(
    `
      select
        connections.module_key,
        count(distinct connections.connection_id)::text as connections,
        count(distinct maps.map_id)::text as external_maps,
        count(distinct sync_jobs.job_id)::text as sync_jobs
      from crays_core.integration_connections connections
      left join crays_core.sync_jobs sync_jobs
        on sync_jobs.connection_id = connections.connection_id
      left join crays_core.external_record_maps maps
        on (
          case
            when maps.external_system = 'member-app' then 'operations'
            else coalesce(maps.metadata ->> 'moduleKey', maps.metadata -> 'fields' ->> 'moduleKey', maps.external_system)
          end
        ) = connections.module_key
      group by connections.module_key
      order by connections.module_key
    `,
  );

  return result.rows.map((row) => ({
    moduleKey: row.module_key,
    connections: Number(row.connections),
    externalMaps: Number(row.external_maps),
    syncJobs: Number(row.sync_jobs),
  }));
}

async function syncCounts() {
  const [integrationConnections, externalRecordMaps, syncJobs, workflowEvents, activeConnections, failedSyncJobs, blockedSyncJobs, conflictExternalMaps, staleExternalMaps] =
    await Promise.all([
      count(`select count(*)::text as row_count from crays_core.integration_connections`),
      count(`select count(*)::text as row_count from crays_core.external_record_maps`),
      count(`select count(*)::text as row_count from crays_core.sync_jobs`),
      count(`select count(*)::text as row_count from crays_core.workflow_events where related_entity_type in ('integration', 'sync-job')`),
      count(`select count(*)::text as row_count from crays_core.integration_connections where status = 'active'`),
      count(`select count(*)::text as row_count from crays_core.sync_jobs where status = 'failed'`),
      count(`select count(*)::text as row_count from crays_core.sync_jobs where status = 'blocked'`),
      count(`select count(*)::text as row_count from crays_core.external_record_maps where sync_status = 'conflict'`),
      count(`select count(*)::text as row_count from crays_core.external_record_maps where last_synced_at is null and sync_status in ('pending', 'failed')`),
    ]);

  return {
    currentIntegrationConnections: integrationConnections,
    currentExternalRecordMaps: externalRecordMaps,
    currentSyncJobs: syncJobs,
    currentWorkflowEvents: workflowEvents,
    activeConnections,
    failedSyncJobs,
    blockedSyncJobs,
    conflictExternalMaps,
    staleExternalMaps,
  };
}

export async function getSyncAdapterReadiness(role: RoleKey): Promise<SyncAdapterReadiness> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const adapter = adapterContractForModule("sync");
  const profile = integrationProfileForModule("sync");

  if (!adapter || !profile) {
    throw new Error("Sync adapter contract is not registered.");
  }

  let missingSyncTables = [...expectedSyncTables];
  let syncTablesReady = false;
  let surfaceCounts = zeroSurfaceCounts();
  let coverage: SyncAdapterReadiness["moduleCoverage"]["modules"] = [];
  let breakdown: SyncAdapterReadiness["statusBreakdown"] = {
    syncJobs: [],
    externalMaps: [],
    integrationConnections: [],
  };

  if (runtime.configured) {
    const existing = await existingTables();
    missingSyncTables = expectedSyncTables.filter((tableName) => !existing.has(tableName));
    syncTablesReady = missingSyncTables.length === 0;

    if (syncTablesReady && countsAllowed(access.level)) {
      const [counts, moduleRows, syncJobBreakdown, mapBreakdown, connectionBreakdown] = await Promise.all([
        syncCounts(),
        moduleCoverage(),
        statusBreakdown("sync_jobs", "status"),
        statusBreakdown("external_record_maps", "sync_status"),
        statusBreakdown("integration_connections", "status"),
      ]);
      surfaceCounts = counts;
      coverage = moduleRows;
      breakdown = {
        syncJobs: syncJobBreakdown,
        externalMaps: mapBreakdown,
        integrationConnections: connectionBreakdown,
      };
    }
  }

  const status: SyncAdapterReadiness["adapter"]["status"] = !runtime.configured ? "not_configured" : syncTablesReady ? "schema_ready" : "schema_incomplete";

  return {
    configured: runtime.configured,
    role,
    access,
    adapter: {
      module: "sync",
      label: "Sync",
      sourceOwner: "sync-engine",
      status,
      contractRoute: "/api/crays/modules/sync",
      readinessRoute: "/api/crays/sync/adapter/readiness",
      integrationBoundary: adapter.integrationBoundary,
      profileRule: profile.uiRule,
      capabilities: {
        read: "contract_ready",
        dryRun: "contract_ready",
        write: "blocked",
        reconciliation: "blocked",
        retryExecution: "blocked",
        sourceWrite: "blocked",
        providerCall: "blocked",
        controlAction: "blocked",
        event: "contract_only",
      },
    },
    firstEntities: access.allowed ? firstEntities() : [],
    readModels: access.allowed ? readModels() : [],
    allowedReadScopes: access.allowed ? allowedReadScopes() : [],
    blockedWriteScopes: access.allowed ? blockedWriteScopes() : [],
    syncSurface: {
      syncTablesReady,
      missingSyncTables,
      internalCountsReturned: countsAllowed(access.level),
      ...surfaceCounts,
      liveSyncRowsReturned: false,
    },
    moduleCoverage: {
      internalCountsReturned: countsAllowed(access.level),
      modules: coverage,
    },
    statusBreakdown: breakdown,
    health: {
      coreDbConfigured: runtime.configured,
      syncTablesReady,
      missingSyncTables,
      liveSourceProbePerformed: false,
      sourceApiCalled: false,
      sourceUiEmbedded: false,
      dryRunOnly: true,
      lastReadOnlySmokeAt: null,
      operationalRisk: !runtime.configured ? "vps_inventory_required" : syncTablesReady ? "reconciliation_policy_required" : "schema_incomplete",
    },
    boundaries: {
      readOnly: true,
      dryRunOnly: true,
      syncWriteEnabled: false,
      destructiveReconciliationEnabled: false,
      mappingOverrideEnabled: false,
      retryExecutionEnabled: false,
      commandSyncEnabled: false,
      webhookDeliveryEnabled: false,
      sourceWriteEnabled: false,
      sourceUiExposureEnabled: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      controlActionsEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
    },
    liveSyncRecordsReturned: false,
    liveExternalRecordMapsReturned: false,
    liveIntegrationRecordsReturned: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
    providerCallsEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
