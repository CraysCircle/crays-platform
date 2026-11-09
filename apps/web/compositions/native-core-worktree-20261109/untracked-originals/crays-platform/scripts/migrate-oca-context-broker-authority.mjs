import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const id = "0166_openclaw_context_broker_authority";
const apply = process.argv.includes("--apply"),
  rollback = process.argv.includes("--rollback");
if (apply && rollback) throw new Error("Choose apply or rollback.");
const url = process.env.CRAYS_DATABASE_URL;
const sql = readFileSync(
  resolve(
    process.cwd(),
    "database",
    "migrations",
    rollback ? `${id}.down.sql` : `${id}.sql`,
  ),
  "utf8",
);
const summary = {
  migrationId: id,
  mode: rollback ? "rollback" : apply ? "apply" : "dry-run",
  target: getRedactedDatabaseTarget(url),
  productionAuthorized: false,
  runtimeInstalled: false,
  providerCalls: 0,
};
if (!apply && !rollback) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}
if (!url || process.env.CRAYS_DATABASE_ENVIRONMENT === "production")
  throw new Error("Task database required.");
if (
  process.env.CONFIRM_CRAYS_DATABASE_MIGRATION !==
  `${rollback ? "ROLLBACK" : "APPLY"}_${id}`
)
  throw new Error("Explicit confirmation required.");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: url, ssl: false, max: 1 });
try {
  await pool.query(sql);
  console.log(
    JSON.stringify(
      { ...summary, applied: apply, rolledBack: rollback },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
