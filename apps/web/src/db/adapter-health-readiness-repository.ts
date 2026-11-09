import type { RoleKey } from "@/lib/roles";
import { getCrmAdapterReadiness } from "./crm-adapter-readiness-repository";
import { getErpFinanceAdapterReadiness } from "./erp-finance-adapter-readiness-repository";
import { getFilesAdapterReadiness } from "./files-adapter-readiness-repository";
import { getProjectAdapterReadiness } from "./project-adapter-readiness-repository";
import { getSyncAdapterReadiness } from "./sync-adapter-readiness-repository";

const internalHealthRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedHealthRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];

export type AdapterHealthAccessLevel = "internal_adapter_health" | "scoped_adapter_health_shell" | "forbidden";
export type AdapterHealthModuleKey = "project" | "crm" | "erp" | "files" | "sync";

export type AdapterHealthReadiness = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: AdapterHealthAccessLevel;
    reason: string;
  };
  summary: {
    moduleCount: number;
    schemaReadyModules: number;
    accessAllowedModules: number;
    scopedShellModules: number;
    modulesWithInternalCounts: number;
    totalBlockedWriteScopes: number;
    liveSourceProbePerformed: false;
    sourceApiCalled: false;
    sourceUiEmbedded: false;
    liveSourceRecordsReturned: false;
    writeActionsEnabled: false;
  };
  modules: Array<{
    module: AdapterHealthModuleKey;
    label: string;
    readinessRoute: string;
    checkedRole: RoleKey;
    accessAllowed: boolean;
    accessLevel: string;
    status: string;
    schemaReady: boolean;
    coreDbConfigured: boolean;
    dataTablesReady: boolean;
    missingTables: string[];
    firstEntities: number;
    readModels: number;
    blockedWriteScopes: number;
    internalCountsReturned: boolean;
    liveSourceProbePerformed: boolean;
    sourceApiCalled: boolean;
    sourceUiEmbedded: boolean;
    liveSourceRecordsReturned: boolean;
    sourceWritesEnabled: boolean;
    providerCallsEnabled: boolean;
    fileUploadEnabled: boolean;
    externalSendingEnabled: boolean;
    controlActionsEnabled: boolean;
    operationalRisk: string;
  }>;
  blockedActions: Array<{
    key: string;
    label: string;
    status: "blocked";
  }>;
  healthPolicy: {
    readOnly: true;
    dryRunOnly: true;
    providerLogsReturned: false;
    environmentValuesReturned: false;
    secretsReturned: false;
    privateKeysReturned: false;
    sourceUiExposureEnabled: false;
    providerCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    destructiveReconciliationEnabled: false;
    retryExecutionEnabled: false;
    controlActionsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
  };
};

function accessForRole(role: RoleKey): AdapterHealthReadiness["access"] {
  if (internalHealthRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_adapter_health",
      reason: "Role can read aggregate adapter health across Project, CRM, ERP, Files and Sync without secrets, logs, source UI or control actions.",
    };
  }

  if (scopedHealthRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_adapter_health_shell",
      reason: "Role can read a scoped adapter health shell. Internal cross-module rows remain hidden where that role is not approved.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Adapter health requires internal platform, review or scoped module-readiness access.",
  };
}

function checkedRoleFor(module: AdapterHealthModuleKey, role: RoleKey): RoleKey {
  if (internalHealthRoles.includes(role)) return role;

  if (module === "erp" && role === "expansion-manager") return "deal-manager";
  if (module === "files" && role === "finance") return "finance";
  if (module === "sync" && scopedHealthRoles.includes(role)) return role;

  return role;
}

function tablesReady(health: Record<string, unknown>) {
  if ("syncTablesReady" in health) return health.syncTablesReady === true;
  if ("metadataTablesReady" in health || "integrationTablesReady" in health) {
    return health.metadataTablesReady !== false && health.integrationTablesReady !== false;
  }
  return health.integrationTablesReady === true;
}

function missingTables(health: Record<string, unknown>) {
  const missingIntegration = Array.isArray(health.missingIntegrationTables) ? health.missingIntegrationTables : [];
  const missingMetadata = Array.isArray(health.missingMetadataTables) ? health.missingMetadataTables : [];
  const missingSync = Array.isArray(health.missingSyncTables) ? health.missingSyncTables : [];
  return [...missingIntegration, ...missingMetadata, ...missingSync].filter((value): value is string => typeof value === "string");
}

function moduleSnapshot(input: {
  module: AdapterHealthModuleKey;
  checkedRole: RoleKey;
  label: string;
  readinessRoute: string;
  accessAllowed: boolean;
  accessLevel: string;
  status: string;
  coreDbConfigured: boolean;
  health: Record<string, unknown>;
  firstEntities: unknown[];
  readModels: unknown[];
  blockedWriteScopes: unknown[];
  internalCountsReturned: boolean;
  liveSourceRecordsReturned: false;
  sourceWritesEnabled?: boolean;
  controlActionsEnabled?: boolean;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
}) {
  return {
    module: input.module,
    label: input.label,
    readinessRoute: input.readinessRoute,
    checkedRole: input.checkedRole,
    accessAllowed: input.accessAllowed,
    accessLevel: input.accessLevel,
    status: input.status,
    schemaReady: input.status === "schema_ready",
    coreDbConfigured: input.coreDbConfigured,
    dataTablesReady: tablesReady(input.health),
    missingTables: missingTables(input.health),
    firstEntities: input.firstEntities.length,
    readModels: input.readModels.length,
    blockedWriteScopes: input.blockedWriteScopes.length,
    internalCountsReturned: input.internalCountsReturned,
    liveSourceProbePerformed: false,
    sourceApiCalled: false,
    sourceUiEmbedded: false,
    liveSourceRecordsReturned: input.liveSourceRecordsReturned,
    sourceWritesEnabled: input.sourceWritesEnabled === true,
    providerCallsEnabled: input.providerCallsEnabled,
    fileUploadEnabled: input.fileUploadEnabled,
    externalSendingEnabled: input.externalSendingEnabled,
    controlActionsEnabled: input.controlActionsEnabled === true,
    operationalRisk: String(input.health.operationalRisk ?? "not_assessed"),
  };
}

export async function getAdapterHealthReadiness(role: RoleKey): Promise<AdapterHealthReadiness> {
  const access = accessForRole(role);

  if (!access.allowed) {
    return {
      role,
      access,
      summary: {
        moduleCount: 0,
        schemaReadyModules: 0,
        accessAllowedModules: 0,
        scopedShellModules: 0,
        modulesWithInternalCounts: 0,
        totalBlockedWriteScopes: 0,
        liveSourceProbePerformed: false,
        sourceApiCalled: false,
        sourceUiEmbedded: false,
        liveSourceRecordsReturned: false,
        writeActionsEnabled: false,
      },
      modules: [],
      blockedActions: blockedActions(),
      healthPolicy: healthPolicy(),
    };
  }

  const projectRole = checkedRoleFor("project", role);
  const crmRole = checkedRoleFor("crm", role);
  const erpRole = checkedRoleFor("erp", role);
  const filesRole = checkedRoleFor("files", role);
  const syncRole = checkedRoleFor("sync", role);

  const [project, crm, erp, files, sync] = await Promise.all([
    getProjectAdapterReadiness(projectRole),
    getCrmAdapterReadiness(crmRole),
    getErpFinanceAdapterReadiness(erpRole),
    getFilesAdapterReadiness(filesRole),
    getSyncAdapterReadiness(syncRole),
  ]);

  const modules = [
    moduleSnapshot({
      module: "project",
      checkedRole: projectRole,
      label: project.adapter.label,
      readinessRoute: project.adapter.readinessRoute,
      accessAllowed: project.access.allowed,
      accessLevel: project.access.level,
      status: project.adapter.status,
      coreDbConfigured: project.health.coreDbConfigured,
      health: project.health,
      firstEntities: project.firstEntities,
      readModels: project.readModels,
      blockedWriteScopes: project.blockedWriteScopes,
      internalCountsReturned: project.mappingStrategy.internalCountsReturned,
      liveSourceRecordsReturned: project.liveSourceRecordsReturned,
      sourceWritesEnabled: project.boundaries.syncWritesEnabled,
      providerCallsEnabled: project.providerCallsEnabled,
      fileUploadEnabled: project.fileUploadEnabled,
      externalSendingEnabled: project.externalSendingEnabled,
    }),
    moduleSnapshot({
      module: "crm",
      checkedRole: crmRole,
      label: crm.adapter.label,
      readinessRoute: crm.adapter.readinessRoute,
      accessAllowed: crm.access.allowed,
      accessLevel: crm.access.level,
      status: crm.adapter.status,
      coreDbConfigured: crm.health.coreDbConfigured,
      health: crm.health,
      firstEntities: crm.firstEntities,
      readModels: crm.readModels,
      blockedWriteScopes: crm.blockedWriteScopes,
      internalCountsReturned: crm.mappingStrategy.internalCountsReturned,
      liveSourceRecordsReturned: crm.liveSourceRecordsReturned,
      sourceWritesEnabled: crm.boundaries.syncWritesEnabled,
      providerCallsEnabled: crm.providerCallsEnabled,
      fileUploadEnabled: crm.fileUploadEnabled,
      externalSendingEnabled: crm.externalSendingEnabled,
    }),
    moduleSnapshot({
      module: "erp",
      checkedRole: erpRole,
      label: erp.adapter.label,
      readinessRoute: erp.adapter.readinessRoute,
      accessAllowed: erp.access.allowed,
      accessLevel: erp.access.level,
      status: erp.adapter.status,
      coreDbConfigured: erp.health.coreDbConfigured,
      health: erp.health,
      firstEntities: erp.firstEntities,
      readModels: erp.readModels,
      blockedWriteScopes: erp.blockedWriteScopes,
      internalCountsReturned: erp.mappingStrategy.internalCountsReturned,
      liveSourceRecordsReturned: erp.liveSourceRecordsReturned,
      sourceWritesEnabled: false,
      providerCallsEnabled: erp.providerCallsEnabled,
      fileUploadEnabled: erp.fileUploadEnabled,
      externalSendingEnabled: erp.externalSendingEnabled,
    }),
    moduleSnapshot({
      module: "files",
      checkedRole: filesRole,
      label: files.adapter.label,
      readinessRoute: files.adapter.readinessRoute,
      accessAllowed: files.access.allowed,
      accessLevel: files.access.level,
      status: files.adapter.status,
      coreDbConfigured: files.health.coreDbConfigured,
      health: files.health,
      firstEntities: files.firstEntities,
      readModels: files.readModels,
      blockedWriteScopes: files.blockedWriteScopes,
      internalCountsReturned: files.mappingStrategy.internalCountsReturned,
      liveSourceRecordsReturned: files.liveSourceRecordsReturned,
      sourceWritesEnabled: false,
      providerCallsEnabled: files.providerCallsEnabled,
      fileUploadEnabled: files.fileUploadEnabled,
      externalSendingEnabled: files.externalSendingEnabled,
    }),
    moduleSnapshot({
      module: "sync",
      checkedRole: syncRole,
      label: sync.adapter.label,
      readinessRoute: sync.adapter.readinessRoute,
      accessAllowed: sync.access.allowed,
      accessLevel: sync.access.level,
      status: sync.adapter.status,
      coreDbConfigured: sync.health.coreDbConfigured,
      health: sync.health,
      firstEntities: sync.firstEntities,
      readModels: sync.readModels,
      blockedWriteScopes: sync.blockedWriteScopes,
      internalCountsReturned: sync.syncSurface.internalCountsReturned,
      liveSourceRecordsReturned: sync.liveSourceRecordsReturned,
      sourceWritesEnabled: sync.boundaries.sourceWriteEnabled,
      controlActionsEnabled: sync.boundaries.controlActionsEnabled,
      providerCallsEnabled: sync.providerCallsEnabled,
      fileUploadEnabled: sync.fileUploadEnabled,
      externalSendingEnabled: sync.externalSendingEnabled,
    }),
  ];

  return {
    role,
    access,
    summary: {
      moduleCount: modules.length,
      schemaReadyModules: modules.filter((module) => module.schemaReady).length,
      accessAllowedModules: modules.filter((module) => module.accessAllowed).length,
      scopedShellModules: modules.filter((module) => module.accessLevel.includes("shell")).length,
      modulesWithInternalCounts: modules.filter((module) => module.internalCountsReturned).length,
      totalBlockedWriteScopes: modules.reduce((total, module) => total + module.blockedWriteScopes, 0),
      liveSourceProbePerformed: false,
      sourceApiCalled: false,
      sourceUiEmbedded: false,
      liveSourceRecordsReturned: false,
      writeActionsEnabled: false,
    },
    modules,
    blockedActions: blockedActions(),
    healthPolicy: healthPolicy(),
  };
}

function blockedActions(): AdapterHealthReadiness["blockedActions"] {
  return [
    { key: "source-api-smoke", label: "Live source API smoke", status: "blocked" },
    { key: "source-write", label: "Source writes", status: "blocked" },
    { key: "sync-write", label: "Sync writes", status: "blocked" },
    { key: "reconciliation", label: "Destructive reconciliation", status: "blocked" },
    { key: "retry-execution", label: "Retry execution", status: "blocked" },
    { key: "control-action", label: "Adapter control actions", status: "blocked" },
    { key: "provider-call", label: "Provider calls", status: "blocked" },
    { key: "upload", label: "Uploads", status: "blocked" },
    { key: "external-send", label: "External sending", status: "blocked" },
  ];
}

function healthPolicy(): AdapterHealthReadiness["healthPolicy"] {
  return {
    readOnly: true,
    dryRunOnly: true,
    providerLogsReturned: false,
    environmentValuesReturned: false,
    secretsReturned: false,
    privateKeysReturned: false,
    sourceUiExposureEnabled: false,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    destructiveReconciliationEnabled: false,
    retryExecutionEnabled: false,
    controlActionsEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
  };
}
