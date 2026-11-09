"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, ClipboardCheck, RefreshCw, Route, ShieldCheck } from "lucide-react";
import {
  emptyOwnerPropertyCheckReadiness,
  type OwnerPropertyCheckPilotReadiness,
} from "@/lib/pilot-owner-property-check-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: OwnerPropertyCheckPilotReadiness;
  liveBusinessRecordsReturned: boolean;
  commandRecordsWritten: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const gateTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  pending: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const entryTone = {
  visible: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  blocked_until_exact_gate: "border-amber-700/20 bg-amber-50 text-amber-950",
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function entryStateLabel(value: string) {
  if (value === "visible") return "Available";
  if (value === "blocked_until_exact_gate") return "Needs approval";
  return statusLabel(value);
}

function displayCaseTitle(value: string) {
  return value.replace(/\bDev\b\s*/g, "").replace(/\s+/g, " ").trim();
}

async function loadOwnerPropertyCheck(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/owner-property-check/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Owner Property Check returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function OwnerPropertyCheckPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyOwnerPropertyCheckReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadOwnerPropertyCheck(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Owner Property Check failed" });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const record = readModel.records[0];

  if (!fallback.access.allowed) return null;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Property intake</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Property fit and handoff</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Review property fit, evidence, documents and handoff readiness before the deal moves into the next workflow.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Owner Property Check pilot"
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
          ["Property cases", readModel.summary.propertyCases.toString()],
          ["Handoff ready", readModel.summary.handoffReady.toString()],
          ["Location", `${readModel.summary.reviewedLocationAnalyses}/${readModel.summary.locationAnalyses}`],
          ["Documents", `${readModel.summary.approvedDocumentLinks}/${readModel.summary.documentLinks}`],
          ["Events", readModel.summary.workflowEvents.toString()],
          ["Apply ready", readModel.summary.applyReady.toString()],
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
              <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Current property case</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Use this workspace to qualify the property and prepare the next handoff.</p>
          </div>

          {record ? (
            <div className="p-4">
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{displayCaseTitle(record.title)}</h3>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      {[record.city, record.country].filter(Boolean).join(", ") || "Location pending"}
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-[var(--ink-muted)]">{record.caseId}</p>
                  </div>
                  <span className="rounded-[7px] border border-emerald-700/20 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-950">
                    {statusLabel(record.caseStatus)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {[
                    ["Property", record.propertyStatus],
                    ["Phase", record.currentPhase],
                    ["Handoff", record.handoffStatus],
                    ["Events", record.eventCount.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[8px] bg-[var(--surface)] p-3">
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                      <strong className="mt-1 block text-sm">{statusLabel(value)}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {record.gates.map((gate) => (
                    <div key={gate.key} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm">{gate.label}</strong>
                        <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${gateTone[gate.status]}`}>
                          {gate.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{gate.requiredFor}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">{gate.current}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
                  <Route className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{record.nextBestRoleAction}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-[var(--ink-muted)]">No private property review records are visible for this role.</div>
          )}
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Property intake channels</h2>
            </div>
            <div className="mt-4 space-y-3">
              {readModel.ownerEntryModes.map((mode) => (
                <div key={mode.key} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <strong className="text-sm">{mode.label}</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${entryTone[mode.state]}`}>
                      {entryStateLabel(mode.state)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{mode.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Available actions</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {[
                ["Review property evidence", "Available"],
                ["Prepare owner update request", "Needs approval"],
                ["Create bank package", "After finance review"],
              ].map(([label, state]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{state}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Connected workflow</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {readModel.preservedFunctions.map((item) => (
                <span key={item.key} className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">
                  {item.label}
                </span>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
