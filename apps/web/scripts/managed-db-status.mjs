import net from "node:net";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

function parseTarget(connectionString) {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      port: Number.parseInt(url.port || "5432", 10),
      database: url.pathname.replace(/^\//, "") || null,
      sslmode: url.searchParams.get("sslmode"),
      channelBinding: url.searchParams.get("channel_binding"),
    };
  } catch {
    return null;
  }
}

function providerHint(host) {
  if (!host) return "unknown";
  if (host.endsWith(".neon.tech")) return "neon";
  if (host.includes("supabase")) return "supabase";
  if (host === "localhost" || host === "127.0.0.1") return "local";
  return "managed-postgres";
}

function checkTcp(host, port) {
  if (!host || !port) return Promise.resolve(false);

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 2000 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

const connectionString = process.env.CRAYS_DATABASE_URL;
const target = parseTarget(connectionString);
const redactedTarget = getRedactedDatabaseTarget(connectionString);
const provider = providerHint(target?.host);
const tcpReachable = await checkTcp(target?.host, target?.port);

const sslExpected = provider !== "local";
const sslConfigured =
  process.env.CRAYS_DATABASE_SSL === "require" ||
  target?.sslmode === "require" ||
  target?.sslmode === "verify-full" ||
  (sslExpected && process.env.CRAYS_DATABASE_SSL !== "disable");

console.log(
  JSON.stringify(
    {
      configured: Boolean(connectionString),
      provider,
      target: redactedTarget,
      tcpReachable,
      sslExpected,
      sslConfigured,
      recommendedEnv: {
        CRAYS_DATABASE_SSL: provider === "local" ? "disable" : "require",
        CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED: "true",
        CRAYS_DATABASE_POOL_MAX: "5",
      },
      readyForMigration: Boolean(connectionString && sslConfigured && tcpReachable),
      nextStep: connectionString
        ? "If this is the approved disposable target, run db:migrate:core:dry-run, then the guarded apply command."
        : "Create a disposable managed Postgres project, then place its connection string in .env.local as CRAYS_DATABASE_URL.",
    },
    null,
    2,
  ),
);
