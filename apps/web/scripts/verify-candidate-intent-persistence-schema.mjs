import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before verifying the CRAYS Candidate intent persistence schema.");
  process.exit(1);
}

const target = getRedactedDatabaseTarget(connectionString);
const ssl =
  process.env.CRAYS_DATABASE_SSL === "disable"
    ? false
    : process.env.CRAYS_DATABASE_SSL === "require" || target?.host !== "localhost"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false;

const expectedCandidateIntentTables = ["candidate_intents", "candidate_intent_events"];

const pool = new Pool({
  connectionString,
  ssl,
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

try {
  const tablesResult = await pool.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
      order by table_name
    `,
  );
  const existingTables = tablesResult.rows.map((row) => row.table_name);
  const missingTables = expectedCandidateIntentTables.filter((table) => !existingTables.includes(table));

  const rlsResult = await pool.query(
    `
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'crays_core'
        and relname = any($1::text[])
      order by relname
    `,
    [expectedCandidateIntentTables],
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

  const rlsNotEnabled = expectedCandidateIntentTables.filter((table) => !rlsByTable.get(table)?.enabled);
  const rlsNotForced = expectedCandidateIntentTables.filter((table) => !rlsByTable.get(table)?.forced);
  const ready = missingTables.length === 0 && rlsNotEnabled.length === 0 && rlsNotForced.length === 0;

  console.log(
    JSON.stringify(
      {
        target,
        expectedCandidateIntentTables: expectedCandidateIntentTables.length,
        existingTables: existingTables.length,
        missingTables,
        rlsNotEnabled,
        rlsNotForced,
        ready,
      },
      null,
      2,
    ),
  );

  if (!ready) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
