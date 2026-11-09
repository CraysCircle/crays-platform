"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { OperationalSignalCase, OperationalSignalsReadModel } from "@/db/operational-signals-read-model-repository";

type Payload = {
  status: "ready" | "forbidden";
  readModel: OperationalSignalsReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandFeedback = {
  status: "created" | "idempotent_existing" | "blocked" | "invalid" | "network_error" | "not_allowed";
  message: string;
  commandId: string | null;
  applyGate: string | null;
};

const toneClass = {
  green: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  amber: "border-amber-700/20 bg-amber-50 text-amber-950",
  rose: "border-rose-700/20 bg-rose-50 text-rose-950",
  blue: "border-sky-700/20 bg-sky-50 text-sky-950",
  ink: "border-black/10 bg-white text-[var(--foreground)]",
};

const priorityClass = {
  critical: "border-rose-700/20 bg-rose-50 text-rose-950",
  high: "border-amber-700/20 bg-amber-50 text-amber-950",
  medium: "border-sky-700/20 bg-sky-50 text-sky-950",
};

const signalReviewRoles = new Set(["admin", "crays-management", "finance", "deal-manager", "reviewer"]);

async function loadOperationalSignals(role: string, signal: AbortSignal) {
  const params = new URLSearchParams({ role, limit: "12" });
  const response = await fetch(`/api/crays/operational-signals/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Operational signals returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScore(value: number | null) {
  return value === null ? "n/a" : `${Math.round(value)}`;
}

function formatMoney(value: number | null) {
  if (value === null) return "n/a";
  if (value >= 1_000_000) return `EUR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `EUR ${Math.round(value / 1_000)}k`;
  return `EUR ${value}`;
}

function matchesSignal(signal: OperationalSignalCase, searchTerm: string, priority: string) {
  if (priority !== "all" && signal.priority !== priority) return false;
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return [signal.title, signal.market, signal.ownerRole, signal.state, signal.blocker, signal.nextAction, signal.links.primaryModuleLabel]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

async function stageSignalReview(role: string, signal: OperationalSignalCase): Promise<CommandFeedback> {
  if (!signalReviewRoles.has(role)) {
    return {
      status: "not_allowed",
      message: "This role can review signals but cannot stage Sync Preview command drafts from this surface.",
      commandId: null,
      applyGate: null,
    };
  }

  try {
    const response = await fetch("/api/crays/core-command/sync-preview", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crays-dev-confirm": "stage-sync-preview-command",
      },
      body: JSON.stringify({
        idempotencyKey: `operational-signals:${role}:${signal.preparedOfferId}:signal-review`,
        actorRole: role,
        commandType: "mapping_preview",
        action: "refresh_preview",
        title: `Review operating signal - ${signal.title}`,
        notes: `Operational Signals drafted this review for ${signal.title}. Sync apply, target apply, release and external side effects remain closed.`,
        status: "drafted",
        sourceModule: "crays-core",
        targetModule: "analytics",
        entityTypeKey: "prepared-offer",
        rollbackPlan: "No sync apply or target apply may run from this command draft.",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      status?: "created" | "idempotent_existing" | "blocked" | "invalid";
      reason?: string;
      error?: string;
      result?: {
        commandId?: string;
        commandStatus?: string;
        targetApplyStatus?: string;
        applyGate?: string;
      };
    };

    return {
      status: response.ok ? (payload.status === "idempotent_existing" ? "idempotent_existing" : "created") : (payload.status ?? "blocked"),
      message: response.ok
        ? `Signal review command draft stored, apply ${payload.result?.targetApplyStatus ?? "blocked"}.`
        : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      commandId: payload.result?.commandId ?? null,
      applyGate: payload.result?.applyGate ?? null,
    };
  } catch (error) {
    return {
      status: "network_error",
      message: error instanceof Error ? error.message : "Signal review command could not reach the local server.",
      commandId: null,
      applyGate: null,
    };
  }
}

function feedbackClass(status: CommandFeedback["status"]) {
  if (status === "created" || status === "idempotent_existing") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "not_allowed" || status === "blocked") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-rose-200 bg-rose-50 text-rose-950";
}

export function OperationalSignalsPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [priority, setPriority] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadOperationalSignals(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Operational signals failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.state === "ready" ? loadState.data.readModel : null;
  const visibleSignals = useMemo(() => {
    if (!readModel) return [];
    return readModel.signals.filter((signal) => matchesSignal(signal, searchTerm, priority));
  }, [priority, readModel, searchTerm]);
  const selectedSignal = visibleSignals.find((signal) => signal.id === selectedId) ?? visibleSignals[0] ?? readModel?.signals[0] ?? null;
  const scopedSignalView = searchTerm.trim().length > 0 || priority !== "all";
  const topSignal = scopedSignalView ? (visibleSignals[0] ?? readModel?.signals[0] ?? null) : (readModel?.signals[0] ?? null);

  async function handleStage() {
    if (!selectedSignal) return;
    setStaging(true);
    const result = await stageSignalReview(role, selectedSignal);
    setFeedback(result);
    setStaging(false);
  }

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading operational signals
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Operational signals unavailable</p>
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
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Operational signals</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">{readModel.roleFocus.title}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{readModel.roleFocus.scope}</p>
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
          Refresh signals
        </button>
      </div>

      {topSignal ? (
        <div className="grid gap-4 border-b border-[var(--line)] bg-white px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${priorityClass[topSignal.priority]}`}>
                {topSignal.priority}
              </span>
              <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Highest signal</span>
            </div>
            <h3 className="mt-2 truncate text-lg font-semibold">{topSignal.title}</h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {topSignal.blocker} {topSignal.nextAction}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={topSignal.links.caseHref}
              className="inline-flex items-center gap-2 rounded-[8px] border border-neutral-950 bg-neutral-950 px-3 py-2 text-xs font-semibold !text-white transition hover:bg-neutral-800 hover:!text-white"
            >
              Open case
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={topSignal.links.primaryModuleHref}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
            >
              Open {topSignal.links.primaryModuleLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-5">
        {readModel.kpis.map((kpi) => (
          <div key={kpi.key} className={`rounded-[8px] border p-3 ${toneClass[kpi.tone]}`}>
            <p className="text-[11px] font-semibold uppercase opacity-70">{kpi.label}</p>
            <strong className="mt-2 block text-2xl">{kpi.value}</strong>
            <span className="mt-1 block text-xs opacity-75">{kpi.context}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Search signals</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search signals"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {["all", "critical", "high", "medium"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPriority(item)}
              className={`rounded-[8px] border px-3 py-2 text-xs font-semibold capitalize transition ${
                priority === item ? "border-neutral-950 bg-neutral-950 !text-white" : "border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--accent)]"
              }`}
              aria-pressed={priority === item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-[1120px] w-full border-collapse text-sm">
            <thead className="bg-white text-left text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-5 py-3 font-semibold">Signal</th>
                <th className="px-3 py-3 font-semibold">Owner</th>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-3 py-3 font-semibold">Gate</th>
                <th className="px-3 py-3 font-semibold">KPIs</th>
                <th className="px-5 py-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleSignals.map((signal) => {
                const selected = selectedSignal?.id === signal.id;
                return (
                  <tr key={signal.id} className={selected ? "bg-emerald-50/45 align-top" : "align-top hover:bg-white"}>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => setSelectedId(signal.id)} className="block max-w-[320px] text-left">
                        <strong className="block">{signal.title}</strong>
                        <span className="mt-1 block text-xs text-[var(--ink-muted)]">{signal.market}</span>
                        <span className="mt-2 block text-xs font-semibold text-[var(--ink-muted)]">{signal.nextAction}</span>
                      </button>
                    </td>
                    <td className="px-3 py-4">{signal.ownerRole}</td>
                    <td className="px-3 py-4">
                      <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${priorityClass[signal.priority]}`}>
                        {signal.priority}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-4 text-[var(--ink-muted)]">{signal.blocker}</td>
                    <td className="px-3 py-4">
                      <div className="grid min-w-[220px] grid-cols-3 gap-2 text-xs">
                        <span>Loc {formatScore(signal.kpis.location)}</span>
                        <span>Bank {formatScore(signal.kpis.bankability)}</span>
                        <span>Open {formatScore(signal.kpis.openingReadiness)}</span>
                        <span>Docs {signal.kpis.approvedDocuments}/{signal.kpis.documents}</span>
                        <span>Cmd {signal.kpis.commandDrafts}</span>
                        <span>Evt {signal.kpis.workflowEvents}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <a href={signal.links.caseHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
                          Case
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        <a href={signal.links.primaryModuleHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
                          Open {signal.links.primaryModuleLabel}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visibleSignals.length === 0 ? (
            <p className="border-t border-[var(--line)] px-5 py-8 text-sm text-[var(--ink-muted)]">No signals match this view.</p>
          ) : null}
        </div>

        <aside className="space-y-4 border-t border-[var(--line)] bg-white px-5 py-4 xl:border-l xl:border-t-0">
          {selectedSignal ? (
            <>
              <div>
                <div className="flex items-center gap-2">
                  {selectedSignal.priority === "critical" ? <AlertTriangle className="h-4 w-4 text-[var(--rose)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected signal</p>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{selectedSignal.title}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedSignal.market}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Location", formatScore(selectedSignal.kpis.location)],
                  ["Bankability", formatScore(selectedSignal.kpis.bankability)],
                  ["Opening", formatScore(selectedSignal.kpis.openingReadiness)],
                  ["Target MRR", formatMoney(selectedSignal.kpis.targetMRR)],
                  ["Investment", formatMoney(selectedSignal.kpis.investment)],
                  ["Documents", `${selectedSignal.kpis.approvedDocuments}/${selectedSignal.kpis.documents}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                    <strong className="mt-1 block">{value}</strong>
                  </div>
                ))}
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Closed gates</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                  Sync apply, target apply, release, upload, external send, finance, bank, payment, deploy and VPS-changing work remain closed.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStage}
                disabled={staging}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-neutral-950 bg-neutral-950 px-3 py-2 text-sm font-semibold !text-white transition hover:bg-neutral-800 hover:!text-white disabled:opacity-60"
              >
                {staging ? "Staging..." : signalReviewRoles.has(role) ? "Stage signal review" : "Review access only"}
              </button>

              {feedback ? (
                <div className={`rounded-[8px] border p-3 text-sm ${feedbackClass(feedback.status)}`}>
                  <strong className="block">{feedback.commandId ? "Stored command draft" : feedback.status}</strong>
                  <p className="mt-1 text-xs leading-5">{feedback.message}</p>
                  {feedback.applyGate ? <p className="mt-1 text-xs font-semibold">Apply remains closed</p> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <a href={selectedSignal.links.caseHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
                  Open case
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a href={selectedSignal.links.primaryModuleHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
                  Open {selectedSignal.links.primaryModuleLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Select a signal to inspect the case and action context.</p>
          )}
        </aside>
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-[8px] border border-[var(--line)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
            <Clock3 className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="font-semibold">Latest events</h3>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {readModel.events.slice(0, 6).map((event) => (
              <div key={event.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_128px]">
                <div className="min-w-0">
                  <strong className="block text-sm">{event.label}</strong>
                  <span className="mt-1 block text-xs uppercase text-[var(--ink-muted)]">
                    {event.source} - {event.eventType} - {event.actorRole ?? "system"}
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase text-[var(--ink-muted)] sm:text-right">{formatTime(event.occurredAt)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="font-semibold">Backbone health</h3>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["Prepared deals", readModel.summary.preparedDeals],
              ["Command drafts", readModel.summary.commandDrafts],
              ["Workflow events", readModel.summary.workflowEvents],
              ["Document coverage", `${readModel.summary.documentApprovalCoverage}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                <strong className="mt-1 block">{value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-5">
              Events and KPIs are bounded CRAYS Core metadata. File bodies, previews, external sends, release and apply actions remain closed.
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
