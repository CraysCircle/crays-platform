"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";

type AdapterHealthModule = {
  module: "project" | "crm" | "erp" | "files" | "sync";
  label: string;
  readinessRoute: string;
  checkedRole: string;
  accessAllowed: boolean;
  accessLevel: string;
  status: string;
  schemaReady: boolean;
  coreDbConfigured: boolean;
  dataTablesReady: boolean;
  missingTables: string[];
  firstEntities: number;
  readModels: number;
  blockedWriteScopes: number;
  internalCountsReturned: boolean;
  liveSourceProbePerformed: false;
  sourceApiCalled: false;
  sourceUiEmbedded: false;
  liveSourceRecordsReturned: false;
  sourceWritesEnabled: false;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  controlActionsEnabled: false;
  operationalRisk: string;
};

type AdapterHealthPayload = {
  status: "ready" | "forbidden";
  readModel: {
    role: string;
    access: {
      allowed: boolean;
      level: string;
      reason: string;
    };
    summary: {
      moduleCount: number;
      schemaReadyModules: number;
      accessAllowedModules: number;
      scopedShellModules: number;
      modulesWithInternalCounts: number;
      totalBlockedWriteScopes: number;
      liveSourceProbePerformed: false;
      sourceApiCalled: false;
      sourceUiEmbedded: false;
      liveSourceRecordsReturned: false;
      writeActionsEnabled: false;
    };
    modules: AdapterHealthModule[];
    blockedActions: Array<{ key: string; label: string; status: "blocked" }>;
    healthPolicy: {
      readOnly: true;
      dryRunOnly: true;
      providerLogsReturned: false;
      environmentValuesReturned: false;
      secretsReturned: false;
      privateKeysReturned: false;
      sourceUiExposureEnabled: false;
      providerCallsEnabled: false;
      sourceWritesEnabled: false;
      syncWritesEnabled: false;
      destructiveReconciliationEnabled: false;
      retryExecutionEnabled: false;
      controlActionsEnabled: false;
      fileUploadEnabled: false;
      externalSendingEnabled: false;
      publicReleaseEnabled: false;
      candidateReleaseEnabled: false;
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: AdapterHealthPayload; error: null }
  | { state: "error"; data: null; error: string };

const statusTone: Record<string, string> = {
  schema_ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  contract_ready: "border-sky-700/20 bg-sky-50 text-sky-950",
  schema_incomplete: "border-amber-700/20 bg-amber-50 text-amber-950",
  not_configured: "border-rose-700/20 bg-rose-50 text-rose-950",
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function countLabel(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

async function loadAdapterHealth(signal?: AbortSignal) {
  const response = await fetch("/api/crays/adapters/health?role=admin", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Adapter health returned HTTP ${response.status}`);
  }

  return (await response.json()) as AdapterHealthPayload;
}

export function AdapterHealthPanel() {
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loadAdapterHealth(controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Adapter health failed",
        });
      });

    return () => controller.abort();
  }, [refreshKey]);

  const data = loadState.data;
  const summary = data?.readModel.summary;
  const modules = data?.readModel.modules ?? [];
  const policy = data?.readModel.healthPolicy;
  const blockedActionLabels = useMemo(() => data?.readModel.blockedActions.map((action) => action.label).slice(0, 6) ?? [], [data]);

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Adapter health</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Module readiness</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Project, CRM, ERP, Files and Sync readiness in one read-only view.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Schema ready", loadState.state === "loading" ? "..." : `${summary?.schemaReadyModules ?? 0} / ${summary?.moduleCount ?? 0}`],
          ["Accessible", loadState.state === "loading" ? "..." : countLabel(summary?.accessAllowedModules ?? 0)],
          ["Internal counts", loadState.state === "loading" ? "..." : countLabel(summary?.modulesWithInternalCounts ?? 0)],
          ["Blocked scopes", loadState.state === "loading" ? "..." : countLabel(summary?.totalBlockedWriteScopes ?? 0)],
          ["Write actions", summary?.writeActionsEnabled ? "Enabled" : loadState.state === "loading" ? "..." : "Disabled"],
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
            <h2 className="font-semibold">Modules</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {loadState.state === "loading"
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-5 py-4">
                    <div className="h-4 w-44 rounded bg-[var(--surface-strong)]" />
                    <div className="mt-3 h-3 w-80 max-w-full rounded bg-[var(--surface-strong)]" />
                  </div>
                ))
              : modules.map((module) => (
                  <div key={module.module} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_190px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{module.label}</strong>
                        <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${statusTone[module.status] ?? statusTone.not_configured}`}>
                          {labelize(module.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                        {module.readModels} read models, {module.firstEntities} first entities, {module.blockedWriteScopes} blocked write scopes.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          module.coreDbConfigured ? "Core DB ready" : "Core DB not configured",
                          module.dataTablesReady ? "Tables ready" : "Tables incomplete",
                          module.internalCountsReturned ? "Counts visible" : "Counts hidden",
                        ].map((item) => (
                          <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[8px] bg-white p-3 text-sm">
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Checked as</p>
                      <strong className="mt-1 block">{labelize(module.checkedRole)}</strong>
                      <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">Risk</p>
                      <span className="mt-1 block text-[var(--ink-muted)]">{labelize(module.operationalRisk)}</span>
                    </div>
                  </div>
                ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Safety policy</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["Read only", policy?.readOnly ? "true" : "..."],
                ["Dry-run only", policy?.dryRunOnly ? "true" : "..."],
                ["Provider logs", policy?.providerLogsReturned ? "returned" : loadState.state === "loading" ? "..." : "hidden"],
                ["Environment values", policy?.environmentValuesReturned ? "returned" : loadState.state === "loading" ? "..." : "hidden"],
                ["Secrets", policy?.secretsReturned ? "returned" : loadState.state === "loading" ? "..." : "hidden"],
                ["Private keys", policy?.privateKeysReturned ? "returned" : loadState.state === "loading" ? "..." : "hidden"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Blocked actions</h2>
            </div>
            <div className="mt-4 space-y-3">
              {blockedActionLabels.length
                ? blockedActionLabels.map((item) => (
                    <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm leading-6">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <span>{item}</span>
                    </div>
                  ))
                : Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 rounded-[8px] bg-white" />)}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
