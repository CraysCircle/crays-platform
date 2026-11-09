import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

export const expectedCandidateIntentPersistenceTables = ["candidate_intents", "candidate_intent_events"] as const;

export type CandidateIntentPersistenceReadiness = {
  configured: boolean;
  schemaVersion: "0004_candidate_intent_persistence";
  migrationDraftReady: true;
  migrationApplied: boolean;
  expectedTables: number;
  existingTables: number;
  missingTables: string[];
  rlsNotEnabled: string[];
  rlsNotForced: string[];
  queryStatus: "not_configured" | "draft_ready" | "schema_incomplete" | "schema_ready";
  liveIntentRecordsReturned: false;
  purchaseIntentWriteEnabled: false;
  financingIntentWriteEnabled: false;
  kycAmlStarted: false;
  equityCheckStarted: false;
  bankPackageCreated: false;
  externalSendingEnabled: false;
  providerCallsEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

async function getExistingCandidateIntentTables() {
  const pool = getCorePgPool();
  const existingResult = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedCandidateIntentPersistenceTables],
  );

  return new Set(existingResult.rows.map((row) => row.table_name));
}

export async function getCandidateIntentPersistenceReadiness(): Promise<CandidateIntentPersistenceReadiness> {
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured) {
    return {
      configured: false,
      schemaVersion: "0004_candidate_intent_persistence",
      migrationDraftReady: true,
      migrationApplied: false,
      expectedTables: expectedCandidateIntentPersistenceTables.length,
      existingTables: 0,
      missingTables: [...expectedCandidateIntentPersistenceTables],
      rlsNotEnabled: [...expectedCandidateIntentPersistenceTables],
      rlsNotForced: [...expectedCandidateIntentPersistenceTables],
      queryStatus: "not_configured",
      liveIntentRecordsReturned: false,
      purchaseIntentWriteEnabled: false,
      financingIntentWriteEnabled: false,
      kycAmlStarted: false,
      equityCheckStarted: false,
      bankPackageCreated: false,
      externalSendingEnabled: false,
      providerCallsEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const pool = getCorePgPool();
  const existing = await getExistingCandidateIntentTables();
  const missingTables = expectedCandidateIntentPersistenceTables.filter((tableName) => !existing.has(tableName));

  const rlsResult = await pool.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'crays_core'
        and relname = any($1::text[])
      order by relname
    `,
    [expectedCandidateIntentPersistenceTables],
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

  const rlsNotEnabled = expectedCandidateIntentPersistenceTables.filter((tableName) => !rlsByTable.get(tableName)?.enabled);
  const rlsNotForced = expectedCandidateIntentPersistenceTables.filter((tableName) => !rlsByTable.get(tableName)?.forced);
  const migrationApplied = missingTables.length === 0 && rlsNotEnabled.length === 0 && rlsNotForced.length === 0;

  return {
    configured: true,
    schemaVersion: "0004_candidate_intent_persistence",
    migrationDraftReady: true,
    migrationApplied,
    expectedTables: expectedCandidateIntentPersistenceTables.length,
    existingTables: existing.size,
    missingTables,
    rlsNotEnabled,
    rlsNotForced,
    queryStatus: migrationApplied ? "schema_ready" : existing.size === 0 ? "draft_ready" : "schema_incomplete",
    liveIntentRecordsReturned: false,
    purchaseIntentWriteEnabled: false,
    financingIntentWriteEnabled: false,
    kycAmlStarted: false,
    equityCheckStarted: false,
    bankPackageCreated: false,
    externalSendingEnabled: false,
    providerCallsEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
