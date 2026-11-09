"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Layers3, PauseCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { ToolNativeDepthReadinessContract } from "@/lib/tool-native-depth-readiness-contract";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ToolNativeDepthReadinessContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadDepthReadiness(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/adapters/tool-native-depth/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Workspace depth check returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function ToolNativeDepthReadinessPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadDepthReadiness(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Depth check failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Workspace coverage</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Operational module coverage</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Coverage for CRM, Files, ERP, Analytics and Loans, followed by cross-module QA and handover.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh workspace coverage"
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
          ["Coverage", readModel ? `${readModel.completedBlocks} / ${readModel.totalBlocks}` : "..."],
          ["Modules", readModel ? readModel.modules.length.toString() : "..."],
          ["Closeout", readModel ? readModel.crossModuleCloseout.length.toString() : "..."],
          ["Writes", "0"],
          ["Next review", "Approval review"],
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
            <h2 className="font-semibold">Module deepening</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {(readModel?.modules ?? []).map((module) => (
              <div key={module.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
                <div className="min-w-0">
                  <strong className="block text-sm">{module.label}</strong>
                  <span className="mt-1 block text-sm text-[var(--ink-muted)]">{module.summary}</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {module.viewSurfaces.slice(0, 4).map((surface) => (
                      <span key={surface} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                        {surface}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">Implemented coverage</span>
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{module.areas.length} areas</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Approval boundary</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Further module expansion requires product review before any new external or write action opens.</p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Closed controls</h2>
            </div>
            <div className="mt-4 space-y-2">
              {["Source writes", "Provider calls", "Live AI calls", "Uploads", "External sending", "Production deploy"].map((item) => (
                <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
