"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, FileSearch, RefreshCw, ShieldCheck, UserRoundCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type PrepStatus = "ready" | "attention" | "blocked";

type CandidateFinancingPrepReadModel = {
  access: {
    role: string;
    allowed: boolean;
    mode: "internal_prep_workflow" | "candidate_shell" | "forbidden";
    canStageChecklistDraft: boolean;
  };
  activeCase: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    title: string;
    market: string;
  } | null;
  candidateIntent: {
    persistenceReady: boolean;
    records: number;
    purchase: number;
    financing: number;
    writeGate: string;
  };
  financingPrep: {
    sourceOfFundsReadiness: string;
    accountInformationReadiness: string;
    transactionEvidenceReadiness: string;
    evidenceConsentState: string;
    approvedDocuments: number;
    totalDocuments: number;
  };
  stages: Array<{
    key: string;
    label: string;
    ownerRole: string;
    status: PrepStatus;
    current: string;
    nextAction: string;
  }>;
  nextAction: {
    label: string;
    priority: "high" | "normal";
    actionKey: "source-of-funds" | "candidate-intent" | "review-only";
  };
  history: Array<{
    commandId: string;
    label: string;
    actorRole: string;
    commandStatus: string;
    targetApplyStatus: string;
    applyGate: string;
    createdAt: string;
  }>;
  boundaries: {
    candidateIntentRecordsReturned: boolean;
    sourceOfFundsCollectionStarted: false;
    regulatedChecksStarted: false;
    bankWorkflowStartEnabled: false;
    bankPackageCreationEnabled: false;
    bankSendEnabled: false;
    externalSendingEnabled: false;
  };
  queryStatus: string;
};

type Payload = {
  status: "ready" | "forbidden";
  readModel: CandidateFinancingPrepReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const tone: Record<PrepStatus, string> = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  attention: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

function words(value: string) {
  return value.replaceAll("_", " ");
}

async function loadWorkbench(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/candidate/financing-prep/workbench/read-model?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Candidate financing prep returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

async function stageCommand(role: string, actionKey: CandidateFinancingPrepReadModel["nextAction"]["actionKey"]) {
  const response = await fetch(`/api/crays/candidate/financing-prep/workbench/command-draft?role=${role}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-crays-dev-confirm": "stage-candidate-financing-prep-command",
    },
    body: JSON.stringify({ role, actionKey }),
  });
  if (!response.ok) throw new Error(`Command draft returned HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export function CandidateFinancingPrepWorkbenchPanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role")).key;
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [stageState, setStageState] = useState<{ state: "idle" | "staging" | "done" | "error"; message: string }>({
    state: "idle",
    message: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    loadWorkbench(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Candidate financing prep failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const metrics = useMemo(() => {
    if (!readModel) return [];
    return [
      ["Intent records", String(readModel.candidateIntent.records)],
      ["Purchase", String(readModel.candidateIntent.purchase)],
      ["Financing", String(readModel.candidateIntent.financing)],
      ["Documents", `${readModel.financingPrep.approvedDocuments}/${readModel.financingPrep.totalDocuments}`],
    ];
  }, [readModel]);

  if (loadState.state === "error") {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
        {loadState.error}
      </section>
    );
  }

  if (!readModel) {
    return (
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <RefreshCw className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </section>
    );
  }

  if (!readModel.access.allowed) return null;

  const stageAllowed = readModel.access.canStageChecklistDraft && readModel.nextAction.actionKey !== "review-only";

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserRoundCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Candidate financing prep</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">{readModel.activeCase?.title ?? "Candidate financing workflow"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Candidate intent, source-of-funds readiness and financing review stay connected to the loan workflow without starting regulated checks or bank handoff.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setLoadState({ state: "loading", data: null, error: null });
                setRefreshKey((value) => value + 1);
              }}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
            >
              <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              disabled={!stageAllowed || stageState.state === "staging"}
              onClick={() => {
                setStageState({ state: "staging", message: "Staging command draft..." });
                stageCommand(role, readModel.nextAction.actionKey)
                  .then((payload) => {
                    const result = payload.result && typeof payload.result === "object" ? (payload.result as { commandId?: string }) : {};
                    setStageState({ state: "done", message: result.commandId ? "Command draft stored for review." : "Command draft staged." });
                    setLoadState({ state: "loading", data: null, error: null });
                    setRefreshKey((value) => value + 1);
                  })
                  .catch((error: unknown) => setStageState({ state: "error", message: error instanceof Error ? error.message : "Command draft failed." }));
              }}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ClipboardCheck className="h-4 w-4" />
              Stage next review
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
          <p className="mt-2 text-sm font-semibold">{readModel.nextAction.label}</p>
          {stageState.message ? <p className={`mt-2 text-xs ${stageState.state === "error" ? "text-rose-700" : "text-[var(--ink-muted)]"}`}>{stageState.message}</p> : null}
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Preparation stages</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.stages.map((stage) => (
              <article key={stage.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm">{stage.label}</strong>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{stage.ownerRole}</p>
                  </div>
                  <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${tone[stage.status]}`}>{stage.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6">{stage.current}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{stage.nextAction}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Controlled outcomes</h2>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Source-of-funds collection", readModel.boundaries.sourceOfFundsCollectionStarted],
                ["Regulated checks", readModel.boundaries.regulatedChecksStarted],
                ["Bank handoff", readModel.boundaries.bankWorkflowStartEnabled],
                ["Bank send", readModel.boundaries.bankSendEnabled],
                ["External sending", readModel.boundaries.externalSendingEnabled],
              ].map(([label, enabled]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{enabled ? "Open" : "Closed"}</strong>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Recent command history</h2>
            <div className="mt-4 space-y-3">
              {readModel.history.length ? (
                readModel.history.slice(0, 3).map((item) => (
                  <div key={item.commandId} className="rounded-[8px] bg-white p-3">
                    <strong className="text-sm">{item.label}</strong>
                    <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">Stored command draft</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{words(item.targetApplyStatus)} · {item.actorRole}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">No command draft has been staged yet.</p>
              )}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
