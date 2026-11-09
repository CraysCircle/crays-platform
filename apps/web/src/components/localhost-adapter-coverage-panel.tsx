"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, Map, RefreshCw, ShieldCheck } from "lucide-react";

type CoverageStatus =
  | "live_adapter_bound"
  | "core_command_bound"
  | "core_read_model_bound"
  | "adapter_wired_runtime_missing"
  | "adapter_wired_runtime_unavailable"
  | "contract_only"
  | "gated_external_shell"
  | "needs_adapter_binding";

type CoverageSurface = {
  key: string;
  label: string;
  route: string;
  area: "dashboard" | "case" | "module" | "settings" | "portal";
  blockScope: string;
  ownerDepartment: string;
  ownerRole: string;
  consumingRoles: string[];
  externalStakeholderSlice: string;
  coreObject: string;
  moduleSurface: string;
  adapterModules: string[];
  status: CoverageStatus;
  currentProof: string;
  nextBindingStep: string;
  adapterBindings: string[];
  commandBindings: string[];
  sourceMapBindings: string[];
  closedGates: string[];
};

type CoveragePayload = {
  status: "ready" | "forbidden";
  readModel: {
    summary: {
      totalSurfaces: number;
      liveAdapterBound: number;
      coreCommandBound: number;
      coreReadModelBound: number;
      adapterWiredRuntimeMissing: number;
      adapterWiredRuntimeUnavailable: number;
      contractOnly: number;
      gatedExternalShell: number;
      needsAdapterBinding: number;
      sourceMappedModules: number;
      sourceMapsPersisted: number;
    };
    coreSync: {
      status: "ready" | "forbidden";
      schemaReady: boolean;
      integrationConnections: number;
      externalRecordMaps: number;
      syncJobs: number;
      moduleCoverage: Array<{
        moduleKey: string;
        connections: number;
        externalMaps: number;
        syncJobs: number;
      }>;
    };
    surfaces: CoverageSurface[];
    verificationPlan: Array<{
      key: string;
      label: string;
      route: string;
      expectedEvidence: string;
    }>;
    boundaries: {
      secretsReturned: false;
      privateKeysReturned: false;
      externalSendingEnabled: false;
      bankSendEnabled: false;
      paymentInitiationEnabled: false;
      publicReleaseEnabled: false;
      productionDeployEnabled: false;
      destructiveSourceApplyEnabled: false;
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: CoveragePayload; error: null }
  | { state: "error"; data: null; error: string };

const statusTone: Record<CoverageStatus, string> = {
  live_adapter_bound: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  core_command_bound: "border-violet-700/20 bg-violet-50 text-violet-950",
  core_read_model_bound: "border-sky-700/20 bg-sky-50 text-sky-950",
  adapter_wired_runtime_missing: "border-amber-700/20 bg-amber-50 text-amber-950",
  adapter_wired_runtime_unavailable: "border-orange-700/20 bg-orange-50 text-orange-950",
  contract_only: "border-slate-700/20 bg-slate-50 text-slate-950",
  gated_external_shell: "border-purple-700/20 bg-purple-50 text-purple-950",
  needs_adapter_binding: "border-rose-700/20 bg-rose-50 text-rose-950",
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function countLabel(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

async function loadCoverage(signal?: AbortSignal) {
  const response = await fetch("/api/crays/localhost/adapter-coverage/read-model?role=admin", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Localhost adapter coverage returned HTTP ${response.status}`);
  }

  return (await response.json()) as CoveragePayload;
}

export function LocalhostAdapterCoveragePanel() {
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loadCoverage(controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Localhost adapter coverage failed",
        });
      });

    return () => controller.abort();
  }, [refreshKey]);

  const data = loadState.data;
  const summary = data?.readModel.summary;
  const coreSync = data?.readModel.coreSync;
  const surfaces = data?.readModel.surfaces ?? [];
  const plan = data?.readModel.verificationPlan ?? [];
  const topGaps = surfaces
    .filter((surface) => ["adapter_wired_runtime_missing", "adapter_wired_runtime_unavailable", "needs_adapter_binding", "contract_only"].includes(surface.status))
    .slice(0, 6);

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Localhost adapter coverage</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Surface-to-adapter proof</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Checks every visible Localhost surface against Core objects, source maps, command drafts, adapter readiness and closed gates.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Surfaces", loadState.state === "loading" ? "..." : countLabel(summary?.totalSurfaces ?? 0)],
          ["Live bound", loadState.state === "loading" ? "..." : countLabel(summary?.liveAdapterBound ?? 0)],
          ["Command-bound", loadState.state === "loading" ? "..." : countLabel(summary?.coreCommandBound ?? 0)],
          ["Read-model bound", loadState.state === "loading" ? "..." : countLabel(summary?.coreReadModelBound ?? 0)],
          ["Needs binding", loadState.state === "loading" ? "..." : countLabel(summary?.needsAdapterBinding ?? 0)],
          ["Source maps", loadState.state === "loading" ? "..." : countLabel(summary?.sourceMapsPersisted ?? 0)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Surface coverage</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Every main Localhost route must be tied to an adapter, Core model, command model or gated shell.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {loadState.state === "loading"
              ? Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="px-5 py-4">
                    <div className="h-4 w-52 rounded bg-[var(--surface-strong)]" />
                    <div className="mt-3 h-3 w-96 max-w-full rounded bg-[var(--surface-strong)]" />
                  </div>
                ))
              : surfaces.map((surface) => (
                  <div key={surface.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_230px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{surface.label}</strong>
                        <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${statusTone[surface.status]}`}>
                          {labelize(surface.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{surface.currentProof}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[surface.area, surface.ownerDepartment, surface.coreObject, surface.moduleSurface].map((item) => (
                          <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)]">
                            {item}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 text-sm leading-6">
                        <span className="font-semibold">Next binding: </span>
                        <span className="text-[var(--ink-muted)]">{surface.nextBindingStep}</span>
                      </div>
                    </div>
                    <div className="rounded-[8px] bg-white p-3 text-sm">
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Route</p>
                      <a className="mt-1 block break-all font-semibold text-[var(--accent)]" href={surface.route}>
                        {surface.route}
                      </a>
                      <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">Source maps</p>
                      <div className="mt-2 space-y-1">
                        {surface.sourceMapBindings.slice(0, 4).map((binding) => (
                          <span key={binding} className="block text-xs text-[var(--ink-muted)]">
                            {binding}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Core sync proof</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["Schema", coreSync?.schemaReady ? "Ready" : loadState.state === "loading" ? "..." : "Incomplete"],
                ["Connections", loadState.state === "loading" ? "..." : countLabel(coreSync?.integrationConnections ?? 0)],
                ["Source maps", loadState.state === "loading" ? "..." : countLabel(coreSync?.externalRecordMaps ?? 0)],
                ["Sync jobs", loadState.state === "loading" ? "..." : countLabel(coreSync?.syncJobs ?? 0)],
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
              <AlertTriangle className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Top binding gaps</h2>
            </div>
            <div className="mt-4 space-y-3">
              {topGaps.length
                ? topGaps.map((surface) => (
                    <div key={surface.key} className="rounded-[8px] bg-white p-3 text-sm leading-6">
                      <strong className="block">{surface.label}</strong>
                      <span className="text-[var(--ink-muted)]">{labelize(surface.status)}</span>
                    </div>
                  ))
                : loadState.state === "loading"
                  ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 rounded-[8px] bg-white" />)
                  : null}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--green)]" />
              <h2 className="font-semibold">Verification path</h2>
            </div>
            <div className="mt-4 space-y-3">
              {plan.map((item) => (
                <a key={item.key} href={item.route} className="block rounded-[8px] bg-white p-3 text-sm leading-6 transition hover:text-[var(--accent)]">
                  <span className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span>
                      <strong className="block">{item.label}</strong>
                      <span className="text-[var(--ink-muted)]">{item.expectedEvidence}</span>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
