"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, DatabaseZap, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { SyncPerformanceModule, SyncPerformanceReadModel } from "@/db/sync-performance-read-model-repository";

type Payload = {
  status: "ready" | "forbidden";
  readModel: SyncPerformanceReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const freshnessClass = {
  fresh: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  aging: "border-amber-700/20 bg-amber-50 text-amber-950",
  stale: "border-rose-700/20 bg-rose-50 text-rose-950",
  missing: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

const confidenceClass = {
  high: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  medium: "border-amber-700/20 bg-amber-50 text-amber-950",
  low: "border-rose-700/20 bg-rose-50 text-rose-950",
};

async function loadSyncHealth(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/sync/performance/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Sync health returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "No sync yet";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function formatDate(value: string | null) {
  if (!value) return "No timestamp";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function matches(module: SyncPerformanceModule, query: string, filter: string) {
  if (filter !== "all" && module.localityConfidence !== filter && module.freshnessStatus !== filter) return false;
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [module.label, module.ownerRole, module.runtimeStatus, module.adapterStatus, module.expectedRuntime, module.localityReason, module.nextAction]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export function SyncHealthWorkbenchPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadSyncHealth(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Sync health failed" });
      });
    return () => controller.abort();
  }, [role, refreshKey]);

  const readModel = loadState.state === "ready" ? loadState.data.readModel : null;
  const modules = useMemo(() => (readModel ? readModel.modules.filter((module) => matches(module, query, filter)) : []), [filter, query, readModel]);
  const selected =
    modules.find((module) => module.moduleKey === selectedKey) ??
    modules.find((module) => module.moduleKey === "operations") ??
    modules.find((module) => module.moduleKey === "crm") ??
    modules[0] ??
    readModel?.modules[0] ??
    null;

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading sync health
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Sync health unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  if (!readModel) return null;

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Sync health</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Source freshness and adapter diagnostics</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Core-only first decision across source maps, sync jobs, conflicts, runtime availability and locality confidence. Secondary source detail stays deferred.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoadState({ state: "loading", data: null, error: null });
            setRefreshKey((value) => value + 1);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh health
        </button>
      </div>

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["Modules", readModel.summary.modules, "tracked"],
          ["Fresh", readModel.summary.freshModules, "current"],
          ["Aging", readModel.summary.agingModules, "watch"],
          ["Missing", readModel.summary.missingModules, "coverage gaps"],
          ["Maps", readModel.summary.sourceMaps, "persisted"],
          ["Conflicts", readModel.summary.conflicts, "review"],
          ["Missing records", readModel.summary.missingRecords, "target gap"],
          ["First decision", `${readModel.summary.firstDecisionDurationMs} ms`, "Core-only"],
        ].map(([label, value, context]) => (
          <div key={label as string} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label as string}</p>
            <strong className="mt-2 block text-xl">{value as string | number}</strong>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">{context as string}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Search sync modules</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, blockers or owners"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {["all", "high", "medium", "low", "fresh", "aging", "stale", "missing"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-[8px] border px-3 py-2 text-xs font-semibold capitalize transition ${
                filter === item ? "border-neutral-950 bg-neutral-950 !text-white" : "border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--accent)]"
              }`}
              aria-pressed={filter === item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="min-w-0 divide-y divide-[var(--line)]">
          {modules.map((module) => {
            const selectedRow = selected?.moduleKey === module.moduleKey;
            return (
              <button
                key={module.moduleKey}
                type="button"
                onClick={() => setSelectedKey(module.moduleKey)}
                className={`grid w-full gap-4 px-5 py-4 text-left transition lg:grid-cols-[180px_minmax(0,1fr)_150px_150px_140px] lg:items-center ${
                  selectedRow ? "bg-emerald-50/45" : "hover:bg-white"
                }`}
              >
                <div>
                  <strong className="block">{module.label}</strong>
                  <span className="mt-1 block text-xs text-[var(--ink-muted)]">{module.ownerRole}</span>
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-sm text-[var(--ink)]">{module.nextAction}</span>
                  <span className="mt-1 block text-xs text-[var(--ink-muted)]">{module.localityReason}</span>
                </div>
                <span className={`w-fit rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${freshnessClass[module.freshnessStatus]}`}>
                  {module.freshnessStatus}
                </span>
                <span className={`w-fit rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${confidenceClass[module.localityConfidence]}`}>
                  {module.localityConfidence}
                </span>
                <span className="text-sm text-[var(--ink-muted)]">{module.sourceMaps}/{module.minimumMaps} maps</span>
              </button>
            );
          })}
        </div>

        <aside className="space-y-4 border-t border-[var(--line)] bg-white px-5 py-4 xl:border-l xl:border-t-0">
          {selected ? (
            <>
              <div>
                <div className="flex items-center gap-2">
                  {selected.localityConfidence === "low" ? <AlertTriangle className="h-4 w-4 text-[var(--rose)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected module</p>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{selected.label}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{selected.expectedRuntime}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Last map sync", formatMinutes(selected.freshnessMinutes)],
                  ["Last success", formatDate(selected.lastSuccessfulSyncAt)],
                  ["Connection", selected.runtimeStatus],
                  ["Health", selected.connectionHealth],
                  ["Conflicts", selected.conflictMaps],
                  ["Failed jobs", selected.failedJobs],
                  ["Missing records", selected.missingRecords],
                  ["Locality confidence", selected.localityConfidence],
                  ["Freshness", selected.freshnessStatus],
                  ["Adapter", selected.adapterStatus.replaceAll("_", " ")],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label as string}</p>
                    <strong className="mt-1 block break-words text-sm">{value as string | number}</strong>
                  </div>
                ))}
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Map status</p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                  {[
                    ["Synced", selected.syncedMaps],
                    ["Pending", selected.pendingMaps],
                    ["Conflict", selected.conflictMaps],
                    ["Failed", selected.failedMaps],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-2">
                      <strong className="block">{value as number}</strong>
                      <span className="mt-1 block text-[10px] uppercase text-[var(--ink-muted)]">{label as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-rose-950">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase">Apply controls closed</p>
                </div>
                <p className="mt-2 text-xs leading-5">
                  Sync apply, destructive reconciliation, retry execution, mapping override, source writes, uploads, provider calls and external sending remain closed.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Select a module to inspect freshness, locality confidence and blocked actions.</p>
          )}
        </aside>
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Recent sync events</h3>
          </div>
          <div className="mt-3 divide-y divide-[var(--line)]">
            {readModel.recentEvents.map((event) => (
              <div key={event.eventId} className="py-3">
                <strong className="block text-sm">{event.label}</strong>
                <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                  {event.related} / {event.ownerRole} / {formatDate(event.occurredAt)}
                </span>
              </div>
            ))}
            {readModel.recentEvents.length === 0 ? <p className="py-3 text-sm text-[var(--ink-muted)]">No sync events recorded yet.</p> : null}
          </div>
        </section>
        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Diagnostics boundary</h3>
          </div>
          <div className="mt-3 space-y-2 text-xs text-[var(--ink-muted)]">
            <p>Core configured: {readModel.diagnostics.coreConfigured ? "Yes" : "No"}</p>
            <p>Sync schema ready: {readModel.diagnostics.syncSchemaReady ? "Yes" : "No"}</p>
            <p>Adapter diagnostics: {readModel.diagnostics.adapterDiagnosticsReady ? "Ready" : "Scoped"}</p>
            <p>Live source probe performed: No</p>
          </div>
        </section>
      </div>
    </article>
  );
}
