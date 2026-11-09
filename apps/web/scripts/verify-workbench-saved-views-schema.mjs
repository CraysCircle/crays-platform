import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before verifying the workbench saved views schema.");
  process.exit(1);
}

const target = getRedactedDatabaseTarget(connectionString);
const ssl =
  process.env.CRAYS_DATABASE_SSL === "disable"
    ? false
    : process.env.CRAYS_DATABASE_SSL === "require" || target?.host !== "localhost"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false;

const pool = new Pool({
  connectionString,
  ssl,
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  options: "-c crays.app_role=core_service",
});

try {
  const tables = await pool.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = 'workbench_saved_views'
    `,
  );

  const rls = await pool.query(
    `
      select relrowsecurity, relforcerowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'crays_core'
        and relname = 'workbench_saved_views'
    `,
  );

  const policy = await pool.query(
    `
      select policyname
      from pg_policies
      where schemaname = 'crays_core'
        and tablename = 'workbench_saved_views'
        and policyname = 'core_service_workbench_saved_views'
    `,
  );

  const counts = await pool.query(
    `
      select
        count(*)::text as saved_views,
        count(distinct module_key)::text as modules,
        count(distinct role_key)::text as roles
      from crays_core.workbench_saved_views
    `,
  );

  const ready =
    tables.rowCount === 1 &&
    rls.rows[0]?.relrowsecurity === true &&
    rls.rows[0]?.relforcerowsecurity === true &&
    policy.rowCount === 1;

  console.log(
    JSON.stringify(
      {
        target,
        tablePresent: tables.rowCount === 1,
        rlsEnabled: rls.rows[0]?.relrowsecurity === true,
        rlsForced: rls.rows[0]?.relforcerowsecurity === true,
        policyPresent: policy.rowCount === 1,
        savedViews: Number(counts.rows[0]?.saved_views ?? 0),
        modules: Number(counts.rows[0]?.modules ?? 0),
        roles: Number(counts.rows[0]?.roles ?? 0),
        ready,
      },
      null,
      2,
    ),
  );

  if (!ready) process.exitCode = 1;
} finally {
  await pool.end();
}
