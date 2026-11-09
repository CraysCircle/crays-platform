"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, ListChecks, LockKeyhole, MessageSquarePlus, RefreshCw, ShieldCheck, UserRoundCheck } from "lucide-react";
import {
  emptyCandidateEvidenceIntentPilotReadiness,
  type CandidateEvidenceIntentPilotReadiness,
} from "@/lib/pilot-candidate-evidence-intent-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: CandidateEvidenceIntentPilotReadiness;
  liveBusinessRecordsReturned: boolean;
  candidateVisibleRecordsReturned: false;
  commandRecordsWritten: false;
  intentRecordsWritten: false;
  candidateReleaseEnabled: false;
  regulatedChecksStarted: false;
  externalSendingEnabled: false;
  bankWorkflowStartEnabled: false;
  bankPackageCreationEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const stageTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  model_ready: "border-sky-700/20 bg-sky-50 text-sky-950",
  release_required: "border-amber-700/20 bg-amber-50 text-amber-950",
  locked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const functionTone = {
  represented: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  deferred_until_exact_gate: "border-amber-700/20 bg-amber-50 text-amber-950",
};

async function loadCandidateEvidenceIntentPilot(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/candidate-evidence-intent/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Candidate Evidence and Intent pilot returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function CandidateEvidenceIntentPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyCandidateEvidenceIntentPilotReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadCandidateEvidenceIntentPilot(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Candidate Evidence and Intent pilot failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Candidate-visible records", enabled: readModel.boundaries.candidateVisibleRecordsEnabled },
      { label: "Candidate release", enabled: readModel.boundaries.candidateReleaseEnabled },
      { label: "Intent writes", enabled: readModel.boundaries.purchaseIntentWritesEnabled || readModel.boundaries.financingIntentWritesEnabled },
      { label: "Checklist commands", enabled: readModel.boundaries.checklistCommandWritesEnabled },
      { label: "Regulated checks", enabled: readModel.boundaries.regulatedChecksStarted },
      { label: "Bank workflow", enabled: readModel.boundaries.bankWorkflowStartEnabled },
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
              <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Candidate Evidence and Intent pilot</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Candidate evidence and intent</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Candidate questions, intent and review checklist actions are modeled as guarded CRAYS command boundaries while release, regulated and bank workflows stay closed.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Candidate Evidence and Intent pilot"
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
          ["Internal packages", readModel.summary.internalAssemblyPackages.toString()],
          ["Candidate-visible", readModel.summary.candidateVisiblePackages.toString()],
          ["Evidence", readModel.summary.evidencePackages.toString()],
          ["Intent records", readModel.summary.intentRecords.toString()],
          ["Action models", readModel.summary.actionModels.toString()],
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
              <MessageSquarePlus className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Candidate action stages</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Candidate actions are command-modeled here, not executed.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.stages.map((stage) => (
              <article key={stage.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm">{stage.label}</strong>
                  <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${stageTone[stage.status]}`}>
                    {stateLabel(stage.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{stage.current}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{stage.requiredFor}</p>
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
              <ListChecks className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Guarded action models</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each action names the operating boundary and the review state that remains closed.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-3">
            {readModel.actionModels.map((action) => (
              <article key={action.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm">{action.label}</strong>
                  <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${stageTone[action.status]}`}>
                    {stateLabel(action.status)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{action.moduleSurface}</p>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">Review boundary: {action.commandBoundary.replaceAll("_", " ")}</p>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">Workflow route: Guarded review draft</p>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{action.current}</p>
                <p className="mt-3 rounded-[8px] bg-[var(--surface)] p-2 text-xs font-semibold text-[var(--ink-muted)]">Apply remains closed until approved review.</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <UserRoundCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Visible surfaces</h2>
            </div>
            <div className="mt-4 space-y-3">
              {readModel.visibleSurfaces.map((item) => (
                <div key={item.surface} className="rounded-[8px] bg-white p-3">
                  <strong className="text-sm">{item.surface}</strong>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.roleUse}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Readiness gates</h2>
            <div className="mt-4 space-y-2">
              {readModel.gates.map((gate) => (
                <div key={gate.key} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{gate.label}</span>
                  <strong>{gate.ready ? "ready" : "closed"}</strong>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
