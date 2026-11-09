"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutList,
  Link2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { CaseWorkspaceReadModel, CaseWorkspaceSection } from "@/db/case-workspace-read-model-repository";
import { roleByKey, type RoleKey } from "@/lib/roles";
import { buildWorkflowActionRegistryReadModel, type WorkflowActionKey, type WorkflowActionReadModelItem } from "@/lib/workflow-action-registry";

type CaseWorkspacePayload = {
  status: "ready" | "not_configured" | "not_found" | "forbidden";
  readModel: CaseWorkspaceReadModel;
};

type WorkbenchModuleKey = "crm" | "project" | "erp" | "files" | "analytics" | "loans" | "operations";
type FilterKey = "all" | "blocked" | "active" | "ready";

type LoadState =
  | { state: "idle"; data: null; error: null }
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: CaseWorkspacePayload; error: null }
  | { state: "error"; data: null; error: string };

type StageFeedback = {
  status: string;
  label: string;
  commandId: string | null;
  applyGate: string | null;
  message: string;
};

type WorkbenchRecord = {
  key: string;
  sectionKey: CaseWorkspaceSection["key"];
  label: string;
  recordType: string;
  ownerRole: string;
  objectId: string | null;
  status: CaseWorkspaceSection["status"];
  state: string;
  recentChange: string;
  blocker: string;
  nextAction: string;
  priority: "Critical" | "High" | "Normal";
};

type ModuleWorkbenchConfig = {
  label: string;
  workbenchLabel: string;
  userJob: string;
  primaryRecord: string;
  sectionKeys: CaseWorkspaceSection["key"][];
  workflowActionKeys: WorkflowActionKey[];
};

type GuardedModuleActionSpec = {
  label: string;
  disabledLabel: string;
  route: string;
  confirmation: string;
  allowedRoles: RoleKey[];
  body: (input: {
    role: RoleKey;
    caseRecord: NonNullable<CaseWorkspaceReadModel["case"]>;
    selectedRecord: WorkbenchRecord;
  }) => Record<string, string | null>;
};

const moduleConfigs: Record<WorkbenchModuleKey, ModuleWorkbenchConfig> = {
  crm: {
    label: "CRM",
    workbenchLabel: "Relationship workbench",
    userJob: "Coordinate property owner, candidate and deal relationship work from the active case.",
    primaryRecord: "Relationship records",
    sectionKeys: ["candidate", "property"],
    workflowActionKeys: ["resolve-blocker", "stage-room-preflight", "review-evidence"],
  },
  project: {
    label: "Project",
    workbenchLabel: "Opening workbench",
    userJob: "Turn case blockers into opening, handoff and delivery work without losing deal context.",
    primaryRecord: "Work items",
    sectionKeys: ["opening", "evidence", "candidate"],
    workflowActionKeys: ["resolve-blocker", "create-opening-handoff"],
  },
  erp: {
    label: "ERP",
    workbenchLabel: "Finance workbench",
    userJob: "Review economics, assumptions and finance readiness for the active prepared deal.",
    primaryRecord: "Finance records",
    sectionKeys: ["economics", "bank"],
    workflowActionKeys: ["request-finance-review", "prepare-bank-package"],
  },
  files: {
    label: "Files",
    workbenchLabel: "Evidence package workbench",
    userJob: "Review evidence packages, document approvals and stakeholder visibility before any release.",
    primaryRecord: "Packages and grants",
    sectionKeys: ["files", "evidence", "candidate", "bank"],
    workflowActionKeys: ["review-evidence", "stage-room-preflight", "prepare-bank-package"],
  },
  analytics: {
    label: "Analytics",
    workbenchLabel: "Signal workbench",
    userJob: "Inspect score, risk and readiness signals that explain the next operating decision.",
    primaryRecord: "Signals and scorecards",
    sectionKeys: ["property", "evidence", "economics", "bank", "opening"],
    workflowActionKeys: ["resolve-blocker", "review-evidence", "request-finance-review"],
  },
  loans: {
    label: "Loans",
    workbenchLabel: "Bank readiness workbench",
    userJob: "Prepare the internal bank-readiness checklist while bank send and release stay closed.",
    primaryRecord: "Loan case records",
    sectionKeys: ["bank", "economics", "files", "candidate"],
    workflowActionKeys: ["prepare-bank-package", "request-finance-review", "stage-room-preflight"],
  },
  operations: {
    label: "Operations",
    workbenchLabel: "Opening operations workbench",
    userJob: "Continue from deal approval into opening handoff, studio readiness and partner execution.",
    primaryRecord: "Opening records",
    sectionKeys: ["opening", "files", "economics"],
    workflowActionKeys: ["create-opening-handoff", "resolve-blocker"],
  },
};

const guardedModuleActions: Record<WorkbenchModuleKey, GuardedModuleActionSpec> = {
  crm: {
    label: "Stage CRM task",
    disabledLabel: "CRM task locked",
    route: "/api/crays/core-command/crm-activity",
    confirmation: "stage-crm-activity-command",
    allowedRoles: ["deal-manager", "expansion-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:crm:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      preparedOfferId: caseRecord.preparedOfferId,
      dealId: caseRecord.dealId,
      propertyCaseId: caseRecord.propertyCaseId,
      commandType: "task",
      action: "create_task",
      subject: selectedRecord.nextAction,
      body: `CRM workbench task for ${caseRecord.title}. Blocker: ${selectedRecord.blocker}. Target apply remains blocked.`,
      status: "drafted",
      priority: selectedRecord.priority.toLowerCase(),
      assigneeRole: role,
    }),
  },
  project: {
    label: "Stage work item",
    disabledLabel: "Work item locked",
    route: "/api/crays/core-command/project-work-item",
    confirmation: "stage-project-work-item-command",
    allowedRoles: ["deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:project:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      preparedOfferId: caseRecord.preparedOfferId,
      dealId: caseRecord.dealId,
      propertyCaseId: caseRecord.propertyCaseId,
      action: "update",
      title: selectedRecord.nextAction,
      status: "drafted",
      priority: selectedRecord.priority === "Critical" ? "urgent" : "high",
      ownerRole: role,
      notes: `Project workbench item for ${caseRecord.title}. Blocker: ${selectedRecord.blocker}. Target apply remains blocked.`,
    }),
  },
  erp: {
    label: "Stage finance review",
    disabledLabel: "Finance review locked",
    route: "/api/crays/core-command/erp-finance",
    confirmation: "stage-erp-finance-command",
    allowedRoles: ["finance", "deal-manager", "reviewer", "admin", "crays-management", "franchise-partner"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:erp:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      preparedOfferId: caseRecord.preparedOfferId,
      dealId: caseRecord.dealId,
      propertyCaseId: caseRecord.propertyCaseId,
      commandType: "finance_summary",
      action: "request_finance_review",
      title: selectedRecord.nextAction,
      notes: `ERP workbench finance review for ${caseRecord.title}. Finance writes and exports remain blocked.`,
      status: "drafted",
      currency: "EUR",
    }),
  },
  files: {
    label: "Stage package review",
    disabledLabel: "Package review locked",
    route: "/api/crays/core-command/files-package",
    confirmation: "stage-files-package-command",
    allowedRoles: ["deal-manager", "finance", "reviewer", "admin", "crays-management"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:files:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      preparedOfferId: caseRecord.preparedOfferId,
      dealId: caseRecord.dealId,
      propertyCaseId: caseRecord.propertyCaseId,
      commandType: "visibility_review",
      action: "request_visibility_review",
      title: selectedRecord.nextAction,
      notes: `Files workbench package review for ${caseRecord.title}. Uploads and releases remain blocked.`,
      status: "drafted",
      sectionKey: selectedRecord.sectionKey,
      visibilityScope: "internal_review",
    }),
  },
  analytics: {
    label: "Stage signal review",
    disabledLabel: "Signal review locked",
    route: "/api/crays/core-command/sync-preview",
    confirmation: "stage-sync-preview-command",
    allowedRoles: ["deal-manager", "finance", "reviewer", "admin", "crays-management"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:analytics:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      commandType: "mapping_preview",
      action: "refresh_preview",
      title: selectedRecord.nextAction,
      notes: `Analytics workbench signal review for ${caseRecord.title}. Source writes and sync apply remain blocked.`,
      status: "drafted",
      sourceModule: "analytics",
      targetModule: "case-workspace",
      entityTypeKey: selectedRecord.sectionKey,
      syncMappingId: caseRecord.preparedOfferId,
    }),
  },
  loans: {
    label: "Stage bank checklist",
    disabledLabel: "Bank checklist locked",
    route: "/api/crays/core-command/loans-checklist",
    confirmation: "stage-loans-checklist-command",
    allowedRoles: ["finance", "deal-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:loans:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      preparedOfferId: caseRecord.preparedOfferId,
      dealId: caseRecord.dealId,
      propertyCaseId: caseRecord.propertyCaseId,
      commandType: "bank_package_checklist",
      action: "request_bank_review",
      title: selectedRecord.nextAction,
      notes: `Loans workbench checklist for ${caseRecord.title}. Bank send, payment and release remain blocked.`,
      status: "drafted",
      checklistItemKey: selectedRecord.sectionKey,
    }),
  },
  operations: {
    label: "Stage opening task",
    disabledLabel: "Opening task locked",
    route: "/api/crays/core-command/project-work-item",
    confirmation: "stage-project-work-item-command",
    allowedRoles: ["deal-manager", "franchise-partner", "studio-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseRecord, selectedRecord }) => ({
      idempotencyKey: `module-workbench:operations:${caseRecord.preparedOfferId}:${selectedRecord.sectionKey}:${role}:v2`,
      actorRole: role,
      preparedOfferId: caseRecord.preparedOfferId,
      dealId: caseRecord.dealId,
      propertyCaseId: caseRecord.propertyCaseId,
      action: "update",
      title: selectedRecord.nextAction,
      status: "drafted",
      priority: selectedRecord.priority === "Critical" ? "urgent" : "high",
      ownerRole: role,
      notes: `Operations workbench opening task for ${caseRecord.title}. External sending and Project apply remain blocked.`,
    }),
  },
};

function buildQuery(searchParams: Pick<URLSearchParams, "get">, roleOverride?: string) {
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
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
  const response = await fetch(`/api/crays/case-workspace/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Case workspace returned HTTP ${response.status}`);
  return (await response.json()) as CaseWorkspacePayload;
}

function labelize(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Pending";
}

function statusClass(status: CaseWorkspaceSection["status"]) {
  if (status === "ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "blocked") return "border-rose-700/20 bg-rose-50 text-rose-950";
  if (status === "waiting") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-sky-700/20 bg-sky-50 text-sky-950";
}

function priorityFor(section: CaseWorkspaceSection): WorkbenchRecord["priority"] {
  if (section.status === "blocked") return "Critical";
  if (section.status === "active" || section.status === "waiting") return "High";
  return "Normal";
}

function moduleRecords(workspace: CaseWorkspaceReadModel, config: ModuleWorkbenchConfig) {
  return workspace.sections
    .filter((section) => config.sectionKeys.includes(section.key))
    .map<WorkbenchRecord>((section) => ({
      key: `${section.key}:${section.objectId ?? "pending"}`,
      sectionKey: section.key,
      label: section.label,
      recordType: config.primaryRecord,
      ownerRole: section.ownerRole,
      objectId: section.objectId,
      status: section.status,
      state: section.state,
      recentChange: section.recentChange,
      blocker: section.blocker,
      nextAction: section.nextAction,
      priority: priorityFor(section),
    }));
}

function stageMessage(payload: { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string }, fallbackLabel: string) {
  if (payload.error) return payload.error;
  return `${fallbackLabel} command draft stored; target apply remains ${payload.result?.targetApplyStatus ?? "blocked"}.`;
}

export function CaseBoundModuleWorkbenchPanel({ moduleKey, role: roleOverride }: { moduleKey: WorkbenchModuleKey; role?: string }) {
  const searchParams = useSearchParams();
  const caseQuery = useMemo(() => buildQuery(searchParams, roleOverride), [roleOverride, searchParams]);
  const activeQueryKey = caseQuery?.params.toString() ?? null;
  const config = moduleConfigs[moduleKey];
  const moduleAction = guardedModuleActions[moduleKey];
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "idle", data: null, error: null });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [stagingKey, setStagingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<StageFeedback | null>(null);

  useEffect(() => {
    if (!caseQuery) return;
    const controller = new AbortController();
    loadCaseWorkspace(caseQuery.params, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Module workbench failed" });
      });

    return () => controller.abort();
  }, [caseQuery, refreshKey]);

  const workspace = loadState.state === "ready" ? loadState.data.readModel : null;
  const records = useMemo(() => (workspace ? moduleRecords(workspace, config) : []), [config, workspace]);

  const visibleRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesFilter = filter === "all" || record.status === filter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [record.label, record.state, record.ownerRole, record.blocker, record.nextAction, record.recentChange].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      return matchesFilter && matchesSearch;
    });
  }, [filter, records, search]);

  if (!caseQuery) return null;

  if (loadState.state === "idle" || loadState.state === "loading" || (loadState.state === "ready" && activeQueryKey !== caseQuery.params.toString())) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading case-bound workbench
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Case-bound workbench unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  const readModel = loadState.data.readModel;
  const caseRecord = readModel.case;
  if (!caseRecord) return null;
  const activeCase = caseRecord;

  const selectedRecord = records.find((record) => record.key === selectedKey) ?? visibleRecords[0] ?? records[0] ?? null;
  const role = roleByKey(caseQuery.role).key;
  const roleAllowed = moduleAction.allowedRoles.includes(role);
  const registry = buildWorkflowActionRegistryReadModel(readModel, role);
  const workflowActions = registry.actions.filter((action) => config.workflowActionKeys.includes(action.key));
  const blockedCount = records.filter((record) => record.status === "blocked").length;
  const readyCount = records.filter((record) => record.status === "ready").length;

  async function stageModuleDraft() {
    if (!selectedRecord || !roleAllowed) return;
    setStagingKey(`module:${moduleKey}`);
    try {
      const response = await fetch(moduleAction.route, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": moduleAction.confirmation,
        },
        body: JSON.stringify(moduleAction.body({ role, caseRecord: activeCase, selectedRecord })),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        status?: string;
        result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string };
        error?: string;
      };
      setFeedback({
        status: payload.status ?? `HTTP ${response.status}`,
        label: moduleAction.label,
        commandId: payload.result?.commandId ?? null,
        applyGate: payload.result?.applyGate ?? null,
        message: stageMessage(payload, moduleAction.label),
      });
      setRefreshKey((value) => value + 1);
    } finally {
      setStagingKey(null);
    }
  }

  async function stageWorkflowAction(action: WorkflowActionReadModelItem) {
    setStagingKey(`workflow:${action.key}`);
    try {
      const response = await fetch("/api/crays/workflow-actions/stage", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-workflow-action-command",
        },
        body: JSON.stringify({
          actionKey: action.key,
          actorRole: role,
          preparedOfferId: activeCase.preparedOfferId,
          dealId: activeCase.dealId,
          propertyCaseId: activeCase.propertyCaseId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        action?: { label?: string };
        result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string };
        reason?: string;
        error?: string;
        status?: string;
      };
      setFeedback({
        status: payload.status ?? `HTTP ${response.status}`,
        label: payload.action?.label ?? action.label,
        commandId: payload.result?.commandId ?? null,
        applyGate: payload.result?.applyGate ?? null,
        message: response.ok
          ? `${payload.action?.label ?? action.label} command draft stored; target apply remains ${payload.result?.targetApplyStatus ?? "blocked"}.`
          : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      });
      setRefreshKey((value) => value + 1);
    } finally {
      setStagingKey(null);
    }
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              <LayoutList className="h-3.5 w-3.5" />
              Case-bound workbench
            </span>
            <span className="rounded-[7px] border border-emerald-700/20 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-950">
              {config.label}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{config.workbenchLabel}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">{config.userJob}</p>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Active case</p>
          <strong className="mt-2 block text-sm">{activeCase.title}</strong>
          <span className="mt-1 block text-xs text-[var(--ink-muted)]">
            {activeCase.market} - {labelize(activeCase.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--line)] px-5 py-4 md:grid-cols-4">
        {[
          ["Records", `${visibleRecords.length}/${records.length}`],
          ["Blocked", String(blockedCount)],
          ["Ready", String(readyCount)],
          ["Drafts", String(readModel.summary.commandDrafts)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-lg">{value}</strong>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <span className="sr-only">Search module records</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search case records"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[var(--ink-muted)]" />
          {(["all", "blocked", "active", "ready"] as FilterKey[]).map((item) => (
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
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-white text-xs font-semibold uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-5 py-3">Record</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Blocker</th>
                <th className="px-5 py-3">Next action</th>
                <th className="px-5 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleRecords.map((record) => (
                <tr key={record.key} className={selectedRecord?.key === record.key ? "bg-emerald-50/45" : "bg-[var(--surface)]"}>
                  <td className="px-5 py-4 align-top">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{record.recordType}</p>
                    <strong className="mt-1 block">{record.label}</strong>
                    <span className="mt-1 block text-xs text-[var(--ink-muted)]">{record.objectId ?? "Object pending"}</span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className={`inline-flex rounded-[7px] border px-2 py-1 text-xs font-semibold capitalize ${statusClass(record.status)}`}>
                      {record.status}
                    </span>
                    <span className="mt-2 block max-w-[180px] text-xs leading-5 text-[var(--ink-muted)]">{record.state}</span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className={record.priority === "Critical" ? "text-sm font-semibold text-rose-700" : "text-sm font-semibold"}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="max-w-[240px] px-5 py-4 align-top text-sm leading-6 text-[var(--ink-muted)]">{record.blocker}</td>
                  <td className="max-w-[240px] px-5 py-4 align-top font-semibold leading-6">{record.nextAction}</td>
                  <td className="px-5 py-4 text-right align-top">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(record.key)}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                    >
                      Select
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--ink-muted)]">
                    No case records match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="border-t border-[var(--line)] bg-white p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Selected record</h3>
          </div>
          {selectedRecord ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedRecord.ownerRole}</p>
                <h4 className="mt-2 text-lg font-semibold">{selectedRecord.label}</h4>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedRecord.recentChange}</p>
              </div>
              {[
                ["State", selectedRecord.state],
                ["Blocker", selectedRecord.blocker],
                ["Next action", selectedRecord.nextAction],
                ["Object", selectedRecord.objectId ?? "Pending"],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-[var(--line)] pt-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <strong className="mt-1 block text-sm leading-6">{value}</strong>
                </div>
              ))}
              <button
                type="button"
                onClick={stageModuleDraft}
                disabled={!roleAllowed || stagingKey !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
              >
                {stagingKey === `module:${moduleKey}` ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : roleAllowed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                {roleAllowed ? moduleAction.label : moduleAction.disabledLabel}
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Workflow actions</h3>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workflowActions.map((action) => {
              const blocked = !action.roleAllowed || action.preflightStatus === "blocked";
              return (
                <div key={action.key} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{action.moduleLabel}</p>
                      <strong className="mt-1 block text-sm">{action.label}</strong>
                    </div>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(action.preflightStatus === "ready" ? "ready" : action.preflightStatus === "blocked" ? "blocked" : "waiting")}`}>
                      {action.preflightStatus}
                    </span>
                  </div>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--ink-muted)]">{action.preflightSummary}</p>
                  <button
                    type="button"
                    onClick={() => stageWorkflowAction(action)}
                    disabled={blocked || stagingKey !== null}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--ink-muted)]"
                  >
                    {stagingKey === `workflow:${action.key}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : blocked ? <LockKeyhole className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Stage action
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Command feedback</h3>
          </div>
          {feedback ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Latest action</p>
                <strong className="mt-1 block text-sm">{feedback.label}</strong>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Review record</p>
                <strong className="mt-1 block text-sm">{feedback.commandId ? "Stored command draft" : feedback.status}</strong>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Workflow state</p>
                <strong className="mt-1 block text-sm">{feedback.applyGate ? "Apply closed" : "Closed"}</strong>
              </div>
              <p className="text-xs leading-5 text-[var(--ink-muted)]">{feedback.message}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Stage a module or workflow action to create a guarded Core command draft.
            </p>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <p className="text-xs leading-5 text-[var(--ink-muted)]">
              Apply, release, upload, send, finance write, bank send, payment, source write and sync apply remain closed.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}
