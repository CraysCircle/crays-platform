import pg from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";
import {
  buildBenchmarkSeed,
  buildManifestSummary,
  getMissingTables,
  getSeedBatchId,
  normalizeLimit,
  parseCliArgs,
  upsertSeedRows,
} from "./benchmark-seed-lib.mjs";

const { Pool } = pg;

loadLocalEnv();

const args = parseCliArgs();
const shouldApply = process.argv.includes("--apply");
const seedBatchId = getSeedBatchId(args);
const limit = normalizeLimit(args.get("limit"));
const seed = buildBenchmarkSeed({ seedBatchId, limit });
const connectionString = process.env.CRAYS_DATABASE_URL;
const confirmation = `APPLY_${seedBatchId}`;

const summary = {
  status: shouldApply ? "pending_apply" : "dry_run",
  mode: shouldApply ? "apply" : "dry-run",
  target: getRedactedDatabaseTarget(connectionString),
  manifest: buildManifestSummary(seed),
  liveProviderReadsEnabled: false,
  fileUploadsEnabled: false,
  externalSendingEnabled: false,
  bankSendEnabled: false,
  paymentInitiationEnabled: false,
  secretsReturned: false,
  privateKeysReturned: false,
};

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        ...summary,
        status: "ready",
        databaseConnectionOpened: false,
        nextStep: `Set CRAYS_ENABLE_BENCHMARK_SEED_WRITES=true and CONFIRM_CRAYS_BENCHMARK_SEED=${confirmation}, then rerun with --apply.`,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before importing benchmark seed data.");
  process.exit(1);
}

if (process.env.CRAYS_ENABLE_BENCHMARK_SEED_WRITES !== "true" || process.env.CONFIRM_CRAYS_BENCHMARK_SEED !== confirmation) {
  console.error(
    JSON.stringify(
      {
        ...summary,
        status: "blocked",
        required: {
          CRAYS_ENABLE_BENCHMARK_SEED_WRITES: "true",
          CONFIRM_CRAYS_BENCHMARK_SEED: confirmation,
        },
      },
      null,
      2,
    ),
  );
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
    const missingTables = await getMissingTables(client);
    if (missingTables.length) {
      console.error(
        JSON.stringify(
          {
            ...summary,
            status: "blocked",
            missingTables,
            nextStep: "Apply the missing approved persistence migrations before importing the benchmark seed.",
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    } else {
      await client.query("begin");
      const insertedRows = await upsertSeedRows(client, seed);
      await client.query("commit");

      console.log(
        JSON.stringify(
          {
            ...summary,
            status: "applied",
            insertedRows,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Benchmark seed import failed.");
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
