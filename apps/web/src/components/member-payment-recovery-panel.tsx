"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CreditCard, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type PaymentRecoveryRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  memberId: string;
  memberName: string;
  status: string;
  priority: string;
  amountGross: number | null;
  currency: string;
  dueDate: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
  fields: Record<string, unknown>;
};

type Payload = {
  status: "ready" | "forbidden";
  readModel: {
    access: {
      allowed: boolean;
      reason: string;
      canViewLedgerPreview: boolean;
      canStageFinanceReview: boolean;
    };
    summary: {
      records: number;
      sourceRecords: number;
      recoveryCases: number;
      openRecoveryCases: number;
      refundReviews: number;
      cancellationSettlements: number;
      communicationPreflights: number;
      ledgerEvents: number;
      chargebackCases: number;
      criticalCases: number;
      amountAtRisk: number;
      refundsUnderReview: number;
      conflicts: number;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterFamily: string; searchTerm: string }>;
    records: PaymentRecoveryRecord[];
    controls: {
      families: Array<{ key: string; label: string; rows: number }>;
      statuses: Array<{ key: string; label: string; rows: number }>;
      priorities: Array<{ key: string; label: string; rows: number }>;
    };
    actions: {
      stageFinanceReviewAllowed: boolean;
      commandRoute: "/api/crays/core-command/erp-finance";
      confirmationHeader: "stage-erp-finance-command";
      commandType: "finance_summary";
      action: "request_finance_review";
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandState = { status: string; message: string; commandId: string | null; applyGate: string | null };

const recoveryRoles = new Set(["admin", "crays-management", "reviewer", "finance", "deal-manager", "studio-manager", "franchise-partner"]);
const toneByStatus: Record<DecisionStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function money(value: number | null, currency = "EUR") {
  if (value === null) return "not available";
  return `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replaceAll("_", " ");
  return null;
}

function facts(record: PaymentRecoveryRecord) {
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
    "memberId",
  ]);
  return Object.entries(record.fields)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => [fieldLabel(key), fieldValue(value)] as const)
    .filter(([, value]) => value)
    .slice(0, 11);
}

async function loadPaymentRecovery(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/erp/member-payment-recovery/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 403) throw new Error(`Payment Recovery read model returned HTTP ${response.status}`);
  return payload;
}

async function stageFinanceReview(role: string, readModel: Payload["readModel"], record: PaymentRecoveryRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `member-payment-recovery:${record.id}:${role}:v1`,
      actorRole: role,
      commandType: readModel.actions.commandType,
      action: readModel.actions.action,
      title: `Review ${record.label}`,
      notes: `${record.nextAction} This stores a finance review command only; no payment, finance posting, accounting export or external send is executed.`,
      status: record.status,
      amount: record.amountGross === null ? null : String(record.amountGross),
      currency: record.currency,
      financeSummaryId: record.id,
      preparedOfferId: "prepared-franchise-deal-munich-schwabing",
      propertyCaseId: "leopoldstrasse-87-studio-lease",
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Finance review stored in Command History. Apply remains closed." : "Finance review stored in Command History.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function MemberPaymentRecoveryPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const clientRoleAllowed = recoveryRoles.has(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadPaymentRecovery(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Payment Recovery data unavailable." });
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
      const haystack = [record.label, record.memberName, record.family, record.status, record.priority, record.nextAction].join(" ").toLowerCase();
      return matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, search]);
  const statusScopedRecords = useMemo(() => familyScopedRecords.filter((record) => status === "all" || record.status === status), [familyScopedRecords, status]);
  const records = useMemo(() => statusScopedRecords.filter((record) => priority === "all" || record.priority === priority), [priority, statusScopedRecords]);
  const statusOptions = useMemo(
    () =>
      (readModel?.controls.statuses ?? [])
        .map((option) => ({ ...option, rows: familyScopedRecords.filter((record) => record.status === option.key).length }))
        .filter((option) => option.rows > 0),
    [familyScopedRecords, readModel?.controls.statuses],
  );
  const priorityOptions = useMemo(
    () =>
      (readModel?.controls.priorities ?? [])
        .map((option) => ({ ...option, rows: statusScopedRecords.filter((record) => record.priority === option.key).length }))
        .filter((option) => option.rows > 0),
    [readModel?.controls.priorities, statusScopedRecords],
  );
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (!clientRoleAllowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><CreditCard className="h-4 w-4" /> Payment Recovery</p>
        <h2 className="mt-2 text-2xl font-semibold">Payment recovery is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">This role is outside the ERP/Finance recovery workflow. Internal finance and scoped operating roles can inspect permitted records.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Payment Recovery records</section>;

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Payment Recovery unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><CreditCard className="h-4 w-4" /> Payment Recovery</p>
        <h2 className="mt-2 text-2xl font-semibold">Payment recovery is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><CreditCard className="h-4 w-4 text-emerald-700" /> ERP / Finance Recovery</p>
          <h2 className="mt-2 text-2xl font-semibold">Member payment recovery workflow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Failed payments, refunds, chargebacks, cancellation settlements, consent checks and ledger previews are connected into one finance review workflow.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.records} scoped records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{money(readModel.summary.amountAtRisk)} at risk</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.criticalCases} critical</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setStatus("all");
            setPriority("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset recovery view
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
              setPriority("all");
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
              <button type="button" onClick={() => setPriority("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${priority === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All priorities</button>
              {priorityOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setPriority(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${priority === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search recovery records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member, refund, chargeback or recovery action" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Recovery record</th>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.family.replaceAll("-", " ")}</p></td>
                    <td className="px-4 py-3">{record.memberName}</td>
                    <td className="px-4 py-3 font-semibold">{money(record.amountGross, record.currency)}</td>
                    <td className="px-4 py-3">{record.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{record.dueDate ?? "not scheduled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No payment recovery records match this filter.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected finance workflow</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Member", selectedRecord.memberName],
                ["Workflow", selectedRecord.family.replaceAll("-", " ")],
                ["Amount", money(selectedRecord.amountGross, selectedRecord.currency)],
                ["Status", selectedRecord.status.replaceAll("_", " ")],
                ["Priority", selectedRecord.priority],
                ["Due", selectedRecord.dueDate ?? "not scheduled"],
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
              {readModel.actions.stageFinanceReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging finance review", commandId: null, applyGate: null });
                    stageFinanceReview(role, readModel, selectedRecord)
                      .then((result) => setCommandState(result))
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Stage finance review
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">This role can inspect scoped recovery state. Finance review staging is reserved for authorized internal roles.</p>
              )}
              {commandState ? (
                <div className={`rounded-[8px] border p-3 text-xs ${commandState.status === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <p className="font-semibold">{commandState.message}</p>
                  {commandState.commandId ? <p className="mt-1">Command History updated.</p> : null}
                  {commandState.applyGate ? <p className="mt-1">Payments, postings, exports and external sends remain closed.</p> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a recovery row to inspect finance facts, connected workflow routing or review action.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
