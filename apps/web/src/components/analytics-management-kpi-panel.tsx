"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DrillKey = "portfolio" | "financial" | "members" | "bank" | "evidence" | "opening";
type KpiStatus = "ready" | "attention" | "blocked";

type DrillRow = {
  id: string;
  label: string;
  moduleKey: string;
  moduleLabel: string;
  family: string;
  status: string;
  owner: string;
  sourceType: "source-map" | "core-command";
  sourceLabel: string;
  entityType: string;
  entityId: string | null;
  evidence: string;
  nextAction: string;
  href: string;
  lastUpdatedAt: string | null;
};

type Kpi = {
  key: string;
  label: string;
  value: string;
  status: KpiStatus;
  ownerRole: string;
  source: string;
  drillKey: DrillKey;
  context: string;
};

type Payload = {
  status: "ready" | "forbidden";
  readModel: {
    access: { allowed: boolean; level: string; reason: string };
    caseContext: { title: string; journey: string; ownerRole: string; consumingRoles: string[] };
    summary: {
      kpis: number;
      drillRows: number;
      sourceMaps: number;
      sourceConflicts: number;
      financialModelRecords: number;
      memberRecords: number;
      paymentExceptionRecords: number;
      evidenceRecords: number;
      bankRecords: number;
      commandDrafts: number;
      applyBlockedCommands: number;
      freshnessMinutes: number | null;
    };
    kpis: Kpi[];
    drilldowns: Record<DrillKey, DrillRow[]>;
    moduleHealth: Array<{
      moduleKey: string;
      label: string;
      sourceMaps: number;
      conflicts: number;
      status: KpiStatus;
      lastSyncedAt: string | null;
      nextAction: string;
    }>;
    controls: { drillFilters: Array<{ key: DrillKey; label: string; rows: number }> };
    boundaries: {
      sourceWritesEnabled: false;
      syncApplyEnabled: false;
      toolApplyEnabled: false;
      reportPublicationEnabled: false;
      externalSendingEnabled: false;
      candidateReleaseEnabled: false;
      bankSendEnabled: false;
      paymentInitiationEnabled: false;
      financePostingEnabled: false;
      liveAiEnabled: false;
      secretsReturned: false;
      privateKeysReturned: false;
    };
    queryStatus: "schema_ready" | "not_configured" | "forbidden";
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const iconByDrill: Record<DrillKey, typeof BarChart3> = {
  portfolio: AlertTriangle,
  financial: BarChart3,
  members: Users,
  bank: ShieldCheck,
  evidence: FileCheck2,
  opening: Building2,
};

const toneByStatus: Record<KpiStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function formatFreshness(minutes: number | null) {
  if (minutes === null) return "freshness not recorded";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function shortDate(value: string | null) {
  if (!value) return "not synced";
  return new Date(value).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isReleaseBlockedRole(role: string) {
  return role === "guest" || role === "franchise-candidate";
}

async function loadManagementKpis(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/analytics/management-kpis/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Management KPI read model returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function AnalyticsManagementKpiPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const initialDrill = (searchParams.get("kpi") as DrillKey | null) ?? "portfolio";
  const releaseBlockedRole = isReleaseBlockedRole(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeDrill, setActiveDrill] = useState<DrillKey>(initialDrill);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (releaseBlockedRole) {
      return;
    }
    const controller = new AbortController();
    loadManagementKpis(role, controller.signal)
      .then((data) => {
        setLoadState({ state: "ready", data, error: null });
        const requested = (searchParams.get("kpi") as DrillKey | null) ?? "portfolio";
        if (data.readModel.controls.drillFilters.some((filter) => filter.key === requested)) {
          setActiveDrill(requested);
        }
        setSelectedId(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Management KPI data unavailable." });
      });
    return () => controller.abort();
  }, [refreshKey, releaseBlockedRole, role, searchParams]);

  const readModel = loadState.data?.readModel ?? null;
  const rows = useMemo(() => readModel?.drilldowns[activeDrill] ?? [], [activeDrill, readModel]);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.label, row.moduleLabel, row.family, row.status, row.owner, row.evidence, row.nextAction]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, rows]);
  const selectedRow = filteredRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? null;

  if (releaseBlockedRole) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <p className="text-xs font-semibold uppercase">Analytics access boundary</p>
        <h2 className="mt-2 text-2xl font-semibold">Management KPI drilldown is not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          This role can only see released stakeholder packages. Internal management KPI records stay hidden until package preflight, redaction and release review approve a scoped view.
        </p>
      </section>
    );
  }

  if (loadState.state === "loading") {
    return (
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading management KPI drilldowns
        </div>
      </section>
    );
  }

  if (loadState.state === "error") {
    return <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{loadState.error}</section>;
  }

  if (!readModel?.access.allowed) return null;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Analytics workbench</p>
            <h2 className="mt-2 text-2xl font-semibold">{readModel.caseContext.title}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">{readModel.caseContext.journey}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">{readModel.caseContext.ownerRole}</span>
              <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">
                {readModel.summary.sourceMaps} source maps
              </span>
              <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">
                {formatFreshness(readModel.summary.freshnessMinutes)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readModel.kpis.map((kpi) => {
          const Icon = iconByDrill[kpi.drillKey];
          return (
            <button
              type="button"
              key={kpi.key}
              onClick={() => {
                setActiveDrill(kpi.drillKey);
                setSelectedId(null);
              }}
              className={`rounded-[8px] border p-4 text-left transition hover:-translate-y-0.5 ${activeDrill === kpi.drillKey ? toneByStatus[kpi.status] : "border-[var(--line)] bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className="h-5 w-5 text-[var(--accent)]" />
                <span className="rounded-[7px] border border-current/20 px-2 py-1 text-[10px] font-semibold uppercase">{kpi.status}</span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase opacity-75">{kpi.label}</p>
              <strong className="mt-2 block text-3xl">{kpi.value}</strong>
              <span className="mt-2 block text-xs leading-5 opacity-80">{kpi.context}</span>
              <span className="mt-3 block text-xs font-semibold">{kpi.ownerRole} · {kpi.source}</span>
            </button>
          );
        })}
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              {readModel.controls.drillFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => {
                    setActiveDrill(filter.key);
                    setSelectedId(null);
                  }}
                  className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${
                    activeDrill === filter.key ? "bg-black text-white" : "border border-[var(--line)] bg-white text-[var(--foreground)]"
                  }`}
                >
                  {filter.label} <span className="ml-1 opacity-70">{filter.rows}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search KPI records</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search KPI records, owners, sources or actions"
              />
            </label>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_130px_150px] gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">
            <span>Record</span>
            <span>Status</span>
            <span>Owner</span>
          </div>
          {filteredRows.length ? (
            filteredRows.map((row) => (
              <button
                type="button"
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_130px_150px] gap-3 border-b border-[var(--line)] px-4 py-3 text-left text-sm last:border-0 ${
                  selectedRow?.id === row.id ? "bg-emerald-50" : "bg-white"
                }`}
              >
                <span className="min-w-0">
                  <strong className="block truncate">{row.label}</strong>
                  <span className="mt-1 block truncate text-xs text-[var(--ink-muted)]">
                    {row.moduleLabel} · {row.family} · {row.sourceLabel}
                  </span>
                </span>
                <span>{row.status}</span>
                <span className="truncate text-[var(--ink-muted)]">{row.owner}</span>
              </button>
            ))
          ) : (
            <p className="p-5 text-sm text-[var(--ink-muted)]">No role-visible source records match this filter.</p>
          )}
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--accent)]" />
            <h3 className="font-semibold">Selected source record</h3>
          </div>
          {selectedRow ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Record</p>
                <strong className="mt-1 block">{selectedRow.label}</strong>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{selectedRow.entityType} · {selectedRow.entityId ?? "no entity id"}</p>
              </div>
              <dl className="space-y-3">
                {[
                  ["Module", selectedRow.moduleLabel],
                  ["Family", selectedRow.family],
                  ["Source", selectedRow.sourceLabel],
                  ["Evidence", selectedRow.evidence],
                  ["Updated", shortDate(selectedRow.lastUpdatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] bg-white p-3">
                    <dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-1 leading-6">{selectedRow.nextAction}</p>
              </div>
              <a
                href={selectedRow.href}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white"
                aria-label={`Open ${selectedRow.moduleLabel} workflow for ${selectedRow.label}`}
              >
                Open {selectedRow.moduleLabel} workflow
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">Select a KPI row to inspect source lineage, module owner and next action.</p>
          )}
        </aside>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readModel.moduleHealth.map((module) => (
          <article key={module.moduleKey} className={`rounded-[8px] border p-4 ${toneByStatus[module.status]}`}>
            <div className="flex items-center justify-between gap-3">
              <strong>{module.label}</strong>
              {module.status === "ready" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <p className="mt-3 text-2xl font-semibold">{module.sourceMaps}</p>
            <p className="mt-1 text-xs opacity-80">{module.conflicts} conflicts · {shortDate(module.lastSyncedAt)}</p>
            <p className="mt-3 text-xs leading-5 opacity-80">{module.nextAction}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
