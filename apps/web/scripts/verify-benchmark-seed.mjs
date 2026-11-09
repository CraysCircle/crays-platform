import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";
import {
  buildBenchmarkSeed,
  countSeedRows,
  getSeedBatchId,
  normalizeLimit,
  parseCliArgs,
} from "./benchmark-seed-lib.mjs";

const { Pool } = pg;

loadLocalEnv();

const args = parseCliArgs();
const seedBatchId = getSeedBatchId(args);
const limit = normalizeLimit(args.get("limit"));
const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before verifying benchmark seed data.");
  process.exit(1);
}

const seed = buildBenchmarkSeed({ seedBatchId, limit });
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
    const actualRows = await countSeedRows(client, seed.seedBatchId, seed.seedPrefix);
    const missingTables = Object.entries(actualRows)
      .filter(([, count]) => count === "missing")
      .map(([table]) => table);
    const mismatchedTables = Object.entries(seed.counts)
      .filter(([table, expected]) => actualRows[table] !== "missing" && Number(actualRows[table] || 0) !== expected)
      .map(([table, expected]) => ({
        table,
        expected,
        actual: actualRows[table],
      }));
    const ready = missingTables.length === 0 && mismatchedTables.length === 0;

    console.log(
      JSON.stringify(
        {
          status: ready ? "ready" : "mismatch",
          target: getRedactedDatabaseTarget(connectionString),
          seedBatchId: seed.seedBatchId,
          expectedRows: seed.counts,
          actualRows,
          missingTables,
          mismatchedTables,
          liveProviderReadsEnabled: false,
          externalSendingEnabled: false,
          bankSendEnabled: false,
          paymentInitiationEnabled: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
        null,
        2,
      ),
    );

    if (!ready) process.exitCode = 1;
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Benchmark seed verification failed.");
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
