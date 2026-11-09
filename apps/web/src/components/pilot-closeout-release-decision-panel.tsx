"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Flag, LockKeyhole, RefreshCw, ShieldCheck, Siren, Split, TestTube2 } from "lucide-react";
import {
  emptyPilotCloseoutReleaseDecisionReadiness,
  type PilotCloseoutReleaseDecisionReadiness,
} from "@/lib/pilot-closeout-release-decision-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: PilotCloseoutReleaseDecisionReadiness;
  liveBusinessRecordsReturned: false;
  betaApproved: false;
  productionDeployPerformed: false;
  externalActionsPerformed: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  toolApplyEnabled: false;
  externalSendingEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const decisionTone = {
  ready_for_beta_scope: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  blocked: "border-orange-700/20 bg-orange-50 text-orange-950",
  closed: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const riskTone = {
  high: "border-rose-700/20 bg-rose-50 text-rose-950",
  medium: "border-amber-700/20 bg-amber-50 text-amber-950",
  low: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
};

async function loadCloseout(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/closeout-release-decision/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Pilot closeout returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function PilotCloseoutReleaseDecisionPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyPilotCloseoutReleaseDecisionReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadCloseout(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Pilot closeout failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Automatic beta approval", enabled: readModel.boundaries.automaticBetaApprovalEnabled },
      { label: "Production deploy", enabled: readModel.boundaries.productionDeployEnabled },
      { label: "Live external reads", enabled: readModel.boundaries.liveExternalReadsEnabled },
      { label: "Tool apply", enabled: readModel.boundaries.toolApplyEnabled },
      { label: "Candidate release", enabled: readModel.boundaries.candidateReleaseEnabled },
      { label: "Bank release", enabled: readModel.boundaries.bankReleaseEnabled },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
      { label: "Payment initiation", enabled: readModel.boundaries.paymentInitiationEnabled },
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
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Pilot closeout and release decision</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Pilot closeout and release decision</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              The pilot is reviewed as one operating chain. Beta scope can be prepared, but production, releases, external reads, writes, sends, uploads, bank actions and payments stay closed.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Pilot closeout"
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
          ["Pilot blocks", readModel.summary.pilotBlocksClosed.toString()],
          ["Segments", readModel.summary.journeySegmentsReviewed.toString()],
          ["Decisions", readModel.summary.decisions.toString()],
          ["Beta-ready", readModel.summary.betaScopeReadyDecisions.toString()],
          ["High risks", readModel.summary.highRisks.toString()],
          ["Gates", readModel.summary.gatesReviewed.toString()],
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
              <Split className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Release decisions</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each decision separates beta preparation from release execution.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.decisions.map((decision) => (
              <article key={decision.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm">{decision.label}</strong>
                  <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${decisionTone[decision.status]}`}>
                    {stateLabel(decision.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{decision.evidence}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{decision.decision}</p>
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
              <Siren className="h-5 w-5 text-[var(--rose)]" />
              <h2 className="font-semibold">Risks</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.risks.map((risk) => (
                <div key={risk.key} className={`rounded-[8px] border p-3 text-xs font-semibold ${riskTone[risk.severity]}`}>
                  {risk.label}
                  <p className="mt-2 text-xs font-medium normal-case leading-5 opacity-80">{risk.mitigation}</p>
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
              <TestTube2 className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">QA evidence</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.qaEvidence.map((item) => (
              <article key={item.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{item.label}</strong>
                  <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                    {item.state}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{item.evidence}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Next beta inputs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {readModel.nextBetaInputs.map((item) => (
              <div key={item.blockRange} className="rounded-[8px] bg-white p-3">
                <strong className="text-sm">{item.blockRange}</strong>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.input}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-semibold">Gate decision register</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {readModel.gates.map((gate) => (
            <article key={gate.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm">{gate.label}</strong>
                <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                  {gate.state}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{gate.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
