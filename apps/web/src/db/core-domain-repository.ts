import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const expectedTables = [
  "properties",
  "property_cases",
  "location_analyses",
  "evidence_packages",
  "prepared_offers",
  "deals",
  "financial_models",
  "bank_packages",
  "loan_cases",
  "document_package_links",
  "workflow_events",
  "external_record_maps",
  "integration_connections",
  "sync_jobs",
];

export type CoreDomainRepositoryHealth = {
  configured: boolean;
  schema: "crays_core";
  expectedTables: number;
  existingTables: number;
  missingTables: string[];
  rlsNotEnabled: string[];
  rlsNotForced: string[];
  rowCounts: Array<{ tableName: string; rowCount: number }>;
};

export type CoreDomainSurfaceKey =
  | "prepared-offers"
  | "properties"
  | "location-evidence"
  | "bank-packages"
  | "documents"
  | "workflow-events"
  | "integration-sync";

export type CoreDomainSurfaceReadiness = {
  key: CoreDomainSurfaceKey;
  label: string;
  requiredTables: string[];
  missingTables: string[];
  rowCounts: Array<{ tableName: string; rowCount: number }>;
  totalRecords: number;
  queryStatus: "not_configured" | "schema_incomplete" | "ready_empty" | "ready_with_records";
  liveRecordsReturned: false;
  nextAction: string;
};

export type CoreDomainReadiness = {
  configured: boolean;
  schemaReady: boolean;
  liveRecordsReturned: false;
  surfaces: CoreDomainSurfaceReadiness[];
};

type CoreDomainSurfaceDefinition = Pick<CoreDomainSurfaceReadiness, "key" | "label" | "requiredTables" | "nextAction"> & {
  recordTables: string[];
};

const surfaceDefinitions: CoreDomainSurfaceDefinition[] = [
  {
    key: "prepared-offers",
    label: "Prepared offers",
    requiredTables: ["prepared_offers", "deals", "evidence_packages", "document_package_links"],
    recordTables: ["prepared_offers", "deals"],
    nextAction: "Create reviewed prepared-offer records through CRAYS workflows before public UI consumes live rows.",
  },
  {
    key: "properties",
    label: "Properties and property cases",
    requiredTables: ["properties", "property_cases", "location_analyses", "workflow_events"],
    recordTables: ["properties", "property_cases"],
    nextAction: "Create property intake and review workflows before Real Estate Partner surfaces consume live rows.",
  },
  {
    key: "location-evidence",
    label: "Location evidence",
    requiredTables: ["location_analyses", "evidence_packages", "workflow_events"],
    recordTables: ["location_analyses", "evidence_packages"],
    nextAction: "Connect server-side location intelligence adapter only after provider and release rules are approved.",
  },
  {
    key: "bank-packages",
    label: "Bank packages and loan cases",
    requiredTables: ["bank_packages", "loan_cases", "financial_models", "document_package_links"],
    recordTables: ["bank_packages", "loan_cases", "financial_models"],
    nextAction: "Create bank packages only after KYC, equity check and CRAYS deal readiness gates exist.",
  },
  {
    key: "documents",
    label: "Document packages",
    requiredTables: ["document_package_links", "evidence_packages", "workflow_events"],
    recordTables: ["document_package_links", "evidence_packages"],
    nextAction: "Add document metadata persistence before file uploads or previews.",
  },
  {
    key: "workflow-events",
    label: "Workflow events",
    requiredTables: ["workflow_events"],
    recordTables: ["workflow_events"],
    nextAction: "Write workflow events from controlled CRAYS actions before dashboards show live KPIs.",
  },
  {
    key: "integration-sync",
    label: "Integration sync",
    requiredTables: ["external_record_maps", "integration_connections", "sync_jobs"],
    recordTables: ["external_record_maps", "integration_connections", "sync_jobs"],
    nextAction: "Create non-secret integration connection records before module adapters write sync jobs.",
  },
];

function readinessSurface(surface: CoreDomainSurfaceDefinition): Pick<CoreDomainSurfaceReadiness, "key" | "label" | "requiredTables" | "nextAction"> {
  return {
    key: surface.key,
    label: surface.label,
    requiredTables: surface.requiredTables,
    nextAction: surface.nextAction,
  };
}

async function getExistingDomainTables() {
  const pool = getCorePgPool();
  const existingResult = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedTables],
  );

  return new Set(existingResult.rows.map((row) => row.table_name));
}

async function countRows(tableNames: string[]) {
  const pool = getCorePgPool();
  const rowCounts: Array<{ tableName: string; rowCount: number }> = [];

  for (const tableName of tableNames) {
    const countResult = await pool.query<{ row_count: string }>(`select count(*)::text as row_count from crays_core.${tableName}`);
    rowCounts.push({ tableName, rowCount: Number(countResult.rows[0]?.row_count ?? 0) });
  }

  return rowCounts;
}

export async function getCoreDomainRepositoryHealth(): Promise<CoreDomainRepositoryHealth> {
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured) {
    return {
      configured: false,
      schema: "crays_core",
      expectedTables: expectedTables.length,
      existingTables: 0,
      missingTables: expectedTables,
      rlsNotEnabled: expectedTables,
      rlsNotForced: expectedTables,
      rowCounts: [],
    };
  }

  const pool = getCorePgPool();
  const existing = await getExistingDomainTables();
  const missingTables = expectedTables.filter((tableName) => !existing.has(tableName));
  const existingExpectedTables = expectedTables.filter((tableName) => existing.has(tableName));

  const rlsResult = await pool.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'crays_core'
        and relname = any($1::text[])
      order by relname
    `,
    [expectedTables],
  );
  const rlsByTable = new Map(
    rlsResult.rows.map((row) => [
      row.relname,
      {
        enabled: row.relrowsecurity === true,
        forced: row.relforcerowsecurity === true,
      },
    ]),
  );

  const rowCounts = await countRows(existingExpectedTables);

  return {
    configured: true,
    schema: "crays_core",
    expectedTables: expectedTables.length,
    existingTables: existing.size,
    missingTables,
    rlsNotEnabled: expectedTables.filter((tableName) => !rlsByTable.get(tableName)?.enabled),
    rlsNotForced: expectedTables.filter((tableName) => !rlsByTable.get(tableName)?.forced),
    rowCounts,
  };
}

export async function getCoreDomainReadiness(): Promise<CoreDomainReadiness> {
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured) {
    return {
      configured: false,
      schemaReady: false,
      liveRecordsReturned: false,
      surfaces: surfaceDefinitions.map((surface) => ({
          ...readinessSurface(surface),
          missingTables: surface.requiredTables,
          rowCounts: [],
          totalRecords: 0,
          queryStatus: "not_configured",
          liveRecordsReturned: false,
        })),
    };
  }

  const existing = await getExistingDomainTables();
  const schemaReady = expectedTables.every((tableName) => existing.has(tableName));

  const surfaces = await Promise.all(
    surfaceDefinitions.map(async (surface) => {
      const missingTables = surface.requiredTables.filter((tableName) => !existing.has(tableName));
      const rowCounts = missingTables.length === 0 ? await countRows(surface.requiredTables) : [];
      const totalRecords = rowCounts
        .filter((row) => surface.recordTables.includes(row.tableName))
        .reduce((total, row) => total + row.rowCount, 0);

      return {
        ...readinessSurface(surface),
        missingTables,
        rowCounts,
        totalRecords,
        queryStatus:
          missingTables.length > 0
            ? "schema_incomplete"
            : totalRecords > 0
              ? "ready_with_records"
              : "ready_empty",
        liveRecordsReturned: false,
      } satisfies CoreDomainSurfaceReadiness;
    }),
  );

  return {
    configured: true,
    schemaReady,
    liveRecordsReturned: false,
    surfaces,
  };
}
