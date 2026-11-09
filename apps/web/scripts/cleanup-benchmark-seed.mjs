import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";
import {
  countSeedRows,
  deleteSeedRows,
  getSeedBatchId,
  parseCliArgs,
} from "./benchmark-seed-lib.mjs";

const { Pool } = pg;

loadLocalEnv();

const args = parseCliArgs();
const shouldApply = process.argv.includes("--apply");
const seedBatchId = getSeedBatchId(args);
const connectionString = process.env.CRAYS_DATABASE_URL;
const confirmation = `DELETE_${seedBatchId}`;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before cleaning benchmark seed data.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : false,
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

try {
  const client = await pool.connect();
  try {
    const beforeRows = await countSeedRows(client, seedBatchId);

    if (!shouldApply) {
      console.log(
        JSON.stringify(
          {
            status: "dry_run",
            target: getRedactedDatabaseTarget(connectionString),
            seedBatchId,
            rowsThatWouldBeDeleted: beforeRows,
            requiredForApply: {
              CRAYS_ENABLE_BENCHMARK_SEED_WRITES: "true",
              CONFIRM_CRAYS_BENCHMARK_SEED_CLEANUP: confirmation,
            },
            databaseWritesPerformed: false,
            secretsReturned: false,
            privateKeysReturned: false,
          },
          null,
          2,
        ),
      );
    } else if (
      process.env.CRAYS_ENABLE_BENCHMARK_SEED_WRITES !== "true" ||
      process.env.CONFIRM_CRAYS_BENCHMARK_SEED_CLEANUP !== confirmation
    ) {
      console.error(
        JSON.stringify(
          {
            status: "blocked",
            target: getRedactedDatabaseTarget(connectionString),
            seedBatchId,
            beforeRows,
            required: {
              CRAYS_ENABLE_BENCHMARK_SEED_WRITES: "true",
              CONFIRM_CRAYS_BENCHMARK_SEED_CLEANUP: confirmation,
            },
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    } else {
      await client.query("begin");
      const deletedRows = await deleteSeedRows(client, seedBatchId);
      await client.query("commit");
      const afterRows = await countSeedRows(client, seedBatchId);
      const cleanupReady = Object.values(afterRows).every((count) => count === "missing" || Number(count || 0) === 0);

      console.log(
        JSON.stringify(
          {
            status: cleanupReady ? "cleaned" : "residual_rows",
            target: getRedactedDatabaseTarget(connectionString),
            seedBatchId,
            beforeRows,
            deletedRows,
            afterRows,
            cleanupReady,
            secretsReturned: false,
            privateKeysReturned: false,
          },
          null,
          2,
        ),
      );

      if (!cleanupReady) process.exitCode = 1;
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Benchmark seed cleanup failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}

function shouldUseSsl(connectionStringValue) {
  if (process.env.CRAYS_DATABASE_SSL === "disable") return false;
  if (process.env.CRAYS_DATABASE_SSL === "require") return true;

  try {
    const host = new URL(connectionStringValue).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}
