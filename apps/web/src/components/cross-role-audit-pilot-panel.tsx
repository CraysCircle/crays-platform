"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Eye, Gauge, LockKeyhole, RefreshCw, Route, ShieldCheck } from "lucide-react";
import {
  emptyCrossRoleAuditPilotReadiness,
  type CrossRoleAuditPilotReadiness,
} from "@/lib/pilot-cross-role-audit-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: CrossRoleAuditPilotReadiness;
  liveBusinessRecordsReturned: false;
  visibilityExpanded: false;
  externalActionsPerformed: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  externalSendingEnabled: false;
  toolApplyEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const segmentTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  in_progress: "border-sky-700/20 bg-sky-50 text-sky-950",
  blocked: "border-orange-700/20 bg-orange-50 text-orange-950",
  release_required: "border-amber-700/20 bg-amber-50 text-amber-950",
  locked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

async function loadCrossRoleAuditPilot(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/cross-role-audit/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Cross-role pilot audit returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function CrossRoleAuditPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyCrossRoleAuditPilotReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadCrossRoleAuditPilot(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Cross-role pilot audit failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Visibility expansion", enabled: readModel.boundaries.unreviewedVisibilityExpansionEnabled },
      { label: "Candidate release", enabled: readModel.boundaries.candidateReleaseEnabled },
      { label: "Bank release", enabled: readModel.boundaries.bankReleaseEnabled },
      { label: "Public release", enabled: readModel.boundaries.publicReleaseEnabled },
      { label: "Tool apply", enabled: readModel.boundaries.toolApplyEnabled },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
      { label: "Uploads", enabled: readModel.boundaries.fileUploadEnabled },
      { label: "Finance writes", enabled: readModel.boundaries.financeWritesEnabled },
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
              <Gauge className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Cross-role pilot audit</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Cross-role audit</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              One scoped control tower for the end-to-end pilot chain: property, evidence, economics, Candidate intent, bank readiness and opening handoff.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Cross-role pilot audit"
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
          ["Segments", readModel.summary.journeySegments.toString()],
          ["Ready", readModel.summary.readySegments.toString()],
          ["Blocked", readModel.summary.blockedSegments.toString()],
          ["Release required", readModel.summary.releaseRequiredSegments.toString()],
          ["Locked", readModel.summary.lockedSegments.toString()],
          ["Audit events", readModel.summary.auditEvents.toString()],
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
              <h2 className="font-semibold">North Star chain</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each row is a value-stream segment, not a standalone dashboard tile.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {readModel.segments.map((segment) => (
              <div key={segment.key} className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_160px_120px] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{segment.label}</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${segmentTone[segment.status]}`}>
                      {stateLabel(segment.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{segment.recordSignal}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{segment.nextAction}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--ink-muted)]">{segment.ownerRole}</span>
                <span className="rounded-[8px] bg-white p-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">{segment.auditState}</span>
              </div>
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
              <Eye className="h-5 w-5 text-[var(--accent)]" />
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
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Audit events</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.auditEvents.map((event) => (
              <article key={event.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{event.label}</strong>
                  <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                    {event.state}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{event.source}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
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
        </aside>
      </section>
    </section>
  );
}
