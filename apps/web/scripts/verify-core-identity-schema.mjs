import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before verifying the CRAYS core identity schema.");
  process.exit(1);
}

const target = getRedactedDatabaseTarget(connectionString);
const ssl =
  process.env.CRAYS_DATABASE_SSL === "disable"
    ? false
    : process.env.CRAYS_DATABASE_SSL === "require" || target?.host !== "localhost"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false;

const expectedTables = [
  "crays_accounts",
  "auth_identities",
  "nostr_identities",
  "nip05_handles",
  "organizations",
  "organization_memberships",
  "role_assignments",
  "nostr_challenges",
  "key_handoff_events",
  "audit_events",
];

const pool = new Pool({
  connectionString,
  ssl,
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

try {
  const result = await pool.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
      order by table_name
    `,
  );
  const existing = result.rows.map((row) => row.table_name);
  const missing = expectedTables.filter((table) => !existing.includes(table));

  console.log(
    JSON.stringify(
      {
        target,
        expectedTables: expectedTables.length,
        existingTables: existing.length,
        missing,
        ready: missing.length === 0,
      },
      null,
      2,
    ),
  );

  if (missing.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
