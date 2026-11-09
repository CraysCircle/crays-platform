import type { RoleKey } from "./roles";

export type SourceSmokeEvidenceModuleKey = "project" | "crm" | "erp" | "files";

type AccessLevel = "internal_source_evidence" | "scoped_source_evidence_shell" | "forbidden";
type EndpointStatus = "reviewed" | "metadata_only_reviewed";
type SmokeStatus = "passed_bounded" | "metadata_only_passed";

type EndpointObservation = {
  key: string;
  label: string;
  method: "GET" | "HEAD";
  observedStatus: 200 | 404 | null;
  contentType: "text/html" | "application/json" | "text/html; charset=utf-8" | "application/json; charset=utf-8" | "not_applicable";
  expectedBoundary: boolean;
  payloadBodyReturned: false;
  requestHeadersReturned: false;
  responseHeadersReturned: false;
  liveSourceRecordsReturned: false;
  sampleRowsReturned: false;
};

type RuntimeSignal = {
  key: string;
  label: string;
  observedState: "healthy" | "running" | "reachable" | "detected" | "not_configured";
};

type ModuleEvidenceConfig = {
  key: SourceSmokeEvidenceModuleKey;
  label: string;
  endpointReviewBlock: "Block 56" | "Block 58" | "Block 60" | "Block 62";
  smokeEvidenceBlock: "Block 57" | "Block 59" | "Block 61" | "Block 63";
  endpointReviewRoute: string;
  smokeEvidenceRoute: string;
  foundationRoute: string;
  internalRoles: RoleKey[];
  scopedRoles: RoleKey[];
  scopedShellReason: string;
  endpointStatus: EndpointStatus;
  smokeStatus: SmokeStatus;
  sourceEndpointConfigured: boolean;
  metadataOnly: boolean;
  observedSourceApiCalled: boolean;
  observedHttpChecks: number;
  runtimeSignals: RuntimeSignal[];
  endpointObservations: EndpointObservation[];
  sourceFaithfulNextSurfaces: string[];
  operationalRisk: string;
};

export type SourceEndpointReviewContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: AccessLevel;
    reason: string;
  };
  module: {
    key: SourceSmokeEvidenceModuleKey;
    label: string;
    endpointReviewBlock: ModuleEvidenceConfig["endpointReviewBlock"];
    smokeEvidenceBlock: ModuleEvidenceConfig["smokeEvidenceBlock"];
    endpointReviewRoute: string;
    smokeEvidenceRoute: string;
    foundationRoute: string;
  };
  endpointReview: {
    status: EndpointStatus;
    observedAt: "2026-07-09";
    evidenceMode: "ssh_read_only_status_probe";
    sourceEndpointConfigured: boolean;
    metadataOnly: boolean;
    runtimeSignals: RuntimeSignal[];
    observations: EndpointObservation[];
    endpointDetailsReturned: boolean;
  };
  boundaries: EvidenceBoundaries;
  nextStep: {
    block: ModuleEvidenceConfig["smokeEvidenceBlock"];
    action: "publish_bounded_read_only_smoke_evidence";
  };
};

export type SourceSmokeEvidenceContract = {
  role: RoleKey;
  access: SourceEndpointReviewContract["access"];
  module: SourceEndpointReviewContract["module"];
  evidence: {
    status: SmokeStatus;
    observedAt: "2026-07-09";
    evidenceMode: "sanitized_read_only_source_smoke";
    sourceEndpointConfigured: boolean;
    observedSourceApiCalled: boolean;
    observedHttpChecks: number;
    payloadBodiesReturned: false;
    requestHeadersReturned: false;
    responseHeadersReturned: false;
    sampleRowsReturned: false;
    liveSourceRecordsReturned: false;
    liveBusinessRecordsReturned: false;
    sourceFaithfulNextSurfaces: string[];
    endpointObservations: EndpointObservation[];
  };
  gates: Array<{
    key: string;
    label: string;
    status: "passed" | "blocked";
  }>;
  boundaries: EvidenceBoundaries;
  nextStep: {
    block: "Block 64" | "Block 65";
    action: "aggregate_source_smoke_evidence" | "update_write_decision_after_evidence";
  };
};

type EvidenceBoundaries = {
  readOnly: true;
  routeRuntimeSourceCallEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  destructiveReconciliationEnabled: false;
  retryExecutionEnabled: false;
  financeWritesEnabled: false;
  accountingExportsEnabled: false;
  bankSendEnabled: false;
  fileUploadEnabled: false;
  binaryDownloadEnabled: false;
  filePreviewEnabled: false;
  sourceUiExposureEnabled: false;
  providerCallsEnabled: false;
  controlActionsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  candidateReleaseEnabled: false;
  payloadBodiesReturned: false;
  requestHeadersReturned: false;
  responseHeadersReturned: false;
  authMaterialReturned: false;
  providerLogsReturned: false;
  environmentValuesReturned: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type SourceSmokeEvidenceDashboardContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_source_smoke_evidence_dashboard" | "scoped_source_smoke_evidence_shell" | "forbidden";
    reason: string;
  };
  summary: {
    blockRange: "Blocks 56-65";
    moduleCount: 4;
    visibleModuleCount: number;
    endpointReviewsComplete: number;
    boundedSmokesComplete: number;
    sourceRuntimeCallsObserved: number;
    metadataOnlySmokes: number;
    approvedWriteAdapters: 0;
    nextBlock: "Block 66";
  };
  modules: Array<{
    key: SourceSmokeEvidenceModuleKey;
    label: string;
    endpointReviewBlock: ModuleEvidenceConfig["endpointReviewBlock"];
    smokeEvidenceBlock: ModuleEvidenceConfig["smokeEvidenceBlock"];
    endpointStatus: EndpointStatus;
    smokeStatus: SmokeStatus;
    sourceEndpointConfigured: boolean;
    observedSourceApiCalled: boolean;
    observedHttpChecks: number;
    metadataOnly: boolean;
    operationalRisk: string;
  }>;
  writeDecision: {
    status: "not_approved";
    firstCandidate: "project";
    approvedWriteAdapters: 0;
    nextDecisionRequired: "project_write_scope_and_source_faithful_surface_plan";
  };
  boundaries: EvidenceBoundaries;
};

const projectRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"];
const crmRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"];
const erpRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance"];
const filesRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];

const configs: Record<SourceSmokeEvidenceModuleKey, ModuleEvidenceConfig> = {
  project: {
    key: "project",
    label: "Project",
    endpointReviewBlock: "Block 56",
    smokeEvidenceBlock: "Block 57",
    endpointReviewRoute: "/api/crays/project/source-endpoint/review",
    smokeEvidenceRoute: "/api/crays/project/source-smoke/evidence",
    foundationRoute: "/api/crays/project/source-smoke/readiness",
    internalRoles: projectRoles,
    scopedRoles: ["franchise-partner"],
    scopedShellReason: "Role can see the scoped Project smoke evidence shell only. Internal endpoint observations stay hidden.",
    endpointStatus: "reviewed",
    smokeStatus: "passed_bounded",
    sourceEndpointConfigured: true,
    metadataOnly: false,
    observedSourceApiCalled: true,
    observedHttpChecks: 2,
    runtimeSignals: [
      { key: "project-web", label: "Project application shell", observedState: "healthy" },
      { key: "project-space", label: "Project collaboration surface", observedState: "healthy" },
      { key: "project-api", label: "Project API service", observedState: "running" },
    ],
    endpointObservations: [
      {
        key: "project-root",
        label: "Application shell reachability",
        method: "GET",
        observedStatus: 200,
        contentType: "text/html",
        expectedBoundary: false,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
      {
        key: "project-api-root",
        label: "API root boundary",
        method: "GET",
        observedStatus: 404,
        contentType: "application/json",
        expectedBoundary: true,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
    ],
    sourceFaithfulNextSurfaces: ["projects", "work items", "cycles", "pages", "handoff activity"],
    operationalRisk: "source_authenticated_record_endpoints_not_called",
  },
  crm: {
    key: "crm",
    label: "CRM",
    endpointReviewBlock: "Block 58",
    smokeEvidenceBlock: "Block 59",
    endpointReviewRoute: "/api/crays/crm/source-endpoint/review",
    smokeEvidenceRoute: "/api/crays/crm/source-smoke/evidence",
    foundationRoute: "/api/crays/crm/source-smoke/readiness",
    internalRoles: crmRoles,
    scopedRoles: [],
    scopedShellReason: "No scoped CRM smoke evidence shell is enabled for this role.",
    endpointStatus: "reviewed",
    smokeStatus: "passed_bounded",
    sourceEndpointConfigured: true,
    metadataOnly: false,
    observedSourceApiCalled: true,
    observedHttpChecks: 2,
    runtimeSignals: [
      { key: "crm-server-health", label: "CRM application service", observedState: "healthy" },
      { key: "crm-listener", label: "CRM internal listener", observedState: "detected" },
      { key: "crm-health-endpoint", label: "CRM health endpoint", observedState: "reachable" },
    ],
    endpointObservations: [
      {
        key: "crm-root",
        label: "Application shell reachability",
        method: "HEAD",
        observedStatus: 200,
        contentType: "text/html; charset=utf-8",
        expectedBoundary: false,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
      {
        key: "crm-health",
        label: "Health endpoint reachability",
        method: "HEAD",
        observedStatus: 200,
        contentType: "application/json; charset=utf-8",
        expectedBoundary: true,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
    ],
    sourceFaithfulNextSurfaces: ["companies", "people", "opportunities", "tasks", "notes"],
    operationalRisk: "authenticated_record_endpoints_not_called",
  },
  erp: {
    key: "erp",
    label: "ERP",
    endpointReviewBlock: "Block 60",
    smokeEvidenceBlock: "Block 61",
    endpointReviewRoute: "/api/crays/erp/source-endpoint/review",
    smokeEvidenceRoute: "/api/crays/erp/source-smoke/evidence",
    foundationRoute: "/api/crays/erp/source-smoke/readiness",
    internalRoles: erpRoles,
    scopedRoles: ["deal-manager"],
    scopedShellReason: "Role can see only the scoped ERP smoke evidence shell. Internal finance endpoint observations stay hidden.",
    endpointStatus: "reviewed",
    smokeStatus: "passed_bounded",
    sourceEndpointConfigured: true,
    metadataOnly: false,
    observedSourceApiCalled: true,
    observedHttpChecks: 2,
    runtimeSignals: [
      { key: "erp-database-health", label: "ERP database service", observedState: "healthy" },
      { key: "erp-backend", label: "ERP backend service", observedState: "running" },
      { key: "erp-frontend", label: "ERP web service", observedState: "running" },
    ],
    endpointObservations: [
      {
        key: "erp-root",
        label: "ERP application shell reachability",
        method: "GET",
        observedStatus: 200,
        contentType: "text/html; charset=utf-8",
        expectedBoundary: false,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
      {
        key: "erp-ping",
        label: "ERP ping endpoint reachability",
        method: "GET",
        observedStatus: 200,
        contentType: "application/json",
        expectedBoundary: true,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
    ],
    sourceFaithfulNextSurfaces: ["customers", "invoices", "payments", "accounts", "budgets"],
    operationalRisk: "queue_cpu_pressure_requires_extra_review_before_deep_finance_smokes",
  },
  files: {
    key: "files",
    label: "Files",
    endpointReviewBlock: "Block 62",
    smokeEvidenceBlock: "Block 63",
    endpointReviewRoute: "/api/crays/files/source-endpoint/review",
    smokeEvidenceRoute: "/api/crays/files/source-smoke/evidence",
    foundationRoute: "/api/crays/files/source-smoke/readiness",
    internalRoles: filesRoles,
    scopedRoles: ["franchise-candidate", "bank-partner"],
    scopedShellReason: "Role can see only the release-gated Files metadata evidence shell. No binary, preview or private document source is exposed.",
    endpointStatus: "metadata_only_reviewed",
    smokeStatus: "metadata_only_passed",
    sourceEndpointConfigured: false,
    metadataOnly: true,
    observedSourceApiCalled: false,
    observedHttpChecks: 0,
    runtimeSignals: [
      { key: "files-metadata-bridge", label: "Files metadata bridge", observedState: "detected" },
      { key: "binary-source-endpoint", label: "Binary source endpoint", observedState: "not_configured" },
      { key: "preview-source-endpoint", label: "Preview source endpoint", observedState: "not_configured" },
    ],
    endpointObservations: [
      {
        key: "files-metadata-only",
        label: "Metadata-only bridge review",
        method: "GET",
        observedStatus: null,
        contentType: "not_applicable",
        expectedBoundary: true,
        payloadBodyReturned: false,
        requestHeadersReturned: false,
        responseHeadersReturned: false,
        liveSourceRecordsReturned: false,
        sampleRowsReturned: false,
      },
    ],
    sourceFaithfulNextSurfaces: ["document package links", "evidence packages", "release states", "version metadata", "access grants"],
    operationalRisk: "binary_and_preview_endpoints_intentionally_not_configured",
  },
};

function boundaries(): EvidenceBoundaries {
  return {
    readOnly: true,
    routeRuntimeSourceCallEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    destructiveReconciliationEnabled: false,
    retryExecutionEnabled: false,
    financeWritesEnabled: false,
    accountingExportsEnabled: false,
    bankSendEnabled: false,
    fileUploadEnabled: false,
    binaryDownloadEnabled: false,
    filePreviewEnabled: false,
    sourceUiExposureEnabled: false,
    providerCallsEnabled: false,
    controlActionsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    payloadBodiesReturned: false,
    requestHeadersReturned: false,
    responseHeadersReturned: false,
    authMaterialReturned: false,
    providerLogsReturned: false,
    environmentValuesReturned: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function accessForModule(config: ModuleEvidenceConfig, role: RoleKey): SourceEndpointReviewContract["access"] {
  if (config.internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_source_evidence",
      reason: `Role can read internal ${config.label} endpoint review and source-smoke evidence.`,
    };
  }

  if (config.scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_source_evidence_shell",
      reason: config.scopedShellReason,
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: `${config.label} source-smoke evidence requires internal module scope or an explicitly scoped shell.`,
  };
}

function moduleShape(config: ModuleEvidenceConfig): SourceEndpointReviewContract["module"] {
  return {
    key: config.key,
    label: config.label,
    endpointReviewBlock: config.endpointReviewBlock,
    smokeEvidenceBlock: config.smokeEvidenceBlock,
    endpointReviewRoute: config.endpointReviewRoute,
    smokeEvidenceRoute: config.smokeEvidenceRoute,
    foundationRoute: config.foundationRoute,
  };
}

function observationsForAccess(config: ModuleEvidenceConfig, access: SourceEndpointReviewContract["access"]) {
  if (!access.allowed || access.level === "scoped_source_evidence_shell") return [];
  return config.endpointObservations;
}

function runtimeSignalsForAccess(config: ModuleEvidenceConfig, access: SourceEndpointReviewContract["access"]) {
  if (!access.allowed || access.level === "scoped_source_evidence_shell") {
    return config.runtimeSignals.map((signal) => ({ ...signal, label: `${config.label} scoped evidence state` }));
  }
  return config.runtimeSignals;
}

function gates(config: ModuleEvidenceConfig): SourceSmokeEvidenceContract["gates"] {
  return [
    { key: "ssh-read-only", label: "Source inspection used read-only SSH/API probes only.", status: "passed" },
    { key: "no-body", label: "No payload bodies, rows, headers, logs or runtime values were returned.", status: "passed" },
    { key: "no-write", label: "No source write, sync write, upload, send or control action is enabled.", status: "passed" },
    {
      key: "record-read",
      label: config.metadataOnly ? "Metadata-only bridge remains approved; binary and preview records stay blocked." : "Authenticated record endpoints were not called in this block.",
      status: config.metadataOnly ? "passed" : "blocked",
    },
  ];
}

export function getSourceEndpointReview(module: SourceSmokeEvidenceModuleKey, role: RoleKey): SourceEndpointReviewContract {
  const config = configs[module];
  const access = accessForModule(config, role);

  return {
    role,
    access,
    module: moduleShape(config),
    endpointReview: {
      status: config.endpointStatus,
      observedAt: "2026-07-09",
      evidenceMode: "ssh_read_only_status_probe",
      sourceEndpointConfigured: access.allowed ? config.sourceEndpointConfigured : false,
      metadataOnly: access.allowed ? config.metadataOnly : false,
      runtimeSignals: access.allowed ? runtimeSignalsForAccess(config, access) : [],
      observations: observationsForAccess(config, access),
      endpointDetailsReturned: access.allowed && access.level === "internal_source_evidence",
    },
    boundaries: boundaries(),
    nextStep: {
      block: config.smokeEvidenceBlock,
      action: "publish_bounded_read_only_smoke_evidence",
    },
  };
}

export function getSourceSmokeEvidence(module: SourceSmokeEvidenceModuleKey, role: RoleKey): SourceSmokeEvidenceContract {
  const config = configs[module];
  const access = accessForModule(config, role);
  const allowed = access.allowed;

  return {
    role,
    access,
    module: moduleShape(config),
    evidence: {
      status: config.smokeStatus,
      observedAt: "2026-07-09",
      evidenceMode: "sanitized_read_only_source_smoke",
      sourceEndpointConfigured: allowed ? config.sourceEndpointConfigured : false,
      observedSourceApiCalled: allowed ? config.observedSourceApiCalled : false,
      observedHttpChecks: allowed ? config.observedHttpChecks : 0,
      payloadBodiesReturned: false,
      requestHeadersReturned: false,
      responseHeadersReturned: false,
      sampleRowsReturned: false,
      liveSourceRecordsReturned: false,
      liveBusinessRecordsReturned: false,
      sourceFaithfulNextSurfaces: allowed ? config.sourceFaithfulNextSurfaces : [],
      endpointObservations: observationsForAccess(config, access),
    },
    gates: allowed ? gates(config) : [],
    boundaries: boundaries(),
    nextStep: {
      block: module === "files" ? "Block 64" : "Block 65",
      action: module === "files" ? "aggregate_source_smoke_evidence" : "update_write_decision_after_evidence",
    },
  };
}

function dashboardAccess(role: RoleKey): SourceSmokeEvidenceDashboardContract["access"] {
  if (["admin", "crays-management", "reviewer"].includes(role)) {
    return {
      allowed: true,
      level: "internal_source_smoke_evidence_dashboard",
      reason: "Role can read aggregate read-only source-smoke evidence for operator review.",
    };
  }

  if (["finance", "deal-manager", "expansion-manager"].includes(role)) {
    return {
      allowed: true,
      level: "scoped_source_smoke_evidence_shell",
      reason: "Role can read a scoped source-smoke evidence shell for planning. Write approval remains blocked.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Source-smoke evidence dashboard requires internal, review or scoped module planning access.",
  };
}

function modulesForDashboard(role: RoleKey) {
  const all = Object.values(configs);
  if (["admin", "crays-management", "reviewer"].includes(role)) return all;
  if (role === "finance") return all.filter((config) => ["erp", "files"].includes(config.key));
  if (role === "deal-manager") return all.filter((config) => ["project", "crm", "erp", "files"].includes(config.key));
  if (role === "expansion-manager") return all.filter((config) => ["project", "crm", "files"].includes(config.key));
  return [];
}

export function getSourceSmokeEvidenceDashboard(role: RoleKey): SourceSmokeEvidenceDashboardContract {
  const access = dashboardAccess(role);
  const visibleModules = access.allowed ? modulesForDashboard(role) : [];

  return {
    role,
    access,
    summary: {
      blockRange: "Blocks 56-65",
      moduleCount: 4,
      visibleModuleCount: visibleModules.length,
      endpointReviewsComplete: access.allowed ? visibleModules.length : 0,
      boundedSmokesComplete: access.allowed ? visibleModules.length : 0,
      sourceRuntimeCallsObserved: access.allowed ? visibleModules.filter((module) => module.observedSourceApiCalled).length : 0,
      metadataOnlySmokes: access.allowed ? visibleModules.filter((module) => module.metadataOnly).length : 0,
      approvedWriteAdapters: 0,
      nextBlock: "Block 66",
    },
    modules: visibleModules.map((module) => ({
      key: module.key,
      label: module.label,
      endpointReviewBlock: module.endpointReviewBlock,
      smokeEvidenceBlock: module.smokeEvidenceBlock,
      endpointStatus: module.endpointStatus,
      smokeStatus: module.smokeStatus,
      sourceEndpointConfigured: module.sourceEndpointConfigured,
      observedSourceApiCalled: module.observedSourceApiCalled,
      observedHttpChecks: module.observedHttpChecks,
      metadataOnly: module.metadataOnly,
      operationalRisk: module.operationalRisk,
    })),
    writeDecision: {
      status: "not_approved",
      firstCandidate: "project",
      approvedWriteAdapters: 0,
      nextDecisionRequired: "project_write_scope_and_source_faithful_surface_plan",
    },
    boundaries: {
      ...boundaries(),
      routeRuntimeSourceCallEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
    },
  };
}

export function getAllSourceSmokeEvidenceConfigs() {
  return Object.values(configs);
}
