"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Landmark,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type {
  BankReadinessWorkbenchReadModel,
  BankReadinessWorkItem,
} from "@/db/bank-readiness-workbench-read-model-repository";
import { roleByKey, type RoleKey } from "@/lib/roles";

type Payload = {
  status: BankReadinessWorkbenchReadModel["queryStatus"] | "forbidden";
  readModel: BankReadinessWorkbenchReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type FilterKey = "all" | "blocked" | "attention" | "ready";

type StageFeedback = {
  status: string;
  commandId: string | null;
  applyGate: string | null;
  message: string;
};

function buildParams(searchParams: Pick<URLSearchParams, "get">) {
  const role = roleByKey(searchParams.get("role")).key;
  const preparedOfferId = searchParams.get("case") ?? searchParams.get("preparedOfferId");
  const dealId = searchParams.get("deal") ?? searchParams.get("dealId");
  const propertyCaseId = searchParams.get("propertyCase") ?? searchParams.get("propertyCaseId");
  const params = new URLSearchParams({ role });
  if (preparedOfferId) params.set("preparedOfferId", preparedOfferId);
  if (dealId) params.set("dealId", dealId);
  if (propertyCaseId) params.set("propertyCaseId", propertyCaseId);
  return { role, preparedOfferId, dealId, propertyCaseId, params };
}

async function loadBankReadiness(params: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`/api/crays/bank-readiness/workbench/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Bank readiness returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function words(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2") : "Pending";
}

function statusClass(status: BankReadinessWorkItem["status"]) {
  if (status === "ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "attention") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-rose-700/20 bg-rose-50 text-rose-950";
}

function priorityClass(priority: BankReadinessWorkItem["priority"]) {
  if (priority === "critical") return "text-rose-700";
  if (priority === "high") return "text-amber-700";
  return "text-[var(--ink-muted)]";
}

function metricValue(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${value}${suffix}`;
}

function moneyValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "n/a";
  if (value >= 1000000) return `EUR ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `EUR ${Math.round(value / 1000)}k`;
  return `EUR ${value.toLocaleString("en-US")}`;
}

function selectedOrFirst(items: BankReadinessWorkItem[], selectedKey: string | null) {
  return items.find((item) => item.key === selectedKey) ?? items[0] ?? null;
}

function roleCanStage(readModel: BankReadinessWorkbenchReadModel, role: RoleKey) {
  return readModel.access.level === "internal_bank_readiness" && readModel.access.canStageChecklistDraft && role === "finance";
}

function workflowModeLabel(mode: BankReadinessWorkbenchReadModel["access"]["workflowMode"]) {
  if (mode === "finance_owner") return "Finance owner";
  if (mode === "deal_manager_consumer") return "Deal Manager consumer";
  if (mode === "reviewer_gate_review") return "Reviewer gate review";
  if (mode === "oversight") return "Oversight";
  if (mode === "external_release_shell") return "Release-gated shell";
  return "No access";
}

function roleActionHref(readModel: BankReadinessWorkbenchReadModel, role: RoleKey) {
  if (role === "deal-manager") return readModel.links.filesHref;
  if (role === "reviewer") return readModel.links.roomsHref;
  if (role === "admin" || role === "crays-management") return readModel.links.caseHref;
  return null;
}

function compactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Stored";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function BankReadinessWorkbenchPanel() {
  const searchParams = useSearchParams();
  const query = useMemo(() => buildParams(searchParams), [searchParams]);
  const queryString = query.params.toString();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [feedback, setFeedback] = useState<StageFeedback | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(queryString);
    loadBankReadiness(params, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Bank readiness failed" });
      });

    return () => controller.abort();
  }, [queryString, refreshKey]);

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading bank readiness
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Bank readiness unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  const readModel = loadState.data.readModel;
  const caseRecord = readModel.case;
  const role = query.role;
  const canStage = roleCanStage(readModel, role);
  const roleHref = roleActionHref(readModel, role);
  const normalizedSearch = search.trim().toLowerCase();
  const workItems = readModel.workItems.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [item.label, item.current, item.blocker, item.nextAction, item.ownerRole].some((value) => value.toLowerCase().includes(normalizedSearch));
    return matchesFilter && matchesSearch;
  });
  const selectedItem = selectedOrFirst(workItems.length ? workItems : readModel.workItems, selectedKey ?? readModel.nextDecision.workItemKey);
  const canStageSelected = canStage && selectedItem?.ownerRole === "Finance";

  async function stageChecklist(item: BankReadinessWorkItem | null) {
    if (!item || !caseRecord || !canStage || item.ownerRole !== "Finance") return;
    setStaging(true);
    try {
      const response = await fetch(`/api/crays/bank-readiness/workbench/command-draft?role=${encodeURIComponent(role)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-loans-checklist-command",
        },
        body: JSON.stringify({
          idempotencyKey: `bank-readiness-workbench:${caseRecord.preparedOfferId}:${item.key}:${role}:block8-v1`,
          actorRole: role,
          preparedOfferId: caseRecord.preparedOfferId,
          dealId: caseRecord.dealId,
          propertyCaseId: caseRecord.propertyCaseId,
          bankPackageId: readModel.package?.bankPackageId ?? null,
          loanCaseId: readModel.loanCase?.loanCaseId ?? null,
          commandType: item.commandType,
          action: item.commandAction,
          title: item.nextAction,
          notes: `Bank readiness review for ${caseRecord.title}. Current state: ${item.current}. Blocker: ${item.blocker}. Bank send, lender release, payment and target apply remain blocked.`,
          status: "drafted",
          checklistItemKey: item.checklistItemKey,
          conditionKey: item.conditionKey,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        status?: string;
        result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string };
        error?: string;
      };
      setFeedback({
        status: payload.status ?? `HTTP ${response.status}`,
        commandId: payload.result?.commandId ?? null,
        applyGate: payload.result?.applyGate ?? null,
        message: payload.error ?? `${item.label} command draft stored; target apply remains ${payload.result?.targetApplyStatus ?? "blocked"}.`,
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({
        status: "error",
        commandId: null,
        applyGate: null,
        message: error instanceof Error ? error.message : "Bank readiness command draft failed.",
      });
    } finally {
      setStaging(false);
    }
  }

  if (!caseRecord) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
            Loans
          </span>
          <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass("blocked")}`}>
            {readModel.access.workflowMode === "external_release_shell" ? "Release blocked" : words(readModel.queryStatus)}
          </span>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
            {workflowModeLabel(readModel.access.workflowMode)}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold">{readModel.nextDecision.label}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">{readModel.nextDecision.copy}</p>
        {readModel.access.workflowMode === "external_release_shell" ? (
          <p className="mt-3 max-w-2xl text-xs leading-5 text-[var(--ink-muted)]">
            Internal records, applicant information, evidence, documents and internal command history are not returned in this shell.
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              <Landmark className="h-3.5 w-3.5" />
              Loans
            </span>
            <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(readModel.nextDecision.status)}`}>
              {readModel.nextDecision.status}
            </span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              {workflowModeLabel(readModel.access.workflowMode)}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold">Bank readiness workbench</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            {caseRecord.title} - {caseRecord.market}
          </p>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next role action</p>
          <strong className="mt-2 block text-base">{readModel.nextDecision.label}</strong>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{readModel.nextDecision.copy}</p>
          {canStage ? (
            <button
              type="button"
              onClick={() => stageChecklist(selectedOrFirst(readModel.workItems, readModel.nextDecision.workItemKey))}
              disabled={!readModel.nextDecision.workItemKey || staging}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
            >
              {staging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {readModel.nextDecision.actionLabel}
            </button>
          ) : roleHref ? (
            <a
              href={roleHref}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold !text-white transition hover:opacity-85 hover:!text-white"
            >
              {readModel.nextDecision.actionLabel}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink-muted)]">
              <LockKeyhole className="h-4 w-4" />
              Release gate closed
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--line)] px-5 py-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Readiness", metricValue(readModel.summary.readinessScore, "%")],
          ["Blocked", String(readModel.summary.blockedItems)],
          ["Approved docs", `${readModel.evidence.approvedDocuments}/${readModel.evidence.totalDocuments}`],
          ["Bankability", metricValue(caseRecord.scores.bankability)],
          ["Drafts", String(readModel.summary.commandDrafts)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-lg">{value}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-3">
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Bank package</p>
          <strong className="mt-2 block text-sm">{readModel.package?.bankPackageId ? "Bank package attached" : "Package not attached"}</strong>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            Status {words(readModel.package?.status)}. Release {words(readModel.package?.releaseStatus)}. {readModel.package?.requiredChecks.length ?? 0} required checks.
          </p>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Loan case</p>
          <strong className="mt-2 block text-sm">{readModel.loanCase?.loanCaseId ? "Loan case attached" : "Loan case not attached"}</strong>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            {readModel.loanCase ? `Status ${words(readModel.loanCase.status)}. Decision ${words(readModel.loanCase.decisionState)}.` : "No lender workflow is visible."}
          </p>
          {readModel.loanCase?.requestedAmountSummary.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {readModel.loanCase.requestedAmountSummary.slice(0, 3).map((item) => (
                <span key={item.label} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold">
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Evidence and funding</p>
          <strong className="mt-2 block text-sm">{moneyValue(caseRecord.scores.bankDebt)} debt target</strong>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            Equity {moneyValue(caseRecord.scores.ownEquity)}. Source of funds {words(readModel.evidence.sourceOfFundsReadiness)}.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <span className="sr-only">Search bank readiness work</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search checklist and conditions"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[var(--ink-muted)]" />
          {(["all", "blocked", "attention", "ready"] as FilterKey[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-[8px] border px-3 py-2 text-xs font-semibold capitalize transition ${
                filter === item ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          className="ml-auto inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid min-h-[460px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-white text-xs font-semibold uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-5 py-3">Work item</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Blocker</th>
                <th className="px-5 py-3">Next action</th>
                <th className="px-5 py-3 text-right">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {workItems.map((item) => (
                <tr key={item.key} className={selectedItem?.key === item.key ? "bg-emerald-50/45" : "bg-[var(--surface)]"}>
                  <td className="px-5 py-4 align-top">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.commandType.replaceAll("_", " ")}</p>
                    <strong className="mt-1 block">{item.label}</strong>
                    <span className={`mt-2 block text-xs font-semibold capitalize ${priorityClass(item.priority)}`}>{item.priority}</span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className={`inline-flex rounded-[7px] border px-2 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="mt-2 block max-w-[180px] text-xs leading-5 text-[var(--ink-muted)]">{item.current}</span>
                  </td>
                  <td className="px-5 py-4 align-top text-sm text-[var(--ink-muted)]">{item.ownerRole}</td>
                  <td className="max-w-[240px] px-5 py-4 align-top text-sm leading-6 text-[var(--ink-muted)]">{item.blocker}</td>
                  <td className="max-w-[240px] px-5 py-4 align-top font-semibold leading-6">{item.nextAction}</td>
                  <td className="px-5 py-4 text-right align-top">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(item.key)}
                      aria-pressed={selectedItem?.key === item.key}
                      aria-label={`Select ${item.label}`}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                    >
                      Select
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {workItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--ink-muted)]">
                    No bank readiness work matches this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="border-t border-[var(--line)] bg-white p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Selected bank work</h3>
          </div>
          {selectedItem ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedItem.ownerRole}</p>
                <h4 className="mt-2 text-lg font-semibold">{selectedItem.label}</h4>
                <span className={`mt-2 inline-flex rounded-[7px] border px-2 py-1 text-xs font-semibold capitalize ${statusClass(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
              </div>
              {[
                ["Current", selectedItem.current],
                ["Blocker", selectedItem.blocker],
                ["Next action", selectedItem.nextAction],
                ["Command model", selectedItem.commandType.replaceAll("_", " ")],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-[var(--line)] pt-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <strong className="mt-1 block text-sm leading-6">{value}</strong>
                </div>
              ))}
              {canStageSelected ? (
                <button
                  type="button"
                  onClick={() => stageChecklist(selectedItem)}
                  disabled={staging}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
                >
                  {staging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {selectedItem.commandType === "loan_condition" ? "Stage condition draft" : "Stage checklist draft"}
                </button>
              ) : roleHref ? (
                <a
                  href={roleHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold !text-white transition hover:opacity-85 hover:!text-white"
                >
                  {readModel.nextDecision.actionLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink-muted)]">
                  <LockKeyhole className="h-4 w-4" />
                  {selectedItem.ownerRole}-owned work
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Consent", words(readModel.evidence.consentState)],
            ["Account evidence", words(readModel.evidence.accountInformationReadiness)],
            ["Transaction evidence", words(readModel.evidence.transactionEvidenceReadiness)],
            ["Release gates", `${readModel.evidence.blockedGates} blocked`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
              <strong className="mt-2 block text-sm capitalize">{value}</strong>
            </div>
          ))}
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Command and gates</h3>
          </div>
          {feedback ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Review record</p>
                <strong className="mt-1 block text-sm">{feedback.commandId ? "Stored command draft" : feedback.status}</strong>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Apply gate</p>
                <strong className="mt-1 block text-sm [overflow-wrap:anywhere]" title={feedback.applyGate ?? undefined}>
                  Loans target apply remains closed
                </strong>
              </div>
              <p className="text-xs leading-5 text-[var(--ink-muted)]">{feedback.message}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              {readModel.history.length
                ? `${readModel.summary.commandDrafts} persisted Loans draft${readModel.summary.commandDrafts === 1 ? "" : "s"}; latest preflight is shown below.`
                : "No persisted Loans command draft is stored for this case yet."}
            </p>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
            <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <p className="text-xs leading-5 text-[var(--ink-muted)]">
              Bank send, lender release, payment, finance write, upload, external send, source write, sync apply and target apply remain closed.
            </p>
          </div>
        </aside>
      </div>

      <div className="border-t border-[var(--line)] px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Persisted history</p>
            <h3 className="mt-1 text-sm font-semibold">Loans command drafts after refresh</h3>
          </div>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
            {readModel.history.length} shown
          </span>
        </div>
        {readModel.history.length ? (
          <div className="mt-3 grid gap-2 xl:grid-cols-2">
            {readModel.history.map((item) => (
              <div key={item.commandId} className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="block text-sm leading-5">{item.label}</strong>
                    <span className="mt-1 block text-xs capitalize text-[var(--ink-muted)]">
                      {words(item.actorRole)} - {compactDate(item.createdAt)}
                    </span>
                  </div>
                  <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase">
                    {words(item.commandStatus)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">Preflight: {item.preflight}.</p>
                <div className="mt-2 grid gap-1 text-[11px] text-[var(--ink-muted)] sm:grid-cols-2">
                  <span className="min-w-0 font-semibold">Stored command draft</span>
                  <span className="min-w-0 text-left font-semibold [overflow-wrap:anywhere] sm:text-right">
                    Loans target apply - {words(item.targetApplyStatus)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">Finance can stage the first guarded checklist or condition draft; target apply remains closed.</p>
        )}
      </div>
    </article>
  );
}
