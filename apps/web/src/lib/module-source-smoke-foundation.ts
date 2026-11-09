import type { RoleKey } from "./roles";

export type ModuleSourceSmokeKey = "project" | "crm" | "erp" | "files";

type AccessLevel = "internal_source_smoke_foundation" | "scoped_source_smoke_shell" | "forbidden";

type ModuleSourceSmokeConfig = {
  key: ModuleSourceSmokeKey;
  label: string;
  block: "Block 46" | "Block 47" | "Block 48" | "Block 49";
  readinessRoute: string;
  foundationRoute: string;
  internalRoles: RoleKey[];
  scopedRoles: RoleKey[];
  firstEntities: string[];
  plannedSignals: string[];
  scopedShellReason: string;
};

export type ModuleSourceSmokeFoundation = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: AccessLevel;
    reason: string;
  };
  module: {
    key: ModuleSourceSmokeKey;
    label: string;
    block: ModuleSourceSmokeConfig["block"];
    readinessRoute: string;
    foundationRoute: string;
    foundationReady: true;
    smokeExecutionEnabled: false;
    sourceEndpointConfigured: false;
    liveSourceCallsEnabled: false;
    firstEntities: string[];
    plannedSignals: string[];
    maxRows: 5;
    timeoutMs: 2500;
  };
  gates: Array<{
    key: string;
    label: string;
    status: "required";
  }>;
  smokePolicy: {
    readOnly: true;
    foundationOnly: true;
    plannedMethod: "GET";
    sourceApiCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    sampleRowsReturned: false;
    liveSourceRecordsReturned: false;
    liveBusinessRecordsReturned: false;
    payloadBodiesReturned: false;
    requestHeadersReturned: false;
    responseHeadersReturned: false;
    authMaterialReturned: false;
    providerLogsReturned: false;
    environmentValuesReturned: false;
    sourceUiExposureEnabled: false;
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
  nextStep: {
    status: "blocked_until_explicit_source_endpoint_review";
    allowedAction: "document_source_endpoint_shape_only";
  };
};

const configs: Record<ModuleSourceSmokeKey, ModuleSourceSmokeConfig> = {
  project: {
    key: "project",
    label: "Project",
    block: "Block 46",
    readinessRoute: "/api/crays/project/adapter/readiness",
    foundationRoute: "/api/crays/project/source-smoke/readiness",
    internalRoles: ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"],
    scopedRoles: ["franchise-partner"],
    firstEntities: ["projects", "work items", "cycles", "pages"],
    plannedSignals: ["opening handoff status", "task count", "blocked work count", "milestone coverage"],
    scopedShellReason: "Role can see the future scoped Project smoke shell only; no internal counts or source records are returned.",
  },
  crm: {
    key: "crm",
    label: "CRM",
    block: "Block 47",
    readinessRoute: "/api/crays/crm/adapter/readiness",
    foundationRoute: "/api/crays/crm/source-smoke/readiness",
    internalRoles: ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"],
    scopedRoles: [],
    firstEntities: ["companies", "people", "opportunities", "tasks", "notes"],
    plannedSignals: ["deal pipeline count", "property partner count", "open follow-up count", "handoff context coverage"],
    scopedShellReason: "No scoped CRM smoke shell is enabled for this role.",
  },
  erp: {
    key: "erp",
    label: "ERP",
    block: "Block 48",
    readinessRoute: "/api/crays/erp/adapter/readiness",
    foundationRoute: "/api/crays/erp/source-smoke/readiness",
    internalRoles: ["admin", "crays-management", "reviewer", "finance"],
    scopedRoles: ["deal-manager"],
    firstEntities: ["customers", "invoices", "payments", "accounts", "budgets"],
    plannedSignals: ["finance summary count", "invoice status count", "payment status count", "budget coverage"],
    scopedShellReason: "Role can see only the deal finance source-smoke shell; no internal accounting counts or source records are returned.",
  },
  files: {
    key: "files",
    label: "Files",
    block: "Block 49",
    readinessRoute: "/api/crays/files/adapter/readiness",
    foundationRoute: "/api/crays/files/source-smoke/readiness",
    internalRoles: ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"],
    scopedRoles: ["franchise-candidate", "bank-partner"],
    firstEntities: ["document package links", "evidence packages", "release states", "version metadata"],
    plannedSignals: ["metadata count", "release-state count", "package coverage", "access-grant coverage"],
    scopedShellReason: "Role can see only the release-gated Files source-smoke shell; no internal metadata counts or file records are returned.",
  },
};

function accessForRole(config: ModuleSourceSmokeConfig, role: RoleKey): ModuleSourceSmokeFoundation["access"] {
  if (config.internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_source_smoke_foundation",
      reason: `Role can read the ${config.label} read-only source-smoke foundation before any source call is enabled.`,
    };
  }

  if (config.scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_source_smoke_shell",
      reason: config.scopedShellReason,
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: `${config.label} source-smoke readiness requires internal module scope or an explicitly scoped shell.`,
  };
}

function gates(): ModuleSourceSmokeFoundation["gates"] {
  return [
    { key: "endpoint-shape", label: "Source endpoint shape is documented before execution.", status: "required" },
    { key: "redaction", label: "Returned fields are bounded and redacted.", status: "required" },
    { key: "role-scope", label: "Server-side role and entity scope are enforced.", status: "required" },
    { key: "timeout", label: "Timeout and max row limits are fixed.", status: "required" },
    { key: "no-write", label: "No write, retry, reconciliation or control action is possible.", status: "required" },
  ];
}

function smokePolicy(): ModuleSourceSmokeFoundation["smokePolicy"] {
  return {
    readOnly: true,
    foundationOnly: true,
    plannedMethod: "GET",
    sourceApiCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    sampleRowsReturned: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
    payloadBodiesReturned: false,
    requestHeadersReturned: false,
    responseHeadersReturned: false,
    authMaterialReturned: false,
    providerLogsReturned: false,
    environmentValuesReturned: false,
    sourceUiExposureEnabled: false,
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

function redactionPolicy(module: ModuleSourceSmokeKey): ModuleSourceSmokeFoundation["redactionPolicy"] {
  const shared = [
    { fieldGroup: "source payload bodies", returned: false },
    { fieldGroup: "request and response headers", returned: false },
    { fieldGroup: "provider logs and runtime values", returned: false },
  ] as ModuleSourceSmokeFoundation["redactionPolicy"];

  if (module === "erp") {
    return [...shared, { fieldGroup: "payment, bank and accounting values", returned: false }];
  }

  if (module === "files") {
    return [...shared, { fieldGroup: "document bodies, binaries and previews", returned: false }];
  }

  return [...shared, { fieldGroup: "personal contact values", returned: false }];
}

export function getModuleSourceSmokeFoundation(module: ModuleSourceSmokeKey, role: RoleKey): ModuleSourceSmokeFoundation {
  const config = configs[module];
  const access = accessForRole(config, role);

  return {
    role,
    access,
    module: {
      key: config.key,
      label: config.label,
      block: config.block,
      readinessRoute: config.readinessRoute,
      foundationRoute: config.foundationRoute,
      foundationReady: true,
      smokeExecutionEnabled: false,
      sourceEndpointConfigured: false,
      liveSourceCallsEnabled: false,
      firstEntities: access.allowed ? config.firstEntities : [],
      plannedSignals: access.allowed ? config.plannedSignals : [],
      maxRows: 5,
      timeoutMs: 2500,
    },
    gates: access.allowed ? gates() : [],
    smokePolicy: smokePolicy(),
    redactionPolicy: access.allowed ? redactionPolicy(module) : [],
    nextStep: {
      status: "blocked_until_explicit_source_endpoint_review",
      allowedAction: "document_source_endpoint_shape_only",
    },
  };
}
