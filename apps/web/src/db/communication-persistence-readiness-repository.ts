import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

export const expectedCommunicationPersistenceTables = [
  "conversations",
  "conversation_participants",
  "messages",
  "communication_consents",
  "communication_events",
] as const;

export type CommunicationPersistenceReadiness = {
  configured: boolean;
  schemaVersion: "0003_communication_persistence";
  migrationDraftReady: true;
  migrationApplied: boolean;
  expectedTables: number;
  existingTables: number;
  missingTables: string[];
  rlsNotEnabled: string[];
  rlsNotForced: string[];
  queryStatus: "not_configured" | "draft_ready" | "schema_incomplete" | "schema_ready";
  liveConversationsReturned: false;
  liveMessagesReturned: false;
  externalSendingEnabled: false;
  providerConnectionsEnabled: false;
  writeRoutesEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

async function getExistingCommunicationTables() {
  const pool = getCorePgPool();
  const existingResult = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedCommunicationPersistenceTables],
  );

  return new Set(existingResult.rows.map((row) => row.table_name));
}

export async function getCommunicationPersistenceReadiness(): Promise<CommunicationPersistenceReadiness> {
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured) {
    return {
      configured: false,
      schemaVersion: "0003_communication_persistence",
      migrationDraftReady: true,
      migrationApplied: false,
      expectedTables: expectedCommunicationPersistenceTables.length,
      existingTables: 0,
      missingTables: [...expectedCommunicationPersistenceTables],
      rlsNotEnabled: [...expectedCommunicationPersistenceTables],
      rlsNotForced: [...expectedCommunicationPersistenceTables],
      queryStatus: "not_configured",
      liveConversationsReturned: false,
      liveMessagesReturned: false,
      externalSendingEnabled: false,
      providerConnectionsEnabled: false,
      writeRoutesEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const pool = getCorePgPool();
  const existing = await getExistingCommunicationTables();
  const missingTables = expectedCommunicationPersistenceTables.filter((tableName) => !existing.has(tableName));

  const rlsResult = await pool.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'crays_core'
        and relname = any($1::text[])
      order by relname
    `,
    [expectedCommunicationPersistenceTables],
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

  const rlsNotEnabled = expectedCommunicationPersistenceTables.filter((tableName) => !rlsByTable.get(tableName)?.enabled);
  const rlsNotForced = expectedCommunicationPersistenceTables.filter((tableName) => !rlsByTable.get(tableName)?.forced);
  const migrationApplied = missingTables.length === 0 && rlsNotEnabled.length === 0 && rlsNotForced.length === 0;

  return {
    configured: true,
    schemaVersion: "0003_communication_persistence",
    migrationDraftReady: true,
    migrationApplied,
    expectedTables: expectedCommunicationPersistenceTables.length,
    existingTables: existing.size,
    missingTables,
    rlsNotEnabled,
    rlsNotForced,
    queryStatus: migrationApplied ? "schema_ready" : existing.size === 0 ? "draft_ready" : "schema_incomplete",
    liveConversationsReturned: false,
    liveMessagesReturned: false,
    externalSendingEnabled: false,
    providerConnectionsEnabled: false,
    writeRoutesEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
