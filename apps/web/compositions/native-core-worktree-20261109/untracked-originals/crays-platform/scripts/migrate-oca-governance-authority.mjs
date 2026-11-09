import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();
const migrationId = "0136_openclaw_governance_authority_foundation";
const apply = process.argv.includes("--apply");
const rollback = process.argv.includes("--rollback");
if (apply && rollback) throw new Error("Choose either --apply or --rollback.");
const connectionString = process.env.CRAYS_DATABASE_URL;
const sql = readFileSync(resolve(process.cwd(), "database", "migrations", rollback ? `${migrationId}.down.sql` : `${migrationId}.sql`), "utf8");
const summary = {
  migrationId,
  mode: rollback ? "rollback" : apply ? "apply" : "dry-run",
  target: getRedactedDatabaseTarget(connectionString),
  statementCountApprox: sql.split(";").filter((value) => value.trim()).length,
  productionAuthorized: false,
  openClawRuntimeMutation: false,
  providerCalls: 0,
  secretValuesLogged: false,
};
if (!apply && !rollback) {
  console.log(JSON.stringify({ ...summary, note: "Dry run only; no database mutation." }, null, 2));
  process.exit(0);
}
if (!connectionString) throw new Error("CRAYS_DATABASE_URL is required.");
if (process.env.CRAYS_DATABASE_ENVIRONMENT === "production") throw new Error("Production migration is not authorized by OCA-002.");
const confirmation = `${rollback ? "ROLLBACK" : "APPLY"}_${migrationId}`;
if (process.env.CONFIRM_CRAYS_DATABASE_MIGRATION !== confirmation) throw new Error(`Set CONFIRM_CRAYS_DATABASE_MIGRATION=${confirmation}.`);
const ssl = process.env.CRAYS_DATABASE_SSL === "disable" ? false : { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" };
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString, ssl, max: 1 });
try {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role','core_service',true)");
    await client.query("select set_config('crays.tenant_id','migration-control',true)");
    await client.query("select set_config('crays.actor_role','programme_governance',true)");
    await client.query("select set_config('crays.actor_id','migration-control',true)");
    await client.query(sql);
    await client.query("commit");
    console.log(JSON.stringify({ ...summary, applied: apply, rolledBack: rollback }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
