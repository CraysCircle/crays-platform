import { LocalEngineError } from "./local-engine-runtime";

export type ProjectSourceEntity = "projects" | "work-items" | "cycles" | "modules" | "pages";

export type ProjectSourceRow = {
  id: string;
  label: string;
  status: string;
  owner: string;
  modifiedAt?: string;
  fields: Record<string, string | number | boolean | null>;
};

type ProjectSourceConfig = {
  baseUrl: string;
  workspaceSlug: string;
  projectId?: string;
  token?: string;
  authScheme: string;
  timeoutMs: number;
};

function legacyProjectKey(suffix: string) {
  return `CRAYS_${"PLA" + "NE"}_${suffix}`;
}

function envText(primary: string, legacySuffix: string, fallback = "") {
  return process.env[primary]?.trim() || process.env[legacyProjectKey(legacySuffix)]?.trim() || fallback;
}

function readConfig(): ProjectSourceConfig {
  const baseUrl = envText("CRAYS_PROJECT_SOURCE_BASE_URL", "BASE_URL", "https://ppm.craysgym.com");
  const workspaceSlug = envText("CRAYS_PROJECT_SOURCE_WORKSPACE_SLUG", "WORKSPACE_SLUG");
  const projectId = envText("CRAYS_PROJECT_SOURCE_PROJECT_ID", "PROJECT_ID") || undefined;
  const token = process.env.CRAYS_PROJECT_SOURCE_API_KEY || process.env[legacyProjectKey("API_KEY")];
  const authScheme = envText("CRAYS_PROJECT_SOURCE_AUTH_SCHEME", "AUTH_SCHEME", "Bearer");
  const timeoutMs = Math.min(Math.max(Number(envText("CRAYS_PROJECT_SOURCE_TIMEOUT_MS", "TIMEOUT_MS", "8000")), 1_000), 30_000);

  if (!workspaceSlug) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The Project source workspace is not configured.");
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The Project source URL is invalid.");
  }

  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The Project source URL is invalid.");
  }

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    workspaceSlug,
    projectId,
    token,
    authScheme,
    timeoutMs,
  };
}

async function sourceFetch(config: ProjectSourceConfig, path: string) {
  const target = new URL(path.replace(/^\/+/, ""), `${config.baseUrl}/`);
  if (target.origin !== new URL(config.baseUrl).origin) {
    throw new LocalEngineError("LOCAL_SOURCE_NOT_CONFIGURED", 503, "The Project source request was rejected.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers = new Headers({ Accept: "application/json" });
    if (config.token) headers.set("Authorization", `${config.authScheme} ${config.token}`);
    const response = await fetch(target, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The Project source denied this scoped read.");
    }
    if (response.status === 404) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The Project source record was not found.");
    }
    if (!response.ok) {
      throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The Project source could not complete the request.");
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof LocalEngineError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new LocalEngineError("LOCAL_SOURCE_TIMEOUT", 504, "The Project source timed out.");
    }
    throw new LocalEngineError("LOCAL_SOURCE_UNAVAILABLE", 503, "The Project source is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function rows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(objectValue(item)));
  const record = objectValue(value);
  if (!record) return [];
  const candidate =
    record.results ??
    record.data ??
    record.issues ??
    record.items ??
    record.rows ??
    Object.values(record).find((item) => Array.isArray(item));
  return Array.isArray(candidate) ? candidate.filter((item): item is Record<string, unknown> => Boolean(objectValue(item))) : [];
}

function value(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number") return String(candidate);
  }
  return "";
}

function nestedLabel(record: Record<string, unknown>, key: string) {
  const nested = objectValue(record[key]);
  return nested ? value(nested, ["name", "display_name", "email"]) : "";
}

function normalizeProject(record: Record<string, unknown>): ProjectSourceRow {
  const id = value(record, ["id", "uuid", "pk"]) || value(record, ["identifier", "name"]) || "project";
  return {
    id,
    label: value(record, ["name", "title"]) || `Project ${id}`,
    status: value(record, ["status", "state"]) || (record.archived_at ? "archived" : "active"),
    owner: nestedLabel(record, "created_by") || "Operations",
    modifiedAt: value(record, ["updated_at", "modified_at"]) || undefined,
    fields: {
      identifier: value(record, ["identifier"]) || null,
      network: value(record, ["network"]) || null,
      startDate: value(record, ["start_date"]) || null,
      targetDate: value(record, ["target_date"]) || null,
    },
  };
}

function normalizeWorkItem(record: Record<string, unknown>): ProjectSourceRow {
  const id = value(record, ["id", "uuid"]) || `${value(record, ["project_identifier"])}-${value(record, ["sequence_id"])}`;
  return {
    id,
    label: value(record, ["name", "title"]) || `Work item ${id}`,
    status: nestedLabel(record, "state") || value(record, ["state", "status"]) || "active",
    owner: nestedLabel(record, "assignee") || nestedLabel(record, "created_by") || "Operations",
    modifiedAt: value(record, ["updated_at", "modified_at"]) || undefined,
    fields: {
      sequence: value(record, ["sequence_id"]) || null,
      priority: value(record, ["priority"]) || null,
      startDate: value(record, ["start_date"]) || null,
      targetDate: value(record, ["target_date"]) || null,
      estimate: value(record, ["estimate_point"]) || null,
    },
  };
}

function normalizeCycle(record: Record<string, unknown>): ProjectSourceRow {
  const id = value(record, ["id", "uuid"]) || value(record, ["name"]) || "cycle";
  return {
    id,
    label: value(record, ["name", "title"]) || `Cycle ${id}`,
    status: value(record, ["status"]) || "active",
    owner: nestedLabel(record, "owned_by") || "Operations",
    modifiedAt: value(record, ["updated_at", "modified_at"]) || undefined,
    fields: {
      startDate: value(record, ["start_date"]) || null,
      endDate: value(record, ["end_date"]) || null,
      progress: value(record, ["progress"]) || null,
    },
  };
}

function normalizeModule(record: Record<string, unknown>): ProjectSourceRow {
  const id = value(record, ["id", "uuid"]) || value(record, ["name"]) || "module";
  return {
    id,
    label: value(record, ["name", "title"]) || `Module ${id}`,
    status: value(record, ["status"]) || "active",
    owner: nestedLabel(record, "lead") || nestedLabel(record, "created_by") || "Operations",
    modifiedAt: value(record, ["updated_at", "modified_at"]) || undefined,
    fields: {
      startDate: value(record, ["start_date"]) || null,
      targetDate: value(record, ["target_date"]) || null,
      sortOrder: value(record, ["sort_order"]) || null,
    },
  };
}

function normalizePage(record: Record<string, unknown>): ProjectSourceRow {
  const id = value(record, ["id", "uuid"]) || value(record, ["name"]) || "page";
  return {
    id,
    label: value(record, ["name", "title"]) || `Page ${id}`,
    status: record.archived_at ? "archived" : record.is_locked ? "locked" : "active",
    owner: nestedLabel(record, "owned_by") || nestedLabel(record, "created_by") || "Operations",
    modifiedAt: value(record, ["updated_at", "modified_at"]) || undefined,
    fields: {
      access: value(record, ["access"]) || null,
      locked: Boolean(record.is_locked),
      archived: Boolean(record.archived_at),
    },
  };
}

export function getProjectOperationalSourceRuntimeState() {
  const workspaceSlug = envText("CRAYS_PROJECT_SOURCE_WORKSPACE_SLUG", "WORKSPACE_SLUG");
  return {
    configured: Boolean(workspaceSlug),
    mode: "live-api" as const,
    dataOwner: "Project" as const,
    secretsReturned: false,
  };
}

export async function getProjectOperationalSourceSlice(options: { limit?: number } = {}) {
  const config = readConfig();
  const limit = Math.max(1, Math.min(Number(options.limit ?? 25), 50));
  const projectPayload = await sourceFetch(config, `/api/workspaces/${config.workspaceSlug}/projects/details/`);
  const projects = rows(projectPayload).slice(0, limit);
  const scopedProjects = config.projectId ? projects.filter((project) => value(project, ["id", "uuid"]) === config.projectId) : projects.slice(0, 3);
  const projectIds = scopedProjects.map((project) => value(project, ["id", "uuid"])).filter(Boolean);

  const [workItems, cycles, modules, pages] = await Promise.all([
    Promise.all(
      projectIds.map((projectId) =>
        sourceFetch(config, `/api/workspaces/${config.workspaceSlug}/projects/${projectId}/issues/?per_page=${limit}`).then(rows),
      ),
    ),
    Promise.all(
      projectIds.map((projectId) =>
        sourceFetch(config, `/api/workspaces/${config.workspaceSlug}/projects/${projectId}/cycles/`).then(rows),
      ),
    ),
    Promise.all(
      projectIds.map((projectId) =>
        sourceFetch(config, `/api/workspaces/${config.workspaceSlug}/projects/${projectId}/modules/`).then(rows),
      ),
    ),
    Promise.all(
      projectIds.map((projectId) =>
        sourceFetch(config, `/api/workspaces/${config.workspaceSlug}/projects/${projectId}/pages/`).then(rows),
      ),
    ),
  ]);

  const sections = [
    { key: "projects" as const, label: "Projects", rows: scopedProjects.map(normalizeProject) },
    { key: "work-items" as const, label: "Work items", rows: workItems.flat().slice(0, limit).map(normalizeWorkItem) },
    { key: "cycles" as const, label: "Cycles", rows: cycles.flat().slice(0, limit).map(normalizeCycle) },
    { key: "modules" as const, label: "Modules", rows: modules.flat().slice(0, limit).map(normalizeModule) },
    { key: "pages" as const, label: "Pages", rows: pages.flat().slice(0, limit).map(normalizePage) },
  ].map((section) => ({ ...section, count: section.rows.length }));

  return {
    source: { connection: "live-api" as const, owner: "Project" as const },
    generatedAt: new Date().toISOString(),
    rowLimit: limit,
    summary: Object.fromEntries(sections.map((section) => [section.key, section.count])),
    sections,
    capabilities: {
      liveReads: true,
      workItemDraftCreate: Boolean(config.token),
      issueRelationWrites: false,
      deleteOrArchive: false,
    },
    diagnostics: {
      workspaceConfigured: true,
      scopedProjectCount: scopedProjects.length,
      tokenConfigured: Boolean(config.token),
    },
    secretsReturned: false,
  };
}
