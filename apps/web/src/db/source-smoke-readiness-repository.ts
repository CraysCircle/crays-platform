import type { RoleKey } from "@/lib/roles";

const internalSourceSmokeRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedSourceSmokeRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];

type SourceSmokeModuleKey = "project" | "crm" | "erp" | "files" | "sync";
type SourceSmokeAccessLevel = "internal_source_smoke_readiness" | "scoped_source_smoke_shell" | "forbidden";

type SourceSmokeModule = {
  module: SourceSmokeModuleKey;
  label: string;
  ownerRole: RoleKey;
  readinessRoute: string;
  smokeRoute: string;
  scope: string;
  endpointStatus: "not_started";
  firstSmokeState: "blocked_until_module_endpoint_review";
  plannedMethod: "GET";
  maxRows: number;
  timeoutMs: number;
  payloadBodiesReturned: false;
  sampleRowsReturned: false;
  liveSourceRecordsReturned: false;
  sourceApiCalled: false;
  sourceWriteEnabled: false;
};

export type SourceSmokeReadiness = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: SourceSmokeAccessLevel;
    reason: string;
  };
  summary: {
    moduleCount: number;
    allowedModuleCount: number;
    routeImplementationReady: false;
    liveSourceCallsEnabled: false;
    sourceWritesEnabled: false;
    providerCallsEnabled: false;
    sampleRowsReturned: false;
    liveSourceRecordsReturned: false;
  };
  modules: SourceSmokeModule[];
  smokePolicy: {
    readOnly: true;
    dryRunOnly: true;
    allowedMethods: ["GET", "HEAD"];
    maxRowsPerModule: 5;
    timeoutMs: 2500;
    maxPayloadBytes: 12000;
    payloadBodiesReturned: false;
    requestHeadersReturned: false;
    responseHeadersReturned: false;
    authMaterialReturned: false;
    providerLogsReturned: false;
    environmentValuesReturned: false;
    sourceUiExposureEnabled: false;
    sourceApiCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    destructiveReconciliationEnabled: false;
    retryExecutionEnabled: false;
    controlActionsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  redactionPolicy: Array<{
    fieldGroup: string;
    returned: false;
  }>;
};

function accessForRole(role: RoleKey): SourceSmokeReadiness["access"] {
  if (internalSourceSmokeRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_source_smoke_readiness",
      reason: "Role can read the bounded source-smoke plan before any live source call is enabled.",
    };
  }

  if (scopedSourceSmokeRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_source_smoke_shell",
      reason: "Role can read the module-scoped source-smoke shell for approved functional areas only.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Source-smoke readiness requires internal platform, review or scoped module-readiness access.",
  };
}

function allModules(): SourceSmokeModule[] {
  return [
    {
      module: "project",
      label: "Project",
      ownerRole: "deal-manager",
      readinessRoute: "/api/crays/project/adapter/readiness",
      smokeRoute: "/api/crays/adapters/source-smoke/project",
      scope: "Project metadata, work item counts and opening handoff status only.",
      endpointStatus: "not_started",
      firstSmokeState: "blocked_until_module_endpoint_review",
      plannedMethod: "GET",
      maxRows: 5,
      timeoutMs: 2500,
      payloadBodiesReturned: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
      sourceApiCalled: false,
      sourceWriteEnabled: false,
    },
    {
      module: "crm",
      label: "CRM",
      ownerRole: "deal-manager",
      readinessRoute: "/api/crays/crm/adapter/readiness",
      smokeRoute: "/api/crays/adapters/source-smoke/crm",
      scope: "Pipeline and relationship metadata counts only.",
      endpointStatus: "not_started",
      firstSmokeState: "blocked_until_module_endpoint_review",
      plannedMethod: "GET",
      maxRows: 5,
      timeoutMs: 2500,
      payloadBodiesReturned: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
      sourceApiCalled: false,
      sourceWriteEnabled: false,
    },
    {
      module: "erp",
      label: "ERP",
      ownerRole: "finance",
      readinessRoute: "/api/crays/erp/adapter/readiness",
      smokeRoute: "/api/crays/adapters/source-smoke/erp",
      scope: "Finance summary metadata and status counts only.",
      endpointStatus: "not_started",
      firstSmokeState: "blocked_until_module_endpoint_review",
      plannedMethod: "GET",
      maxRows: 5,
      timeoutMs: 2500,
      payloadBodiesReturned: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
      sourceApiCalled: false,
      sourceWriteEnabled: false,
    },
    {
      module: "files",
      label: "Files",
      ownerRole: "deal-manager",
      readinessRoute: "/api/crays/files/adapter/readiness",
      smokeRoute: "/api/crays/adapters/source-smoke/files",
      scope: "Document metadata counts only; no binary download or preview.",
      endpointStatus: "not_started",
      firstSmokeState: "blocked_until_module_endpoint_review",
      plannedMethod: "GET",
      maxRows: 5,
      timeoutMs: 2500,
      payloadBodiesReturned: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
      sourceApiCalled: false,
      sourceWriteEnabled: false,
    },
    {
      module: "sync",
      label: "Sync",
      ownerRole: "admin",
      readinessRoute: "/api/crays/sync/adapter/readiness",
      smokeRoute: "/api/crays/adapters/source-smoke/sync",
      scope: "Adapter status, map coverage and job status counts only.",
      endpointStatus: "not_started",
      firstSmokeState: "blocked_until_module_endpoint_review",
      plannedMethod: "GET",
      maxRows: 5,
      timeoutMs: 2500,
      payloadBodiesReturned: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
      sourceApiCalled: false,
      sourceWriteEnabled: false,
    },
  ];
}

function modulesForRole(role: RoleKey) {
  const modules = allModules();
  if (internalSourceSmokeRoles.includes(role)) return modules;
  if (role === "finance") return modules.filter((module) => ["erp", "files", "sync"].includes(module.module));
  if (role === "deal-manager") return modules;
  if (role === "expansion-manager") return modules.filter((module) => ["project", "crm", "files", "sync"].includes(module.module));
  return [];
}

function smokePolicy(): SourceSmokeReadiness["smokePolicy"] {
  return {
    readOnly: true,
    dryRunOnly: true,
    allowedMethods: ["GET", "HEAD"],
    maxRowsPerModule: 5,
    timeoutMs: 2500,
    maxPayloadBytes: 12000,
    payloadBodiesReturned: false,
    requestHeadersReturned: false,
    responseHeadersReturned: false,
    authMaterialReturned: false,
    providerLogsReturned: false,
    environmentValuesReturned: false,
    sourceUiExposureEnabled: false,
    sourceApiCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    destructiveReconciliationEnabled: false,
    retryExecutionEnabled: false,
    controlActionsEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function redactionPolicy(): SourceSmokeReadiness["redactionPolicy"] {
  return [
    { fieldGroup: "personal contact values", returned: false },
    { fieldGroup: "payment and bank values", returned: false },
    { fieldGroup: "document bodies and binaries", returned: false },
    { fieldGroup: "provider request material", returned: false },
    { fieldGroup: "environment and runtime values", returned: false },
  ];
}

export function getSourceSmokeReadiness(role: RoleKey): SourceSmokeReadiness {
  const access = accessForRole(role);
  const modules = access.allowed ? modulesForRole(role) : [];

  return {
    role,
    access,
    summary: {
      moduleCount: allModules().length,
      allowedModuleCount: modules.length,
      routeImplementationReady: false,
      liveSourceCallsEnabled: false,
      sourceWritesEnabled: false,
      providerCallsEnabled: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
    },
    modules,
    smokePolicy: smokePolicy(),
    redactionPolicy: access.allowed ? redactionPolicy() : [],
  };
}
