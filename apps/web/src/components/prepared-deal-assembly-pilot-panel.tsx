"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, FileCheck2, LockKeyhole, PackageCheck, RefreshCw, Route, ShieldCheck, Workflow } from "lucide-react";
import {
  emptyPreparedDealAssemblyReadiness,
  type PreparedDealAssemblyReadiness,
} from "@/lib/pilot-prepared-deal-assembly-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: PreparedDealAssemblyReadiness;
  liveBusinessRecordsReturned: boolean;
  liveExternalReadsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  packageRecordsWritten: false;
  commandRecordsWritten: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const laneTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  pending: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const functionTone = {
  represented: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  deferred_until_exact_gate: "border-amber-700/20 bg-amber-50 text-amber-950",
};

function statusLabel(value: string | null | undefined) {
  return (value ?? "none").replaceAll("_", " ");
}

async function loadPreparedDealAssembly(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/prepared-deal-assembly/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Prepared Deal Assembly returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function PreparedDealAssemblyPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyPreparedDealAssemblyReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadPreparedDealAssembly(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Prepared Deal Assembly failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const record = readModel.records[0];
  const boundaryRows = useMemo(
    () => [
      { label: "Package writes", enabled: readModel.boundaries.packageRecordWritesEnabled },
      { label: "Tool apply", enabled: readModel.boundaries.toolApplyEnabled },
      { label: "Candidate Deal Room", enabled: readModel.boundaries.candidateDealRoomEnabled },
      { label: "Candidate release", enabled: readModel.boundaries.candidateReleaseEnabled },
      { label: "Bank package creation", enabled: readModel.boundaries.bankPackageCreationEnabled },
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
              <PackageCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Prepared Deal Assembly pilot</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Prepared deal assembly</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Property, evidence, documents, economics, Project signals and CRM activity are assembled into an internal package view before any Candidate or Bank release.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Prepared Deal Assembly pilot"
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
          ["Packages", readModel.summary.assemblyPackages.toString()],
          ["Prepared offers", readModel.summary.preparedOffers.toString()],
          ["Evidence", readModel.summary.evidencePackages.toString()],
          ["Documents", `${readModel.summary.approvedDocumentLinks}/${readModel.summary.documentLinks}`],
          ["Project signals", readModel.summary.projectSignals.toString()],
          ["CRM signals", readModel.summary.crmSignals.toString()],
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
              <BriefcaseBusiness className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Internal package assembly</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">The package is internal until the next release-gated Candidate flow approves sections.</p>
          </div>

          {record ? (
            <div className="p-4">
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{record.offerTitle ?? record.title}</h3>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      {record.market ?? ([record.city, record.country].filter(Boolean).join(", ") || "Market pending")}
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-[var(--ink-muted)]">{record.caseId}</p>
                    {record.preparedOfferId ? <p className="mt-1 break-all font-mono text-xs text-[var(--ink-muted)]">{record.preparedOfferId}</p> : null}
                  </div>
                  <span className="rounded-[7px] border border-amber-700/20 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-amber-950">
                    {statusLabel(record.offerStatus)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {[
                    ["Case handoff", statusLabel(record.handoffStatus)],
                    ["Release state", statusLabel(record.candidateReleaseState)],
                    ["Workflow events", record.counts.workflowEvents.toString()],
                    ["Release gates", `${record.counts.blockedReleaseGates}/${record.counts.releaseGates}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[8px] bg-[var(--surface)] p-3">
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                      <strong className="mt-1 block text-sm">{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {record.assemblyLanes.map((lane) => (
                    <div key={lane.key} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm">{lane.label}</strong>
                        <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${laneTone[lane.status]}`}>
                          {lane.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{lane.requiredFor}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">{lane.current}</p>
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
            <div className="px-5 py-8 text-sm text-[var(--ink-muted)]">No internal prepared package records are visible for this role.</div>
          )}
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Module signals</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["Project", record?.counts.projectSignals ?? readModel.summary.projectSignals],
                ["CRM", record?.counts.crmSignals ?? readModel.summary.crmSignals],
                ["Files", record?.counts.filesSignals ?? 0],
                ["ERP", record?.counts.erpSignals ?? 0],
                ["Analytics", record?.counts.analyticsSignals ?? 0],
                ["Loans", record?.counts.loansSignals ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              <h2 className="font-semibold">Side-effect gates</h2>
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
              <FileCheck2 className="h-5 w-5 text-[var(--accent)]" />
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
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Visible surfaces</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {readModel.visibleSurfaces.map((item) => (
                <span key={item.surface} className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">
                  {item.surface}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Benchmark context</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3">
                <span className="text-[var(--ink-muted)]">Prepared deals</span>
                <strong>{readModel.benchmark.preparedDeals}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3">
                <span className="text-[var(--ink-muted)]">Rent ready</span>
                <strong>{readModel.benchmark.rentReadyProperties}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3">
                <span className="text-[var(--ink-muted)]">Economics ready</span>
                <strong>{readModel.benchmark.economicsReadyDeals}</strong>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
