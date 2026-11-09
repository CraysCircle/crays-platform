"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft, CheckCircle2, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { AdapterBidirectionalPolicyReadModel } from "@/db/adapter-bidirectional-policy-read-model-repository";

type Payload = {
  status: "ready" | "forbidden";
  readModel: AdapterBidirectionalPolicyReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const stateClass = {
  source_ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  draft_ready: "border-sky-700/20 bg-sky-50 text-sky-950",
  review_required: "border-amber-700/20 bg-amber-50 text-amber-950",
  coverage_required: "border-rose-700/20 bg-rose-50 text-rose-950",
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

async function loadPolicy(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/sync/adapter-policy/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Adapter policy returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function AdapterBidirectionalPolicyPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadPolicy(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Adapter policy failed" });
      });
    return () => controller.abort();
  }, [role, refreshKey]);

  const readModel = loadState.data?.readModel ?? null;
  const items = useMemo(() => {
    if (!readModel) return [];
    const term = query.trim().toLowerCase();
    if (!term) return readModel.policyItems;
    return readModel.policyItems.filter((item) =>
      [item.label, item.ownerRole, item.state, item.preservedFunction, item.craysOrchestration, item.nextAction].join(" ").toLowerCase().includes(term),
    );
  }, [query, readModel]);

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading adapter policy
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Adapter policy unavailable</p>
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
            <ArrowRightLeft className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Adapter policy</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Safe bidirectional adapter policy</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Source reads and Core command drafts are available. Target apply, source writes, sync apply, destructive reconciliation, uploads and external sending stay closed.
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
          Refresh policy
        </button>
      </div>

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-3 xl:grid-cols-7">
        {[
          ["Modules", readModel.summary.modules],
          ["Source maps", readModel.summary.sourceMaps],
          ["Command drafts", readModel.summary.commandDrafts],
          ["Review required", readModel.summary.reviewRequired],
          ["Coverage gaps", readModel.summary.coverageRequired],
          ["Apply enabled", readModel.summary.targetApplyEnabled ? "Yes" : "No"],
          ["Queue bridge", readModel.queueBridge.applyBlockedCommands],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label as string}</p>
            <strong className="mt-2 block text-xl">{value as string | number}</strong>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Search adapter policy</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, owners or policy"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-950">
          {readModel.queueBridge.applyBlockedCommands} apply-blocked commands linked to the review queue
        </div>
      </div>

      <div className="divide-y divide-[var(--line)]">
        {items.map((item) => (
          <section key={item.moduleKey} className="grid gap-4 px-5 py-4 xl:grid-cols-[150px_minmax(0,1fr)_230px_180px] xl:items-start">
            <div>
              <strong className="block">{item.label}</strong>
              <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.ownerRole}</span>
              <span className={`mt-3 inline-flex rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[item.state]}`}>
                {labelize(item.state)}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Preserved source function</p>
                <p className="mt-2 text-sm leading-5">{item.preservedFunction}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">CRAYS orchestration</p>
                <p className="mt-2 text-sm leading-5">{item.craysOrchestration}</p>
              </div>
            </div>
            <div className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Policy</p>
              <div className="mt-2 space-y-2">
                {[
                  ["Source read", item.sourceReadEnabled],
                  ["Command draft", item.commandDraftEnabled],
                  ["Preflight", item.preflightRequired],
                  ["Target apply", item.targetApplyEnabled],
                  ["Source write", item.sourceWriteEnabled],
                  ["Sync apply", item.syncApplyEnabled],
                ].map(([label, enabled]) => (
                  <div key={label as string} className="flex items-center justify-between gap-3">
                    <span>{label as string}</span>
                    <span className={enabled ? "text-emerald-700" : "text-rose-700"}>{enabled ? "Ready" : "Closed"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-2 text-sm leading-5">{item.nextAction}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Rollback</p>
                <p className="mt-2 text-sm leading-5">{item.rollbackPolicy}</p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Idempotency and audit</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            Every future adapter write path must use module, object, action, role and version in the idempotency key, then persist preflight, rollback and gate review in Core.
          </p>
        </section>
        <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-4 text-rose-950">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Apply remains closed</h3>
          </div>
          <div className="mt-3 grid gap-2 text-xs">
            {["Target apply", "Source writes", "Sync apply", "Destructive apply", "Uploads", "External sending", "Payments", "Bank actions", "Live AI", "Production deploy"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-[7px] bg-white px-2 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{item}: closed</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
