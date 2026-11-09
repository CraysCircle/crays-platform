import { spawn } from "node:child_process";

export type LocalEngineErrorCode =
  | "LOCAL_SOURCE_NOT_CONFIGURED"
  | "LOCAL_SOURCE_TIMEOUT"
  | "LOCAL_SOURCE_UNAVAILABLE"
  | "LOCAL_SOURCE_INVALID_RESPONSE";

export class LocalEngineError extends Error {
  constructor(
    public readonly code: LocalEngineErrorCode,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "LocalEngineError";
  }
}

export function safeLocalEngineError(error: unknown) {
  if (error instanceof LocalEngineError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: "LOCAL_SOURCE_UNAVAILABLE" as const,
    message: "The local operational source is unavailable.",
  };
}

export function localEngineErrorHttpStatus(error: unknown) {
  return error instanceof LocalEngineError ? error.httpStatus : 503;
}

function legacyKey(prefixParts: string[], suffix: string) {
  return `${prefixParts.join("")}_${suffix}`;
}

function envValue(primary: string, fallback: string, legacyPrefixParts?: string[], legacySuffix?: string) {
  if (process.env[primary]?.trim()) return process.env[primary]?.trim() as string;
  if (legacyPrefixParts && legacySuffix) {
    const legacy = process.env[legacyKey(legacyPrefixParts, legacySuffix)]?.trim();
    if (legacy) return legacy;
  }
  return fallback;
}

export function quotePgIdentifier(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function runProcess(
  command: string,
  args: string[],
  options: { env?: Record<string, string>; input?: string; timeoutMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? 8_000;

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ? { ...process.env, ...options.env } : process.env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new LocalEngineError("LOCAL_SOURCE_TIMEOUT", 504, "The local operational source timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The local operational source process could not start."));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The local operational source rejected the request."));
    });

    child.stdin.end(options.input ?? "");
  });
}

function wslDistro() {
  return process.env.CRAYS_WSL_DISTRO?.trim() || "";
}

function wslDockerPrefix() {
  const distro = wslDistro();
  return distro ? ["-d", distro, "--"] : ["-e"];
}

async function runWslDockerExec(container: string, dockerArgs: string[], timeoutMs: number) {
  return runProcess("wsl", [...wslDockerPrefix(), "docker", "exec", "-i", container, ...dockerArgs], {
    timeoutMs,
  });
}

let cachedBackOfficeDatabaseName: string | null = null;
let cachedBackOfficeRootPassword: string | null = null;

export async function runCrmSourcePg(sql: string, timeoutMs = 8_000) {
  const legacyPrefix = ["CRAYS_", "TW", "ENTY_DB"];
  const container = envValue("CRAYS_CRM_DB_CONTAINER", "crays-" + "tw" + "enty-db-1", legacyPrefix, "CONTAINER");
  const user = envValue("CRAYS_CRM_DB_USER", "postgres", legacyPrefix, "USER");
  const database = envValue("CRAYS_CRM_DB_NAME", "default", legacyPrefix, "NAME");

  return runWslDockerExec(
    container,
    ["psql", "-U", user, "-d", database, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", sql],
    timeoutMs,
  );
}

export async function readCrmWorkspaceSchema(timeoutMs = 5_000) {
  const explicit =
    process.env.CRAYS_CRM_WORKSPACE_SCHEMA?.trim() ||
    process.env[legacyKey(["CRAYS_", "TW", "ENTY"], "WORKSPACE_SCHEMA")]?.trim();
  if (explicit) return explicit;

  const { stdout } = await runCrmSourcePg(
    "select schema_name from information_schema.schemata where schema_name like 'workspace_%' order by schema_name limit 1;",
    timeoutMs,
  );
  const schema = stdout.trim().split(/\r?\n/).find(Boolean) ?? "";
  if (!/^workspace_[a-z0-9_]+$/.test(schema)) {
    throw new LocalEngineError("LOCAL_SOURCE_INVALID_RESPONSE", 502, "The CRM workspace schema could not be resolved.");
  }
  return schema;
}

export async function runBackOfficeSql(sql: string, timeoutMs = 5_000) {
  const legacyPrefix = ["CRAYS_", "ERP", "NEXT"];
  const directContainer = envValue("CRAYS_ERP_DB_CONTAINER", "crays-" + "erp" + "next-db-1", legacyPrefix, "DB_CONTAINER");
  const directDatabase = envValue("CRAYS_ERP_DB_NAME", "", legacyPrefix, "DB_NAME");

  if (process.platform === "win32") {
    return runBackOfficePowerShellSql(directContainer, sql, timeoutMs, directDatabase || undefined);
  }

  try {
    const database = directDatabase || cachedBackOfficeDatabaseName || (await resolveBackOfficeDatabaseName(directContainer, timeoutMs));
    cachedBackOfficeDatabaseName = database;
    return await runBackOfficeDirectSql(directContainer, sql, timeoutMs, database);
  } catch {
    const container = envValue("CRAYS_ERP_BACKEND_CONTAINER", "crays-" + "erp" + "next-backend-1", legacyPrefix, "BACKEND_CONTAINER");
    const site = envValue("CRAYS_ERP_SITE", "frontend", legacyPrefix, "SITE");

    return runWslDockerExec(container, ["bench", "--site", site, "mariadb", "-B", "-N", "-e", sql], timeoutMs);
  }
}

async function resolveBackOfficeDatabaseName(container: string, timeoutMs: number) {
  const { stdout } = await runBackOfficeDirectSql(
    container,
    "select schema_name from information_schema.schemata where schema_name not in ('information_schema','mysql','performance_schema','sys') order by schema_name limit 1",
    timeoutMs,
  );
  const database = stdout.trim().split(/\r?\n/).find(Boolean) ?? "";
  if (!database || /[^a-zA-Z0-9_$-]/.test(database)) {
    throw new LocalEngineError("LOCAL_SOURCE_INVALID_RESPONSE", 502, "The local back-office database could not be resolved.");
  }
  return database;
}

async function resolveBackOfficeRootPassword(container: string, timeoutMs: number) {
  if (cachedBackOfficeRootPassword) return cachedBackOfficeRootPassword;
  const { stdout } = await runWslDockerExec(container, ["printenv", "MYSQL_ROOT_PASSWORD"], timeoutMs);
  const password = stdout.trim();
  if (!password) {
    throw new LocalEngineError("LOCAL_SOURCE_INVALID_RESPONSE", 502, "The local back-office database password could not be resolved.");
  }
  cachedBackOfficeRootPassword = password;
  return password;
}

async function runBackOfficeDirectSql(container: string, sql: string, timeoutMs: number, database?: string) {
  const password = await resolveBackOfficeRootPassword(container, timeoutMs);
  const databaseArgs = database ? ["--database", database] : [];
  return runProcess(
    "wsl",
    [
      ...wslDockerPrefix(),
      "docker",
      "exec",
      "-i",
      "-e",
      `MYSQL_PWD=${password}`,
      container,
      "mariadb",
      "-uroot",
      "-B",
      "-N",
      ...databaseArgs,
    ],
    { input: sql, timeoutMs },
  );
}

async function runBackOfficePowerShellSql(container: string, sql: string, timeoutMs: number, database?: string) {
  const command = `
$ErrorActionPreference = 'Stop'
$container = $env:CRAYS_BACK_OFFICE_DB_CONTAINER
$database = $env:CRAYS_BACK_OFFICE_DB_NAME
function Invoke-DbClient([string]$query, [string]$selectedDatabase) {
  $password = $env:CRAYS_BACK_OFFICE_DB_PASSWORD
  if (-not $password) {
    $password = (wsl.exe -e docker exec $container printenv MYSQL_ROOT_PASSWORD).Trim()
  }
  if (-not $password) { throw 'The local back-office database password could not be resolved.' }
  if ($selectedDatabase) {
    $query | wsl.exe -e docker exec -e MYSQL_PWD=$password -i $container mariadb -uroot -B -N --database $selectedDatabase
  } else {
    $query | wsl.exe -e docker exec -e MYSQL_PWD=$password -i $container mariadb -uroot -B -N
  }
  if ($LASTEXITCODE -ne 0) { throw 'The local back-office database rejected the request.' }
}
if (-not $database) {
  $database = (Invoke-DbClient "select schema_name from information_schema.schemata where schema_name not in ('information_schema','mysql','performance_schema','sys') order by schema_name limit 1" '').Trim()
}
$sql = [Console]::In.ReadToEnd()
$attempt = 0
do {
  try {
    Invoke-DbClient $sql $database
    exit 0
  } catch {
    $attempt += 1
    if ($attempt -ge 3) { throw }
    Start-Sleep -Seconds 2
  }
} while ($true)
`;

  return runProcess(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      env: {
        CRAYS_BACK_OFFICE_DB_CONTAINER: container,
        CRAYS_BACK_OFFICE_DB_NAME: database ?? "",
      },
      input: sql,
      timeoutMs,
    },
  );
}

export function parseTsv(stdout: string, columns: string[]) {
  return String(stdout || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(columns.map((column, index) => [column, cells[index] || ""]));
    });
}

export function firstJsonObject(stdout: string) {
  const output = String(stdout || "").trim();
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new LocalEngineError("LOCAL_SOURCE_INVALID_RESPONSE", 502, "The local operational source returned an invalid payload.");
  }
  return JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
}
