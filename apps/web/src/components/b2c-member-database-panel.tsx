"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, RefreshCw, Search, UsersRound } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type MemberRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  memberId: string;
  memberName: string;
  status: string;
  priority: string;
  value: string | number | boolean | null;
  unit: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
  fields: Record<string, unknown>;
};

type Payload = {
  status: "ready" | "forbidden";
  readModel: {
    access: { allowed: boolean; reason: string; canStageReview: boolean };
    summary: {
      records: number;
      sourceRecords: number;
      members: number;
      activeMembers: number;
      pausedMembers: number;
      trialMembers: number;
      contracts: number;
      invoices: number;
      payments: number;
      failedPayments: number;
      refunds: number;
      cancellations: number;
      chargebacks: number;
      bookings: number;
      checkIns: number;
      supportRequests: number;
      consents: number;
      conflicts: number;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterFamily: string; searchTerm: string }>;
    records: MemberRecord[];
    controls: {
      families: Array<{ key: string; label: string; rows: number }>;
      statuses: Array<{ key: string; label: string; rows: number }>;
    };
    actions: {
      stageReviewAllowed: boolean;
      commandRoute: "/api/crays/core-command/sync-preview";
      confirmationHeader: "stage-sync-preview-command";
      commandType: "diff_review";
      action: "classify_diff";
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
const memberDatabaseRoles = new Set(["admin", "crays-management", "reviewer", "finance", "studio-manager", "franchise-partner", "gym-member"]);

function formatValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null || value === undefined) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (unit === "EUR") return `EUR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  return new Date(value).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fieldLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replaceAll("_", " ");
  return null;
}

function facts(record: MemberRecord) {
  const hidden = new Set(["moduleKey", "seedBatch", "sourceAsOf", "memberAppApiWritesEnabled", "sourceWritesEnabled", "syncApplyEnabled", "targetApplyEnabled", "paymentInitiationEnabled", "financePostingEnabled", "externalSendingEnabled", "liveAiEnabled", "memberId"]);
  return Object.entries(record.fields)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => [fieldLabel(key), fieldValue(value)] as const)
    .filter(([, value]) => value)
    .slice(0, 10);
}

async function loadMemberDatabase(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/operations/member-database/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 403) throw new Error(`Member Database read model returned HTTP ${response.status}`);
  return payload;
}

async function stageMemberReview(role: string, readModel: Payload["readModel"], record: MemberRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `b2c-member-database:${record.id}:${role}:v1`,
      actorRole: role,
      commandType: readModel.actions.commandType,
      action: readModel.actions.action,
      title: `Review ${record.label}`,
      notes: `${record.nextAction} This stores a source review command only; no payment, posting or source apply is executed.`,
      status: record.status,
      syncMappingId: record.id,
      sourceModule: "operations",
      targetModule: record.family,
      entityTypeKey: record.craysEntityType,
      conflictClass: "b2c-member-database-review",
      retryClass: "manual_review",
      rollbackPlan: "Supersede this Core draft if the member source record changes.",
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Member source review stored; apply remains closed." : "Member source review stored.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function B2cMemberDatabasePanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const clientRoleAllowed = memberDatabaseRoles.has(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadMemberDatabase(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Member Database data unavailable." });
      });
    return () => controller.abort();
  }, [clientRoleAllowed, role]);

  const readModel = loadState.data?.readModel;
  const familyScopedRecords = useMemo(() => {
    const rows = readModel?.records ?? [];
    const familySelection = family.split("|").filter(Boolean);
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesFamily = family === "all" || familySelection.includes(record.family);
      const haystack = [record.label, record.memberName, record.family, record.status, record.nextAction].join(" ").toLowerCase();
      return matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, search]);
  const records = useMemo(() => {
    return familyScopedRecords.filter((record) => status === "all" || record.status === status);
  }, [familyScopedRecords, status]);
  const statusOptions = useMemo(
    () =>
      (readModel?.controls.statuses ?? [])
        .map((option) => ({ ...option, rows: familyScopedRecords.filter((record) => record.status === option.key).length }))
        .filter((option) => option.rows > 0),
    [familyScopedRecords, readModel?.controls.statuses],
  );
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (!clientRoleAllowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><UsersRound className="h-4 w-4" /> B2C Member Database</p>
        <h2 className="mt-2 text-2xl font-semibold">Member database is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">This role is outside the B2C member database scope. Internal operating roles and the scoped member role can inspect permitted member records.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading B2C Member Database records</section>;

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">B2C Member Database unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><UsersRound className="h-4 w-4" /> B2C Member Database</p>
        <h2 className="mt-2 text-2xl font-semibold">Member database is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><UsersRound className="h-4 w-4 text-emerald-700" /> B2C Member Database</p>
          <h2 className="mt-2 text-2xl font-semibold">Berlin Mitte member operating database</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">Member profiles, contracts, invoices, payments, cancellations, refunds, chargebacks, bookings, check-ins, support, training and consent records are stored as source-backed operating data.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.members} members</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setStatus("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset member view
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setFamily(card.filterFamily);
              setStatus("all");
              setSearch(card.searchTerm);
              setSelectedId(null);
              setCommandState(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <UsersRound className="h-5 w-5" />
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
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All families {readModel.summary.records}</button>
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
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search member database records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members, payments, bookings or support records" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Record</th>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.family.replaceAll("_", " ")}</p></td>
                    <td className="px-4 py-3">{record.memberName}</td>
                    <td className="px-4 py-3 font-semibold">{formatValue(record.value, record.unit)}</td>
                    <td className="px-4 py-3">{record.status.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No member records match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected member source</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Member", selectedRecord.memberName],
                ["Family", selectedRecord.family.replaceAll("_", " ")],
                ["Value", formatValue(selectedRecord.value, selectedRecord.unit)],
                ["Status", selectedRecord.status.replaceAll("_", " ")],
                ["Priority", selectedRecord.priority],
                ["Updated", shortDate(selectedRecord.lastSyncedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source facts</p>
                <div className="mt-2 space-y-2">
                  {facts(selectedRecord).map(([label, value]) => (
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
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected workflow <ArrowRight className="h-4 w-4" /></a>
              {readModel.actions.stageReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging member source review", commandId: null, applyGate: null });
                    stageMemberReview(role, readModel, selectedRecord)
                      .then((result) => setCommandState(result))
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Stage member review
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">This role can inspect scoped member data. Source review staging is reserved for internal operating roles.</p>
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
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a member database row to inspect source facts, workflow routing or review action.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
