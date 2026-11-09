"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, ShieldCheck, Telescope } from "lucide-react";

type EvidenceModule = {
  key: "project" | "crm" | "erp" | "files";
  label: string;
  endpointReviewBlock: string;
  smokeEvidenceBlock: string;
  endpointStatus: string;
  smokeStatus: string;
  sourceEndpointConfigured: boolean;
  observedSourceApiCalled: boolean;
  observedHttpChecks: number;
  metadataOnly: boolean;
  operationalRisk: string;
};

type EvidencePayload = {
  status: "ready" | "forbidden";
  readModel: {
    summary: {
      visibleModuleCount: number;
      endpointReviewsComplete: number;
      boundedSmokesComplete: number;
      sourceRuntimeCallsObserved: number;
      metadataOnlySmokes: number;
      approvedWriteAdapters: 0;
      nextReview: "Adapter write decision";
    };
    modules: EvidenceModule[];
    writeDecision: {
      status: "not_approved";
      firstCandidate: "project";
      approvedWriteAdapters: 0;
      nextDecisionRequired: string;
    };
    boundaries: {
      sourceWritesEnabled: false;
      syncWritesEnabled: false;
      providerCallsEnabled: false;
      fileUploadEnabled: false;
      externalSendingEnabled: false;
      payloadBodiesReturned: false;
      routeRuntimeSourceCallEnabled: false;
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: EvidencePayload; error: null }
  | { state: "error"; data: null; error: string };

const toneByStatus: Record<string, string> = {
  reviewed: "border-sky-700/20 bg-sky-50 text-sky-950",
  metadata_only_reviewed: "border-amber-700/20 bg-amber-50 text-amber-950",
  passed_bounded: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  metadata_only_passed: "border-amber-700/20 bg-amber-50 text-amber-950",
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

async function loadEvidence(signal: AbortSignal) {
  const response = await fetch("/api/crays/adapters/source-smoke/evidence?role=admin", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Source smoke evidence returned HTTP ${response.status}`);
  }

  return (await response.json()) as EvidencePayload;
}

export function SourceSmokeEvidencePanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    loadEvidence(controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Source smoke evidence failed",
        });
      });

    return () => controller.abort();
  }, [refreshKey]);

  const data = loadState.data;
  const summary = data?.readModel.summary;
  const modules = data?.readModel.modules ?? [];
  const disabledPolicies = useMemo(
    () => ["Source writes", "Sync writes", "Provider calls", "Uploads", "External sending", "Payload bodies", "Runtime calls"],
    [],
  );

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Telescope className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source smoke evidence</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Bounded read-only probes</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Project, CRM, ERP and Files endpoint evidence from the approved read-only inspection window.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh source smoke evidence"
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
          ["Modules", loadState.state === "loading" ? "..." : `${summary?.visibleModuleCount ?? 0}`],
          ["Endpoint reviews", loadState.state === "loading" ? "..." : `${summary?.endpointReviewsComplete ?? 0}`],
          ["Bounded smokes", loadState.state === "loading" ? "..." : `${summary?.boundedSmokesComplete ?? 0}`],
          ["Runtime calls observed", loadState.state === "loading" ? "..." : `${summary?.sourceRuntimeCallsObserved ?? 0}`],
          ["Write adapters", loadState.state === "loading" ? "..." : `${summary?.approvedWriteAdapters ?? 0}`],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Evidence modules</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {loadState.state === "loading"
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="px-5 py-4">
                    <div className="h-4 w-48 rounded bg-[var(--surface-strong)]" />
                    <div className="mt-3 h-3 w-80 max-w-full rounded bg-[var(--surface-strong)]" />
                  </div>
                ))
              : modules.map((module) => (
                  <div key={module.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{module.label}</strong>
                        <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${toneByStatus[module.smokeStatus] ?? toneByStatus.passed_bounded}`}>
                          {labelize(module.smokeStatus)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                        {module.endpointReviewBlock} endpoint review, {module.smokeEvidenceBlock} smoke evidence, {module.observedHttpChecks} status checks.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          module.sourceEndpointConfigured ? "Endpoint configured" : "Metadata only",
                          module.observedSourceApiCalled ? "Read-only source call observed" : "No source call observed",
                          module.metadataOnly ? "Binary blocked" : "Rows hidden",
                        ].map((item) => (
                          <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--ink-muted)]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[8px] bg-white p-3 text-sm">
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Endpoint state</p>
                      <span className={`mt-2 inline-flex rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${toneByStatus[module.endpointStatus] ?? toneByStatus.reviewed}`}>
                        {labelize(module.endpointStatus)}
                      </span>
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
              <h2 className="font-semibold">Still blocked</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
              {disabledPolicies.map((item) => (
                <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-2">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Write decision</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-[8px] bg-white p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span>{data?.readModel.writeDecision.status ? labelize(data.readModel.writeDecision.status) : "..."}</span>
              </div>
              <div className="rounded-[8px] bg-white p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next review</p>
                <strong className="mt-1 block">{summary?.nextReview ?? "..."}</strong>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
