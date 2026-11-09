"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Landmark, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type BankPackageRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  status: string;
  priority: string;
  owner: string;
  audience: string;
  value: string | number | boolean | null;
  unit: string | null;
  context: string;
  nextAction: string;
  href: string;
  dueDate: string | null;
  lastSyncedAt: string | null;
  fields: Record<string, unknown>;
};

type Payload = {
  status: "ready" | "forbidden";
  readModel: {
    access: {
      allowed: boolean;
      level: string;
      reason: string;
      canStagePackageReview: boolean;
      canViewInternalRecords: boolean;
      canViewBankScopedRecords: boolean;
    };
    packageContext: {
      packageId: string;
      loanCaseId: string;
      preparedOfferId: string;
      propertyCaseId: string;
      candidateName: string;
      candidateCompany: string;
      bankPartner: string;
      realEstatePartner: string;
      siteName: string;
      journey: string;
    };
    summary: {
      records: number;
      sourceRecords: number;
      linkedFinancialWorkbookRecords: number;
      linkedForecastRecords: number;
      linkedLocationRecords: number;
      linkedFilesRecords: number;
      linkedFinanceLedgerRecords: number;
      creditMetrics: number;
      financialEvidence: number;
      locationEvidence: number;
      fileEvidence: number;
      loanConditions: number;
      redactionRules: number;
      reviewActions: number;
      readinessScore: number;
      blockers: number;
      attention: number;
      conflicts: number;
      requestedDebt: number | null;
      totalInvestment: number | null;
      equityAmount: number | null;
      midCaseRevenueYear3: number | null;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterFamily: string; searchTerm: string }>;
    records: BankPackageRecord[];
    controls: {
      families: Array<{ key: string; label: string; rows: number }>;
      statuses: Array<{ key: string; label: string; rows: number }>;
      priorities: Array<{ key: string; label: string; rows: number }>;
      audiences: Array<{ key: string; label: string; rows: number }>;
    };
    actions: {
      stagePackageReviewAllowed: boolean;
      commandRoute: "/api/crays/bank-readiness/workbench/command-draft";
      confirmationHeader: "stage-loans-checklist-command";
      applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY";
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandState = { status: string; message: string; commandId: string | null; applyGate: string | null };

const bankPackageRoles = new Set(["admin", "crays-management", "finance", "reviewer", "deal-manager", "franchise-partner", "bank-partner"]);
const toneByStatus: Record<DecisionStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function money(value: number | null) {
  if (value === null) return "not available";
  return `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortFreshness(minutes: number | null) {
  if (minutes === null) return "freshness not recorded";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function words(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function fieldLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueLabel(value: string | number | boolean | null, unit: string | null) {
  if (value === null) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return words(value);
  if (unit === "EUR") return money(value);
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "score") return `${Math.round(value * (value <= 1 ? 100 : 1))}/100`;
  if (unit === "ratio") return value.toFixed(2);
  if (unit === "years") return `${value.toFixed(1)} years`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return words(value);
  return null;
}

function facts(record: BankPackageRecord, internal: boolean) {
  const hidden = new Set([
    "moduleKey",
    "seedBatch",
    "sourceAsOf",
    "sourceDatasets",
    "bankSendEnabled",
    "lenderReleaseEnabled",
    "packagePublicationEnabled",
    "financePostingEnabled",
    "accountingExportsEnabled",
    "paymentInitiationEnabled",
    "sourceWritesEnabled",
    "syncApplyEnabled",
    "targetApplyEnabled",
    "uploadsEnabled",
    "externalSendingEnabled",
    "liveAiEnabled",
    "href",
  ]);
  return Object.entries(record.fields)
    .filter(([key]) => !hidden.has(key))
    .filter(([key]) => internal || !["candidateName", "candidateCompany", "realEstatePartner"].includes(key))
    .map(([key, value]) => [fieldLabel(key), fieldValue(value)] as const)
    .filter(([, value]) => value !== null && value !== "")
    .slice(0, 14);
}

function routeFamily(view: string | null, record: string | null) {
  if (view === "conditions" || record === "conditions") return "loan-conditions";
  if (view === "handoff") return "bank-review-actions";
  if (record === "loan-cases") return "credit-decision-metrics";
  if (record === "packages" || view === "package-readiness") return "bank-package-summary";
  return "all";
}

async function loadBankPackage(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/loans/bank-package/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 403) throw new Error(`Bank Package read model returned HTTP ${response.status}`);
  return payload;
}

async function stageBankPackageReview(role: string, readModel: Payload["readModel"], record: BankPackageRecord) {
  const isCondition = record.family === "loan-conditions";
  const response = await fetch(`${readModel.actions.commandRoute}?role=${encodeURIComponent(role)}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `bank-package-workflow:${record.id}:${role}:block52-v1`,
      actorRole: role,
      commandType: isCondition ? "loan_condition" : "bank_package_checklist",
      action: isCondition ? "update_condition" : "request_bank_review",
      title: `Review ${record.label}`,
      notes: `${record.nextAction} This stores a guarded Loans review command only; no bank send, lender release, finance posting, upload or external send is executed.`,
      status: record.status,
      checklistItemKey: isCondition ? null : String(record.fields.checklistItemKey ?? record.id),
      conditionKey: isCondition ? String(record.fields.conditionKey ?? record.id) : null,
      bankPackageId: readModel.packageContext.packageId,
      loanCaseId: readModel.packageContext.loanCaseId,
      preparedOfferId: readModel.packageContext.preparedOfferId,
      propertyCaseId: readModel.packageContext.propertyCaseId,
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Bank package review stored in Command History. Bank send and lender release remain closed." : "Bank package review stored in Command History.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function BankPackageWorkflowPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const routeScopedFamily = routeFamily(searchParams.get("view"), searchParams.get("record"));

  return <BankPackageWorkflowPanelContent key={`${role}:${routeScopedFamily}`} role={role} routeScopedFamily={routeScopedFamily} />;
}

function BankPackageWorkflowPanelContent({ role, routeScopedFamily }: { role: string; routeScopedFamily: string }) {
  const clientRoleAllowed = bankPackageRoles.has(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState(routeScopedFamily);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [audience, setAudience] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadBankPackage(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Bank Package data unavailable." });
      });
    return () => controller.abort();
  }, [clientRoleAllowed, role]);

  const readModel = loadState.data?.readModel;
  const familyScopedRecords = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesFamily = family === "all" || record.family === family;
      const haystack = [record.label, record.family, record.status, record.priority, record.owner, record.audience, record.context, record.nextAction].join(" ").toLowerCase();
      return matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, search]);
  const statusScopedRecords = useMemo(() => familyScopedRecords.filter((record) => status === "all" || record.status === status), [familyScopedRecords, status]);
  const priorityScopedRecords = useMemo(() => statusScopedRecords.filter((record) => priority === "all" || record.priority === priority), [priority, statusScopedRecords]);
  const records = useMemo(() => priorityScopedRecords.filter((record) => audience === "all" || record.audience === audience), [audience, priorityScopedRecords]);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const statusOptions = useMemo(() => (readModel?.controls.statuses ?? []).map((option) => ({ ...option, rows: familyScopedRecords.filter((record) => record.status === option.key).length })).filter((option) => option.rows > 0), [familyScopedRecords, readModel?.controls.statuses]);
  const priorityOptions = useMemo(() => (readModel?.controls.priorities ?? []).map((option) => ({ ...option, rows: statusScopedRecords.filter((record) => record.priority === option.key).length })).filter((option) => option.rows > 0), [readModel?.controls.priorities, statusScopedRecords]);
  const audienceOptions = useMemo(() => (readModel?.controls.audiences ?? []).map((option) => ({ ...option, rows: priorityScopedRecords.filter((record) => record.audience === option.key).length })).filter((option) => option.rows > 0), [priorityScopedRecords, readModel?.controls.audiences]);

  if (!clientRoleAllowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><Landmark className="h-4 w-4" /> Bank Package</p>
        <h2 className="mt-2 text-2xl font-semibold">Bank package is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">This role needs a reviewed package release before bank package records are visible.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Bank Package workflow</section>;

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Bank Package unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><Landmark className="h-4 w-4" /> Bank Package</p>
        <h2 className="mt-2 text-2xl font-semibold">Bank package is release-gated</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Landmark className="h-4 w-4 text-emerald-700" /> Bank Package</p>
          <h2 className="mt-2 text-2xl font-semibold">Bank package workflow</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            {readModel.packageContext.siteName} package for {readModel.packageContext.candidateCompany}: financial model, forecast, location evidence, files, loan conditions and ERP ledger bridge in one review flow.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.records} scoped records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.readinessScore}% package readiness</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{money(readModel.summary.requestedDebt)} requested debt</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.blockers} blockers</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{shortFreshness(readModel.summary.freshnessMinutes)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--ink-muted)]">
            <span>Workbook {readModel.summary.linkedFinancialWorkbookRecords}</span>
            <span>Forecast {readModel.summary.linkedForecastRecords}</span>
            <span>Location {readModel.summary.linkedLocationRecords}</span>
            <span>Files {readModel.summary.linkedFilesRecords}</span>
            <span>Finance Ledger {readModel.summary.linkedFinanceLedgerRecords}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setStatus("all");
            setPriority("all");
            setAudience("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset package view
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setFamily(card.filterFamily);
              setStatus("all");
              setPriority("all");
              setAudience("all");
              setSearch(card.searchTerm);
              setSelectedId(null);
              setCommandState(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <ShieldCheck className="h-5 w-5" />
            <p className="mt-4 text-xs font-semibold uppercase">{card.label}</p>
            <strong className="mt-2 block text-xl">{card.value}</strong>
            <p className="mt-2 text-xs leading-5">{card.context}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_410px]">
        <div className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white">
          <div className="space-y-3 border-b border-[var(--line)] p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All package records {readModel.summary.records}</button>
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
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAudience("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${audience === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All audiences</button>
              {audienceOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setAudience(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${audience === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search bank package records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search package, conditions, evidence or blockers" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>

          <div className="max-h-[580px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Package record</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{words(record.family)}</p></td>
                    <td className="px-4 py-3">{record.audience}</td>
                    <td className="px-4 py-3">{record.owner}</td>
                    <td className="px-4 py-3 font-semibold">{valueLabel(record.value, record.unit)}</td>
                    <td className="px-4 py-3">{words(record.status)}</td>
                    <td className="px-4 py-3">{record.dueDate ?? "not scheduled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No bank package records match this view.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected package workflow</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Family", words(selectedRecord.family)],
                ["Audience", selectedRecord.audience],
                ["Owner", selectedRecord.owner],
                ["Status", words(selectedRecord.status)],
                ["Priority", selectedRecord.priority],
                ["Value", valueLabel(selectedRecord.value, selectedRecord.unit)],
                ["Entity", words(selectedRecord.craysEntityType)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source facts</p>
                <div className="mt-2 space-y-2">
                  {facts(selectedRecord, readModel.access.canViewInternalRecords).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[145px_minmax(0,1fr)] gap-2 text-xs">
                      <span className="text-[var(--ink-muted)]">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Context</p>
                <p className="mt-1 leading-6">{selectedRecord.context}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-1 leading-6">{selectedRecord.nextAction}</p>
              </div>
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected workflow <ArrowRight className="h-4 w-4" /></a>
              {readModel.actions.stagePackageReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging bank package review", commandId: null, applyGate: null });
                    stageBankPackageReview(role, readModel, selectedRecord)
                      .then((result) => setCommandState(result))
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Stage bank package review
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                  {readModel.access.canViewBankScopedRecords ? "This role can inspect scoped package evidence. Review staging is reserved for CRAYS Finance." : "Package release is closed for this role."}
                </p>
              )}
              {commandState ? (
                <div className={`rounded-[8px] border p-3 text-xs ${commandState.status === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <p className="font-semibold">{commandState.message}</p>
                  {commandState.commandId ? <p className="mt-1">Command History updated.</p> : null}
                  {commandState.applyGate ? <p className="mt-1">Bank send, release, upload, posting and external sending remain closed.</p> : null}
                </div>
              ) : null}
              <div className="flex items-start gap-2 rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Bank send, lender release, package publication, upload, payment initiation, posting, external sending, source write, sync apply and target apply remain closed.</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select a package record to inspect evidence, source lineage, connected workflow routing or guarded review action.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
