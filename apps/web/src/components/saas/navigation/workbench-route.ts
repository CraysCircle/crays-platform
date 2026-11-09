import type { ModuleKey } from "@/lib/modules";

export const workbenchRouteKeys = [
  "view",
  "resource",
  "record",
  "tab",
  "savedView",
  "filter",
  "sort",
  "focus",
  "returnTo",
] as const;

export type WorkbenchRouteKey = (typeof workbenchRouteKeys)[number];

export type WorkbenchRouteState = {
  module: ModuleKey;
  view: string;
  resource?: string;
  record?: string;
  tab?: string;
  savedView?: string;
  filter?: string;
  sort?: string;
  focus?: string;
  returnTo?: string;
};

const valueLimits: Record<WorkbenchRouteKey, number> = {
  view: 120,
  resource: 160,
  record: 240,
  tab: 120,
  savedView: 240,
  filter: 2048,
  sort: 1024,
  focus: 240,
  returnTo: 2048,
};

const workbenchModules = new Set<ModuleKey>([
  "dashboard",
  "crm",
  "project",
  "erp",
  "files",
  "analytics",
  "loans",
  "chat",
  "operations",
  "hr",
  "learning",
  "support",
  "sites",
  "sync",
  "settings",
]);

function cleanValue(value: string | null, limit: number) {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > limit || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function isSafeWorkbenchReturnTo(value: string | null | undefined) {
  return normalizeWorkbenchReturnTo(value) !== null;
}

export function normalizeWorkbenchReturnTo(value: string | null | undefined) {
  const cleaned = cleanValue(value ?? null, valueLimits.returnTo);
  if (
    !cleaned ||
    !cleaned.startsWith("/") ||
    cleaned.startsWith("//") ||
    cleaned.includes("\\") ||
    cleaned.includes("#")
  ) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(cleaned, "https://workbench.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "https://workbench.invalid") return null;
  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  if (pathSegments.length !== 1) return null;
  const moduleKey = pathSegments[0] as ModuleKey;
  if (!workbenchModules.has(moduleKey)) return null;
  const suppliedKeys = [...parsed.searchParams.keys()];
  if (
    suppliedKeys.some(
      (key) => !workbenchRouteKeys.includes(key as WorkbenchRouteKey) || key === "returnTo",
    ) ||
    workbenchRouteKeys.some((key) => parsed.searchParams.getAll(key).length > 1)
  ) {
    return null;
  }
  const view = cleanValue(parsed.searchParams.get("view"), valueLimits.view);
  if (!view) return null;
  const params = new URLSearchParams();
  params.set("view", view);
  for (const key of workbenchRouteKeys) {
    if (key === "view" || key === "returnTo") continue;
    const next = cleanValue(parsed.searchParams.get(key), valueLimits[key]);
    if (next) params.set(key, next);
  }
  return `/${moduleKey}?${params.toString()}`;
}

export function parseWorkbenchRoute(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get" | "getAll">,
): WorkbenchRouteState | null {
  const pathSegments = pathname.split("/").filter(Boolean);
  const moduleKey = pathSegments[0] as ModuleKey | undefined;
  if (pathSegments.length !== 1) return null;
  if (workbenchRouteKeys.some((key) => searchParams.getAll(key).length > 1)) return null;
  const view = cleanValue(searchParams.get("view"), valueLimits.view);
  if (!moduleKey || !workbenchModules.has(moduleKey) || !view) return null;

  const state: WorkbenchRouteState = { module: moduleKey, view };
  for (const key of workbenchRouteKeys) {
    if (key === "view") continue;
    const value = cleanValue(searchParams.get(key), valueLimits[key]);
    if (!value) continue;
    if (key === "returnTo") {
      const returnTo = normalizeWorkbenchReturnTo(value);
      if (returnTo) state.returnTo = returnTo;
      continue;
    }
    state[key] = value;
  }
  return state;
}

export function buildWorkbenchHref(state: WorkbenchRouteState) {
  if (!workbenchModules.has(state.module)) {
    throw new Error(`Unsupported workbench module: ${state.module}`);
  }
  const view = cleanValue(state.view, valueLimits.view);
  if (!view) throw new Error("A canonical workbench route requires a valid view.");

  const params = new URLSearchParams();
  params.set("view", view);
  for (const key of workbenchRouteKeys) {
    if (key === "view") continue;
    const raw = state[key];
    const value = cleanValue(raw ?? null, valueLimits[key]);
    if (!value) continue;
    if (key === "returnTo") {
      const returnTo = normalizeWorkbenchReturnTo(value);
      if (returnTo) params.set(key, returnTo);
      continue;
    }
    params.set(key, value);
  }
  return `/${state.module}?${params.toString()}`;
}
