"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DatabaseZap, LockKeyhole, RefreshCw, Route, ShieldCheck, TableProperties } from "lucide-react";
import type { CoreCommandPersistenceContract } from "@/lib/core-command-persistence-contract";

type Payload = {
  status: "ready" | "draft_ready" | "forbidden";
  readModel: CoreCommandPersistenceContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadCoreCommandPersistence(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/core-command-persistence/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Core command persistence returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function CoreCommandPersistencePanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadCoreCommandPersistence(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Core command persistence failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const persistence = readModel?.persistence;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Core command persistence</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Command persistence</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Product-Fit checked CRAYS Core command store and guarded command staging before any external apply gate opens.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Core command persistence"
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {loadState.state === "error" ? <p className="mt-4 text-sm text-rose-700">{loadState.error}</p> : null}
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Schema", persistence ? label(persistence.queryStatus) : "..."],
          ["Tables", persistence ? `${persistence.existingTables}/${persistence.expectedTables}` : "..."],
          ["RLS gaps", persistence ? (persistence.rlsNotEnabled.length + persistence.rlsNotForced.length).toString() : "..."],
          ["Rows returned", "0"],
          ["Tool apply", "Off"],
        ].map(([itemLabel, value]) => (
          <article key={itemLabel} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{itemLabel}</p>
            <strong className="mt-3 block text-2xl font-semibold capitalize">{value}</strong>
          </article>
        ))}
      </section>

      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Guarded command routes</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Routes stage CRAYS Core commands only; apply and external side effects stay closed.</p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {[
            ["Project work item", "/api/crays/core-command/project-work-item", "stage-project-work-item-command"],
            ["CRM activity", "/api/crays/core-command/crm-activity", "stage-crm-activity-command"],
            ["Files package", "/api/crays/core-command/files-package", "stage-files-package-command"],
            ["ERP finance", "/api/crays/core-command/erp-finance", "stage-erp-finance-command"],
            ["Loans checklist", "/api/crays/core-command/loans-checklist", "stage-loans-checklist-command"],
            ["Sync preview", "/api/crays/core-command/sync-preview", "stage-sync-preview-command"],
          ].map(([itemLabel, route, confirmation]) => (
            <div key={route} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{itemLabel}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{route}</p>
                </div>
                <span className="rounded-[7px] border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Core only</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">Confirmation: {confirmation}</p>
            </div>
          ))}
        </div>
      </article>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Product-Fit Check</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">This command store exists only when it serves the full CRAYS journey and keeps gates closed.</p>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {readModel
              ? [
                  ["Journey segment", readModel.productFit.journeySegment],
                  ["Owning roles", readModel.productFit.owningRoles.join(", ")],
                  ["Consuming roles", readModel.productFit.consumingRoles.join(", ")],
                  ["Module surfaces", readModel.productFit.moduleSurfaces.join(", ")],
                ].map(([itemLabel, value]) => (
                  <div key={itemLabel} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{itemLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{value}</p>
                  </div>
                ))
              : null}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Command tables</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(readModel?.commandStore.tables ?? []).map((table) => (
                <div key={table} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium">
                  {table}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Preserved functions</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(readModel?.productFit.preservedFunctions ?? []).map((item) => (
                <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              <h2 className="font-semibold">Closed gates</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              {(readModel?.productFit.closedGates ?? []).map((item) => (
                <div key={item} className="rounded-[8px] bg-white px-3 py-2">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
