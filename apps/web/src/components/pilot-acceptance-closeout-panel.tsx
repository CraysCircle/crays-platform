"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, LockKeyhole, MapPinned, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { PilotAcceptanceCriterion, PilotAcceptanceReadModel } from "@/db/pilot-acceptance-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: PilotAcceptanceReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type AcceptanceFilter = "all" | "passed" | "attention" | "blocked";

const stateClass = {
  passed: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  attention: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

async function loadAcceptance(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-acceptance/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Pilot acceptance is not available for this role.");
  return (await response.json()) as Payload;
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matchesCriterion(item: PilotAcceptanceCriterion, term: string, filter: AcceptanceFilter) {
  if (filter !== "all" && item.state !== filter) return false;
  if (!term) return true;
  return [item.label, item.ownerRole, item.state, item.evidence, item.nextAction].join(" ").toLowerCase().includes(term);
}

function routeLabel(route: string) {
  if (route.includes("process-suites")) return "Open process suites";
  if (route.includes("pilot-acceptance")) return "Review pilot closeout";
  if (route.includes("case")) return "Open prepared deal case";
  if (route.includes("rooms")) return "Review stakeholder rooms";
  if (route.includes("signals")) return "Check operating signals";
  if (route.includes("sync")) return "Check source health";
  if (route.includes("analytics")) return "Open Location Intelligence workflow";
  if (route.includes("actions")) return "Review command queue";
  return "Open connected workspace";
}

function workflowForCriterion(item: PilotAcceptanceCriterion, role: string) {
  const actionsHref = `/dashboard?role=${role}&view=actions`;
  const processHref = `/dashboard?role=${role}&view=process-suites`;
  const roomsHref = `/dashboard?role=${role}&view=rooms`;
  const signalsHref = `/dashboard?role=${role}&view=signals`;
  const sourceHealthHref = role === "admin" || role === "crays-management" ? `/sync?role=${role}` : signalsHref;
  const analyticsHref = `/analytics?role=${role}&view=portfolio`;

  if (item.key === "process-suites") return { href: processHref, label: "Open process suite workflow" };
  if (item.key === "command-recovery" || item.key === "closed-gates") return { href: actionsHref, label: "Review command queue" };
  if (item.key === "location-intelligence") return { href: analyticsHref, label: "Open Location Intelligence workflow" };
  if (item.key === "stakeholder-preflight") return { href: roomsHref, label: "Review stakeholder room preflight" };
  if (item.key === "golden-source-data" || item.key === "source-conflict-recovery" || item.key === "adapter-truth") {
    return { href: sourceHealthHref, label: role === "admin" || role === "crays-management" ? "Check source health" : "Check operating signals" };
  }

  return { href: `/dashboard?role=${role}&view=case`, label: "Open prepared deal case" };
}

function blockerWorkflow(blocker: string, role: string) {
  const lower = blocker.toLowerCase();
  if (lower.includes("room") || lower.includes("redaction")) return { href: `/dashboard?role=${role}&view=rooms`, label: "Review room blocker" };
  if (lower.includes("source") || lower.includes("conflict")) {
    return role === "admin" || role === "crays-management"
      ? { href: `/sync?role=${role}`, label: "Classify source conflict" }
      : { href: `/dashboard?role=${role}&view=signals`, label: "Open signal" };
  }
  if (lower.includes("rent") || lower.includes("economics") || lower.includes("financial")) return { href: `/analytics?role=${role}&view=portfolio`, label: "Open economics workflow" };
  return { href: `/dashboard?role=${role}&view=actions`, label: "Review blocker queue" };
}

function safeWorklinkHref(route: string, role: string) {
  if (route.includes("process-suites")) return `/dashboard?role=${role}&view=process-suites`;
  if (route.includes("rooms")) return `/dashboard?role=${role}&view=rooms`;
  if (route.includes("sync")) return role === "admin" || role === "crays-management" ? `/sync?role=${role}` : `/dashboard?role=${role}&view=signals`;
  if (route.includes("location-rent-economics") || route.includes("analytics")) return `/analytics?role=${role}&view=portfolio`;
  return `/dashboard?role=${role}&view=case`;
}

export function PilotAcceptanceCloseoutPanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role") ?? "crays-management").key;
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AcceptanceFilter>("all");
  const [selectedCriterionKey, setSelectedCriterionKey] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadAcceptance(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Pilot acceptance unavailable" });
        }
      });
    return () => controller.abort();
  }, [role, refreshKey]);

  const readModel = loadState.data?.readModel ?? null;
  const visibleCriteria = useMemo(() => {
    if (!readModel) return [];
    const term = query.trim().toLowerCase();
    return readModel.criteria.filter((item) => matchesCriterion(item, term, filter));
  }, [filter, query, readModel]);

  const selectedCriterion = useMemo(() => {
    if (!readModel) return null;
    return readModel.criteria.find((item) => item.key === selectedCriterionKey) ?? visibleCriteria[0] ?? readModel.criteria[0] ?? null;
  }, [readModel, selectedCriterionKey, visibleCriteria]);

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading pilot acceptance
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="font-semibold">Pilot acceptance unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  if (!readModel) return null;
  const sourceHealthHref = role === "admin" || role === "crays-management" ? `/sync?role=${role}` : `/dashboard?role=${role}&view=signals`;
  const focusCriteria = (nextFilter: AcceptanceFilter, nextQuery = "") => {
    setFilter(nextFilter);
    setQuery(nextQuery);
    const nextCriterion =
      readModel.criteria.find((item) => nextFilter === "all" || item.state === nextFilter) ??
      readModel.criteria[0] ??
      null;
    setSelectedCriterionKey(nextCriterion?.key ?? null);
  };
  const summaryCards = [
    { label: "Criteria", value: readModel.summary.criteria, action: "Show all criteria", onClick: () => focusCriteria("all") },
    { label: "Passed", value: readModel.summary.passed, action: "Filter passed", onClick: () => focusCriteria("passed") },
    { label: "Attention", value: readModel.summary.attention, action: "Filter attention", onClick: () => focusCriteria("attention") },
    { label: "Blocked", value: readModel.summary.blocked, action: "Filter blocked", onClick: () => focusCriteria("blocked") },
    { label: "Source maps", value: readModel.summary.sourceMaps, action: "Check source health", href: sourceHealthHref },
    { label: "Process stages", value: readModel.summary.processStages, action: "Open process suites", href: `/dashboard?role=${role}&view=process-suites` },
    { label: "Evidence records", value: readModel.summary.evidenceRecords, action: "Open evidence workflow", href: `/dashboard?role=${role}&view=process-suites` },
    { label: "Commands", value: readModel.summary.commandDrafts, action: "Review commands", href: `/dashboard?role=${role}&view=actions` },
    { label: "Maps persisted", value: readModel.summary.externalRecordMaps, action: "Check source health", href: sourceHealthHref },
    { label: "Open gates", value: readModel.summary.openSideEffectGates, action: "Review gate queue", href: `/dashboard?role=${role}&view=actions` },
  ];

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Pilot acceptance</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Final pilot acceptance closeout</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            Internal demo acceptance across Golden Tenant data, A-Z process suites, command recovery, Location Intelligence, stakeholder preflight, adapter status and closed gates.
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
          Refresh acceptance
        </button>
      </div>

      <div className={`border-b px-5 py-4 ${readModel.decision.internalPilotDemoReady ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase opacity-75">Decision</p>
            <h3 className="mt-1 text-2xl font-semibold">{readModel.decision.decisionLabel}</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] bg-white px-3 py-2">Internal demo: {readModel.decision.internalPilotDemoReady ? "Ready" : "Not ready"}</span>
            <span className="rounded-[7px] bg-white px-3 py-2">External release: Blocked</span>
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-3 xl:grid-cols-10">
        {summaryCards.map((card) =>
          card.href ? (
            <Link key={card.label} href={card.href} className="rounded-[8px] border border-[var(--line)] bg-white p-3 transition hover:border-[var(--accent)]">
              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{card.label}</p>
              <strong className="mt-2 block text-xl">{card.value}</strong>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                {card.action}
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          ) : (
            <button key={card.label} type="button" onClick={card.onClick} className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]">
              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{card.label}</p>
              <strong className="mt-2 block text-xl">{card.value}</strong>
              <span className="mt-2 block text-[11px] font-semibold text-[var(--accent)]">{card.action}</span>
            </button>
          ),
        )}
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-4">
          <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="font-semibold">Location Intelligence acceptance</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link href={`/dashboard?role=${role}&view=case`} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--accent)]">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Property</p>
                <p className="mt-2 text-sm">{readModel.locationIntelligence.property}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{readModel.locationIntelligence.market}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                  Open prepared deal case
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
              <Link href={`/analytics?role=${role}&view=portfolio`} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--accent)]">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Prepared offer</p>
                <p className="mt-2 text-sm">{readModel.locationIntelligence.preparedOffer}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Location review {readModel.locationIntelligence.reviewedLocationAnalyses}/{readModel.locationIntelligence.locationAnalyses}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                  Open Location Intelligence workflow
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
              <button type="button" onClick={() => focusCriteria("attention", "location")} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--accent)]">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-2 text-sm">{readModel.locationIntelligence.nextAction}</p>
                <span className="mt-2 block text-[11px] font-semibold text-[var(--accent)]">Focus location criteria</span>
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              {[
                ["Location score", readModel.locationIntelligence.locationScore ?? "Pending"],
                ["Rent models", readModel.locationIntelligence.rentPotentialModels],
                ["Economics models", readModel.locationIntelligence.dealEconomicsModels],
                ["Financial models", readModel.locationIntelligence.financialModels],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-[8px] bg-[var(--surface-muted)] p-3">
                  <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label as string}</p>
                  <strong className="mt-1 block">{value as string | number}</strong>
                </div>
              ))}
            </div>
          </div>

          {selectedCriterion ? (
            <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Selected acceptance workflow</p>
                  <h4 className="mt-2 font-semibold">{selectedCriterion.label}</h4>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{selectedCriterion.evidence}</p>
                </div>
                <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[selectedCriterion.state]}`}>{labelize(selectedCriterion.state)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={workflowForCriterion(selectedCriterion, role).href} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--accent)]">
                  {workflowForCriterion(selectedCriterion, role).label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <Link href={`/dashboard?role=${role}&view=actions`} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--accent)]">
                  Review command history
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white p-3">
            <label className="relative min-w-[260px] flex-1">
            <span className="sr-only">Search acceptance criteria</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search criteria, evidence, owner or next action"
              className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            </label>
            {(["all", "passed", "attention", "blocked"] as AcceptanceFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => focusCriteria(item)}
                className={`rounded-[8px] border px-3 py-2 text-xs font-semibold transition ${
                  filter === item ? "border-black bg-black text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                }`}
              >
                {labelize(item)}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {visibleCriteria.map((item) => (
              <section key={item.key} className={`rounded-[8px] border bg-white p-4 ${selectedCriterion?.key === item.key ? "border-black shadow-sm" : "border-[var(--line)]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[item.state]}`}>
                      {labelize(item.state)}
                    </span>
                    <button type="button" onClick={() => setSelectedCriterionKey(item.key)} className="mt-3 block text-left font-semibold hover:underline">{item.label}</button>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{item.evidence}</p>
                  </div>
                  <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold">{item.ownerRole}</span>
                </div>
                <div className="mt-3 grid gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-sm leading-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                  <p>{item.nextAction}</p>
                  <Link href={workflowForCriterion(item, role).href} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold hover:border-[var(--accent)]">
                    {workflowForCriterion(item, role).label}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-4 text-rose-950">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Release blockers</h3>
            </div>
            <div className="mt-3 space-y-2">
              {readModel.decision.releaseBlockers.map((item) => (
                <Link key={item} href={blockerWorkflow(item, role).href} className="block rounded-[8px] bg-white p-3 text-sm leading-5 transition hover:ring-1 hover:ring-rose-300">
                  {item}
                  <span className="mt-2 flex items-center gap-1 text-xs font-semibold">
                    {blockerWorkflow(item, role).label}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Acceptance worklinks</h3>
            </div>
            <div className="mt-3 space-y-2">
              {readModel.routeProof.map((item) => (
                <Link key={item.route} href={safeWorklinkHref(item.route, role)} className="block rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 hover:border-[var(--accent)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-[7px] border px-2 py-1 text-[10px] font-semibold uppercase ${stateClass[item.state]}`}>{labelize(item.state)}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                  <p className="mt-2 text-xs font-semibold">{routeLabel(safeWorklinkHref(item.route, role))}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.proof}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Closed gates confirmed</h3>
            </div>
            <p className="mt-2 text-sm leading-6">
              Production deploy, public release, candidate/owner/bank release, uploads, sends, payments, bank actions, finance posting, target apply, source writes, sync apply, live external reads and live AI are closed.
            </p>
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Verified adapter status</h3>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Surfaces</span><strong>{readModel.summary.adapterSurfaces}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Connections</span><strong>{readModel.summary.integrationConnections}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">External maps</span><strong>{readModel.summary.externalRecordMaps}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">Sync jobs</span><strong>{readModel.summary.syncJobs}</strong></div>
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}
