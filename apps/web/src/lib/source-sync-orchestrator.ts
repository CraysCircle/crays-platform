import { persistSourceSnapshot, type SourceSyncModule, type SourceSyncResult } from "@/db/source-sync-repository";
import { getBackOfficeOperationalSourceSlice } from "@/lib/back-office-operational-source-adapter";
import { getCrmOperationalSourceSlice } from "@/lib/crm-operational-source-adapter";
import { safeLocalEngineError } from "@/lib/local-engine-runtime";
import { getLendingSourceReadSlice } from "@/lib/loans-operational-source-adapter";
import { safeSourceError } from "@/lib/operational-source-client";
import { getProjectOperationalSourceSlice } from "@/lib/project-operational-source-adapter";
import type { RoleKey } from "@/lib/roles";
import type { SourceWorkbenchSection } from "@/lib/source-faithful-product-contract";

export const sourceSyncModules = ["crm", "erp", "project", "loans"] as const satisfies readonly SourceSyncModule[];

export type PermanentSourceSyncModule = (typeof sourceSyncModules)[number];

type SourceSlice = {
  source: { connection: string; owner: string };
  generatedAt: string;
  sections: SourceWorkbenchSection[];
  capabilities: Record<string, unknown>;
  summary?: Record<string, number>;
};

export type SourceDataGap = {
  sectionKey: string;
  label: string;
  current: number;
  minimum: number;
  severity: "blocking" | "coverage";
  remediation: "seed_source_test_data" | "configure_source_runtime" | "review_source_filters";
};

export type PermanentSourceSyncResult = {
  moduleKey: PermanentSourceSyncModule;
  sourceRecordStatus: "ready" | "source_unavailable";
  sourceConnection: string | null;
  sourceOwner: string;
  generatedAt: string | null;
  sectionCounts: Record<string, number>;
  totalRows: number;
  completenessStatus: "complete" | "incomplete" | "source_unavailable" | "core_unavailable";
  gaps: SourceDataGap[];
  coreSync: SourceSyncResult | null;
  error?: { code: string; message: string };
};

export type PermanentSourceSyncRun = {
  role: RoleKey;
  mode: "localhost_permanent_sync";
  requestedModules: PermanentSourceSyncModule[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: PermanentSourceSyncResult[];
  summary: {
    modulesRequested: number;
    sourceReady: number;
    complete: number;
    incomplete: number;
    sourceUnavailable: number;
    corePersisted: number;
    coreUnavailable: number;
    missingSections: number;
    totalRowsRead: number;
  };
  testDataPolicy: {
    testDataWritesEnabled: boolean;
    requiresDevRuntime: true;
    requiresExplicitSeedAction: true;
    sourceProductionWritesAllowed: false;
    note: string;
  };
  boundaries: {
    sourceReadsEnabled: true;
    coreWritesEnabled: true;
    sourceTestDataWritesEnabled: boolean;
    sourceProductionWritesEnabled: false;
    destructiveSourceApplyEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

type MinimumSpec = Record<string, { label: string; minimum: number; severity: SourceDataGap["severity"] }>;

const minimums: Record<PermanentSourceSyncModule, MinimumSpec> = {
  crm: {
    companies: { label: "Companies", minimum: 3, severity: "blocking" },
    people: { label: "People", minimum: 3, severity: "blocking" },
    opportunities: { label: "Opportunities", minimum: 3, severity: "blocking" },
    tasks: { label: "Tasks", minimum: 1, severity: "coverage" },
  },
  erp: {
    accounts: { label: "Accounts", minimum: 1, severity: "blocking" },
    "cost-centers": { label: "Cost centers", minimum: 1, severity: "blocking" },
    invoices: { label: "Invoices", minimum: 1, severity: "blocking" },
    customers: { label: "Customers", minimum: 1, severity: "coverage" },
    suppliers: { label: "Suppliers", minimum: 1, severity: "coverage" },
    items: { label: "Items", minimum: 1, severity: "coverage" },
    "purchase-orders": { label: "Purchase orders", minimum: 1, severity: "coverage" },
    "material-requests": { label: "Material requests", minimum: 1, severity: "coverage" },
    projects: { label: "Projects", minimum: 1, severity: "blocking" },
    tasks: { label: "Tasks", minimum: 1, severity: "coverage" },
    employees: { label: "Employees", minimum: 1, severity: "coverage" },
    departments: { label: "Departments", minimum: 1, severity: "coverage" },
    "job-applicants": { label: "Job applicants", minimum: 1, severity: "coverage" },
    "training-events": { label: "Training events", minimum: 1, severity: "coverage" },
    assets: { label: "Assets", minimum: 1, severity: "coverage" },
    maintenance: { label: "Maintenance", minimum: 1, severity: "coverage" },
    issues: { label: "Issues", minimum: 1, severity: "coverage" },
    "quality-inspections": { label: "Quality inspections", minimum: 1, severity: "coverage" },
    communications: { label: "Communications", minimum: 1, severity: "coverage" },
  },
  project: {
    projects: { label: "Projects", minimum: 1, severity: "blocking" },
    "work-items": { label: "Work items", minimum: 3, severity: "blocking" },
    cycles: { label: "Cycles", minimum: 1, severity: "coverage" },
    modules: { label: "Modules", minimum: 1, severity: "coverage" },
    pages: { label: "Pages", minimum: 1, severity: "coverage" },
  },
  loans: {
    "loan-products": { label: "Loan products", minimum: 1, severity: "blocking" },
    "loan-applications": { label: "Loan applications", minimum: 1, severity: "blocking" },
    loans: { label: "Loans", minimum: 1, severity: "coverage" },
    disbursements: { label: "Disbursements", minimum: 1, severity: "coverage" },
    repayments: { label: "Repayments", minimum: 1, severity: "coverage" },
  },
};

export function requestedPermanentSourceModules(raw: string | null | undefined): PermanentSourceSyncModule[] {
  if (!raw) return [...sourceSyncModules];
  const requested = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is PermanentSourceSyncModule => sourceSyncModules.includes(item as PermanentSourceSyncModule));
  return requested.length ? requested : [...sourceSyncModules];
}

function sourceTestDataWritesEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.CRAYS_ENABLE_SOURCE_TEST_DATA_WRITES === "true";
}

async function readSource(moduleKey: PermanentSourceSyncModule, limit: number): Promise<SourceSlice> {
  if (moduleKey === "crm") return getCrmOperationalSourceSlice({ limit });
  if (moduleKey === "erp") return getBackOfficeOperationalSourceSlice({ limit });
  if (moduleKey === "project") return getProjectOperationalSourceSlice({ limit });
  return getLendingSourceReadSlice(limit);
}

function safeModuleError(error: unknown) {
  const sourceError = safeSourceError(error);
  if (sourceError.code !== "SOURCE_UNAVAILABLE") return sourceError;
  const localError = safeLocalEngineError(error);
  if (localError.code !== "LOCAL_SOURCE_UNAVAILABLE") return localError;
  return { code: "SOURCE_UNAVAILABLE", message: "The operational source is unavailable." };
}

function sectionCounts(sections: SourceWorkbenchSection[]) {
  return Object.fromEntries(sections.map((section) => [section.key, section.count]));
}

function gapsFor(moduleKey: PermanentSourceSyncModule, counts: Record<string, number>, sourceUnavailable: boolean): SourceDataGap[] {
  return Object.entries(minimums[moduleKey]).flatMap(([sectionKey, spec]) => {
    const current = counts[sectionKey] ?? 0;
    if (current >= spec.minimum) return [];
    return [
      {
        sectionKey,
        label: spec.label,
        current,
        minimum: spec.minimum,
        severity: spec.severity,
        remediation: sourceUnavailable ? "configure_source_runtime" : current === 0 ? "seed_source_test_data" : "review_source_filters",
      },
    ];
  });
}

function ownerRoleFor(moduleKey: PermanentSourceSyncModule): RoleKey {
  return moduleKey === "erp" || moduleKey === "loans" ? "finance" : "admin";
}

async function syncModule(moduleKey: PermanentSourceSyncModule, role: RoleKey, limit: number): Promise<PermanentSourceSyncResult> {
  try {
    const source = await readSource(moduleKey, limit);
    const counts = sectionCounts(source.sections);
    const totalRows = source.sections.reduce((total, section) => total + section.rows.length, 0);
    const sourceUnavailable = source.source.connection === "unavailable";
    const gaps = gapsFor(moduleKey, counts, sourceUnavailable);

    if (sourceUnavailable) {
      return {
        moduleKey,
        sourceRecordStatus: "source_unavailable",
        sourceConnection: source.source.connection,
        sourceOwner: source.source.owner,
        generatedAt: source.generatedAt,
        sectionCounts: counts,
        totalRows,
        completenessStatus: "source_unavailable",
        gaps,
        coreSync: null,
      };
    }

    const coreSync = await persistSourceSnapshot({
      moduleKey,
      role,
      ownerRole: ownerRoleFor(moduleKey),
      sourceConnection: source.source.connection,
      generatedAt: source.generatedAt,
      sections: source.sections,
      capabilities: source.capabilities,
    });

    const completenessStatus =
      coreSync.status === "core_unavailable" ? "core_unavailable" : gaps.some((gap) => gap.severity === "blocking") ? "incomplete" : "complete";

    return {
      moduleKey,
      sourceRecordStatus: "ready",
      sourceConnection: source.source.connection,
      sourceOwner: source.source.owner,
      generatedAt: source.generatedAt,
      sectionCounts: counts,
      totalRows,
      completenessStatus,
      gaps,
      coreSync,
    };
  } catch (error) {
    const safeError = safeModuleError(error);
    const gaps = gapsFor(moduleKey, {}, true);
    return {
      moduleKey,
      sourceRecordStatus: "source_unavailable",
      sourceConnection: null,
      sourceOwner: moduleKey,
      generatedAt: null,
      sectionCounts: {},
      totalRows: 0,
      completenessStatus: "source_unavailable",
      gaps,
      coreSync: null,
      error: safeError,
    };
  }
}

export async function runPermanentSourceSync(input: {
  role: RoleKey;
  modules?: PermanentSourceSyncModule[];
  limit?: number;
}): Promise<PermanentSourceSyncRun> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const modules = input.modules?.length ? input.modules : [...sourceSyncModules];
  const limit = Math.max(1, Math.min(Number(input.limit ?? 50), 100));
  const results: PermanentSourceSyncResult[] = [];

  for (const moduleKey of modules) {
    results.push(await syncModule(moduleKey, input.role, limit));
  }

  const finished = Date.now();
  const testDataWritesEnabled = sourceTestDataWritesEnabled();
  const sourceUnavailable = results.filter((result) => result.completenessStatus === "source_unavailable").length;
  const coreUnavailable = results.filter((result) => result.completenessStatus === "core_unavailable").length;

  return {
    role: input.role,
    mode: "localhost_permanent_sync",
    requestedModules: modules,
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    results,
    summary: {
      modulesRequested: modules.length,
      sourceReady: results.filter((result) => result.sourceRecordStatus === "ready").length,
      complete: results.filter((result) => result.completenessStatus === "complete").length,
      incomplete: results.filter((result) => result.completenessStatus === "incomplete").length,
      sourceUnavailable,
      corePersisted: results.filter((result) => result.coreSync?.status === "persisted").length,
      coreUnavailable,
      missingSections: results.reduce((total, result) => total + result.gaps.length, 0),
      totalRowsRead: results.reduce((total, result) => total + result.totalRows, 0),
    },
    testDataPolicy: {
      testDataWritesEnabled,
      requiresDevRuntime: true,
      requiresExplicitSeedAction: true,
      sourceProductionWritesAllowed: false,
      note: testDataWritesEnabled
        ? "Source test-data remediation may run only against a recognized local or dev runtime."
        : "Source test-data remediation is disabled until the source test-data write flag is enabled for a local or dev runtime.",
    },
    boundaries: {
      sourceReadsEnabled: true,
      coreWritesEnabled: true,
      sourceTestDataWritesEnabled: testDataWritesEnabled,
      sourceProductionWritesEnabled: false,
      destructiveSourceApplyEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
