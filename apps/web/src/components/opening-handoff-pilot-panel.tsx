"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, FileText, Flag, LockKeyhole, RefreshCw, Route, ShieldCheck, Workflow } from "lucide-react";
import {
  emptyOpeningHandoffPilotReadiness,
  type OpeningHandoffPilotReadiness,
} from "@/lib/pilot-opening-handoff-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: OpeningHandoffPilotReadiness;
  liveBusinessRecordsReturned: boolean;
  workItemsWritten: false;
  operationsTasksWritten: false;
  externalNotificationsSent: false;
  toolApplyEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const statusTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  model_ready: "border-sky-700/20 bg-sky-50 text-sky-950",
  in_progress: "border-indigo-700/20 bg-indigo-50 text-indigo-950",
  decision_required: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-orange-700/20 bg-orange-50 text-orange-950",
  locked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const functionTone = {
  represented: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  deferred_until_exact_gate: "border-amber-700/20 bg-amber-50 text-amber-950",
};

async function loadOpeningHandoffPilot(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/opening-handoff/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Opening Handoff pilot returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function OpeningHandoffPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyOpeningHandoffPilotReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadOpeningHandoffPilot(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Opening Handoff pilot failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Project creation", enabled: readModel.boundaries.projectCreationEnabled },
      { label: "Work item writes", enabled: readModel.boundaries.workItemWriteEnabled },
      { label: "Operations writes", enabled: readModel.boundaries.operationsWriteEnabled },
      { label: "Tool apply", enabled: readModel.boundaries.toolApplyEnabled },
      { label: "Source writes", enabled: readModel.boundaries.sourceWritesEnabled },
      { label: "Sync writes", enabled: readModel.boundaries.syncWritesEnabled },
      { label: "File uploads", enabled: readModel.boundaries.fileUploadEnabled },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
    ],
    [readModel],
  );

  if (!fallback.access.allowed) return null;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Opening Handoff pilot</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Opening handoff</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Approved internal readiness feeds a Project and Operations handoff cockpit with partner milestones, work items, pages and stakeholder scopes while tool apply and external notifications stay closed.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Opening Handoff pilot"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Project items", readModel.summary.projectWorkItems.toString()],
          ["Handoff items", readModel.summary.openingHandoffItems.toString()],
          ["High priority", readModel.summary.highPriorityItems.toString()],
          ["Blocked", readModel.summary.blockedItems.toString()],
          ["Actions", readModel.summary.handoffActions.toString()],
          ["Ready gates", `${readModel.summary.readyGates}/${readModel.summary.readinessGates}`],
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
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Handoff milestones</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Milestones show owner, readiness and the next operational action.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.milestones.map((milestone) => (
              <article key={milestone.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm">{milestone.label}</strong>
                  <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${statusTone[milestone.status]}`}>
                    {stateLabel(milestone.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{milestone.current}</p>
                <p className="mt-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">{milestone.ownerRole}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{milestone.nextAction}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              <h2 className="font-semibold">Closed gates</h2>
            </div>
            <div className="mt-4 space-y-2">
              {boundaryRows.map(({ label, enabled }) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{enabled ? "true" : "false"}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Preserved functions</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.preservedFunctions.map((item) => (
                <div key={item.key} className={`rounded-[8px] border p-3 text-xs font-semibold ${functionTone[item.state]}`}>
                  {item.label}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Handoff action queue</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Actions are command-modeled and gated before any apply or external notification.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {readModel.handoffActions.map((action) => (
              <div key={action.key} className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_140px_160px] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{action.label}</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusTone[action.status]}`}>
                      {stateLabel(action.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{action.nextAction}</p>
                  <p className="mt-2 break-all font-mono text-xs text-[var(--ink-muted)]">{action.commandBoundary}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--ink-muted)]">{action.moduleSurface}</span>
                <span className="rounded-[8px] bg-white p-2 text-xs font-semibold text-[var(--ink-muted)]">{action.closedGate}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Handoff work items</h2>
            </div>
            <div className="mt-4 space-y-3">
              {readModel.workItems.length ? (
                readModel.workItems.map((item) => (
                  <div key={item.id} className="rounded-[8px] bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm">{item.identifier}</strong>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.state}</span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[var(--foreground)]">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{item.lead} - {item.dueDate}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink-muted)]">No handoff work items in this scope.</p>
              )}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Readiness gates</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.gates.map((gate) => (
                <div key={gate.key} className="rounded-[8px] bg-white p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)]">{gate.label}</span>
                    <strong>{gate.ready ? "ready" : "closed"}</strong>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{gate.current}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
