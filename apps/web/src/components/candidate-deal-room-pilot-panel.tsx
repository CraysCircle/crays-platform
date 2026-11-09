"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, MessageSquareText, RefreshCw, ShieldCheck, UserRoundCheck } from "lucide-react";
import {
  emptyCandidateDealRoomPilotReadiness,
  type CandidateDealRoomPilotReadiness,
} from "@/lib/pilot-candidate-deal-room-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: CandidateDealRoomPilotReadiness;
  liveBusinessRecordsReturned: boolean;
  candidateVisibleRecordsReturned: false;
  commandRecordsWritten: false;
  candidateReleaseEnabled: false;
  regulatedChecksStarted: false;
  externalSendingEnabled: false;
  bankPackageCreationEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const stageTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  release_required: "border-amber-700/20 bg-amber-50 text-amber-950",
  locked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const functionTone = {
  represented: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  deferred_until_exact_gate: "border-amber-700/20 bg-amber-50 text-amber-950",
};

async function loadCandidateDealRoomPilot(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/candidate-deal-room/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Candidate Deal Room pilot returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function CandidateDealRoomPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyCandidateDealRoomPilotReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadCandidateDealRoomPilot(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Candidate Deal Room pilot failed",
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
      { label: "Regulated checks", enabled: readModel.boundaries.regulatedChecksStarted },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
      { label: "Bank package creation", enabled: readModel.boundaries.bankPackageCreationEnabled },
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
              <UserRoundCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Candidate Deal Room pilot</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Candidate deal room</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Candidate-facing package sections, questions and intent preparation stay release-gated while Deal Manager reviews the shell from real CRAYS Core pilot state.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Candidate Deal Room pilot"
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
          ["Sections", readModel.summary.sections.toString()],
          ["Release required", readModel.summary.releaseRequiredSections.toString()],
          ["Ready gates", `${readModel.summary.readyGates}/${readModel.summary.readinessGates}`],
          ["Messages", readModel.summary.messages.toString()],
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
              <MessageSquareText className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Candidate room stages</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Sections and questions are visible only as a controlled shell until release approval.</p>
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

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Visible surfaces</h2>
            <div className="mt-4 space-y-3">
              {readModel.visibleSurfaces.map((item) => (
                <div key={item.surface} className="rounded-[8px] bg-white p-3">
                  <strong className="text-sm">{item.surface}</strong>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.roleUse}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
