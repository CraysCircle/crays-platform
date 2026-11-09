import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

export const expectedCoreCommandPersistenceTables = [
  "core_command_requests",
  "core_command_previews",
  "core_command_events",
  "core_command_apply_gate_reviews",
] as const;

export type CoreCommandPersistenceReadiness = {
  configured: boolean;
  schemaVersion: "0006_core_command_persistence";
  migrationDraftReady: true;
  migrationApplied: boolean;
  expectedTables: number;
  existingTables: number;
  missingTables: string[];
  rlsNotEnabled: string[];
  rlsNotForced: string[];
  rowCounts: Array<{ tableName: string; rowCount: number }>;
  queryStatus: "not_configured" | "draft_ready" | "schema_incomplete" | "schema_ready";
  persistedCommandStoreEnabled: boolean;
  commandDraftWritesEnabled: false;
  commandDryRunWritesEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  uploadsEnabled: false;
  externalSendingEnabled: false;
  financeActionsEnabled: false;
  bankActionsEnabled: false;
  releaseActionsEnabled: false;
  liveCommandRecordsReturned: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

async function getExistingCoreCommandTables() {
  const pool = getCorePgPool();
  const existingResult = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedCoreCommandPersistenceTables],
  );

  return new Set(existingResult.rows.map((row) => row.table_name));
}

async function countRows(tableNames: readonly string[]) {
  const pool = getCorePgPool();
  const rowCounts: Array<{ tableName: string; rowCount: number }> = [];

  for (const tableName of tableNames) {
    const countResult = await pool.query<{ row_count: string }>(`select count(*)::text as row_count from crays_core.${tableName}`);
    rowCounts.push({ tableName, rowCount: Number(countResult.rows[0]?.row_count ?? 0) });
  }

  return rowCounts;
}

export async function getCoreCommandPersistenceReadiness(): Promise<CoreCommandPersistenceReadiness> {
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured) {
    return {
      configured: false,
      schemaVersion: "0006_core_command_persistence",
      migrationDraftReady: true,
      migrationApplied: false,
      expectedTables: expectedCoreCommandPersistenceTables.length,
      existingTables: 0,
      missingTables: [...expectedCoreCommandPersistenceTables],
      rlsNotEnabled: [...expectedCoreCommandPersistenceTables],
      rlsNotForced: [...expectedCoreCommandPersistenceTables],
      rowCounts: [],
      queryStatus: "not_configured",
      persistedCommandStoreEnabled: false,
      commandDraftWritesEnabled: false,
      commandDryRunWritesEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      releaseActionsEnabled: false,
      liveCommandRecordsReturned: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const pool = getCorePgPool();
  const existing = await getExistingCoreCommandTables();
  const missingTables = expectedCoreCommandPersistenceTables.filter((tableName) => !existing.has(tableName));
  const existingTables = expectedCoreCommandPersistenceTables.filter((tableName) => existing.has(tableName));

  const rlsResult = await pool.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'crays_core'
        and relname = any($1::text[])
      order by relname
    `,
    [expectedCoreCommandPersistenceTables],
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

  const rlsNotEnabled = expectedCoreCommandPersistenceTables.filter((tableName) => !rlsByTable.get(tableName)?.enabled);
  const rlsNotForced = expectedCoreCommandPersistenceTables.filter((tableName) => !rlsByTable.get(tableName)?.forced);
  const migrationApplied = missingTables.length === 0 && rlsNotEnabled.length === 0 && rlsNotForced.length === 0;
  const rowCounts = existingTables.length > 0 ? await countRows(existingTables) : [];

  return {
    configured: true,
    schemaVersion: "0006_core_command_persistence",
    migrationDraftReady: true,
    migrationApplied,
    expectedTables: expectedCoreCommandPersistenceTables.length,
    existingTables: existing.size,
    missingTables,
    rlsNotEnabled,
    rlsNotForced,
    rowCounts,
    queryStatus: migrationApplied ? "schema_ready" : existing.size === 0 ? "draft_ready" : "schema_incomplete",
    persistedCommandStoreEnabled: migrationApplied,
    commandDraftWritesEnabled: false,
    commandDryRunWritesEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    releaseActionsEnabled: false,
    liveCommandRecordsReturned: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
