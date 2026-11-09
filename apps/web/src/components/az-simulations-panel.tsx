"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Beaker, CheckCircle2, GitBranch, LockKeyhole, RefreshCw, Search, ShieldCheck, Workflow } from "lucide-react";
import type { AzSimulation, AzSimulationReadModel } from "@/db/az-simulation-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = { status: string; readModel: AzSimulationReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager", "expansion-manager", "franchise-partner"];
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/a-z-simulations/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(`A-Z Simulations returned HTTP ${response.status}`);
  return payload;
}

async function stageSimulationReview(role: string, readModel: AzSimulationReadModel, simulation: AzSimulation) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `block63-az-simulation-${role}-${simulation.simulationKey}`,
      actorRole: role,
      commandType: simulation.conflicts > 0 ? "conflict_review" : "mapping_preview",
      action: simulation.conflicts > 0 ? "classify_conflict" : "refresh_preview",
      title: `Review ${simulation.label}`,
      notes: `${simulation.runbookFocus} This stores a Core simulation review draft only. Target apply, source writes, sync apply, release, external sending, bank actions and payments remain closed.`,
      status: simulation.state,
      syncMappingId: simulation.sharedCoreObject.id,
      sourceModule: simulation.steps[0]?.moduleKey ?? "sync",
      targetModule: simulation.steps[1]?.moduleKey ?? simulation.steps[0]?.moduleKey ?? "sync",
      entityTypeKey: simulation.sharedCoreObject.type,
      conflictClass: simulation.conflicts > 0 ? "az_simulation_conflict_review" : "az_simulation_readiness_review",
      retryClass: "review-only",
    }),
  });
  const payload = (await response.json()) as { result?: { commandId?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Simulation command returned HTTP ${response.status}`);
  return {
    commandId: payload.result?.commandId ?? null,
    message: payload.result?.targetApplyStatus === "blocked" ? "Simulation review stored. Target apply remains blocked." : "Simulation review stored.",
  };
}

export function AzSimulationsPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <AzSimulationsContent key={role} role={role} />;
}

function AzSimulationsContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [moduleKey, setModuleKey] = useState("all");
  const [state, setState] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "A-Z Simulations unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const simulations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return readModel?.simulations.filter((simulation) => {
      if (state !== "all" && simulation.state !== state) return false;
      if (owner !== "all" && simulation.ownerRole !== owner) return false;
      if (moduleKey !== "all" && !simulation.steps.some((step) => step.moduleKey === moduleKey)) return false;
      if (!term) return true;
      return [
        simulation.label,
        simulation.journeySegment,
        simulation.ownerRole,
        simulation.currentDecision,
        simulation.nextAction,
        simulation.sharedCoreObject.label,
        simulation.sharedCoreObject.id,
        ...simulation.modules,
        ...simulation.selectedRolePath,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    }) ?? [];
  }, [moduleKey, owner, readModel, search, state]);
  const selected = simulations.find((simulation) => simulation.simulationKey === selectedKey) ?? simulations[0] ?? null;

  if (!allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> A-Z Simulations</p>
        <h2 className="mt-2 text-2xl font-semibold">Simulation control is internal-only</h2>
        <p className="mt-2 text-sm">This role has no simulation scope and no simulation API request is made from this surface.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading A-Z simulations</section>;
  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">A-Z Simulations unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Beaker className="h-4 w-4 text-emerald-700" /> A-Z Simulations</p>
          <h2 className="mt-2 text-2xl font-semibold">End-to-end operating simulations</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            Franchise deal, studio opening, member/payment recovery, bank package and real-estate decision paths using the same Core objects, source links and timelines.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.simulations} simulations</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.sharedCoreObjects} shared Core objects</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.commandDrafts} command drafts observed</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.blockedSteps} blocked steps</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold">
          <RefreshCw className="h-4 w-4" /> Refresh simulations
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="relative md:col-span-2">
          <span className="sr-only">Search simulations</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search simulation, Core object or role" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" />
        </label>
        <select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All modules</option>
          {readModel.controls.modules.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={state} onChange={(event) => setState(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All states</option>
          {readModel.controls.states.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All owners</option>
          {readModel.controls.owners.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-3">
          {simulations.map((simulation) => (
            <button
              key={simulation.simulationKey}
              type="button"
              onClick={() => { setSelectedKey(simulation.simulationKey); setCommand({ state: "idle", message: null, commandId: null }); }}
              className={`rounded-[8px] border bg-white p-4 text-left transition ${selected?.simulationKey === simulation.simulationKey ? "border-emerald-700 shadow-sm" : "border-[var(--line)] hover:border-black/30"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{simulation.journeySegment}</p>
                  <h3 className="mt-1 text-lg font-semibold">{simulation.label}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">{simulation.currentDecision}</p>
                </div>
                <span className="rounded-[7px] border bg-[var(--surface)] px-3 py-1 text-xs font-semibold">{title(simulation.state)}</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {[
                  ["Completion", `${simulation.completionPercent}%`],
                  ["Source links", simulation.sourceLinkCount],
                  ["Timeline events", simulation.timelineEvents],
                  ["Conflicts", simulation.conflicts],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] bg-[var(--surface)] p-3">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                    <strong className="mt-1 block">{value}</strong>
                  </div>
                ))}
              </div>
            </button>
          ))}
          {!simulations.length ? <p className="rounded-[8px] border bg-white p-6 text-sm text-[var(--ink-muted)]">No simulation matches these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected simulation</p>
                <h3 className="mt-2 text-lg font-semibold">{selected.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.runbookFocus}</p>
              </div>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Shared Core object</p>
                <strong className="mt-2 block">{selected.sharedCoreObject.label}</strong>
                <p className="mt-1 break-all font-mono text-xs">{selected.sharedCoreObject.type} · {selected.sharedCoreObject.id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Simulation steps</p>
                {selected.steps.map((step) => (
                  <a key={step.stepKey} href={step.href} className="block rounded-[8px] border p-3 text-sm hover:border-black/30">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{step.label}</strong>
                      <span className="rounded-[7px] bg-[var(--surface)] px-2 py-1 text-xs font-semibold">{title(step.state)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{step.moduleLabel} · {step.ownerRole} · {step.sourceRecordCount} records · {step.commandDrafts} drafts</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{step.nextAction}</p>
                  </a>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Evidence sample</p>
                {selected.evidence.slice(0, 4).map((item) => (
                  <div key={`${item.moduleKey}-${item.label}`} className="rounded-[8px] bg-[var(--surface)] p-3 text-sm">
                    <strong>{item.label}</strong>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{title(item.moduleKey)} · {item.sourceFamily} · {item.status}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <a href={selected.sharedCoreObject.href} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">
                  Open shared object <ArrowRight className="h-4 w-4" />
                </a>
                {readModel.actions.stageSimulationReviewAllowed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCommand({ state: "submitting", message: "Staging guarded simulation review", commandId: null });
                      stageSimulationReview(role, readModel, selected)
                        .then((result) => setCommand({ state: "ready", message: result.message, commandId: result.commandId }))
                        .catch((error: unknown) => setCommand({ state: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null }));
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <GitBranch className="h-4 w-4" /> Stage simulation review
                  </button>
                ) : null}
              </div>
              {command.state !== "idle" ? (
                <div className={`rounded-[8px] border p-3 text-sm ${command.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <strong>{command.message}</strong>
                  {command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}
                  <p className="mt-1 text-xs">{readModel.actions.applyGate} remains closed.</p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Select a simulation.</p>
          )}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Workflow className="h-4 w-4 text-emerald-700" /> Source-backed path</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Each simulation step comes from existing process-suite, identity and source-health read models.</p></div>
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Shared object spine</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">The selected object, source IDs, timeline and module drilldowns stay connected across the run.</p></div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Closed execution boundary</p><p className="mt-2 text-xs leading-5">Apply, release, send, upload, bank, payment, finance posting, live AI and deployment gates remain closed.</p></div>
      </div>
    </section>
  );
}
