"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Layers3, PauseCircle, RefreshCw } from "lucide-react";
import type { SourceFaithfulReadinessContract } from "@/lib/source-faithful-product-contract";

type Payload = {
  status: "ready" | "forbidden";
  readModel: SourceFaithfulReadinessContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadReadiness(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/adapters/source-faithful/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Source-faithful readiness returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function SourceFaithfulReadinessPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadReadiness(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Readiness failed" });
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
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Module coverage</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Connected workspace coverage</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Module surfaces, settings parity and governed action staging through the current approval boundary.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh module coverage"
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
          ["Modules", readModel ? `${readModel.sourceFaithfulModules}` : "..."],
          ["Panels", readModel ? `${readModel.craysNativePanels}` : "..."],
          ["Write adapters", "0"],
          ["Approval", readModel ? "Review required" : "..."],
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
            <h2 className="font-semibold">Module coverage</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {(readModel?.modules ?? []).map((module) => (
              <div key={module.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_160px] lg:items-center">
                <div className="min-w-0">
                  <strong className="block text-sm">{module.label}</strong>
                  <span className="mt-1 block text-sm text-[var(--ink-muted)]">Implemented coverage</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                  <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1">{module.recordsMapped} records</span>
                  <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1">{module.viewsMapped} views</span>
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
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Further connected actions require product review before additional approvals open.</p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Closed controls</h2>
            <div className="mt-4 space-y-2">
              {["Source writes", "Provider calls", "Uploads", "External sending", "Production deploy"].map((item) => (
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
