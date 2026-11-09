"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { roleByKey } from "@/lib/roles";
import type { WorkbenchModuleKey, WorkbenchSavedView, WorkbenchSavedViewsReadModel } from "@/lib/workbench-saved-views";

export type WorkbenchViewControlsPayload = {
  status: "schema_ready" | "not_configured" | "forbidden";
  readModel: WorkbenchSavedViewsReadModel;
};

type LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: WorkbenchViewControlsPayload; error: null }
  | { status: "error"; data: null; error: string };

async function loadViews(moduleKey: WorkbenchModuleKey, role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/workbench/views/read-model?moduleKey=${moduleKey}&role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Views returned HTTP ${response.status}`);
  return (await response.json()) as WorkbenchViewControlsPayload;
}

export function WorkbenchViewControls({
  moduleKey,
  role: roleOverride,
  initialPayload = null,
}: {
  moduleKey: WorkbenchModuleKey;
  role?: string;
  initialPayload?: WorkbenchViewControlsPayload | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roleDefinition = roleByKey(roleOverride ?? searchParams.get("role"));
  const role = roleDefinition.key;
  const clientRoleAllowed = roleDefinition.mode === "workbench";
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<LoadState>(() =>
    initialPayload ? { status: "ready", data: initialPayload, error: null } : { status: "loading", data: null, error: null },
  );

  useEffect(() => {
    if (!clientRoleAllowed) return;
    if (initialPayload && refreshKey === 0) {
      return;
    }
    const controller = new AbortController();
    loadViews(moduleKey, role, controller.signal)
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Views are unavailable." });
      });
    return () => controller.abort();
  }, [clientRoleAllowed, initialPayload, moduleKey, refreshKey, role]);

  const resolvedState: LoadState = initialPayload && refreshKey === 0 ? { status: "ready", data: initialPayload, error: null } : state;
  const readModel = resolvedState.data?.readModel ?? null;
  const views = useMemo(() => readModel?.views ?? [], [readModel]);
  const activeView = searchParams.get("savedView") ?? readModel?.activeDefaultViewKey ?? views[0]?.key ?? "";
  const activeViewRecord = views.find((view) => view.key === activeView) ?? views[0] ?? null;
  const statuses = useMemo(() => ["all", ...Array.from(new Set(views.map((view) => view.status).filter((status) => status && status !== "all")))], [views]);

  if (!clientRoleAllowed) return null;

  function update(values: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyView(view: WorkbenchSavedView) {
    update({
      savedView: view.key,
      status: view.status,
      sort: view.sort,
      density: view.density,
      groupBy: view.groupBy,
    });
  }

  if (resolvedState.status === "loading") {
    return (
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3" aria-label="View controls">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading role views
        </div>
      </section>
    );
  }

  if (resolvedState.status === "error" || !readModel?.access.allowed || !views.length) {
    return null;
  }

  return (
    <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3" aria-label="View controls">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-w-[210px] flex-1 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[var(--ink-muted)]" />
          <span className="sr-only">Search records</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search records"
            key={searchParams.get("q") ?? "empty"}
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(event) => update({ q: event.target.value })}
          />
        </label>
        <label className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="sr-only">Saved view</span>
          <select
            className="bg-transparent outline-none"
            value={activeView}
            onChange={(event) => {
              const view = views.find((item) => item.key === event.target.value) ?? views[0];
              applyView(view);
            }}
          >
            {views.map((view) => (
              <option key={view.key} value={view.key}>
                {view.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm">
          Status
          <select className="bg-transparent font-semibold outline-none" value={searchParams.get("status") ?? "all"} onChange={(event) => update({ status: event.target.value })}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All" : status.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm">
          Sort
          <select className="bg-transparent font-semibold outline-none" value={searchParams.get("sort") ?? "updated"} onChange={(event) => update({ sort: event.target.value })}>
            <option value="updated">Recently updated</option>
            <option value="priority">Priority</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => update({ density: searchParams.get("density") === "compact" ? "comfortable" : "compact" })}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
        >
          <Columns3 className="h-4 w-4" />
          {searchParams.get("density") === "compact" ? "Comfortable" : "Compact"}
        </button>
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading", data: null, error: null });
            setRefreshKey((value) => value + 1);
          }}
          className="grid h-10 w-10 place-items-center rounded-[8px] border border-[var(--line)] bg-white text-[var(--ink-muted)]"
          aria-label="Refresh views"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--ink-muted)]">
        {activeViewRecord?.department ?? roleByKey(role).label} / {readModel.source.sourceRecordCount} source records / {readModel.source.commandDraftCount} command drafts
      </p>
    </section>
  );
}
