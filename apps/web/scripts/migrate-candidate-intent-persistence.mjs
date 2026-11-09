import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const migrationId = "0004_candidate_intent_persistence";
const confirmation = `APPLY_${migrationId}`;
const shouldApply = process.argv.includes("--apply");
const dryRun = !shouldApply;
const connectionString = process.env.CRAYS_DATABASE_URL;
const sqlPath = resolve(process.cwd(), "database", "migrations", `${migrationId}.sql`);
const migrationSql = readFileSync(sqlPath, "utf8");

const summary = {
  migrationId,
  sqlPath,
  mode: dryRun ? "dry-run" : "apply",
  target: getRedactedDatabaseTarget(connectionString),
  statementsApprox: migrationSql.split(";").filter((statement) => statement.trim()).length,
};

if (dryRun) {
  console.log(JSON.stringify({ ...summary, note: "Dry run only. No database connection was opened." }, null, 2));
  process.exit(0);
}

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before applying migrations.");
  process.exit(1);
}

if (process.env.CONFIRM_CRAYS_DATABASE_MIGRATION !== confirmation) {
  console.error(`Refusing to apply migration. Set CONFIRM_CRAYS_DATABASE_MIGRATION=${confirmation} for this one command.`);
  process.exit(1);
}

const ssl =
  process.env.CRAYS_DATABASE_SSL === "disable"
    ? false
    : process.env.CRAYS_DATABASE_SSL === "require" || summary.target?.host !== "localhost"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : false;

const pool = new Pool({
  connectionString,
  ssl,
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

try {
  await pool.query("begin");
  await pool.query(migrationSql);
  await pool.query("commit");
  console.log(JSON.stringify({ ...summary, applied: true }, null, 2));
} catch (error) {
  await pool.query("rollback").catch(() => undefined);
  console.error("Migration failed. The transaction was rolled back.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
