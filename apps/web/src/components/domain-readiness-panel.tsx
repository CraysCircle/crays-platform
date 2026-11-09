"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

type SurfaceReadiness = {
  key: string;
  label: string;
  requiredTables: string[];
  missingTables: string[];
  rowCounts: Array<{ tableName: string; rowCount: number }>;
  totalRecords: number;
  queryStatus: "not_configured" | "schema_incomplete" | "ready_empty" | "ready_with_records";
  liveRecordsReturned: false;
};

type DomainReadinessPayload = {
  status: "ready" | "incomplete";
  readiness: {
    configured: boolean;
    schemaReady: boolean;
    liveRecordsReturned: false;
    surfaces: SurfaceReadiness[];
  };
  security: {
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: DomainReadinessPayload; error: null }
  | { state: "error"; data: null; error: string };

const queryStatusTone: Record<SurfaceReadiness["queryStatus"], string> = {
  not_configured: "border-rose-700/20 bg-rose-50 text-rose-950",
  schema_incomplete: "border-amber-700/20 bg-amber-50 text-amber-950",
  ready_empty: "border-sky-700/20 bg-sky-50 text-sky-950",
  ready_with_records: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
};

function statusLabel(status: SurfaceReadiness["queryStatus"]) {
  return status.replaceAll("_", " ");
}

function countLabel(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

async function loadDomainReadiness(signal?: AbortSignal) {
  const response = await fetch("/api/crays/domain/readiness", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Readiness check failed with HTTP ${response.status}`);
  }

  return (await response.json()) as DomainReadinessPayload;
}

export function DomainReadinessPanel() {
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loadDomainReadiness(controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Readiness check failed",
        });
      });

    return () => controller.abort();
  }, [refreshKey]);

  const data = loadState.data;
  const totals = useMemo(() => {
    const surfaces = data?.readiness.surfaces ?? [];
    return {
      surfaces: surfaces.length,
      records: surfaces.reduce((total, surface) => total + surface.totalRecords, 0),
      missingTables: surfaces.reduce((total, surface) => total + surface.missingTables.length, 0),
      readySurfaces: surfaces.filter((surface) => surface.queryStatus === "ready_empty" || surface.queryStatus === "ready_with_records").length,
    };
  }, [data]);

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Core domain</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Data readiness</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Schema status, domain surfaces and guarded write boundaries for prepared offers, properties, bank packages, documents and sync.
            </p>
          </div>
          <button
            type="button"
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

        {loadState.state === "error" ? (
          <div className="mt-5 flex gap-3 rounded-[8px] border border-rose-700/20 bg-rose-50 p-4 text-sm leading-6 text-rose-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadState.error}</span>
          </div>
        ) : null}
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Schema", data?.readiness.schemaReady ? "Ready" : loadState.state === "loading" ? "Checking" : "Incomplete"],
          ["Surfaces", loadState.state === "loading" ? "..." : `${totals.readySurfaces} / ${totals.surfaces}`],
          ["Records", loadState.state === "loading" ? "..." : countLabel(totals.records)],
          ["Missing tables", loadState.state === "loading" ? "..." : countLabel(totals.missingTables)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Domain surfaces</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {loadState.state === "loading"
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="px-5 py-4">
                    <div className="h-4 w-48 rounded bg-[var(--surface-strong)]" />
                    <div className="mt-3 h-3 w-72 max-w-full rounded bg-[var(--surface-strong)]" />
                  </div>
                ))
              : data?.readiness.surfaces.map((surface) => (
                  <div key={surface.key} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-sm">{surface.label}</strong>
                        <span className="mt-1 block text-sm leading-6 text-[var(--ink-muted)]">
                          {surface.requiredTables.length} tables, {countLabel(surface.totalRecords)} records
                        </span>
                      </div>
                      <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${queryStatusTone[surface.queryStatus]}`}>
                        {statusLabel(surface.queryStatus)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {surface.requiredTables.map((table) => (
                        <span key={table} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)]">
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Safety state</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["Live records returned", data?.readiness.liveRecordsReturned ? "true" : "false"],
                ["Secrets returned", data?.security.secretsReturned ? "true" : "false"],
                ["Private keys returned", data?.security.privateKeysReturned ? "true" : "false"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{loadState.state === "loading" ? "..." : value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Write boundary</h2>
            </div>
            <div className="mt-4 space-y-3">
              {["Property case intake", "Prepared offer intake"].map((item) => (
                <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{item}: guarded by dev confirmation and server flag.</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
