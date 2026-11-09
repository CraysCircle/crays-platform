"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, FileCheck2, Landmark, ListChecks, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import {
  emptyBankEvidenceFinancingPilotReadiness,
  type BankEvidenceFinancingPilotReadiness,
} from "@/lib/pilot-bank-evidence-financing-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: BankEvidenceFinancingPilotReadiness;
  liveBusinessRecordsReturned: boolean;
  bankPartnerPackageRecordsReturned: false;
  financeRecordsWritten: false;
  externalPackageReleased: false;
  bankPackageCreationEnabled: false;
  bankHandoffEnabled: false;
  lenderReleaseEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  externalSendingEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const stageTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  model_ready: "border-sky-700/20 bg-sky-50 text-sky-950",
  decision_required: "border-amber-700/20 bg-amber-50 text-amber-950",
  release_required: "border-orange-700/20 bg-orange-50 text-orange-950",
  locked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const functionTone = {
  represented: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  deferred_until_exact_gate: "border-amber-700/20 bg-amber-50 text-amber-950",
};

async function loadBankEvidenceFinancingPilot(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/bank-evidence-financing/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Bank Evidence and Financing Package pilot returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function BankEvidenceFinancingPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyBankEvidenceFinancingPilotReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadBankEvidenceFinancingPilot(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Bank Evidence and Financing Package pilot failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Bank package creation", enabled: readModel.boundaries.bankPackageCreationEnabled },
      { label: "Bank handoff", enabled: readModel.boundaries.bankHandoffEnabled },
      { label: "Lender release", enabled: readModel.boundaries.lenderReleaseEnabled },
      { label: "Bank send", enabled: readModel.boundaries.bankSendEnabled },
      { label: "Payment initiation", enabled: readModel.boundaries.paymentInitiationEnabled },
      { label: "Finance writes", enabled: readModel.boundaries.financeWritesEnabled },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
      { label: "File uploads", enabled: readModel.boundaries.fileUploadEnabled },
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
              <Landmark className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Bank Evidence and Financing Package pilot</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Bank evidence and financing</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Finance package prerequisites, document evidence, Candidate intent signals and Bank Partner shell state are reviewed in CRAYS while all lender release, sends, uploads and finance writes stay closed.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Bank Evidence and Financing Package pilot"
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
          ["Bank packages", readModel.summary.bankPackages.toString()],
          ["Loan cases", readModel.summary.loanCases.toString()],
          ["Candidate intents", readModel.summary.candidateIntents.toString()],
          ["Documents", readModel.summary.documentPackageLinks.toString()],
          ["Work items", readModel.summary.workItems.toString()],
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
              <Banknote className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Financing stages</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each stage has an owner, a gate and an explicit current state.</p>
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
              <h2 className="font-semibold">Financing work queue</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Work items name owner, CRAYS boundary, next action and closed release gate.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {readModel.workItems.map((item) => (
              <div key={item.key} className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_140px_160px] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{item.label}</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stageTone[item.status]}`}>
                      {stateLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.current}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{item.nextAction}</p>
                  <p className="mt-2 break-all font-mono text-xs text-[var(--ink-muted)]">{item.commandBoundary}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--ink-muted)]">{item.moduleSurface}</span>
                <span className="rounded-[8px] bg-white p-2 text-xs font-semibold text-[var(--ink-muted)]">{item.closedGate}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-[var(--accent)]" />
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
