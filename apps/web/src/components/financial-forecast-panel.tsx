"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarRange, LineChart, RefreshCw, Search } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type ForecastStatus = "ready" | "attention" | "blocked";

type ForecastRecord = {
  id: string;
  label: string;
  family: string;
  scenario: string;
  forecastYear: number | null;
  sourceType: string;
  metricKey: string | null;
  metricLabel: string;
  value: string | number | boolean | null;
  unit: string | null;
  audience: string;
  status: string;
  owner: string;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
};

type Payload = {
  status: "ready" | "forbidden" | "release_blocked";
  readModel: {
    summary: {
      records: number;
      sourceRecords: number;
      annualForecasts: number;
      forecastKpis: number;
      scenarios: number;
      years: number;
      blockedReleaseViews: number;
      midCaseYear5Revenue: number | null;
      midCaseYear5Cash: number | null;
      midCaseYear5Members: number | null;
      midCaseYear5Payback: number | null;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: ForecastStatus; drillMetric: string }>;
    records: ForecastRecord[];
    controls: {
      scenarios: Array<{ key: string; label: string; rows: number }>;
      years: Array<{ key: string; label: string; rows: number }>;
      families: Array<{ key: string; label: string; rows: number }>;
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const toneByStatus: Record<ForecastStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function formatValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null || value === undefined) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  if (unit === "EUR") return `€${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function freshness(minutes: number | null) {
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

async function loadForecast(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/financial-model/forecast-5y/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`5-year forecast read model returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function FinancialForecastPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const releaseBlockedRole = isReleaseBlockedRole(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [scenario, setScenario] = useState("Mid-Case");
  const [year, setYear] = useState("2031");
  const [family, setFamily] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (releaseBlockedRole) {
      return;
    }
    const controller = new AbortController();
    loadForecast(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "5-year forecast data unavailable." });
      });
    return () => controller.abort();
  }, [releaseBlockedRole, role]);

  const readModel = loadState.data?.readModel;
  const records = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesScenario = scenario === "all" || record.scenario === scenario || record.scenario === "Shared";
      const matchesYear = year === "all" || String(record.forecastYear ?? "") === year || record.forecastYear === null;
      const matchesFamily = family === "all" || record.family === family;
      const haystack = [record.label, record.family, record.scenario, record.metricKey, record.metricLabel, record.audience, record.nextAction].join(" ").toLowerCase();
      return matchesScenario && matchesYear && matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, scenario, search, year]);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (releaseBlockedRole) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-xs font-semibold uppercase">Forecast package release preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">5-year forecast metrics are not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          Forecast records remain internal until a stakeholder package is reviewed with scenario, time horizon, audience and redaction scope.
        </p>
      </section>
    );
  }

  if (loadState.state === "loading") {
    return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading 5-year forecast records</section>;
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">5-year forecast unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><CalendarRange className="h-4 w-4 text-emerald-700" /> Forecast extension</p>
          <h2 className="mt-2 text-2xl font-semibold">5-year financial forecast</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">Year 1-3 are sourced from the workbook baseline. Year 4-5 use explicit forecast-extension assumptions and remain review-gated before external release.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.forecastKpis} KPI records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setScenario("Mid-Case");
            setYear("2031");
            setFamily("all");
            setSearch("");
            setSelectedId(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset forecast
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setFamily("forecast-kpis");
              setScenario("Mid-Case");
              setYear("2031");
              setSearch(card.drillMetric);
              setSelectedId(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <LineChart className="h-5 w-5" />
            <p className="mt-4 text-xs font-semibold uppercase">{card.label}</p>
            <strong className="mt-2 block text-2xl">{card.value}</strong>
            <p className="mt-2 text-xs leading-5">{card.context}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white">
          <div className="space-y-3 border-b border-[var(--line)] p-4">
            <div className="flex flex-wrap gap-2">
              {["Mid-Case", "Worst-Case", "Best-Case", "Shared", "all"].map((option) => (
                <button key={option} type="button" onClick={() => setScenario(option)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${scenario === option ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option === "all" ? "All scenarios" : option}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {["2031", "2030", "2029", "2028", "2027", "all"].map((option) => (
                <button key={option} type="button" onClick={() => setYear(option)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${year === option ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option === "all" ? "All years" : option}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All families {readModel.summary.records}
              </button>
              {readModel.controls.families.map((option) => (
                <button key={option.key} type="button" onClick={() => setFamily(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search forecast records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search forecast metrics, audiences or years" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Metric</th>
                  <th className="px-4 py-3 font-semibold">Scenario</th>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => setSelectedId(record.id)} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.metricLabel}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.label}</p></td>
                    <td className="px-4 py-3">{record.scenario}</td>
                    <td className="px-4 py-3">{record.forecastYear ?? "Shared"}</td>
                    <td className="px-4 py-3 font-semibold">{formatValue(record.value, record.unit)}</td>
                    <td className="px-4 py-3">{record.audience}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No forecast records match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected forecast source</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Scenario", selectedRecord.scenario],
                ["Year", selectedRecord.forecastYear ?? "Shared"],
                ["Value", formatValue(selectedRecord.value, selectedRecord.unit)],
                ["Audience", selectedRecord.audience],
                ["Source type", selectedRecord.sourceType.replaceAll("_", " ")],
                ["Status", selectedRecord.status],
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
                Open forecast workflow
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a forecast row to inspect source lineage and workflow routing.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
