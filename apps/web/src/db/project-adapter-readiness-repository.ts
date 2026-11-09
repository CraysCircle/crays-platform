import { adapterContractForModule } from "@/modules/common/registry";
import { integrationProfileForModule } from "@/modules/common/integration-modes";
import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const internalReadinessRoles: RoleKey[] = ["deal-manager", "expansion-manager", "reviewer", "crays-management", "admin"];
const futureStakeholderRoles: RoleKey[] = ["franchise-partner", "landlord", "vendor"];
const expectedIntegrationTables = ["integration_connections", "external_record_maps", "sync_jobs"] as const;

export type ProjectAdapterAccessLevel = "internal_readiness" | "future_scoped_shell" | "forbidden";

export type ProjectAdapterReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: ProjectAdapterAccessLevel;
    reason: string;
  };
  adapter: {
    module: "project";
    label: "Project";
    sourceOwner: "project-engine";
    status: "contract_ready" | "schema_ready" | "not_configured" | "schema_incomplete";
    contractRoute: "/api/crays/modules/project";
    readinessRoute: "/api/crays/project/adapter/readiness";
    integrationBoundary: string;
    profileRule: string;
    capabilities: {
      read: "contract_ready";
      write: "blocked";
      event: "contract_only";
      file: "blocked";
      communication: "contract_only";
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
  mappingStrategy: {
    externalRecordMapsReady: boolean;
    externalSystemKey: "project-engine";
    internalCountsReturned: boolean;
    entityPairs: Array<{
      sourceEntity: string;
      craysEntity: string;
      mappingStatus: "contract_ready" | "blocked_until_schema_change" | "future";
    }>;
    currentProjectConnections: number;
    currentProjectExternalMaps: number;
    currentProjectSyncJobs: number;
  };
  health: {
    coreDbConfigured: boolean;
    integrationTablesReady: boolean;
    missingIntegrationTables: string[];
    liveSourceProbePerformed: false;
    sourceApiCalled: false;
    sourceUiEmbedded: false;
    lastReadOnlySmokeAt: null;
    operationalRisk: "vps_inventory_required" | "ready_for_contract_work" | "schema_incomplete";
  };
  boundaries: {
    readOnly: true;
    projectCreationEnabled: false;
    workItemWriteEnabled: false;
    commentWriteEnabled: false;
    pageWriteEnabled: false;
    syncWritesEnabled: false;
    sourceUiExposureEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
  };
  liveProjectRecordsReturned: false;
  liveWorkItemsReturned: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey): ProjectAdapterReadiness["access"] {
  if (internalReadinessRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_readiness",
      reason: "Role can read Project adapter readiness before live source reads or write commands are enabled.",
    };
  }

  if (futureStakeholderRoles.includes(role)) {
    return {
      allowed: true,
      level: "future_scoped_shell",
      reason: "Role can see the future scoped Project shell contract, but no internal counts or live project records.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Project adapter readiness requires internal Project delivery scope or future scoped stakeholder access.",
  };
}

function zeroCounts() {
  return {
    currentProjectConnections: 0,
    currentProjectExternalMaps: 0,
    currentProjectSyncJobs: 0,
  };
}

function firstEntities(): ProjectAdapterReadiness["firstEntities"] {
  return [
    {
      key: "projects",
      label: "Projects",
      sourceEntity: "Project",
      craysTarget: "Opening project state",
      firstReadScope: "Opening, build-out and handoff status.",
    },
    {
      key: "work-items",
      label: "Work items",
      sourceEntity: "WorkItem",
      craysTarget: "Stakeholder task summary",
      firstReadScope: "Owner, due date, status, priority and blocked state.",
    },
    {
      key: "cycles",
      label: "Cycles",
      sourceEntity: "Cycle",
      craysTarget: "Milestone and sprint readiness",
      firstReadScope: "Timeline grouping and delivery cadence.",
    },
    {
      key: "pages",
      label: "Pages",
      sourceEntity: "Page",
      craysTarget: "Decision notes",
      firstReadScope: "Metadata only until document rules are approved.",
    },
  ];
}

function readModels(): ProjectAdapterReadiness["readModels"] {
  return [
    {
      key: "opening-project-state",
      label: "Opening project state",
      ownerRole: "deal-manager",
      status: "contract_ready",
    },
    {
      key: "handoff-readiness",
      label: "Handoff readiness",
      ownerRole: "deal-manager",
      status: "contract_ready",
    },
    {
      key: "property-to-opening-transition",
      label: "Property to opening transition",
      ownerRole: "expansion-manager",
      status: "contract_ready",
    },
    {
      key: "stakeholder-task-summary",
      label: "Stakeholder task summary",
      ownerRole: "reviewer",
      status: "future_scoped",
    },
  ];
}

function allowedReadScopes(): ProjectAdapterReadiness["allowedReadScopes"] {
  return [
    {
      role: "deal-manager",
      scope: "Active prepared-offer, candidate deal and opening handoff projects.",
      records: ["Projects", "Work items", "Cycles", "Handoff readiness"],
    },
    {
      role: "expansion-manager",
      scope: "Property-case transition projects before Deal Manager handoff.",
      records: ["Projects", "Work items", "Property transition notes"],
    },
    {
      role: "franchise-partner",
      scope: "Own future opening projects only after partner handoff.",
      records: ["Projects", "Assigned work items", "Handoff checklist"],
    },
    {
      role: "vendor",
      scope: "Assigned delivery tasks only after scoped assignment.",
      records: ["Assigned work items", "Delivery status"],
    },
  ];
}

function blockedWriteScopes(): ProjectAdapterReadiness["blockedWriteScopes"] {
  return [
    {
      key: "project-create",
      label: "Create project",
      blockedUntil: "Explicit write-adapter approval, idempotency keys and audit event policy.",
    },
    {
      key: "work-item-write",
      label: "Create or update work items",
      blockedUntil: "Role-scoped command contract and rollback plan.",
    },
    {
      key: "comment-page-write",
      label: "Write comments or pages",
      blockedUntil: "Communication and document visibility rules are approved.",
    },
    {
      key: "sync-write",
      label: "Sync writeback",
      blockedUntil: "External record map conflict policy and retry behavior are approved.",
    },
  ];
}

async function existingIntegrationTables() {
  const pool = getCorePgPool();
  const result = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedIntegrationTables],
  );

  return new Set(result.rows.map((row) => row.table_name));
}

async function projectIntegrationCounts() {
  const pool = getCorePgPool();

  const connectionResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.integration_connections
      where module_key = 'project'
    `,
  );
  const mapResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.external_record_maps
      where external_system = 'project-engine'
         or metadata ->> 'moduleKey' = 'project'
    `,
  );
  const syncJobResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.sync_jobs sync_jobs
      left join crays_core.integration_connections connections
        on connections.connection_id = sync_jobs.connection_id
      where connections.module_key = 'project'
         or sync_jobs.payload_summary ->> 'moduleKey' = 'project'
    `,
  );

  return {
    currentProjectConnections: Number(connectionResult.rows[0]?.row_count ?? 0),
    currentProjectExternalMaps: Number(mapResult.rows[0]?.row_count ?? 0),
    currentProjectSyncJobs: Number(syncJobResult.rows[0]?.row_count ?? 0),
  };
}

export async function getProjectAdapterReadiness(role: RoleKey): Promise<ProjectAdapterReadiness> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const adapter = adapterContractForModule("project");
  const profile = integrationProfileForModule("project");

  if (!adapter || !profile) {
    throw new Error("Project adapter contract is not registered.");
  }

  let missingIntegrationTables = [...expectedIntegrationTables];
  let integrationTablesReady = false;
  let counts = zeroCounts();

  if (runtime.configured) {
    const existing = await existingIntegrationTables();
    missingIntegrationTables = expectedIntegrationTables.filter((tableName) => !existing.has(tableName));
    integrationTablesReady = missingIntegrationTables.length === 0;
    if (integrationTablesReady && access.level === "internal_readiness") {
      counts = await projectIntegrationCounts();
    }
  }

  const status: ProjectAdapterReadiness["adapter"]["status"] = !runtime.configured
    ? "not_configured"
    : integrationTablesReady
      ? "schema_ready"
      : "schema_incomplete";

  return {
    configured: runtime.configured,
    role,
    access,
    adapter: {
      module: "project",
      label: "Project",
      sourceOwner: "project-engine",
      status,
      contractRoute: "/api/crays/modules/project",
      readinessRoute: "/api/crays/project/adapter/readiness",
      integrationBoundary: adapter.integrationBoundary,
      profileRule: profile.uiRule,
      capabilities: {
        read: "contract_ready",
        write: "blocked",
        event: "contract_only",
        file: "blocked",
        communication: "contract_only",
      },
    },
    firstEntities: access.allowed ? firstEntities() : [],
    readModels: access.allowed ? readModels() : [],
    allowedReadScopes: access.allowed ? allowedReadScopes() : [],
    blockedWriteScopes: access.allowed ? blockedWriteScopes() : [],
    mappingStrategy: {
      externalRecordMapsReady: integrationTablesReady,
      externalSystemKey: "project-engine",
      internalCountsReturned: access.level === "internal_readiness",
      entityPairs: [
        {
          sourceEntity: "Project",
          craysEntity: "prepared-offer, deal or property-case scoped opening project",
          mappingStatus: "blocked_until_schema_change",
        },
        {
          sourceEntity: "WorkItem",
          craysEntity: "workflow event, document package link or stakeholder task summary",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Cycle",
          craysEntity: "opening milestone group",
          mappingStatus: "future",
        },
        {
          sourceEntity: "Page",
          craysEntity: "decision note metadata",
          mappingStatus: "future",
        },
      ],
      ...counts,
    },
    health: {
      coreDbConfigured: runtime.configured,
      integrationTablesReady,
      missingIntegrationTables,
      liveSourceProbePerformed: false,
      sourceApiCalled: false,
      sourceUiEmbedded: false,
      lastReadOnlySmokeAt: null,
      operationalRisk: !runtime.configured ? "vps_inventory_required" : integrationTablesReady ? "ready_for_contract_work" : "schema_incomplete",
    },
    boundaries: {
      readOnly: true,
      projectCreationEnabled: false,
      workItemWriteEnabled: false,
      commentWriteEnabled: false,
      pageWriteEnabled: false,
      syncWritesEnabled: false,
      sourceUiExposureEnabled: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
    },
    liveProjectRecordsReturned: false,
    liveWorkItemsReturned: false,
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
