"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, LockKeyhole, RefreshCw, Search, ShieldCheck, Undo2 } from "lucide-react";
import type { ResilienceRecoveryLane, ResilienceRecoveryReadModel } from "@/db/resilience-recovery-read-model-repository";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ResilienceRecoveryReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const stateClass = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  attention: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

async function loadRecovery(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/resilience/recovery/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Recovery review returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matchesLane(lane: ResilienceRecoveryLane, term: string) {
  if (!term) return true;
  return [lane.label, lane.ownerRole, lane.state, lane.current, lane.recoveryPolicy, lane.nextAction, ...lane.evidence.flatMap((item) => [item.label, item.source, String(item.value)])]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export function ResilienceRecoveryPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadRecovery(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Recovery review unavailable" });
        }
      });
    return () => controller.abort();
  }, [role, refreshKey]);

  const readModel = loadState.data?.readModel ?? null;
  const visibleLanes = useMemo(() => {
    if (!readModel) return [];
    const term = query.trim().toLowerCase();
    return readModel.lanes.filter((lane) => matchesLane(lane, term));
  }, [query, readModel]);

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading recovery review
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="font-semibold">Recovery review unavailable</p>
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
            <Undo2 className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Recovery review</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Resilience, security and recovery</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            Cross-module recovery posture for command rollback, idempotency, source freshness, stakeholder redaction, role exposure and closed side-effect controls.
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
          Refresh review
        </button>
      </div>

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-3 xl:grid-cols-10">
        {[
          ["Lanes", readModel.summary.lanes],
          ["Ready", readModel.summary.ready],
          ["Attention", readModel.summary.attention],
          ["Blocked", readModel.summary.blocked],
          ["Commands", readModel.summary.commandDrafts],
          ["Rollback", readModel.summary.rollbackAvailable],
          ["Collisions", readModel.summary.idempotencyCollisions],
          ["Source maps", readModel.summary.sourceMaps],
          ["Redactions", readModel.summary.redactions],
          ["Open gates", readModel.summary.openSideEffectGates],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label as string}</p>
            <strong className="mt-2 block text-xl">{value as number}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <label className="relative block">
            <span className="sr-only">Search recovery review</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lanes, evidence, recovery policy or owner"
              className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <div className="space-y-3">
            {visibleLanes.map((lane) => (
              <section key={lane.laneKey} className="rounded-[8px] border border-[var(--line)] bg-white">
                <div className="grid gap-4 border-b border-[var(--line)] p-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[lane.state]}`}>
                        {labelize(lane.state)}
                      </span>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{lane.ownerRole}</span>
                    </div>
                    <h3 className="mt-3 font-semibold">{lane.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{lane.current}</p>
                  </div>
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                    <p className="mt-2 text-sm leading-5">{lane.nextAction}</p>
                  </div>
                </div>
                <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="grid gap-2 md:grid-cols-2">
                    {lane.evidence.map((item) => (
                      <div key={`${lane.laneKey}-${item.label}`} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.label}</p>
                            <strong className="mt-2 block text-lg">{item.value}</strong>
                            <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.source}</p>
                          </div>
                          <span className={`rounded-[7px] border px-2 py-1 text-[10px] font-semibold uppercase ${stateClass[item.status]}`}>{labelize(item.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                      <p className="text-sm font-semibold">Recovery policy</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{lane.recoveryPolicy}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Exposure review</h3>
            </div>
            <div className="mt-3 space-y-3">
              {readModel.exposureReview.map((item) => (
                <div key={item.surface} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{item.surface}</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[10px] font-semibold uppercase ${stateClass[item.state]}`}>{labelize(item.state)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.audience}</p>
                  <p className="mt-3 text-xs leading-5">
                    <span className="font-semibold">Visible:</span> {item.visible}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                    <span className="font-semibold">Hidden:</span> {item.hidden}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Process backbone</h3>
            </div>
            <div className="mt-3 space-y-2">
              {readModel.processBackbone.map((item) => (
                <div key={item.suite} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{item.suite}</strong>
                    <span className="text-xs text-[var(--ink-muted)]">{item.sourceRecords} records</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{item.nextAction}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="text-sm font-semibold">No side-effect gate is open</h3>
            </div>
            <p className="mt-2 text-sm leading-6">
              Target apply, source writes, sync apply, uploads, private previews, releases, sends, payments, bank actions, finance posting, live AI and deployment are closed.
            </p>
          </section>
        </aside>
      </div>
    </article>
  );
}
