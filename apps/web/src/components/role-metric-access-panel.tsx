"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BarChart3, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type MetricAccessRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  roleKey: string;
  roleLabel: string;
  category: string;
  metricKey: string;
  metricLabel: string;
  sourceDataset: string;
  sourceFamily: string;
  value: string | number | boolean | null;
  unit: string | null;
  visibility: string;
  status: string;
  owner: string;
  priority: string;
  accessReason: string;
  href: string;
  nextAction: string;
  lastSyncedAt: string | null;
};

type Payload = {
  status: "ready" | "forbidden" | "release_blocked";
  readModel: {
    access: { allowed: boolean; reason: string; level: string };
    summary: {
      records: number;
      sourceRecords: number;
      metricCatalog: number;
      roleVisibilityRows: number;
      visibleRows: number;
      aggregateRows: number;
      releaseBlockedRows: number;
      hiddenRows: number;
      roleCount: number;
      categories: number;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterRole: string; filterVisibility: string; searchTerm: string }>;
    records: MetricAccessRecord[];
    controls: {
      roles: Array<{ key: string; label: string; rows: number }>;
      categories: Array<{ key: string; label: string; rows: number }>;
      visibilities: Array<{ key: string; label: string; rows: number }>;
      families: Array<{ key: string; label: string; rows: number }>;
    };
    actions: {
      stageReviewAllowed: boolean;
      commandRoute: "/api/crays/core-command/sync-preview";
      confirmationHeader: "stage-sync-preview-command";
      commandType: "diff_review";
      action: "classify_diff";
      applyGate: "OPEN_DEV_SYNC_APPLY";
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandState = { status: string; message: string; commandId: string | null; applyGate: string | null };

const toneByStatus: Record<DecisionStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function formatValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null || value === undefined) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  if (unit === "EUR") return `EUR ${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "EUR/sqm") return `EUR ${value.toLocaleString("en-US")}/sqm`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "score") return value <= 1 ? `${Math.round(value * 100)}/100` : `${Math.round(value)}/100`;
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

function visibilityLabel(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceLabel(value: string) {
  const labels: Record<string, string> = {
    "financial-workbook": "Financial Workbook",
    "financial-forecast-5y": "Financial Forecast",
    "location-intelligence": "Location Intelligence",
    "member-app": "Member App",
    "files-workflow": "Files Workflow",
    "role-metric-access": "Role Metric Access",
    loans: "Loans",
  };
  return labels[value] ?? visibilityLabel(value);
}

function isReleaseBlockedRole(role: string) {
  return role === "guest" || role === "franchise-candidate";
}

async function loadRoleMetricAccess(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/analytics/role-metric-access/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 423 && response.status !== 403) throw new Error(`Role Metric Access read model returned HTTP ${response.status}`);
  return payload;
}

async function stageVisibilityReview(role: string, readModel: Payload["readModel"], record: MetricAccessRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-crays-dev-confirm": readModel.actions.confirmationHeader,
    },
    body: JSON.stringify({
      idempotencyKey: `role-metric-access:${record.id}:${role}:v1`,
      actorRole: role,
      commandType: readModel.actions.commandType,
      action: readModel.actions.action,
      title: `Review ${record.roleLabel} access for ${record.metricLabel}`,
      notes: `${record.nextAction} This stores a policy review command only.`,
      status: record.status,
      syncMappingId: record.id,
      sourceModule: "analytics",
      targetModule: record.roleLabel,
      entityTypeKey: record.craysEntityType,
      conflictClass: "role-metric-visibility-review",
      retryClass: "manual_review",
      rollbackPlan: "Supersede this Core draft if the metric access policy changes.",
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Visibility review stored; apply remains closed." : "Visibility review stored.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function RoleMetricAccessPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const releaseBlockedRole = isReleaseBlockedRole(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [roleFilter, setRoleFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (releaseBlockedRole) {
      return;
    }
    const controller = new AbortController();
    loadRoleMetricAccess(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Role Metric Access data unavailable." });
      });
    return () => controller.abort();
  }, [releaseBlockedRole, role]);

  const readModel = loadState.data?.readModel;
  const records = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesRole = roleFilter === "all" || record.roleKey === roleFilter;
      const matchesCategory = category === "all" || record.category === category;
      const matchesVisibility = visibility === "all" || record.visibility === visibility;
      const haystack = [record.roleLabel, record.metricLabel, record.category, record.sourceDataset, record.visibility, record.accessReason, record.nextAction].join(" ").toLowerCase();
      return matchesRole && matchesCategory && matchesVisibility && (!term || haystack.includes(term));
    });
  }, [category, readModel?.records, roleFilter, search, visibility]);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (releaseBlockedRole) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><ShieldCheck className="h-4 w-4" /> Metric package release preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">Metric packages are not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          KPI visibility rules stay internal until release review approves the audience, metric grain, hidden rows and redaction policy.
        </p>
      </section>
    );
  }

  if (loadState.state === "loading") {
    return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Role Metric Access records</section>;
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Role Metric Access unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><ShieldCheck className="h-4 w-4" /> Metric package release preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">Metric packages are not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><BarChart3 className="h-4 w-4 text-emerald-700" /> Role Metric Access</p>
          <h2 className="mt-2 text-2xl font-semibold">KPI visibility policy matrix</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Financial, forecast, location, member and package metrics are mapped to role-specific visibility grains so stakeholder views can be built without leaking internal records.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.roleVisibilityRows} role rows</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setRoleFilter("all");
            setCategory("all");
            setVisibility("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset policy view
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setRoleFilter(card.filterRole);
              setVisibility(card.filterVisibility);
              setCategory("all");
              setSearch(card.searchTerm);
              setSelectedId(null);
              setCommandState(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <BarChart3 className="h-5 w-5" />
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
              <button type="button" onClick={() => setRoleFilter("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${roleFilter === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All roles
              </button>
              {readModel.controls.roles.map((option) => (
                <button key={option.key} type="button" onClick={() => setRoleFilter(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${roleFilter === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setCategory("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${category === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All categories
              </button>
              {readModel.controls.categories.map((option) => (
                <button key={option.key} type="button" onClick={() => setCategory(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${category === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setVisibility("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${visibility === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All visibility
              </button>
              {readModel.controls.visibilities.map((option) => (
                <button key={option.key} type="button" onClick={() => setVisibility(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${visibility === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search role metric policy rows</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles, metrics, sources or access reasons" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Metric</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Visibility</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.roleLabel}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.category}</p></td>
                    <td className="px-4 py-3"><strong>{record.metricLabel}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.label}</p></td>
                    <td className="px-4 py-3 font-semibold">{formatValue(record.value, record.unit)}</td>
                    <td className="px-4 py-3">{visibilityLabel(record.visibility)}</td>
                    <td className="px-4 py-3">{sourceLabel(record.sourceDataset)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No Role Metric Access rows match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected metric policy</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.metricLabel}</strong>
              {[
                ["Role", selectedRecord.roleLabel],
                ["Visibility", visibilityLabel(selectedRecord.visibility)],
                ["Value", formatValue(selectedRecord.value, selectedRecord.unit)],
                ["Category", selectedRecord.category],
                ["Source dataset", sourceLabel(selectedRecord.sourceDataset)],
                ["Updated", shortDate(selectedRecord.lastSyncedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Access reason</p>
                <p className="mt-1 leading-6">{selectedRecord.accessReason}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-1 leading-6">{selectedRecord.nextAction}</p>
              </div>
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">
                Open connected workflow
                <ArrowRight className="h-4 w-4" />
              </a>
              {readModel.actions.stageReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging visibility review", commandId: null, applyGate: null });
                    stageVisibilityReview(role, readModel, selectedRecord)
                      .then((result) => setCommandState(result))
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Stage visibility review
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">This role can inspect its scoped metric package. Visibility review staging is reserved for internal review roles.</p>
              )}
              {commandState ? (
                <div className={`rounded-[8px] border p-3 text-xs ${commandState.status === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <p className="font-semibold">{commandState.message}</p>
                  {commandState.commandId ? <p className="mt-1">Stored in Command History.</p> : null}
                  {commandState.applyGate ? <p className="mt-1">Apply remains closed.</p> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a policy row to inspect source, access reason, workflow route or review action.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
