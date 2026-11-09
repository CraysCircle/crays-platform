import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      if (!key || process.env[key] !== undefined) continue;

      const rawValue = rawValueParts.join("=").trim();
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}

export function getRedactedDatabaseTarget(connectionString) {
  if (!connectionString) return null;

  try {
    const url = new URL(connectionString);
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return { parseable: false };
  }
}
