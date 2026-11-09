"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { defaultRole, type RoleKey } from "@/lib/roles";

type AnalysisGate = {
  key: string;
  label: string;
  status: "ready" | "pending" | "blocked";
  current: string;
  requiredFor: string;
};

type AnalysisReadinessPayload = {
  status: "ready" | "forbidden";
  readModel: {
    role: RoleKey;
    access: {
      allowed: boolean;
      reason: string;
    };
    case: {
      caseId: string;
      propertyId: string;
      title: string;
      city: string | null;
      country: string | null;
      propertyStatus: string;
      caseStatus: string;
      currentPhase: string;
      handoffRequired: boolean;
      handoffStatus: string;
      ownerRole: string;
    } | null;
    counts: {
      locationAnalyses: number;
      reviewedLocationAnalyses: number;
      evidencePackages: number;
      releasableEvidencePackages: number;
      documentLinks: number;
      approvedDocumentLinks: number;
      workflowEvents: number;
    };
    gates: AnalysisGate[];
    handoffPreparation: {
      status: "not_ready" | "ready_for_review";
      explicitHandoffRequired: boolean;
      dealManagerAccessGranted: false;
      candidateReleaseEnabled: false;
      bankReleaseEnabled: false;
      publicReleaseEnabled: false;
      requiredNextActions: string[];
    };
    liveBusinessRecordReturned: boolean;
    fileUploadEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: AnalysisReadinessPayload; error: null }
  | { state: "error"; data: null; error: string };

const visibleRoles = new Set(["deal-manager", "expansion-manager", "reviewer", "crays-management", "admin"]);

const statusClass: Record<AnalysisGate["status"], string> = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  pending: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

async function loadReadiness(role: RoleKey, signal?: AbortSignal) {
  const response = await fetch(`/api/crays/property-cases/analysis/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Property-case analysis readiness returned HTTP ${response.status}`);
  }

  return (await response.json()) as AnalysisReadinessPayload;
}

export function PropertyCaseAnalysisReadinessPanel() {
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") ?? defaultRole) as RoleKey;
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const isVisible = visibleRoles.has(role);

  useEffect(() => {
    if (!isVisible) return;

    const controller = new AbortController();
    loadReadiness(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Property-case analysis readiness failed",
        });
      });

    return () => controller.abort();
  }, [isVisible, refreshKey, role]);

  const data = loadState.data?.readModel;
  const record = data?.case;
  const counts = data?.counts;
  const boundary = useMemo(
    () => [
      ["File upload", data?.fileUploadEnabled ? "true" : "false"],
      ["Provider calls", data?.providerCallsEnabled ? "true" : "false"],
      ["External sending", data?.externalSendingEnabled ? "true" : "false"],
      ["Public release", data?.publicReleaseEnabled ? "true" : "false"],
      ["Handoff release", data?.handoffPreparation.dealManagerAccessGranted ? "true" : "false"],
    ],
    [data],
  );

  if (!isVisible) return null;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Analysis readiness</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">Property analysis gates</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Evidence, document, manual intake and digital handoff readiness for the current property case.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadState.state === "error" ? (
          <div className="m-5 rounded-[8px] border border-rose-700/20 bg-rose-50 p-4 text-sm font-medium text-rose-950">{loadState.error}</div>
        ) : null}

        <div className="grid gap-3 p-4 md:grid-cols-4">
          {[
            ["Location", counts ? `${counts.reviewedLocationAnalyses}/${counts.locationAnalyses}` : "..."],
            ["Evidence", counts ? String(counts.evidencePackages) : "..."],
            ["Documents", counts ? `${counts.approvedDocumentLinks}/${counts.documentLinks}` : "..."],
            ["Events", counts ? String(counts.workflowEvents) : "..."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
              <strong className="mt-2 block text-xl font-semibold">{value}</strong>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <strong className="block text-sm">{record?.title ?? "No property case selected"}</strong>
            <span className="mt-1 block text-sm text-[var(--ink-muted)]">
              {record ? `${statusLabel(record.caseStatus)} / ${statusLabel(record.currentPhase)}` : "Waiting for a property case"}
            </span>
            {record ? <span className="mt-2 block break-all font-mono text-xs text-[var(--ink-muted)]">{record.caseId}</span> : null}
          </div>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {loadState.state === "loading" ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="px-5 py-4">
                <div className="h-4 w-64 max-w-full rounded bg-[var(--surface-strong)]" />
                <div className="mt-3 h-3 w-96 max-w-full rounded bg-[var(--surface-strong)]" />
              </div>
            ))
          ) : data?.gates.length ? (
            data.gates.map((gate) => (
              <div key={gate.key} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_120px] md:items-center">
                <div className="min-w-0">
                  <strong className="block text-sm">{gate.label}</strong>
                  <span className="mt-1 block text-sm text-[var(--ink-muted)]">{gate.requiredFor}</span>
                  <span className="mt-1 block break-words text-xs text-[var(--ink-muted)]">{gate.current}</span>
                </div>
                <span className={`w-fit rounded-[7px] border px-3 py-1 text-xs font-semibold uppercase ${statusClass[gate.status]}`}>
                  {gate.status}
                </span>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-[var(--ink-muted)]">No analysis gates are available for this review queue.</div>
          )}
        </div>
      </article>

      <aside className="space-y-4">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Release boundary</h2>
          </div>
          <div className="mt-4 space-y-3">
            {boundary.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                <span className="text-[var(--ink-muted)]">{label}</span>
                <strong>{loadState.state === "loading" ? "..." : value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[var(--amber)]" />
            <h2 className="font-semibold">Handoff preparation</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            {data ? statusLabel(data.handoffPreparation.status) : "Checking readiness"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(data?.handoffPreparation.requiredNextActions ?? ["loading"]).map((action) => (
              <span key={action} className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">
                {statusLabel(action)}
              </span>
            ))}
          </div>
        </article>
      </aside>
    </section>
  );
}
