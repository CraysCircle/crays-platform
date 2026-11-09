"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, MapPinned, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type LocationRecord = {
  id: string;
  label: string;
  family: string;
  craysEntityType: string;
  craysEntityId: string;
  audience: string;
  owner: string;
  status: string;
  priority: string;
  metricLabel: string;
  value: string | number | boolean | null;
  unit: string | null;
  scenario: string;
  nextAction: string;
  href: string;
  commandScope: string;
  lastSyncedAt: string | null;
  fields: Record<string, unknown>;
};

type Payload = {
  status: "ready" | "forbidden" | "release_blocked";
  readModel: {
    access: { allowed: boolean; reason: string; level: string };
    summary: {
      records: number;
      sourceRecords: number;
      catchmentBands: number;
      competitionSignals: number;
      stakeholderViews: number;
      releaseBlockedViews: number;
      midCasePotential: number | null;
      localityConfidence: number | null;
      midCaseYear5Revenue: number | null;
      midCaseRentRatio: number | null;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterFamily: string; searchTerm: string }>;
    records: LocationRecord[];
    controls: {
      families: Array<{ key: string; label: string; rows: number }>;
      audiences: Array<{ key: string; label: string; rows: number }>;
      statuses: Array<{ key: string; label: string; rows: number }>;
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

type CommandState = {
  status: string;
  message: string;
  commandId: string | null;
  applyGate: string | null;
};

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
  if (unit === "months") return `${Math.round(value)} months`;
  if (unit === "members") return `${Math.round(value).toLocaleString("en-US")} members`;
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

function displayFieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  return null;
}

function fieldLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function selectedFacts(record: LocationRecord) {
  const hidden = new Set([
    "moduleKey",
    "seedBatch",
    "sourceAsOf",
    "sourceWritesEnabled",
    "syncApplyEnabled",
    "targetApplyEnabled",
    "liveExternalReadEnabled",
    "reportPublicationEnabled",
    "externalSendingEnabled",
    "bankSendEnabled",
    "candidateReleaseEnabled",
    "ownerReleaseEnabled",
    "paymentInitiationEnabled",
    "financePostingEnabled",
    "hiddenUntilRelease",
    "siteId",
    "propertyCaseId",
    "preparedOfferId",
  ]);
  return Object.entries(record.fields)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => [fieldLabel(key), displayFieldValue(value)] as const)
    .filter(([, value]) => value)
    .slice(0, 10);
}

function isReleaseBlockedRole(role: string) {
  return role === "guest" || role === "franchise-candidate";
}

async function loadLocation(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/location-intelligence/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 423 && response.status !== 403) throw new Error(`Location Intelligence read model returned HTTP ${response.status}`);
  return payload;
}

async function stageLocationReview(role: string, readModel: Payload["readModel"], record: LocationRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-crays-dev-confirm": readModel.actions.confirmationHeader,
    },
    body: JSON.stringify({
      idempotencyKey: `location-intelligence:${record.id}:${role}:v1`,
      actorRole: role,
      commandType: readModel.actions.commandType,
      action: readModel.actions.action,
      title: `Review ${record.metricLabel} for Gudrunstrasse 3`,
      notes: `${record.nextAction} Execution remains closed; this command only stores the review draft.`,
      status: record.status,
      syncMappingId: record.id,
      sourceModule: "analytics",
      targetModule: record.audience,
      entityTypeKey: record.craysEntityType,
      conflictClass: record.commandScope,
      retryClass: "manual_review",
      rollbackPlan: "No external write is executed; rollback is limited to superseding this Core draft.",
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Review command stored; apply remains closed." : "Review command stored.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function LocationIntelligencePanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const releaseBlockedRole = isReleaseBlockedRole(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState("all");
  const [audience, setAudience] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (releaseBlockedRole) {
      return;
    }
    const controller = new AbortController();
    loadLocation(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Location Intelligence data unavailable." });
      });
    return () => controller.abort();
  }, [releaseBlockedRole, role]);

  const readModel = loadState.data?.readModel;
  const records = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesFamily = family === "all" || record.family === family;
      const matchesAudience = audience === "all" || record.audience === audience;
      const matchesStatus = status === "all" || record.status === status;
      const haystack = [record.label, record.family, record.metricLabel, record.audience, record.owner, record.scenario, record.nextAction].join(" ").toLowerCase();
      return matchesFamily && matchesAudience && matchesStatus && (!term || haystack.includes(term));
    });
  }, [audience, family, readModel?.records, search, status]);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (releaseBlockedRole) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><ShieldCheck className="h-4 w-4" /> Location Intelligence release preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">Location evidence is not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          Catchment, competition, rent and forecast evidence stay hidden until a reviewed stakeholder package approves the exact visible scope.
        </p>
      </section>
    );
  }

  if (loadState.state === "loading") {
    return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Location Intelligence records</section>;
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Location Intelligence unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><ShieldCheck className="h-4 w-4" /> Location Intelligence release preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">Location evidence is not released for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><MapPinned className="h-4 w-4 text-emerald-700" /> Location Intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold">Gudrunstrasse 3 forecast input workflow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Catchment, member potential, competition, access and rent evidence are stored as Core source records and linked to financial forecast, bank package, real estate decision and franchise partner offer workflows.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.catchmentBands} catchment bands</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setAudience("all");
            setStatus("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset location view
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setFamily(card.filterFamily);
              setSearch(card.searchTerm);
              setAudience("all");
              setStatus("all");
              setSelectedId(null);
              setCommandState(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <MapPinned className="h-5 w-5" />
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
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All families {readModel.summary.records}
              </button>
              {readModel.controls.families.map((option) => (
                <button key={option.key} type="button" onClick={() => setFamily(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAudience("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${audience === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All audiences
              </button>
              {readModel.controls.audiences.map((option) => (
                <button key={option.key} type="button" onClick={() => setAudience(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${audience === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStatus("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${status === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                All statuses
              </button>
              {readModel.controls.statuses.map((option) => (
                <button key={option.key} type="button" onClick={() => setStatus(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${status === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>
                  {option.label} {option.rows}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search location records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search catchment, competition, rent or forecast signals" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.metricLabel}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.label}</p></td>
                    <td className="px-4 py-3 font-semibold">{formatValue(record.value, record.unit)}</td>
                    <td className="px-4 py-3">{record.audience}</td>
                    <td className="px-4 py-3">{record.status}</td>
                    <td className="px-4 py-3">{record.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No Location Intelligence records match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected location evidence</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Family", selectedRecord.family.replaceAll("-", " ")],
                ["Audience", selectedRecord.audience],
                ["Value", formatValue(selectedRecord.value, selectedRecord.unit)],
                ["Status", selectedRecord.status],
                ["Priority", selectedRecord.priority],
                ["Updated", shortDate(selectedRecord.lastSyncedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Evidence facts</p>
                <div className="mt-2 space-y-2">
                  {selectedFacts(selectedRecord).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2 text-xs">
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
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">
                Open connected workflow
                <ArrowRight className="h-4 w-4" />
              </a>
              {readModel.actions.stageReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging review command", commandId: null, applyGate: null });
                    stageLocationReview(role, readModel, selectedRecord)
                      .then((result) => setCommandState(result))
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Stage review command
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">This role can inspect scoped Location Intelligence records. Command staging is reserved for internal review roles.</p>
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
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a Location Intelligence row to inspect evidence, route the workflow or stage a guarded review command.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
