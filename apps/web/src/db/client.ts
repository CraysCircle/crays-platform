import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export type CoreDatabaseRuntimeState = {
  configured: boolean;
  providerHint: "managed-postgres" | "local-postgres" | "unknown";
  orm: "drizzle";
  driver: "pg";
  lazyInitialization: true;
  poolMax: number;
  ssl: "required" | "disabled";
};

let pool: Pool | null = null;
let database: NodePgDatabase<typeof schema> | null = null;

function numberFromEnv(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getProviderHint(
  connectionString: string | undefined,
): CoreDatabaseRuntimeState["providerHint"] {
  if (!connectionString) return "unknown";

  try {
    const hostname = new URL(connectionString).hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    ) {
      return "local-postgres";
    }
    return "managed-postgres";
  } catch {
    return "unknown";
  }
}

function shouldUseSsl(
  connectionString: string | undefined,
  env: Record<string, string | undefined>,
) {
  if (env.CRAYS_DATABASE_SSL === "disable") return false;
  if (env.CRAYS_DATABASE_SSL === "require") return true;
  return getProviderHint(connectionString) === "managed-postgres";
}

function supportsCustomStartupOptions(connectionString: string | undefined) {
  if (!connectionString) return false;
  try {
    return !new URL(connectionString).hostname.includes("-pooler.");
  } catch {
    return false;
  }
}

export function getCoreDatabaseRuntimeState(
  env: Record<string, string | undefined> = process.env,
): CoreDatabaseRuntimeState {
  const connectionString = env.CRAYS_DATABASE_URL;
  const ssl = shouldUseSsl(connectionString, env);

  return {
    configured: Boolean(connectionString),
    providerHint: getProviderHint(connectionString),
    orm: "drizzle",
    driver: "pg",
    lazyInitialization: true,
    poolMax: numberFromEnv(env.CRAYS_DATABASE_POOL_MAX, 8),
    ssl: ssl ? "required" : "disabled",
  };
}

function getPoolConfig(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  const connectionString = env.CRAYS_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "CRAYS_DATABASE_URL is required before opening the CRAYS core database connection.",
    );
  }

  const ssl = shouldUseSsl(connectionString, env);
  const appRole = env.CRAYS_DATABASE_APP_ROLE?.trim() || "core_service";

  return {
    connectionString,
    max: numberFromEnv(env.CRAYS_DATABASE_POOL_MAX, 8),
    idleTimeoutMillis: numberFromEnv(
      env.CRAYS_DATABASE_IDLE_TIMEOUT_MS,
      30_000,
    ),
    connectionTimeoutMillis: numberFromEnv(
      env.CRAYS_DATABASE_CONNECTION_TIMEOUT_MS,
      30_000,
    ),
    ssl: ssl
      ? {
          rejectUnauthorized:
            env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
        }
      : undefined,
    // Neon transaction-pooler endpoints reject custom PostgreSQL startup
    // parameters. Keep the exact role startup option on direct PostgreSQL
    // connections; pooled deployments must use their admitted database role
    // and repository-level authorization boundary instead.
    options:
      appRole && supportsCustomStartupOptions(connectionString)
        ? `-c crays.app_role=${appRole}`
        : undefined,
  };
}

export function getCorePgPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }
  return pool;
}

export function getCoreDb() {
  if (!database) {
    database = drizzle(getCorePgPool(), { schema });
  }
  return database;
}

export async function closeCoreDatabase() {
  if (pool) {
    await pool.end();
  }
  pool = null;
  database = null;
}
