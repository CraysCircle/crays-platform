"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Banknote, Building2, CheckCircle2, FileSpreadsheet, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type FinancialStatus = "ready" | "attention" | "blocked";

type FinancialRecord = {
  id: string;
  label: string;
  family: string;
  scenario: string;
  status: string;
  owner: string;
  audience: string;
  category: string;
  metricKey: string | null;
  value: string | number | boolean | null;
  unit: string | null;
  sourceSheet: string | null;
  sourceRef: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
};

type Payload = {
  status: "ready" | "forbidden" | "release_blocked";
  readModel: {
    access: { allowed: boolean; level: string; reason: string };
    caseContext: { title: string; journey: string; ownerRole: string; consumingRoles: string[] };
    summary: {
      records: number;
      families: number;
      scenarios: number;
      kpiRows: number;
      workbookRecords: number;
      blockedReleaseViews: number;
      midCaseMembersEndYear3: number | null;
      midCaseRevenueYear3: number | null;
      midCaseResultYear3: number | null;
      midCaseCashflowEndYear3: number | null;
      midCasePaybackYears: number | null;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{
      key: string;
      label: string;
      value: string;
      context: string;
      status: FinancialStatus;
      audience: string;
      drillFamily: string;
    }>;
    stakeholderViews: Array<{
      audience: string;
      label: string;
      visibleMetrics: string[];
      hiddenMetrics: string[];
      nextAction: string;
      status: string;
    }>;
    records: FinancialRecord[];
    controls: {
      families: Array<{ key: string; label: string; rows: number }>;
      scenarios: Array<{ key: string; label: string; rows: number }>;
    };
    boundaries: {
      sourceWritesEnabled: false;
      syncApplyEnabled: false;
      targetApplyEnabled: false;
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

const toneByStatus: Record<FinancialStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function formatValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null || value === undefined) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  if (unit === "EUR" || unit?.startsWith("EUR ")) return `€${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "x") return `${value.toFixed(1)}x`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  if (unit?.includes("sqm")) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function shortDate(value: string | null) {
  if (!value) return "not synced";
  return new Date(value).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function freshness(minutes: number | null) {
  if (minutes === null) return "freshness not recorded";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function isReleaseBlockedRole(role: string) {
  return role === "guest" || role === "franchise-candidate";
}

async function loadFinancialWorkbook(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/financial-model/workbook/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Financial workbook read model returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function FinancialWorkbookPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const releaseBlockedRole = isReleaseBlockedRole(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState<string>("all");
  const [scenario, setScenario] = useState<string>("Mid-Case");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (releaseBlockedRole) {
      return;
    }
    const controller = new AbortController();
    loadFinancialWorkbook(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Financial workbook data unavailable." });
      });
    return () => controller.abort();
  }, [releaseBlockedRole, role]);

  const readModel = loadState.data?.readModel;

  const records = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFamily = family === "all" || row.family === family;
      const matchesScenario = scenario === "all" || row.scenario === scenario || row.scenario === "Shared";
      const haystack = [row.label, row.family, row.scenario, row.owner, row.audience, row.category, row.metricKey, row.sourceSheet, row.nextAction].join(" ").toLowerCase();
      return matchesFamily && matchesScenario && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, scenario, search]);

  const selectedRecord = records.find((row) => row.id === selectedId) ?? records[0] ?? null;

  if (releaseBlockedRole) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-xs font-semibold uppercase">Financial package release preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">Financial workbook metrics are not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          Financial source records stay internal until a reviewed stakeholder package defines the exact metric grain, redactions and audience scope.
        </p>
      </section>
    );
  }

  if (loadState.state === "loading") {
    return (
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="flex items-center gap-2 text-sm text-[var(--ink-muted)]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading financial workbook records</p>
      </section>
    );
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Financial workbook unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><FileSpreadsheet className="h-4 w-4 text-emerald-700" /> Financial source model</p>
          <h2 className="mt-2 text-2xl font-semibold">Rotkreuzplatz financial model</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">{readModel.caseContext.journey}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">187 workbook records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.records} visible for role</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setScenario("Mid-Case");
            setSearch("");
            setSelectedId(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset view
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readModel.decisionCards.map((card) => {
          const Icon = card.key === "bank-credit" ? Banknote : card.key === "real-estate-rent" ? Building2 : card.key === "release-preflight" ? ShieldAlert : Users;
          return (
            <button
              type="button"
              key={card.key}
              onClick={() => {
                setFamily(card.drillFamily);
                setScenario(card.drillFamily === "site-assumptions" ? "Shared" : "Mid-Case");
                setSelectedId(null);
              }}
              className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="h-5 w-5" />
                <span className="rounded-[6px] bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase">{card.audience}</span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase">{card.label}</p>
              <strong className="mt-2 block text-2xl">{card.value}</strong>
              <p className="mt-2 text-xs leading-5">{card.context}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All families {readModel.summary.records}
              </button>
              {readModel.controls.families.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => setFamily(option.key)}
                  className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}
                >
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Mid-Case", "Worst-Case", "Best-Case", "Shared", "all"].map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setScenario(option)}
                  className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${scenario === option ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}
                >
                  {option === "all" ? "All scenarios" : option}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search financial records</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search metrics, scenarios, audiences or sources"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Record</th>
                  <th className="px-4 py-3 font-semibold">Scenario</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === row.id ? "bg-emerald-50" : "bg-white"}`}
                  >
                    <td className="px-4 py-3">
                      <strong>{row.label}</strong>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">{row.family} · {row.category}</p>
                    </td>
                    <td className="px-4 py-3">{row.scenario}</td>
                    <td className="px-4 py-3 font-semibold">{formatValue(row.value, row.unit)}</td>
                    <td className="px-4 py-3">{row.audience}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-muted)]">{row.sourceSheet ?? "Core source"} {row.sourceRef ? `· ${row.sourceRef}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No financial records match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Selected financial source</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Record</p>
                <strong className="mt-1 block">{selectedRecord.label}</strong>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{selectedRecord.id}</p>
              </div>
              {[
                ["Scenario", selectedRecord.scenario],
                ["Audience", selectedRecord.audience],
                ["Owner", selectedRecord.owner],
                ["Status", selectedRecord.status],
                ["Value", formatValue(selectedRecord.value, selectedRecord.unit)],
                ["Source", `${selectedRecord.sourceSheet ?? "Core source"}${selectedRecord.sourceRef ? ` · ${selectedRecord.sourceRef}` : ""}`],
                ["Updated", shortDate(selectedRecord.lastSyncedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-1 leading-6">{selectedRecord.nextAction}</p>
              </div>
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">
                Open connected workflow
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a financial row to inspect source lineage and workflow routing.</p>
          )}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {readModel.stakeholderViews.map((view) => (
          <article key={view.audience} className={`rounded-[8px] border p-4 ${view.status === "release_blocked" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-[var(--line)] bg-white"}`}>
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{view.audience}</p>
            <h3 className="mt-2 font-semibold">{view.label}</h3>
            <p className="mt-3 text-xs font-semibold uppercase">Visible metrics</p>
            <p className="mt-1 text-xs leading-5">{view.visibleMetrics.slice(0, 3).join(", ")}</p>
            <p className="mt-3 text-xs font-semibold uppercase">Hidden until approved</p>
            <p className="mt-1 text-xs leading-5">{view.hiddenMetrics.slice(0, 3).join(", ")}</p>
            <p className="mt-3 text-xs leading-5">{view.nextAction}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
