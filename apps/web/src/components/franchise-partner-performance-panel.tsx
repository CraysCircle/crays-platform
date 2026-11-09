"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { FranchisePartnerPerformanceReadModel, FranchisePartnerPerformanceRecord } from "@/db/franchise-partner-performance-read-model-repository";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type Payload = {
  status: "ready" | "forbidden";
  readModel: FranchisePartnerPerformanceReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandState = { status: string; message: string; commandId: string | null; applyGate: string | null };

const performanceRoles = new Set(["admin", "crays-management", "reviewer", "finance", "deal-manager", "studio-manager", "franchise-partner"]);
const toneByStatus: Record<DecisionStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null || value === undefined) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return titleCase(value);
  if (unit === "EUR") return `EUR ${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  if (unit === "members") return `${value.toLocaleString("en-US")} members`;
  if (unit === "records") return `${value.toLocaleString("en-US")} records`;
  if (unit === "visits") return `${value.toLocaleString("en-US")} visits`;
  if (unit === "visits_per_month") return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} visits/month`;
  if (unit === "cases_per_1000_members") return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}/1,000 members`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function deltaLabel(value: number | null, unit: string | null) {
  if (value === null) return "no delta";
  const sign = value > 0 ? "+" : "";
  if (unit === "percent") return `${sign}${(value * 100).toFixed(Math.abs(value) < 0.02 ? 1 : 0)} pp vs benchmark`;
  if (unit === "EUR") return `${sign}EUR ${Math.round(value).toLocaleString("en-US")} vs benchmark`;
  return `${sign}${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} vs benchmark`;
}

function shortDate(value: string | null) {
  if (!value) return "not synced";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function freshness(minutes: number | null) {
  if (minutes === null) return "freshness not recorded";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function fieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replaceAll("_", " ");
  return null;
}

function facts(record: FranchisePartnerPerformanceRecord) {
  const hidden = new Set([
    "moduleKey",
    "seedBatch",
    "sourceAsOf",
    "sourceWritesEnabled",
    "syncApplyEnabled",
    "targetApplyEnabled",
    "paymentInitiationEnabled",
    "financePostingEnabled",
    "accountingExportsEnabled",
    "externalSendingEnabled",
    "liveAiEnabled",
    "partnerId",
    "partnerName",
    "companyName",
    "franchisePartnerId",
  ]);
  return Object.entries(record.fields)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => [titleCase(key), fieldValue(value)] as const)
    .filter(([, value]) => value)
    .slice(0, 10);
}

async function loadPerformance(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/analytics/franchise-partner-performance/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 403) throw new Error(`Franchise Partner Performance read model returned HTTP ${response.status}`);
  return payload;
}

async function stagePartnerReview(role: string, readModel: FranchisePartnerPerformanceReadModel, record: FranchisePartnerPerformanceRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `franchise-partner-performance:${record.id}:${role}:block50-v1`,
      actorRole: role,
      commandType: readModel.actions.commandType,
      action: readModel.actions.action,
      title: `Review ${record.metricLabel}`,
      notes: `${record.nextAction} This stores a partner performance review command only; no source write, external release, payment, finance posting or apply action is executed.`,
      status: record.status,
      syncMappingId: record.id,
      sourceModule: "analytics",
      targetModule: "franchise-partner",
      entityTypeKey: record.craysEntityType,
      conflictClass: "franchise-partner-performance-review",
      retryClass: "manual_review",
      rollbackPlan: "Supersede or cancel this Core draft before any future apply gate is considered.",
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Partner performance review stored in Command History. Apply remains closed." : "Partner performance review stored in Command History.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function FranchisePartnerPerformancePanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const clientRoleAllowed = performanceRoles.has(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState("all");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [studio, setStudio] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadPerformance(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Franchise Partner Performance data unavailable." });
      });
    return () => controller.abort();
  }, [clientRoleAllowed, role, refreshKey]);

  const readModel = loadState.data?.readModel;
  const familyScopedRecords = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesFamily = family === "all" || record.family === family;
      const haystack = [record.label, record.partnerName, record.companyName, record.studioName, record.metricLabel, record.status, record.priority, record.ownerRole, record.currentState, record.nextAction, ...record.sourceDatasets].join(" ").toLowerCase();
      return matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, search]);
  const statusScopedRecords = useMemo(() => familyScopedRecords.filter((record) => status === "all" || record.status === status), [familyScopedRecords, status]);
  const ownerScopedRecords = useMemo(() => statusScopedRecords.filter((record) => owner === "all" || record.ownerRole === owner), [owner, statusScopedRecords]);
  const records = useMemo(() => ownerScopedRecords.filter((record) => studio === "all" || record.studioName === studio), [ownerScopedRecords, studio]);
  const statusOptions = useMemo(() => (readModel?.controls.statuses ?? []).map((option) => ({ ...option, rows: familyScopedRecords.filter((record) => record.status === option.key).length })).filter((option) => option.rows > 0), [familyScopedRecords, readModel?.controls.statuses]);
  const ownerOptions = useMemo(() => (readModel?.controls.owners ?? []).map((option) => ({ ...option, rows: statusScopedRecords.filter((record) => record.ownerRole === option.key).length })).filter((option) => option.rows > 0), [readModel?.controls.owners, statusScopedRecords]);
  const studioOptions = useMemo(() => (readModel?.controls.studios ?? []).map((option) => ({ ...option, rows: ownerScopedRecords.filter((record) => record.studioName === option.key).length })).filter((option) => option.rows > 0), [ownerScopedRecords, readModel?.controls.studios]);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (!clientRoleAllowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><BarChart3 className="h-4 w-4" /> Partner Performance</p>
        <h2 className="mt-2 text-2xl font-semibold">Partner performance is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">This role is outside the internal partner performance workflow. Released stakeholder packages are handled in external portals.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Franchise Partner Performance records</section>;

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Franchise Partner Performance unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><BarChart3 className="h-4 w-4" /> Partner Performance</p>
        <h2 className="mt-2 text-2xl font-semibold">Partner performance is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><BarChart3 className="h-4 w-4 text-emerald-700" /> Analytics / Franchise Partner Performance</p>
          <h2 className="mt-2 text-2xl font-semibold">Franchise partner performance workflow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Member growth, payments, operations recovery, support load and forecast performance are linked into one partner-safe operating view.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.records} scoped records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} performance records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.linkedMemberSourceRecords} member records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.linkedFinanceRecoveryRecords} finance recovery records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.linkedOperationsRecoveryRecords} operations recovery records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.criticalRows} critical</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setStatus("all");
            setOwner("all");
            setStudio("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
            setRefreshKey((value) => value + 1);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh performance
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setFamily(card.filterFamily);
              setStatus("all");
              setOwner("all");
              setStudio("all");
              setSearch(card.searchTerm);
              setSelectedId(null);
              setCommandState(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <ShieldCheck className="h-5 w-5" />
            <p className="mt-4 text-xs font-semibold uppercase">{card.label}</p>
            <strong className="mt-2 block text-2xl">{card.value}</strong>
            <p className="mt-2 text-xs leading-5">{card.context}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_390px]">
        <div className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white">
          <div className="space-y-3 border-b border-[var(--line)] p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All workflows {readModel.summary.records}</button>
              {readModel.controls.families.map((option) => (
                <button key={option.key} type="button" onClick={() => setFamily(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStatus("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${status === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All statuses</button>
              {statusOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setStatus(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${status === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setOwner("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${owner === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All owners</button>
              {ownerOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setOwner(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${owner === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStudio("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${studio === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All studios</button>
              {studioOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setStudio(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${studio === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search partner performance records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search studio, metric, owner, source or exception" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Performance record</th>
                  <th className="px-4 py-3 font-semibold">Studio</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Benchmark</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.family.replaceAll("-", " ")}</p></td>
                    <td className="px-4 py-3">{record.studioName}</td>
                    <td className="px-4 py-3 font-semibold">{formatValue(record.value, record.unit)}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">{formatValue(record.benchmarkValue, record.unit)}</td>
                    <td className="px-4 py-3">{titleCase(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No partner performance records match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected performance workflow</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Partner", `${selectedRecord.partnerName} / ${selectedRecord.companyName}`],
                ["Studio", selectedRecord.studioName],
                ["Workflow", selectedRecord.family.replaceAll("-", " ")],
                ["Value", formatValue(selectedRecord.value, selectedRecord.unit)],
                ["Benchmark", formatValue(selectedRecord.benchmarkValue, selectedRecord.unit)],
                ["Delta", deltaLabel(selectedRecord.benchmarkDelta, selectedRecord.unit)],
                ["Status", titleCase(selectedRecord.status)],
                ["Owner", selectedRecord.ownerRole],
                ["Updated", shortDate(selectedRecord.lastSyncedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source datasets</p>
                <p className="mt-1 leading-6">{selectedRecord.sourceDatasets.join(", ")}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Current state</p>
                <p className="mt-1 leading-6">{selectedRecord.currentState}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source facts</p>
                <div className="mt-2 space-y-2">
                  {facts(selectedRecord).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[135px_minmax(0,1fr)] gap-2 text-xs">
                      <span className="text-[var(--ink-muted)]">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-1 leading-6">{selectedRecord.nextAction}</p>
              </div>
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected workflow <ArrowRight className="h-4 w-4" /></a>
              {readModel.actions.stagePerformanceReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging partner performance review", commandId: null, applyGate: null });
                    stagePartnerReview(role, readModel, selectedRecord)
                      .then((result) => {
                        setCommandState(result);
                        setRefreshKey((value) => value + 1);
                      })
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Stage partner review
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">This role can inspect the performance workflow. Command staging is reserved for authorized internal roles.</p>
              )}
              {commandState ? (
                <div className={`rounded-[8px] border p-3 text-xs ${commandState.status === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <p className="font-semibold">{commandState.message}</p>
                  {commandState.commandId ? <p className="mt-1">Command History updated.</p> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a performance row to inspect source facts, benchmark delta, connected workflow routing or review action.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
