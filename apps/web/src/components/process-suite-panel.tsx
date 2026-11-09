"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, RefreshCw, Search, ShieldCheck, Workflow } from "lucide-react";
import type { ProcessSuite, ProcessSuiteReadModel, ProcessSuiteSourceRecord, ProcessSuiteStep } from "@/db/process-suite-read-model-repository";
import { modulesForRole, type ModuleKey } from "@/lib/modules";
import { roleByKey, type RoleKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ProcessSuiteReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type StageFilter = "all" | "blocked" | "attention" | "ready";
type StageFeedback = {
  state: "staging" | "done" | "error";
  message: string;
  commandId?: string | null;
};

type CommandRoute = {
  route: string;
  confirmation: string;
};

type CommandDraftResponse = {
  status?: string;
  result?: {
    commandId?: string;
    targetApplyStatus?: string;
    applyGate?: string;
  };
  error?: string;
};

const stateClass = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  attention: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const commandRoutes: Record<string, CommandRoute> = {
  analytics: { route: "/api/crays/core-command/sync-preview", confirmation: "stage-sync-preview-command" },
  crm: { route: "/api/crays/core-command/crm-activity", confirmation: "stage-crm-activity-command" },
  erp: { route: "/api/crays/core-command/erp-finance", confirmation: "stage-erp-finance-command" },
  files: { route: "/api/crays/core-command/files-package", confirmation: "stage-files-package-command" },
  loans: { route: "/api/crays/core-command/loans-checklist", confirmation: "stage-loans-checklist-command" },
  sync: { route: "/api/crays/core-command/sync-preview", confirmation: "stage-sync-preview-command" },
};

const fallbackWorkItemRoute: CommandRoute = {
  route: "/api/crays/core-command/project-work-item",
  confirmation: "stage-project-work-item-command",
};

async function loadSuites(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/process-suites/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Process suites returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matchesRecord(record: ProcessSuiteSourceRecord, term: string) {
  if (!term) return true;
  return [record.label, record.moduleLabel, record.sourceFamily, record.status, record.ownerRole, record.nextAction, ...record.highlights]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function matchesStep(step: ProcessSuiteStep, term: string, stageFilter: StageFilter) {
  if (stageFilter !== "all" && step.state !== stageFilter) return false;
  if (!term) return true;
  return [
    step.label,
    step.moduleLabel,
    step.ownerRole,
    step.state,
    step.blocker,
    step.nextAction,
    ...step.evidence.flatMap((record) => [record.label, record.sourceFamily, record.nextAction]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function moduleHref(step: ProcessSuiteStep, role: RoleKey) {
  const visibleModules = modulesForRole(role).map((module) => module.key);
  const moduleKey = step.moduleKey as ModuleKey;
  const roleCanOpenModule = visibleModules.includes(moduleKey);

  if (!roleCanOpenModule) {
    return `/dashboard?role=${role}&view=actions`;
  }

  if (moduleKey === "crm") return `/crm?role=${role}&view=records&record=opportunities`;
  if (moduleKey === "project") return `/project?role=${role}&view=work-items`;
  if (moduleKey === "erp") return `/erp?role=${role}&view=budget-review&record=budgets`;
  if (moduleKey === "files") return `/files?role=${role}&view=package-builder&record=packages`;
  if (moduleKey === "analytics") return `/analytics?role=${role}&view=portfolio`;
  if (moduleKey === "loans") return `/loans?role=${role}&view=package-readiness&record=packages`;
  if (moduleKey === "operations") return `/operations?role=${role}`;
  if (moduleKey === "support") return `/support?role=${role}`;
  if (moduleKey === "hr") return `/hr?role=${role}`;
  if (moduleKey === "learning") return `/learning?role=${role}`;
  if (moduleKey === "sync") return `/sync?role=${role}`;

  return `/dashboard?role=${role}&view=case`;
}

function commandRouteForStep(step: ProcessSuiteStep) {
  return commandRoutes[step.moduleKey] ?? fallbackWorkItemRoute;
}

function commandBodyForStep(step: ProcessSuiteStep, suite: ProcessSuite, role: RoleKey) {
  const idempotencyKey = `process-suite:${suite.suiteKey}:${step.stepKey}:${role}:v1`;
  const title = `${step.moduleLabel}: ${step.nextAction}`;
  const notes = `${suite.label} workflow stage "${step.label}" for ${step.sourceRecordCount} source records. Current blocker: ${step.blocker}. Target apply, external sends, releases, uploads, finance posting, bank actions and sync/source apply remain closed.`;
  const firstRecord = step.evidence[0] ?? null;
  const base = {
    idempotencyKey,
    actorRole: role,
    title,
    notes,
    status: "drafted",
  };

  if (step.moduleKey === "crm") {
    return {
      ...base,
      commandType: "task",
      action: "create_task",
      subject: title,
      body: notes,
      priority: step.state === "blocked" ? "high" : "medium",
      assigneeRole: role,
      opportunityId: firstRecord?.recordKey ?? null,
    };
  }

  if (step.moduleKey === "files") {
    return {
      ...base,
      commandType: "visibility_review",
      action: "request_visibility_review",
      sectionKey: step.stepKey,
      visibilityScope: "internal_review",
      documentId: firstRecord?.recordKey ?? null,
      packageId: suite.suiteKey,
    };
  }

  if (step.moduleKey === "erp") {
    return {
      ...base,
      commandType: "finance_summary",
      action: "request_finance_review",
      financeSummaryId: firstRecord?.recordKey ?? suite.suiteKey,
      currency: "EUR",
    };
  }

  if (step.moduleKey === "loans") {
    return {
      ...base,
      commandType: "bank_package_checklist",
      action: "request_bank_review",
      checklistItemKey: step.stepKey,
      bankPackageId: firstRecord?.recordKey ?? suite.suiteKey,
    };
  }

  if (step.moduleKey === "analytics" || step.moduleKey === "sync") {
    return {
      ...base,
      commandType: step.state === "attention" ? "conflict_review" : "mapping_preview",
      action: step.state === "attention" ? "classify_conflict" : "refresh_preview",
      syncMappingId: firstRecord?.recordKey ?? suite.suiteKey,
      sourceModule: step.moduleKey,
      targetModule: "dashboard",
      entityTypeKey: step.stepKey,
      rollbackPlan: "Review-only preview. No sync apply or source write is executed.",
    };
  }

  return {
    ...base,
    action: "update",
    priority: step.state === "blocked" ? "urgent" : "high",
    ownerRole: role,
    projectId: suite.suiteKey,
    workItemId: firstRecord?.recordKey ?? step.stepKey,
  };
}

function EvidenceRecords({ records, query }: { records: ProcessSuiteSourceRecord[]; query: string }) {
  const term = query.trim().toLowerCase();
  const visible = records.filter((record) => matchesRecord(record, term));

  if (!visible.length) {
    return <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-sm text-[var(--ink-muted)]">No matching evidence records in this step.</p>;
  }

  return (
    <div className="grid gap-2">
      {visible.map((record) => (
        <div key={record.recordKey} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-[6px] bg-black px-2 py-0.5 text-[11px] font-semibold text-white">{record.moduleLabel}</span>
                <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{record.sourceFamily}</span>
              </div>
              <p className="mt-2 font-semibold">{record.label}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{record.ownerRole}</p>
            </div>
            <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase">{labelize(record.status)}</span>
          </div>
          {record.highlights.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {record.highlights.map((highlight) => (
                <span key={highlight} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] text-[var(--ink-muted)]">
                  {highlight}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-sm leading-5 text-[var(--ink-muted)]">{record.nextAction}</p>
        </div>
      ))}
    </div>
  );
}

function SuiteCard({ suite, active, onSelect }: { suite: ProcessSuite; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[8px] border p-4 text-left transition ${
        active ? "border-black bg-black text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${active ? "border-white/20 bg-white/10" : stateClass[suite.state]}`}>
          {labelize(suite.state)}
        </span>
        <span className="text-xs opacity-75">{suite.completionPercent}%</span>
      </div>
      <strong className="mt-3 block">{suite.label}</strong>
      <p className={`mt-2 text-xs leading-5 ${active ? "text-white/70" : "text-[var(--ink-muted)]"}`}>{suite.journeySegment}</p>
      <div className={`mt-3 flex flex-wrap gap-2 text-[11px] ${active ? "text-white/70" : "text-[var(--ink-muted)]"}`}>
        <span>{suite.sourceRecords} records</span>
        <span>{suite.commandDrafts} drafts</span>
        <span>{suite.modules.length} modules</span>
      </div>
    </button>
  );
}

export function ProcessSuitePanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role") ?? "crays-management").key;
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [selectedSuiteKey, setSelectedSuiteKey] = useState<string | null>(null);
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);
  const [stagingStepKey, setStagingStepKey] = useState<string | null>(null);
  const [stageFeedback, setStageFeedback] = useState<StageFeedback | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadSuites(role, controller.signal)
      .then((data) => {
        setLoadState({ state: "ready", data, error: null });
        setSelectedSuiteKey((current) => current ?? data.readModel.suites[0]?.suiteKey ?? null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Process suites unavailable" });
        }
      });
    return () => controller.abort();
  }, [role, refreshKey]);

  const readModel = loadState.data?.readModel ?? null;
  const selectedSuite = useMemo(() => {
    if (!readModel) return null;
    return readModel.suites.find((suite) => suite.suiteKey === selectedSuiteKey) ?? readModel.suites[0] ?? null;
  }, [readModel, selectedSuiteKey]);

  const visibleSteps = useMemo(() => {
    if (!selectedSuite) return [];
    const term = query.trim().toLowerCase();
    return selectedSuite.steps.filter((step) => matchesStep(step, term, stageFilter));
  }, [query, selectedSuite, stageFilter]);

  const selectedStep = useMemo(() => {
    if (!selectedSuite) return null;
    return selectedSuite.steps.find((step) => step.stepKey === selectedStepKey) ?? selectedSuite.steps[0] ?? null;
  }, [selectedStepKey, selectedSuite]);

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading process suites
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="font-semibold">Process suites unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  if (!readModel || !selectedSuite) return null;
  const activeSuite = selectedSuite;
  const sourceHealthHref = role === "admin" || role === "crays-management" ? `/sync?role=${role}` : `/dashboard?role=${role}&view=signals`;
  const focusStep = (filter: StageFilter, nextQuery = "") => {
    setStageFilter(filter);
    setQuery(nextQuery);
    const nextStep = activeSuite.steps.find((step) => filter === "all" || step.state === filter) ?? activeSuite.steps[0] ?? null;
    setSelectedStepKey(nextStep?.stepKey ?? null);
  };
  const focusSuite = (suite: ProcessSuite) => {
    setSelectedSuiteKey(suite.suiteKey);
    setSelectedStepKey(suite.steps[0]?.stepKey ?? null);
    setStageFilter("all");
    setQuery("");
    setStageFeedback(null);
  };
  const focusNextAction = () => {
    const nextStep = activeSuite.steps.find((step) => step.state === "blocked") ?? activeSuite.steps.find((step) => step.state === "attention") ?? activeSuite.steps[0];
    setSelectedStepKey(nextStep?.stepKey ?? null);
    setStageFilter(nextStep?.state ?? "all");
    setQuery("");
  };
  const summaryCards = [
    { label: "Suites", value: readModel.summary.suites, action: "Show all suites", onClick: () => focusStep("all") },
    { label: "Stages", value: readModel.summary.stages, action: "Show all stages", onClick: () => focusStep("all") },
    { label: "Records", value: readModel.summary.sourceRecords, action: "Focus evidence", onClick: () => focusStep("all") },
    { label: "Modules", value: readModel.summary.modulesCovered, action: "Open selected module", href: selectedStep ? moduleHref(selectedStep, role) : `/dashboard?role=${role}&view=case` },
    { label: "Source-backed", value: readModel.summary.sourceBackedSuites, action: "Check source health", href: sourceHealthHref },
    { label: "Command drafts", value: readModel.summary.commandDrafts, action: "Review commands", href: `/dashboard?role=${role}&view=actions` },
    { label: "Apply blocked", value: readModel.summary.applyBlockedCommands, action: "Review blocked queue", href: `/dashboard?role=${role}&view=actions` },
    { label: "Blocked stages", value: readModel.summary.blockedStages, action: "Filter blocked", onClick: () => focusStep("blocked") },
    { label: "Missing records", value: readModel.summary.missingSourceRecords, action: "Check sync", href: sourceHealthHref },
  ];

  async function stageProcessStepDraft(step: ProcessSuiteStep) {
    const config = commandRouteForStep(step);
    setSelectedStepKey(step.stepKey);
    setStagingStepKey(step.stepKey);
    setStageFeedback({ state: "staging", message: `Storing ${step.moduleLabel} review draft...` });
    try {
      const response = await fetch(config.route, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": config.confirmation,
        },
        body: JSON.stringify(commandBodyForStep(step, activeSuite, role)),
      });
      const payload = (await response.json().catch(() => ({}))) as CommandDraftResponse;
      if (!response.ok || payload.status === "invalid" || payload.status === "blocked" || payload.status === "forbidden") {
        throw new Error(payload.error ?? `${step.moduleLabel} command draft failed.`);
      }
      setStageFeedback({
        state: "done",
        commandId: payload.result?.commandId ?? null,
        message: `${step.moduleLabel} review draft stored. Target apply remains ${payload.result?.targetApplyStatus ?? "blocked"}.`,
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setStageFeedback({ state: "error", message: error instanceof Error ? error.message : "Command draft could not be stored." });
    } finally {
      setStagingStepKey(null);
    }
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Process suites</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">A-Z process suites</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            Full-process suites compose CRM, Project, ERP, Files, Loans, Operations, Analytics, HR, Learning, Support, Sync, command queue and stakeholder-room preflight into real operating journeys.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoadState({ state: "loading", data: null, error: null });
            setRefreshKey((value) => value + 1);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh suites
        </button>
      </div>

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-3 xl:grid-cols-9">
        {summaryCards.map((card) =>
          card.href ? (
            <Link key={card.label} href={card.href} className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]">
              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{card.label}</p>
              <strong className="mt-2 block text-xl">{card.value}</strong>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                {card.action}
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          ) : (
            <button key={card.label} type="button" onClick={card.onClick} className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]">
              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{card.label}</p>
              <strong className="mt-2 block text-xl">{card.value}</strong>
              <span className="mt-2 block text-[11px] font-semibold text-[var(--accent)]">{card.action}</span>
            </button>
          ),
        )}
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3">
          {readModel.suites.map((suite) => (
            <SuiteCard key={suite.suiteKey} suite={suite} active={suite.suiteKey === selectedSuite.suiteKey} onSelect={() => focusSuite(suite)} />
          ))}
          <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Suite actions</h3>
            </div>
            <div className="mt-3 grid gap-2">
              <Link href={`/dashboard?role=${role}&view=case`} className="inline-flex items-center justify-between rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:border-[var(--accent)]">
                Open case workspace
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/dashboard?role=${role}&view=actions`} className="inline-flex items-center justify-between rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:border-[var(--accent)]">
                Review command queue
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href={sourceHealthHref} className="inline-flex items-center justify-between rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:border-[var(--accent)]">
                Check source health
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className={`inline-flex rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[selectedSuite.state]}`}>
                  {labelize(selectedSuite.state)}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{selectedSuite.label}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{selectedSuite.currentDecision}</p>
              </div>
              <div className="grid gap-1 text-right text-xs text-[var(--ink-muted)]">
                <span>Owner: {selectedSuite.ownerRole}</span>
                <span>Consumers: {selectedSuite.consumingRoles.join(", ")}</span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link href={`/dashboard?role=${role}&view=case`} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--accent)]">
                <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Anchor case</p>
                <p className="mt-2 text-sm">{readModel.anchorCase.preparedOffer}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {readModel.anchorCase.candidate} / {readModel.anchorCase.candidateOrganization}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                  Open case workspace
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
              <Link href={`/dashboard?role=${role}&view=rooms`} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--accent)]">
                <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Property and bank</p>
                <p className="mt-2 text-sm">{readModel.anchorCase.property}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{readModel.anchorCase.bank}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">
                  Review room preflight
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
              <button type="button" onClick={focusNextAction} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--accent)]">
                <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-2 text-sm">{selectedSuite.nextAction}</p>
                <span className="mt-2 block text-[11px] font-semibold text-[var(--accent)]">Focus next stage</span>
              </button>
            </div>
          </div>

          {selectedStep ? (
            <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Selected workflow stage</p>
                  <h4 className="mt-2 font-semibold">{selectedStep.label}</h4>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedStep.moduleLabel} · {selectedStep.sourceRecordCount} source records · {selectedStep.commandDrafts} command drafts</p>
                </div>
                <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[selectedStep.state]}`}>{labelize(selectedStep.state)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={moduleHref(selectedStep, role)} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--accent)]">
                  Open connected workspace
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => void stageProcessStepDraft(selectedStep)}
                  disabled={stagingStepKey === selectedStep.stepKey}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-black px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {stagingStepKey === selectedStep.stepKey ? "Staging draft" : "Stage review draft"}
                </button>
              </div>
              {stageFeedback ? (
                <p className={`mt-3 rounded-[8px] border p-3 text-xs leading-5 ${
                  stageFeedback.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : stageFeedback.state === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"
                }`}>
                  {stageFeedback.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-[var(--line)] bg-white p-3">
            <label className="relative min-w-[260px] flex-1">
              <span className="sr-only">Search process suites</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search steps, records, owners or blockers"
                className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            {(["all", "blocked", "attention", "ready"] as StageFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStageFilter(filter)}
                className={`rounded-[8px] border px-3 py-2 text-xs font-semibold transition ${
                  stageFilter === filter ? "border-black bg-black text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                }`}
              >
                {labelize(filter)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {visibleSteps.map((stepItem) => (
              <section key={stepItem.stepKey} className={`rounded-[8px] border bg-white ${selectedStep?.stepKey === stepItem.stepKey ? "border-black shadow-sm" : "border-[var(--line)]"}`}>
                <div className="grid gap-4 border-b border-[var(--line)] p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${stateClass[stepItem.state]}`}>
                        {labelize(stepItem.state)}
                      </span>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{stepItem.moduleLabel}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedStepKey(stepItem.stepKey)} className="mt-3 text-left font-semibold hover:underline">
                      {stepItem.label}
                    </button>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{stepItem.blocker}</p>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">Owner</span>
                      <strong>{stepItem.ownerRole}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">Records</span>
                      <strong>{stepItem.sourceRecordCount}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">Command drafts</span>
                      <strong>{stepItem.commandDrafts}</strong>
                    </div>
                    <Link href={moduleHref(stepItem, role)} className="mt-1 inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--accent)]">
                      Open module
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void stageProcessStepDraft(stepItem)}
                      disabled={stagingStepKey === stepItem.stepKey}
                      className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {stagingStepKey === stepItem.stepKey ? "Staging" : "Stage review draft"}
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <EvidenceRecords records={stepItem.evidence} query={query} />
                  <div className="space-y-3">
                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-[var(--accent)]" />
                        <p className="text-sm font-semibold">Next action</p>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[var(--ink-muted)]">{stepItem.nextAction}</p>
                    </div>
                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                      <div className="flex items-center gap-2">
                        {stepItem.state === "ready" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                        <p className="text-sm font-semibold">Decision status</p>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[var(--ink-muted)]">
                        {stepItem.state === "ready"
                          ? "Ready for the next internal role decision."
                          : "Needs review before the process can advance."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
