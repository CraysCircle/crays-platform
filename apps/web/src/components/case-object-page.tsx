"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { CaseActivityBackboneReadModel } from "@/db/case-activity-backbone-read-model-repository";
import type { CaseWorkspaceReadModel, CaseWorkspaceSection } from "@/db/case-workspace-read-model-repository";
import type { CoreCommandHistoryReadModel } from "@/db/core-command-history-read-model-repository";
import type { RealProductReadModel } from "@/db/real-product-read-model-repository";
import { DocumentsLifecyclePanel } from "./documents-lifecycle-panel";
import { roleByKey } from "@/lib/roles";
import { buildWorkflowActionRegistryReadModel, type WorkflowActionKey, type WorkflowActionReadModelItem } from "@/lib/workflow-action-registry";

type CaseWorkspacePayload = {
  status: "ready" | "not_configured" | "not_found" | "forbidden";
  readModel: CaseWorkspaceReadModel;
};

type CaseActivityPayload = {
  status: "ready" | "not_configured" | "not_found" | "forbidden";
  readModel: CaseActivityBackboneReadModel;
};

type CommandHistoryPayload = {
  status: "ready" | "not_configured" | "forbidden";
  readModel: CoreCommandHistoryReadModel;
};

type WorkspaceState =
  | { state: "loading"; queryKey: null; data: null; error: null }
  | {
      state: "ready";
      queryKey: string;
      data: CaseWorkspacePayload;
      error: null;
    }
  | { state: "error"; queryKey: string; data: null; error: string };

type DetailsState =
  | { state: "loading"; queryKey: null; data: null; error: null }
  | {
      state: "ready";
      queryKey: string;
      data: {
        activity: CaseActivityPayload;
        history: CommandHistoryPayload;
      };
      error: null;
    }
  | { state: "error"; queryKey: string; data: null; error: string };

type CommandFeedback = {
  commandId: string | null;
  applyGate: string | null;
  actionLabel: string | null;
  message: string;
};

type CasePickerState =
  | { state: "idle"; data: null; error: null }
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: RealProductReadModel; error: null }
  | { state: "error"; data: null; error: string };

function labelize(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Pending";
}

function score(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "n/a" : `${Math.round(value)}${suffix}`;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  if (Math.abs(value) >= 1_000_000) return `EUR ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `EUR ${Math.round(value / 1_000)}k`;
  return `EUR ${Math.round(value)}`;
}

function statusClass(status: string) {
  if (status === "ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "blocked") return "border-rose-700/20 bg-rose-50 text-rose-950";
  if (status === "waiting") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-sky-700/20 bg-sky-50 text-sky-950";
}

function buildQuery(searchParams: Pick<URLSearchParams, "get">) {
  const role = searchParams.get("role") ?? "deal-manager";
  const preparedOfferId = searchParams.get("case") ?? searchParams.get("preparedOfferId");
  const dealId = searchParams.get("deal") ?? searchParams.get("dealId");
  const propertyCaseId = searchParams.get("propertyCase") ?? searchParams.get("propertyCaseId");

  if (!preparedOfferId) return null;

  const params = new URLSearchParams({ role, preparedOfferId });
  if (dealId) params.set("dealId", dealId);
  if (propertyCaseId) params.set("propertyCaseId", propertyCaseId);
  return { role, preparedOfferId, dealId, propertyCaseId, params };
}

async function loadCaseWorkspace(params: URLSearchParams, signal: AbortSignal) {
  const workspaceResponse = await fetch(`/api/crays/case-workspace/read-model?${params.toString()}`, { cache: "no-store", signal });

  if (!workspaceResponse.ok) throw new Error(`Case workspace returned HTTP ${workspaceResponse.status}`);

  return (await workspaceResponse.json()) as CaseWorkspacePayload;
}

async function loadCaseDetails(params: URLSearchParams, signal: AbortSignal) {
  const [activityResponse, historyResponse] = await Promise.all([
    fetch(`/api/crays/case-activity/read-model?${params.toString()}&limit=30`, { cache: "no-store", signal }),
    fetch(`/api/crays/core-command/history/read-model?${params.toString()}&limit=8`, { cache: "no-store", signal }),
  ]);

  if (!activityResponse.ok) throw new Error(`Case activity returned HTTP ${activityResponse.status}`);
  if (!historyResponse.ok) throw new Error(`Command history returned HTTP ${historyResponse.status}`);

  return {
    activity: (await activityResponse.json()) as CaseActivityPayload,
    history: (await historyResponse.json()) as CommandHistoryPayload,
  };
}

function sectionSortValue(section: CaseWorkspaceSection) {
  if (section.status === "blocked") return 0;
  if (section.status === "active") return 1;
  if (section.status === "waiting") return 2;
  return 3;
}

export function CaseObjectPage() {
  const searchParams = useSearchParams();
  const caseQuery = useMemo(() => buildQuery(searchParams), [searchParams]);
  const role = roleByKey(searchParams.get("role")).key;
  const activeQueryKey = caseQuery?.params.toString() ?? null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [stageState, setStageState] = useState<{ state: "idle" | "staging"; actionKey: WorkflowActionKey | null }>({ state: "idle", actionKey: null });
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);
  const [state, setState] = useState<WorkspaceState>({ state: "loading", queryKey: null, data: null, error: null });
  const [detailsState, setDetailsState] = useState<DetailsState>({ state: "loading", queryKey: null, data: null, error: null });
  const [casePickerState, setCasePickerState] = useState<CasePickerState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (caseQuery) return;
    const controller = new AbortController();
    fetch(`/api/crays/real-product/read-model?role=${role}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Prepared deal list returned HTTP ${response.status}`);
        return (await response.json()) as { readModel: RealProductReadModel };
      })
      .then((payload) => setCasePickerState({ state: "ready", data: payload.readModel, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCasePickerState({ state: "error", data: null, error: error instanceof Error ? error.message : "Prepared deal list failed" });
      });
    return () => controller.abort();
  }, [caseQuery, role]);

  useEffect(() => {
    if (!caseQuery) return;
    const controller = new AbortController();
    const requestKey = caseQuery.params.toString();
    loadCaseWorkspace(caseQuery.params, controller.signal)
      .then((data) => setState({ state: "ready", queryKey: requestKey, data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ state: "error", queryKey: requestKey, data: null, error: error instanceof Error ? error.message : "Case object page failed" });
      });

    return () => controller.abort();
  }, [caseQuery, refreshKey]);

  useEffect(() => {
    if (!caseQuery) return;
    const controller = new AbortController();
    const requestKey = caseQuery.params.toString();
    loadCaseDetails(caseQuery.params, controller.signal)
      .then((data) => setDetailsState({ state: "ready", queryKey: requestKey, data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDetailsState({ state: "error", queryKey: requestKey, data: null, error: error instanceof Error ? error.message : "Case details failed" });
      });

    return () => controller.abort();
  }, [caseQuery, refreshKey]);

  async function stageWorkflowAction(action: WorkflowActionReadModelItem | null | undefined) {
    if (!caseQuery || state.state !== "ready") return;
    const workspace = state.data.readModel;
    if (!workspace.case || !action) return;

    setStageState({ state: "staging", actionKey: action.key });
    try {
      const response = await fetch("/api/crays/workflow-actions/stage", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-workflow-action-command",
        },
        body: JSON.stringify({
          actionKey: action.key,
          actorRole: caseQuery.role,
          preparedOfferId: workspace.case.preparedOfferId,
          dealId: workspace.case.dealId,
          propertyCaseId: workspace.case.propertyCaseId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        action?: { label?: string };
        result?: { commandId?: string; applyGate?: string; commandStatus?: string; targetApplyStatus?: string };
        reason?: string;
        error?: string;
      };
      setFeedback({
        commandId: payload.result?.commandId ?? null,
        applyGate: payload.result?.applyGate ?? null,
        actionLabel: payload.action?.label ?? action.label,
        message: response.ok
          ? `${payload.action?.label ?? action.label} command draft stored, apply ${payload.result?.targetApplyStatus ?? "blocked"}.`
          : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      });
      setRefreshKey((value) => value + 1);
    } finally {
      setStageState({ state: "idle", actionKey: null });
    }
  }

  if (!caseQuery) {
    const cases = casePickerState.data?.cases.slice(0, 8) ?? [];
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Case workspace</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold">Select a prepared deal</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
              The workspace opens a Core-backed prepared deal with sections, documents, events, command history and guarded workflow actions.
            </p>
          </div>
          <Link
            href={`/dashboard?role=${role}&view=work-queue`}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
          >
            Open Work Queue
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {casePickerState.state === "loading" ? (
          <div className="flex items-center gap-2 px-5 py-6 text-sm font-semibold text-[var(--ink-muted)]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading prepared deals
          </div>
        ) : casePickerState.state === "error" ? (
          <p className="px-5 py-6 text-sm text-[var(--rose)]">{casePickerState.error}</p>
        ) : (
          <div className="grid gap-3 p-5 lg:grid-cols-2">
            {cases.map((item) => {
              const params = new URLSearchParams({ role, view: "case", case: item.offerId });
              if (item.dealId) params.set("deal", item.dealId);
              if (item.propertyCaseId) params.set("propertyCase", item.propertyCaseId);
              return (
                <Link key={item.offerId} href={`/dashboard?${params.toString()}`} className="rounded-[8px] border border-[var(--line)] bg-white p-4 transition hover:border-[var(--accent)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{item.title}</strong>
                      <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.market}</span>
                    </div>
                    <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                      {labelize(item.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-[var(--ink-muted)]">{item.nextAction}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--ink-muted)]">
                    <span>{score(item.scores.location, "%")} location</span>
                    <span>{score(item.scores.bankability, "%")} bank</span>
                    <span>{item.evidence.blockedReleaseGates} blockers</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </article>
    );
  }

  if (state.state === "loading" || state.queryKey !== activeQueryKey) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading case object page
        </div>
      </article>
    );
  }

  if (state.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Case object page unavailable</p>
        <p className="mt-1 text-sm opacity-75">{state.error}</p>
      </article>
    );
  }

  const workspace = state.data.readModel;
  const detailsReady = detailsState.state === "ready" && detailsState.queryKey === activeQueryKey;
  const activity = detailsReady ? detailsState.data.activity.readModel : null;
  const history = detailsReady ? detailsState.data.history.readModel : null;
  const workflowActions = buildWorkflowActionRegistryReadModel(workspace, roleByKey(caseQuery.role).key);
  const caseRecord = workspace.case;

  if (!caseRecord) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="text-sm font-semibold">Case not found</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">No CRAYS Core prepared deal matched this URL state.</p>
      </article>
    );
  }

  const sections = [...workspace.sections].sort((a, b) => sectionSortValue(a) - sectionSortValue(b));
  const topBlockedSection = sections.find((section) => section.status === "blocked");
  const primaryNextAction = topBlockedSection?.nextAction ?? caseRecord.nextAction;
  const recommendedAction =
    workflowActions.actions.find((action) => action.key === workflowActions.recommendedActionKey) ??
    workflowActions.actions.find((action) => action.roleAllowed && action.preflightStatus !== "blocked") ??
    null;

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="grid gap-5 border-b border-[var(--line)] px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                Case workspace
              </span>
              <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${workspace.summary.blockedSections > 0 ? "border-rose-700/20 bg-rose-50 text-rose-950" : "border-emerald-700/20 bg-emerald-50 text-emerald-950"}`}>
                {workspace.summary.blockedSections} blockers
              </span>
              <span className="rounded-[7px] border border-amber-700/20 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase text-amber-950">
                {workspace.summary.commandDrafts} command drafts
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal">{caseRecord.title}</h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {caseRecord.market} - {labelize(caseRecord.status)} - {primaryNextAction}
            </p>
          </div>
          <div className="flex flex-wrap items-start justify-start gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => stageWorkflowAction(recommendedAction)}
              disabled={!recommendedAction || stageState.state === "staging"}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {stageState.state === "staging" ? "Staging..." : `Stage ${recommendedAction?.shortLabel ?? "workflow action"}`}
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {feedback ? (
          <div className="border-b border-[var(--line)] bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-950">
            {feedback.commandId
              ? "Command draft stored for review. Apply remains closed until the approved workflow opens it."
              : feedback.message}
          </div>
        ) : null}

        <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Location", score(caseRecord.scores.location, "%")],
            ["Bankability", score(caseRecord.scores.bankability, "%")],
            ["Opening", score(caseRecord.scores.openingReadiness, "%")],
            ["Target MRR", money(caseRecord.scores.targetMRR)],
            ["Investment", money(caseRecord.scores.targetRaise)],
            ["Equity", money(caseRecord.scores.ownEquity)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
              <strong className="mt-2 block text-lg">{value}</strong>
            </div>
          ))}
        </div>
      </article>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Case work sections</h2>
            </div>
            <span className="text-xs font-semibold text-[var(--ink-muted)]">
              {workspace.summary.readySections}/{workspace.summary.sections} ready
            </span>
          </div>
          <div className="grid gap-3 p-5 lg:grid-cols-2">
            {sections.map((section) => (
              <article key={section.key} className={`rounded-[8px] border p-4 ${statusClass(section.status)}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase opacity-70">{section.ownerRole}</p>
                    <h3 className="mt-2 text-base font-semibold">{section.label}</h3>
                  </div>
                  <span className="rounded-[7px] border border-current/20 px-2 py-1 text-[11px] font-semibold uppercase">{section.status}</span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase opacity-70">State</dt>
                    <dd className="mt-1 font-medium">{section.state}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase opacity-70">Blocker</dt>
                    <dd className="mt-1">{section.blocker}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase opacity-70">Next action</dt>
                    <dd className="mt-1 font-semibold">{section.nextAction}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Workflow actions</h2>
            </div>
            <div className="mt-3 grid gap-2">
              {workflowActions.actions.map((action) => (
                <div key={action.key} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{action.moduleLabel}</p>
                      <h3 className="mt-1 text-sm font-semibold">{action.label}</h3>
                    </div>
                    <span
                      className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${
                        action.preflightStatus === "ready"
                          ? "border-emerald-700/20 bg-emerald-50 text-emerald-950"
                          : action.preflightStatus === "attention"
                            ? "border-amber-700/20 bg-amber-50 text-amber-950"
                            : "border-rose-700/20 bg-rose-50 text-rose-950"
                      }`}
                    >
                      {action.preflightStatus}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{action.preflightSummary}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">Apply remains closed until the approved workflow opens this action.</p>
                  <button
                    type="button"
                    onClick={() => stageWorkflowAction(action)}
                    disabled={!action.roleAllowed || action.preflightStatus === "blocked" || stageState.state === "staging"}
                    className="mt-3 inline-flex items-center rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
                  >
                    {stageState.state === "staging" && stageState.actionKey === action.key ? "Staging..." : "Stage"}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Open in module</h2>
            </div>
            <div className="mt-3 grid gap-2">
              {workspace.moduleDeepLinks.map((link) => (
                <Link
                  key={link.moduleKey}
                  href={link.href}
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                >
                  <span>{link.moduleLabel}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Gates</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Apply, release, upload, external send, finance, bank, payment, deploy and server-changing actions remain closed.
            </p>
          </article>
        </aside>
      </section>

      <DocumentsLifecyclePanel />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Activity timeline</h2>
            </div>
            <span className="text-xs font-semibold text-[var(--ink-muted)]">
              {activity
                ? `${activity.summary.workflowEvents + activity.summary.commandEvents + activity.summary.communicationEvents + activity.summary.sourceEvents} events`
                : "Loading details"}
            </span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {activity?.events.slice(0, 8).map((event) => (
              <div key={event.eventId} className="grid gap-2 px-5 py-3 text-sm md:grid-cols-[150px_minmax(0,1fr)_140px]">
                <span className="font-semibold">{labelize(event.source)}</span>
                <span className="min-w-0">{event.label}</span>
                <span className="text-xs text-[var(--ink-muted)]">{new Date(event.occurredAt).toLocaleString()}</span>
              </div>
            ))}
            {!activity && detailsState.state !== "error" ? <p className="px-5 py-5 text-sm text-[var(--ink-muted)]">Loading case activity without blocking the workspace.</p> : null}
            {detailsState.state === "error" ? <p className="px-5 py-5 text-sm text-rose-700">{detailsState.error}</p> : null}
            {activity && activity.events.length === 0 ? <p className="px-5 py-5 text-sm text-[var(--ink-muted)]">No case activity events are visible yet.</p> : null}
          </div>
        </article>

        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-semibold">Documents and commands</h2>
            </div>
            <span className="text-xs font-semibold text-[var(--ink-muted)]">{activity ? `${activity.summary.documents} documents` : "Loading details"}</span>
          </div>
          <div className="grid gap-4 p-5">
            <div>
              <h3 className="text-sm font-semibold">Document metadata</h3>
              <div className="mt-2 grid gap-2">
                {activity?.documents.slice(0, 5).map((document) => (
                  <div key={document.linkId} className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{labelize(document.documentGroup)}</strong>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{document.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {document.versionLabel} - {document.requiredFor ?? "case evidence"} - No files returned
                    </p>
                  </div>
                ))}
                {!activity && detailsState.state !== "error" ? <p className="text-sm text-[var(--ink-muted)]">Loading document metadata.</p> : null}
                {activity && activity.documents.length === 0 ? <p className="text-sm text-[var(--ink-muted)]">No document metadata is linked to this case.</p> : null}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Command history</h3>
              <div className="mt-2 grid gap-2">
                {history?.records.slice(0, 5).map((record) => (
                  <div key={record.commandId} className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{record.moduleLabel}</strong>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{record.targetApplyStatus}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      Stored command draft · apply remains closed
                    </p>
                  </div>
                ))}
                {!history && detailsState.state !== "error" ? <p className="text-sm text-[var(--ink-muted)]">Loading command history.</p> : null}
                {history && history.records.length === 0 ? <p className="text-sm text-[var(--ink-muted)]">No command drafts are stored for this case yet.</p> : null}
              </div>
            </div>
          </div>
        </article>
      </section>

      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="font-semibold">Connected workbench</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          This case is connected to role-scoped sections, document metadata, event history, KPI snapshots and guarded command drafts for the selected prepared deal.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--ink-muted)]">
          <Link href={`/crm?role=${caseQuery.role}&case=${caseRecord.preparedOfferId}`} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 hover:border-[var(--accent)]">Open CRM</Link>
          <Link href={`/files?role=${caseQuery.role}&case=${caseRecord.preparedOfferId}`} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 hover:border-[var(--accent)]">Open Files</Link>
          <Link href={`/loans?role=${caseQuery.role}&case=${caseRecord.preparedOfferId}`} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 hover:border-[var(--accent)]">Open Loans</Link>
          <Link href={`/dashboard?role=${caseQuery.role}&view=messages`} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 hover:border-[var(--accent)]">Open Messages</Link>
        </div>
      </article>
    </div>
  );
}
