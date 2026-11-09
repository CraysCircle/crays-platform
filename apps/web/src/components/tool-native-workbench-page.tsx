"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Columns3,
  FileText,
  Inbox,
  Kanban,
  LayoutList,
  Mail,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { roleByKey } from "@/lib/roles";
import type { SourceFaithfulModuleKey, SourceFaithfulWorkbenchContract } from "@/lib/source-faithful-product-contract";

type NativeModuleKey = Exclude<SourceFaithfulModuleKey, "project" | "sync">;

type Payload = {
  status: "ready" | "forbidden";
  readModel: SourceFaithfulWorkbenchContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type StageState =
  | { state: "idle"; message: string | null }
  | { state: "staging"; message: string }
  | { state: "done"; message: string }
  | { state: "error"; message: string };

type DraftCommandResponse = {
  status?: string;
  error?: string;
  result?: {
    commandId?: string;
    applyGate?: string;
    targetApplyStatus?: string;
  };
};

type NativeItem = {
  id: string;
  recordKey: string;
  identifier: string;
  kind: string;
  title: string;
  description: string;
  owner: string;
  assignees: string[];
  stage: "Inbox" | "Active" | "Review" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  labels: string[];
  startDate: string;
  dueDate: string;
  scope: string;
  relation: string;
  notes: string[];
  customFields: Array<{ key: string; label: string; value: string }>;
};

const routes: Record<NativeModuleKey, string> = {
  crm: "/api/crays/crm/workbench/read-model",
  erp: "/api/crays/erp/workbench/read-model",
  files: "/api/crays/files/workbench/read-model",
  analytics: "/api/crays/analytics/workbench/read-model",
  loans: "/api/crays/loans/workbench/read-model",
};

const draftRoutes: Record<NativeModuleKey, { route: string; confirmation: string }> = {
  crm: { route: "/api/crays/core-command/crm-activity", confirmation: "stage-crm-activity-command" },
  erp: { route: "/api/crays/core-command/erp-finance", confirmation: "stage-erp-finance-command" },
  files: { route: "/api/crays/core-command/files-package", confirmation: "stage-files-package-command" },
  analytics: { route: "/api/crays/core-command/sync-preview", confirmation: "stage-sync-preview-command" },
  loans: { route: "/api/crays/core-command/loans-checklist", confirmation: "stage-loans-checklist-command" },
};

const stageOrder: NativeItem["stage"][] = ["Inbox", "Active", "Review", "Done"];
const priorities: NativeItem["priority"][] = ["Critical", "High", "Medium", "Low"];

function modulePrefix(moduleKey: NativeModuleKey) {
  if (moduleKey === "crm") return "CRM";
  if (moduleKey === "erp") return "FIN";
  if (moduleKey === "files") return "FILE";
  if (moduleKey === "analytics") return "KPI";
  return "LOAN";
}

function defaultView(moduleKey: NativeModuleKey) {
  if (moduleKey === "crm") return "home";
  if (moduleKey === "erp") return "finance-summary";
  if (moduleKey === "files") return "vault";
  if (moduleKey === "analytics") return "scorecards";
  return "package-readiness";
}

function defaultRecordForView(moduleKey: NativeModuleKey, viewKey: string) {
  if (moduleKey === "erp") {
    if (viewKey === "invoice-status") return "invoices";
    if (viewKey === "budget-review") return "budgets";
    if (viewKey === "procurement") return "purchase-orders";
    if (viewKey === "staff") return "employees";
    if (viewKey === "facilities") return "assets";
    if (viewKey === "quality") return "quality-inspections";
  }
  if (moduleKey === "files") {
    if (viewKey === "vault") return "documents";
    if (viewKey === "package-builder") return "packages";
    if (viewKey === "release-review") return "release-preflights";
  }
  return "all";
}

function itemTitle(moduleKey: NativeModuleKey, label: string) {
  if (moduleKey === "crm") return `${label} workspace`;
  if (moduleKey === "erp") return `${label} control`;
  if (moduleKey === "files") return `${label} review`;
  if (moduleKey === "analytics") return `${label} board`;
  return `${label} desk`;
}

function sourceRowDescription(moduleKey: NativeModuleKey, sectionLabel: string) {
  if (moduleKey === "files") {
    return `${sectionLabel} connected to document package, stakeholder-room and redaction workflow data. Changes are staged for review before any upload, preview, release or external send.`;
  }
  return `Live operational record from ${sectionLabel}. Field edits stage inside CRAYS before any source write.`;
}

function sourceRowNotes(moduleKey: NativeModuleKey) {
  if (moduleKey === "files") return ["Package lineage, grants and review history are tracked for the active workflow."];
  return ["Record lineage is available through the Core source map."];
}

function stageFromStatus(status: string): NativeItem["stage"] {
  const normalized = status.toLowerCase();
  if (/(done|closed|complete|submitted|approved|active|ready)/.test(normalized)) return "Done";
  if (/(review|pending|waiting|proposal|meeting)/.test(normalized)) return "Review";
  if (/(open|screening|progress|draft)/.test(normalized)) return "Active";
  return "Inbox";
}

function priorityFromStatus(status: string): NativeItem["priority"] {
  const normalized = status.toLowerCase();
  if (/(blocked|overdue|critical|urgent|failed)/.test(normalized)) return "Critical";
  if (/(review|pending|waiting|proposal|high)/.test(normalized)) return "High";
  if (/(done|closed|complete|approved)/.test(normalized)) return "Low";
  return "Medium";
}

function formatFieldValue(value: string | number | boolean | null) {
  if (value === null) return "n/a";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value || "n/a");
}

function buildItems(readModel: SourceFaithfulWorkbenchContract): NativeItem[] {
  if (readModel.sourceSections?.length) {
    return readModel.sourceSections.flatMap((section, sectionIndex) =>
      section.rows.map((row, rowIndex) => ({
        id: `${readModel.module.key}-${section.key}-${row.id}`,
        recordKey: section.key,
        identifier: `${modulePrefix(readModel.module.key as NativeModuleKey)}-${String(sectionIndex + 1).padStart(2, "0")}-${String(rowIndex + 1).padStart(3, "0")}`,
        kind: section.label,
        title: row.label,
        description: sourceRowDescription(readModel.module.key as NativeModuleKey, section.label),
        owner: row.owner || readModel.role,
        assignees: [row.owner || readModel.role],
        stage: stageFromStatus(row.status),
        priority: priorityFromStatus(row.status),
        labels: [readModel.module.label, section.label, row.status],
        startDate: row.modifiedAt?.slice(0, 10) ?? "Live source",
        dueDate: row.fields.dueDate ? formatFieldValue(row.fields.dueDate) : row.fields.expectedEnd ? formatFieldValue(row.fields.expectedEnd) : "Live source",
        scope: `${section.label} - ${row.status}`,
        relation: readModel.sourceRuntime?.owner ?? readModel.module.label,
        notes: sourceRowNotes(readModel.module.key as NativeModuleKey),
        customFields: Object.entries(row.fields).map(([key, value]) => ({
          key,
          label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("-", " "),
          value: formatFieldValue(value),
        })),
      })),
    );
  }

  return readModel.records.map((record, index) => ({
    id: `${readModel.module.key}-${record.key}`,
    recordKey: record.key,
    identifier: `${modulePrefix(readModel.module.key as NativeModuleKey)}-${String(index + 1).padStart(3, "0")}`,
    kind: record.label,
    title: itemTitle(readModel.module.key as NativeModuleKey, record.label),
    description: `${record.scope}. Review status, owner and next action before connected updates.`,
    owner: readModel.role,
    assignees: [readModel.role],
    stage: stageOrder[index % stageOrder.length],
    priority: index === 0 ? "High" : "Medium",
    labels: [readModel.module.label, record.label],
    startDate: "2026-07-10",
    dueDate: index === 0 ? "This week" : "Queued",
    scope: record.scope,
    relation: readModel.module.label,
    notes: ["Draft changes are staged for review."],
    customFields: [
      { key: "visibility", label: "Visibility", value: record.scope },
      { key: "status", label: "Status", value: record.status.replaceAll("_", " ") },
      { key: "approval", label: "Approval", value: "Required before live action" },
    ],
  }));
}

async function loadWorkbench(moduleKey: NativeModuleKey, role: string, signal: AbortSignal) {
  const response = await fetch(`${routes[moduleKey]}?role=${role}`, { cache: "no-store", signal });
  if (response.status === 403) return (await response.json()) as Payload;
  if (!response.ok) throw new Error(`Workbench returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function asList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function listValue(value: string[]) {
  return value.join(", ");
}

function eventLabel(label: string) {
  return `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${label}`;
}

function idForDraft(moduleKey: NativeModuleKey, record: NativeItem | null, title: string) {
  return `${moduleKey}:${record?.id ?? "new-action"}:${title}:${crypto.randomUUID()}`;
}

export function ToolNativeWorkbenchPage({ moduleKey, role: roleOverride }: { moduleKey: NativeModuleKey; role?: string }) {
  const searchParams = useSearchParams();
  const roleDefinition = roleByKey(roleOverride ?? searchParams.get("role"));
  const role = roleDefinition.key;
  const clientRoleAllowed = roleDefinition.mode === "workbench";
  const canStageCoreDraft =
    moduleKey !== "erp" || ["finance", "deal-manager", "reviewer", "admin", "crays-management", "franchise-partner"].includes(role);
  const requestedView = searchParams.get("view") ?? defaultView(moduleKey);
  const requestedRecord = searchParams.get("record");
  const initialRecord = requestedRecord ?? defaultRecordForView(moduleKey, requestedView);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState(requestedView);
  const [activeRecord, setActiveRecord] = useState(initialRecord);
  const [activeStage, setActiveStage] = useState<"all" | NativeItem["stage"]>("all");
  const [displayOpen, setDisplayOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [items, setItems] = useState<NativeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeSettingsKey, setActiveSettingsKey] = useState<string | null>(null);
  const [stagedEvents, setStagedEvents] = useState<string[]>([]);
  const [stageState, setStageState] = useState<StageState>({ state: "idle", message: null });

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadWorkbench(moduleKey, role, controller.signal)
      .then((data) => {
        const firstView = data.readModel.navigation.find((view) => view.key === requestedView)?.key ?? requestedView;
        const fallbackRecord = defaultRecordForView(moduleKey, firstView);
        const firstRecord = requestedRecord && data.readModel.records.some((record) => record.key === requestedRecord) ? requestedRecord : fallbackRecord;
        setLoadState({ state: "ready", data, error: null });
        setItems(buildItems(data.readModel));
        setActiveView(firstView);
        setActiveRecord(firstRecord);
        setActiveStage("all");
        setActiveSettingsKey(data.readModel.settingsGroups[0]?.key ?? null);
        setSelectedId(null);
        setDetailOpen(false);
        setStagedEvents([]);
        setStageState({ state: "idle", message: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Workbench failed" });
      });

    return () => controller.abort();
  }, [clientRoleAllowed, moduleKey, refreshKey, requestedRecord, requestedView, role]);

  const readModel = loadState.data?.readModel ?? null;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const activeSettings = readModel?.settingsGroups.find((group) => group.key === activeSettingsKey) ?? readModel?.settingsGroups[0] ?? null;
  const activeLabel = readModel?.navigation.find((view) => view.key === activeView)?.label ?? activeView.replaceAll("-", " ");
  const kindOptions = readModel?.records.map((record) => record.label) ?? [];

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const recordMatches = activeRecord === "all" || item.recordKey === activeRecord;
      const stageMatches = activeStage === "all" || item.stage === activeStage;
      const searchable = `${item.identifier} ${item.kind} ${item.title} ${item.description} ${item.owner} ${item.assignees.join(" ")} ${item.labels.join(" ")} ${item.scope}`.toLowerCase();
      return recordMatches && stageMatches && (!normalized || searchable.includes(normalized));
    });
  }, [activeRecord, activeStage, items, query]);
  const visibleSummary = moduleKey === "crm" && activeView === "reports" ? "6 report workflows" : `${filteredItems.length} visible records`;

  if (!clientRoleAllowed) {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-xs font-semibold uppercase">{moduleKey.toUpperCase()} workspace</p>
        <h2 className="mt-2 text-xl font-semibold">Workspace is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">This role uses a separate portal or member surface and cannot inspect this internal workspace.</p>
      </div>
    );
  }

  function stage(label: string) {
    setStagedEvents((events) => [eventLabel(label), ...events].slice(0, 8));
  }

  function draftBody(title: string, record: NativeItem | null) {
    const idempotencyKey = idForDraft(moduleKey, record, title);
    const notes = record
      ? `${title} staged from ${readModel?.module.label ?? moduleKey.toUpperCase()} for ${record.title}. Source apply, tool apply, uploads and external sending remain closed.`
      : `${title} staged from ${readModel?.module.label ?? moduleKey.toUpperCase()}. Source apply, tool apply, uploads and external sending remain closed.`;

    if (moduleKey === "crm") {
      return {
        idempotencyKey,
        actorRole: role,
        commandType: "task",
        action: "create_task",
        subject: title,
        body: notes,
        status: "drafted",
        priority: record?.priority ?? "Medium",
        dueDate: record?.dueDate && record.dueDate !== "Live source" ? record.dueDate : null,
        assigneeRole: record?.owner ?? role,
        companyId: record?.recordKey === "companies" ? record.id : null,
        personId: record?.recordKey === "people" ? record.id : null,
        opportunityId: record?.recordKey === "opportunities" ? record.id : null,
        taskId: record?.recordKey === "tasks" ? record.id : null,
      };
    }

    if (moduleKey === "erp") {
      return {
        idempotencyKey,
        actorRole: role,
        commandType: record?.recordKey === "budgets" ? "budget_assumption" : "finance_summary",
        action: "request_finance_review",
        title,
        notes,
        status: "drafted",
        amount: record?.customFields.find((field) => /amount|budget|cost|revenue/i.test(field.key))?.value ?? null,
        currency: "EUR",
        financeSummaryId: record?.id ?? null,
      };
    }

    if (moduleKey === "files") {
      return {
        idempotencyKey,
        actorRole: role,
        commandType: "visibility_review",
        action: "request_visibility_review",
        title,
        notes,
        status: "drafted",
        sectionKey: activeRecord === "all" ? record?.recordKey ?? null : activeRecord,
        visibilityScope: role,
        documentId: record?.recordKey === "documents" ? record.id : null,
        packageId: record?.recordKey === "packages" ? record.id : null,
      };
    }

    if (moduleKey === "loans") {
      return {
        idempotencyKey,
        actorRole: role,
        commandType: record?.recordKey === "conditions" ? "loan_condition" : "bank_package_checklist",
        action: "request_bank_review",
        title,
        notes,
        status: "drafted",
        checklistItemKey: record?.recordKey ?? activeRecord,
        conditionKey: record?.recordKey === "conditions" ? record.id : null,
        bankPackageId: record?.recordKey === "bank-packages" ? record.id : null,
        loanCaseId: record?.recordKey === "loan-cases" ? record.id : null,
      };
    }

    return {
      idempotencyKey,
      actorRole: role,
      commandType: "mapping_preview",
      action: "refresh_preview",
      title,
      notes,
      status: "drafted",
      sourceModule: moduleKey,
      targetModule: "analytics",
      entityTypeKey: record?.recordKey ?? activeRecord,
      entityId: record?.id ?? null,
    };
  }

  async function stageCoreDraft(title: string, record: NativeItem | null = selectedItem) {
    if (!canStageCoreDraft) {
      setStageState({ state: "error", message: "This role can inspect records here. Command staging is reserved for authorized roles." });
      return false;
    }
    const config = draftRoutes[moduleKey];
    setStageState({ state: "staging", message: "Storing command draft for review..." });
    try {
      const response = await fetch(config.route, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": config.confirmation,
        },
        body: JSON.stringify(draftBody(title, record)),
      });
      const payload = (await response.json().catch(() => ({}))) as DraftCommandResponse;
      if (!response.ok || payload.status === "blocked" || payload.status === "invalid") {
        throw new Error(payload.error ?? "Command draft could not be stored.");
      }
      const stored = payload.result?.commandId ? "Stored command draft" : "Command draft reviewed";
      setStageState({ state: "done", message: `${stored}. Apply remains closed.` });
      stage(`${stored}: ${title}`);
      return true;
    } catch (error) {
      setStageState({ state: "error", message: error instanceof Error ? error.message : "Command draft failed." });
      return false;
    }
  }

  function openDetail(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function updateSelected(update: Partial<NativeItem>) {
    if (!selectedItem) return;
    setItems((current) => current.map((item) => (item.id === selectedItem.id ? { ...item, ...update } : item)));
  }

  function updateListField(field: "assignees" | "labels" | "notes", value: string) {
    updateSelected({ [field]: asList(value) } as Partial<NativeItem>);
  }

  function updateCustomField(key: string, value: string) {
    if (!selectedItem) return;
    updateSelected({
      customFields: selectedItem.customFields.map((field) => (field.key === key ? { ...field, value } : field)),
    });
  }

  async function createDraft() {
    const title = draftTitle.trim();
    if (!title || !readModel || !canStageCoreDraft) return;
    const stored = await stageCoreDraft(title, null);
    if (!stored) return;
    const firstRecord = readModel.records[0];
    const draftSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "review-action";
    const draft: NativeItem = {
      id: `draft-${items.length + 1}-${draftSlug}`,
      recordKey: activeRecord === "all" ? firstRecord?.key ?? "records" : activeRecord,
      identifier: `${modulePrefix(moduleKey)}-DRAFT-${items.length + 1}`,
      kind: firstRecord?.label ?? "Record",
      title,
      description: "Guarded command draft stored for review. It does not write to any external system.",
      owner: "Current role",
      assignees: ["Current role"],
      stage: "Inbox",
      priority: "Medium",
      labels: ["draft"],
      startDate: "2026-07-10",
      dueDate: "Unscheduled",
      scope: readModel.module.label,
      relation: "Review queue",
      notes: ["Review before approval."],
      customFields: [
        { key: "approval", label: "Approval", value: "Required" },
        { key: "origin", label: "Origin", value: "Review draft" },
      ],
    };
    setItems((current) => [draft, ...current]);
    setSelectedId(draft.id);
    setDetailOpen(true);
    setDraftTitle("");
  }

  function moveSelected(nextStage?: NativeItem["stage"]) {
    if (!selectedItem) return;
    const currentIndex = stageOrder.indexOf(selectedItem.stage);
    const stageName = nextStage ?? stageOrder[(currentIndex + 1) % stageOrder.length];
    updateSelected({ stage: stageName });
    stage(`${selectedItem.identifier} moved to ${stageName}`);
  }

  const renderRows = () => (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full border-collapse text-left text-sm">
        <thead className="border-b border-[var(--line)] bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Record</th>
            <th className="px-3 py-3 font-semibold">Type</th>
            <th className="px-3 py-3 font-semibold">Stage</th>
            <th className="px-3 py-3 font-semibold">Priority</th>
            <th className="px-3 py-3 font-semibold">Owner</th>
            <th className="px-3 py-3 font-semibold">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)] bg-white">
          {filteredItems.map((item) => (
            <tr key={item.id} onClick={() => openDetail(item.id)} className="cursor-pointer transition hover:bg-[var(--surface)]">
              <td className="px-4 py-3">
                <strong className="block text-sm">{item.identifier} - {item.title}</strong>
                <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.scope}</span>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{item.kind}</td>
              <td className="px-3 py-3 text-xs font-semibold">{item.stage}</td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{item.priority}</td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{item.owner}</td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{item.dueDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredItems.length ? <p className="px-4 py-8 text-sm text-[var(--ink-muted)]">No records match this view.</p> : null}
    </div>
  );

  const renderBoard = () => (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      {stageOrder.map((stageName) => (
        <section key={stageName} className="min-h-[240px] rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{stageName}</h3>
            <span className="rounded-[7px] border border-[var(--line)] px-2 py-0.5 text-xs font-semibold">{filteredItems.filter((item) => item.stage === stageName).length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {filteredItems
              .filter((item) => item.stage === stageName)
              .map((item) => (
                <button key={item.id} type="button" onClick={() => openDetail(item.id)} className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]">
                  <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{item.identifier}</span>
                  <strong className="mt-1 block text-sm">{item.title}</strong>
                  <span className="mt-2 block text-xs text-[var(--ink-muted)]">{item.priority} - {item.owner}</span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-3 p-4">
      {filteredItems.map((item) => (
        <button key={item.id} type="button" onClick={() => openDetail(item.id)} className="grid w-full gap-3 rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)] lg:grid-cols-[150px_minmax(0,1fr)_130px]">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">{item.startDate}<br />{item.dueDate}</span>
          <span className="min-w-0">
            <strong className="block text-sm">{item.identifier} - {item.title}</strong>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.kind} - {item.scope}</span>
          </span>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-center text-xs font-semibold">{item.stage}</span>
        </button>
      ))}
    </div>
  );

  const renderCrmHome = () => {
    const workbenchCards = [
      {
        key: "inbox",
        label: "Inbox",
        icon: Inbox,
        view: "inbox",
        record: "emails",
        description: "Email, message and reply-draft queue for role-scoped relationships.",
      },
      {
        key: "calendar",
        label: "Calendar",
        icon: CalendarDays,
        view: "calendar",
        record: "calendar-events",
        description: "Meetings, site visits, financing calls and follow-up dates.",
      },
      {
        key: "timeline",
        label: "Timeline",
        icon: Clock3,
        view: "timeline",
        record: "activities",
        description: "Calls, messages, notes, meetings and record-state changes.",
      },
      {
        key: "reports",
        label: "Reports",
        icon: PieChart,
        view: "reports",
        record: "reports",
        description: "Pipeline, owner, candidate and bank-readiness reporting.",
      },
    ];
    const objectCards = (readModel?.records ?? []).filter((record) => !["emails", "calendar-events", "activities", "reports"].includes(record.key));

    return (
      <div className="space-y-5 p-4">
        <section className="grid gap-4 lg:grid-cols-4">
          {workbenchCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setActiveView(card.view);
                  setActiveRecord(card.record);
                }}
                className="rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-[var(--accent)]" />
                  <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                    {items.filter((item) => item.recordKey === card.record).length}
                  </span>
                </div>
                <strong className="mt-4 block text-base">{card.label}</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{card.description}</p>
              </button>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">CRM objects</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">Relationship and pipeline records exposed as CRAYS-native work surfaces.</p>
              </div>
              <button type="button" onClick={() => setActiveView("records")} className="rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold">
                Open records
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {objectCards.map((record) => (
                <button
                  key={record.key}
                  type="button"
                  onClick={() => {
                    setActiveRecord(record.key);
                    setActiveView(record.key === "opportunities" ? "pipeline" : "records");
                  }}
                  className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]"
                >
                  <strong className="block text-sm">{record.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{record.scope}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <h3 className="font-semibold">Next actions</h3>
            <div className="mt-4 space-y-2">
              {[
                { action: "Triage inbox", view: "inbox", record: "emails" },
                { action: "Prepare meeting brief", view: "calendar", record: "calendar-events" },
                { action: "Review opportunity stage", view: "pipeline", record: "opportunities" },
                { action: "Attach record files", view: "record-page", record: "files" },
                { action: "Open workflow review", view: "workflow", record: "activities" },
              ].map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => {
                    setActiveView(item.view);
                    setActiveRecord(item.record);
                    stage(`${item.action} selected`);
                  }}
                  className="flex w-full items-center justify-between rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
                >
                  <span>{item.action}</span>
                  <ChevronRight className="h-4 w-4 text-[var(--ink-muted)]" />
                </button>
              ))}
            </div>
          </article>
        </section>
      </div>
    );
  };

  const renderCrmInbox = () => {
    const inboxItems = items.filter((item) => ["emails", "people", "opportunities", "tasks"].includes(item.recordKey));
    return (
      <div className="grid min-h-[440px] gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--accent)]" />
            <h3 className="font-semibold">Inbox lanes</h3>
          </div>
          <div className="mt-4 space-y-2">
            {["Needs reply", "Meeting request", "Owner question", "Candidate question", "Bank question", "Drafts"].map((lane, index) => (
              <button key={lane} type="button" onClick={() => { setActiveRecord("all"); setQuery(lane); stage(`${lane} inbox lane selected`); }} className="flex w-full items-center justify-between rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]">
                <span>{lane}</span>
                <span className="rounded-[7px] bg-white px-2 py-0.5 text-xs text-[var(--ink-muted)]">{index + 1}</span>
              </button>
            ))}
          </div>
        </aside>
        <div className="space-y-3">
          {inboxItems.map((item) => (
            <button key={item.id} type="button" onClick={() => openDetail(item.id)} className="grid w-full gap-3 rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)] lg:grid-cols-[140px_minmax(0,1fr)_120px]">
              <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.kind}</span>
              <span className="min-w-0">
                <strong className="block text-sm">{item.title}</strong>
                <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{item.description}</span>
              </span>
              <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-center text-xs font-semibold">{item.stage}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const columns = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const calendarItems = filteredItems.length ? filteredItems : items.filter((item) => item.recordKey === "calendar-events");
    return (
      <div className="grid min-w-[860px] gap-3 p-4 md:grid-cols-5">
        {columns.map((day, index) => (
          <section key={day} className="min-h-[320px] rounded-[8px] border border-[var(--line)] bg-white p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{day}</h3>
              <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="mt-3 space-y-2">
              {calendarItems
                .filter((_, itemIndex) => itemIndex % columns.length === index)
                .map((item) => (
                  <button key={item.id} type="button" onClick={() => openDetail(item.id)} className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]">
                    <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{item.dueDate}</span>
                    <strong className="mt-1 block text-sm">{item.title}</strong>
                    <span className="mt-2 block text-xs text-[var(--ink-muted)]">{item.owner}</span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderCrmRecordPage = () => {
    const record = selectedItem ?? filteredItems[0] ?? items[0];
    if (!record) return <p className="p-4 text-sm text-[var(--ink-muted)]">No record selected.</p>;
    return (
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="rounded-[8px] border border-[var(--line)] bg-white p-5">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{record.identifier}</p>
          <h3 className="mt-2 text-2xl font-semibold">{record.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{record.description}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["Type", record.kind],
              ["Owner", record.owner],
              ["Stage", record.stage],
              ["Priority", record.priority],
              ["Scope", record.scope],
              ["Relation", record.relation],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <p className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                <strong className="mt-1 block text-sm">{value}</strong>
              </div>
            ))}
          </div>
        </article>
        <aside className="space-y-4">
          {[
            ["Emails", "Record-linked communication history and staged drafts.", Mail],
            ["Calendar", "Meetings and follow-up dates connected to this record.", CalendarDays],
            ["Tasks", "Follow-up work and ownership.", ClipboardList],
            ["Files", "Record-linked file metadata and package links.", FileText],
            ["Timeline", "Calls, messages, notes and state changes.", Clock3],
          ].map(([label, description, Icon]) => {
            const ViewIcon = Icon as React.ComponentType<{ className?: string }>;
            return (
              <button
                key={label as string}
                type="button"
                onClick={() => {
                  const target = String(label).toLowerCase();
                  setActiveView(target === "emails" ? "inbox" : target === "calendar" ? "calendar" : target === "timeline" ? "timeline" : "records");
                  setActiveRecord(target === "emails" ? "emails" : target === "calendar" ? "calendar-events" : target === "files" ? "files" : target.toLowerCase());
                  stage(`${label as string} widget selected`);
                }}
                className="w-full rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)]"
              >
                <div className="flex items-center gap-2">
                  <ViewIcon className="h-4 w-4 text-[var(--accent)]" />
                  <strong className="text-sm">{label as string}</strong>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{description as string}</p>
              </button>
            );
          })}
        </aside>
      </div>
    );
  };

  const renderCrmReports = () => (
    <div className="grid gap-4 p-4 lg:grid-cols-3">
      {[
        { title: "Pipeline health", description: "Opportunity movement, stalled stages and handoff risk.", view: "pipeline", recordKey: "opportunities" },
        { title: "Owner readiness", description: "Property owner contact, evidence and follow-up coverage.", view: "records", recordKey: "companies" },
        { title: "Candidate progress", description: "Intent, diligence, communication and bank-readiness state.", view: "records", recordKey: "people" },
        { title: "Communication load", description: "Inbox volume, response risk and meeting queue.", view: "inbox", recordKey: "emails" },
        { title: "File coverage", description: "Missing file metadata and package linkage.", view: "files", recordKey: "files" },
        { title: "Workflow gaps", description: "Automation and approval steps waiting for review.", view: "workflow", recordKey: "activities" },
      ].map((report) => (
        <button
          key={report.title}
          type="button"
          onClick={() => {
            setActiveView(report.view);
            setActiveRecord(report.recordKey);
            stage(`${report.title} report opened`);
          }}
          className="rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)]"
        >
          <PieChart className="h-5 w-5 text-[var(--accent)]" />
          <strong className="mt-4 block text-base">{report.title}</strong>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{report.description}</p>
        </button>
      ))}
    </div>
  );

  const renderCrmWorkflow = () => (
    <div className="space-y-3 p-4">
      {(readModel?.workflows ?? []).map((workflow, index) => (
        <button key={workflow} type="button" onClick={() => stage(`${workflow} workflow selected`)} className="grid w-full gap-3 rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)] md:grid-cols-[44px_minmax(0,1fr)_180px] md:items-center">
          <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[var(--surface)] text-sm font-semibold text-[var(--accent)]">{index + 1}</span>
          <span>
            <strong className="block text-sm">{workflow}</strong>
            <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">Trigger, action and approval steps are mapped for review while write and sending gates remain closed.</span>
          </span>
          <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-center text-xs font-semibold uppercase text-[var(--ink-muted)]">Read-only</span>
        </button>
      ))}
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="space-y-2">
        {(readModel?.settingsGroups ?? []).map((group) => (
          <button key={group.key} type="button" onClick={() => setActiveSettingsKey(group.key)} className={`flex w-full items-center justify-between rounded-[8px] border px-3 py-2 text-left text-sm font-semibold ${activeSettings?.key === group.key ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white"}`}>
            {group.label}
            <ChevronRight className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Settings group</p>
        <h3 className="mt-2 text-xl font-semibold">{activeSettings?.label ?? "Settings"}</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(activeSettings?.items ?? []).map((item) =>
            canStageCoreDraft ? (
              <button key={item} type="button" onClick={() => void stageCoreDraft(`${item} settings review`, selectedItem)} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium transition hover:border-[var(--accent)]">
                {item}
              </button>
            ) : (
              <div key={item} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium">
                {item}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );

  const renderProcessFooter = () => {
    if (!readModel) return null;

    const moduleProcesses: Record<
      NativeModuleKey,
      Array<{ title: string; description: string; action: string; recordKey: string; icon: typeof ClipboardList }>
    > = {
      crm: [
        { title: "Relationship follow-up", description: "Review people, companies and next contact steps from the CRM queue.", action: "Open people queue", recordKey: "people", icon: ClipboardList },
        { title: "Opportunity pipeline", description: "Move deals through stages, owners and next meetings.", action: "Open pipeline", recordKey: "opportunities", icon: Kanban },
        { title: "Activity timeline", description: "Log calls, notes, meetings and follow-up tasks against the selected record.", action: "Open timeline", recordKey: "activities", icon: Clock3 },
      ],
      erp: [
        { title: "Finance review", description: "Review deal economics, budgets, payment exceptions and variance items.", action: "Open payment exceptions", recordKey: "payment-exceptions", icon: ClipboardList },
        { title: "Supplier and invoice work", description: "Track suppliers, invoices, purchase orders and approvals.", action: "Open invoice queue", recordKey: "invoices", icon: FileText },
        { title: "Purchase and budget approvals", description: "Review material requests, purchasing blockers and budget impact before handoff.", action: "Open budget queue", recordKey: "budgets", icon: Columns3 },
      ],
      files: [
        { title: "Package assembly", description: "Collect metadata, versions and package sections for the selected recipient.", action: "Open packages", recordKey: "packages", icon: FileText },
        { title: "Document review", description: "Check approvals, missing documents and recipient-specific visibility.", action: "Open documents", recordKey: "documents", icon: ClipboardList },
        { title: "Grant preflight", description: "Prepare grants and redactions before external package access.", action: "Open grants", recordKey: "grants", icon: Columns3 },
      ],
      analytics: [
        { title: "KPI exceptions", description: "Review portfolio signals, outliers and source freshness.", action: "Open scorecards", recordKey: "scorecards", icon: BarChart3 },
        { title: "Deal drill-down", description: "Trace metrics back to the active case and source records.", action: "Open reports", recordKey: "reports", icon: PieChart },
        { title: "Management view", description: "Prepare role-safe reporting for management review.", action: "Open portfolio", recordKey: "portfolio", icon: Columns3 },
      ],
      loans: [
        { title: "Loan case review", description: "Review loan cases, conditions and bank package readiness.", action: "Open loan cases", recordKey: "loan-cases", icon: ClipboardList },
        { title: "Condition workflow", description: "Work required evidence, documents and checklist items.", action: "Open conditions", recordKey: "conditions", icon: FileText },
        { title: "Bank package preflight", description: "Prepare release-safe banking evidence before partner access.", action: "Open package", recordKey: "bank-packages", icon: Columns3 },
      ],
    };

    const processes = moduleProcesses[moduleKey];
    const liveRows = readModel.sourceSections?.reduce((total, section) => total + section.rows.length, 0) ?? 0;
    const runtimeLabel = readModel.sourceRuntime ? "Connected records" : "Module records";

    return (
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{readModel.module.label} workflows</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                Work from records into next actions, ownership and follow-up history.
              </p>
            </div>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-muted)]">
              {runtimeLabel}: {liveRows || items.length}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {processes.map((process) => {
              const Icon = process.icon;
              return (
                <button
                  key={process.title}
                  type="button"
                  onClick={() => {
                    setActiveRecord(process.recordKey);
                    if (process.recordKey.includes("opportunit") || process.recordKey.includes("pipeline")) setActiveView("pipeline");
                    stage(`${process.title} opened`);
                  }}
                  className="rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)]"
                >
                  <Icon className="h-5 w-5 text-[var(--accent)]" />
                  <strong className="mt-4 block text-sm">{process.title}</strong>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{process.description}</p>
                  <span className="mt-4 inline-flex rounded-[7px] border border-[var(--line)] px-2.5 py-1 text-xs font-semibold">{process.action}</span>
                </button>
              );
            })}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Next operating actions</h2>
          <div className="mt-4 space-y-2">
            {canStageCoreDraft
              ? readModel.actions.slice(0, 4).map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => void stageCoreDraft(action.label, selectedItem)}
                    className="flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
                  >
                    <span>{action.label}</span>
                    <span className="text-[10px] uppercase text-[var(--ink-muted)]">Prepare</span>
                  </button>
                ))
              : readModel.actions.slice(0, 4).map((action) => (
                  <div key={action.key} className="flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold">
                    <span>{action.label}</span>
                    <span className="text-[10px] uppercase text-[var(--ink-muted)]">Review only</span>
                  </div>
                ))}
          </div>
        </aside>
      </section>
    );
  };

  const renderActiveView = () => {
    if (activeView === "settings") return renderSettings();
    if (moduleKey === "crm" && activeView === "home") return renderCrmHome();
    if (moduleKey === "crm" && activeView === "inbox") return renderCrmInbox();
    if (activeView.includes("calendar")) return renderCalendar();
    if (moduleKey === "crm" && activeView === "record-page") return renderCrmRecordPage();
    if (moduleKey === "crm" && activeView === "reports") return renderCrmReports();
    if (moduleKey === "crm" && activeView === "workflow") return renderCrmWorkflow();
    if (activeView.includes("pipeline") || activeView.includes("builder") || activeView.includes("conditions") || activeView.includes("review")) return renderBoard();
    if (activeView.includes("timeline") || activeView.includes("handoff")) return renderTimeline();
    if (activeView.includes("summary") || activeView.includes("scorecards") || activeView.includes("risk") || activeView.includes("portfolio") || activeView.includes("readiness")) return renderBoard();
    return renderRows();
  };

  if (loadState.state === "loading") {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading {moduleKey.toUpperCase()}
        </div>
      </div>
    );
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-rose-200 bg-white p-6 text-sm text-rose-700">
        {loadState.error ?? "Workbench is not available."}
      </div>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-xs font-semibold uppercase">{readModel.module.label} workspace</p>
        <h2 className="mt-2 text-xl font-semibold">Workspace is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-5">
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Tool workspace</p>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">{readModel.module.label}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Role-scoped records, views, settings and detail drawer with staged review before connected updates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto_auto] xl:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          {canStageCoreDraft ? (
            <>
              <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
                <Plus className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void createDraft();
                  }}
                  placeholder="Describe next action"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <button type="button" onClick={() => void createDraft()} disabled={!draftTitle.trim() || stageState.state === "staging"} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]">
                <Plus className="h-4 w-4" />
                {stageState.state === "staging" ? "Staging..." : "Stage action"}
              </button>
            </>
          ) : (
            <div className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-muted)] xl:col-span-2">
              This role can inspect records here. Command staging is reserved for authorized roles.
            </div>
          )}
          <div className="relative">
            <button type="button" onClick={() => setDisplayOpen((open) => !open)} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4" />
              Display
            </button>
            {displayOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-[8px] border border-[var(--line)] bg-white p-4 shadow-xl max-[720px]:right-auto max-[720px]:left-0 max-[720px]:w-[calc(100vw-48px)]">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Record family</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setActiveRecord("all")} className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold ${activeRecord === "all" ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)]"}`}>
                    All
                  </button>
                  {readModel.records.map((record) => (
                    <button key={record.key} type="button" onClick={() => setActiveRecord(record.key)} className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold ${activeRecord === record.key ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)]"}`}>
                      {record.label}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-[var(--ink-muted)]">Stage</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["all", ...stageOrder] as Array<"all" | NativeItem["stage"]>).map((stageName) => (
                    <button key={stageName} type="button" onClick={() => setActiveStage(stageName)} className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold ${activeStage === stageName ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)]"}`}>
                      {stageName === "all" ? "All" : stageName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {stageState.message ? (
          <p className={`mt-3 rounded-[8px] border px-3 py-2 text-xs font-semibold ${stageState.state === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
            {stageState.message}
          </p>
        ) : null}
      </section>

      <section className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-2">
            {activeView.includes("pipeline") || activeView.includes("builder") || activeView.includes("conditions") ? <Kanban className="h-4 w-4 text-[var(--accent)]" /> : <LayoutList className="h-4 w-4 text-[var(--accent)]" />}
            <div>
              <h2 className="font-semibold">{activeLabel}</h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{visibleSummary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
            <BarChart3 className="h-4 w-4" />
            {activeRecord === "all" ? "All records" : readModel.records.find((record) => record.key === activeRecord)?.label}
          </div>
        </div>
        {renderActiveView()}
      </section>

      {renderProcessFooter()}

      {detailOpen && selectedItem ? (
        <div className="fixed inset-0 z-30 bg-black/18 backdrop-blur-[1px]" onClick={() => setDetailOpen(false)}>
          <aside className="crays-scrollbar ml-auto h-full w-full max-w-[460px] overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] shadow-2xl" onClick={(event) => event.stopPropagation()} aria-label={`${readModel.module.label} record details`}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-semibold">Properties</h2>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} aria-label="Close properties" className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--line)] bg-white text-[var(--ink-muted)] transition hover:text-[var(--foreground)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="rounded-[8px] bg-white p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedItem.identifier}</p>
                  <input value={selectedItem.title} onChange={(event) => updateSelected({ title: event.target.value })} className="mt-2 w-full rounded-[8px] border border-transparent bg-[var(--surface)] px-3 py-2 text-lg font-semibold outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Description</span>
                    <textarea value={selectedItem.description} onChange={(event) => updateSelected({ description: event.target.value })} rows={3} className="resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Type</span>
                      <select value={selectedItem.kind} onChange={(event) => updateSelected({ kind: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none">
                        {kindOptions.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Stage</span>
                      <select value={selectedItem.stage} onChange={(event) => moveSelected(event.target.value as NativeItem["stage"])} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none">
                        {stageOrder.map((stageName) => <option key={stageName} value={stageName}>{stageName}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Priority</span>
                      <select value={selectedItem.priority} onChange={(event) => updateSelected({ priority: event.target.value as NativeItem["priority"] })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none">
                        {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Owner</span>
                      <input value={selectedItem.owner} onChange={(event) => updateSelected({ owner: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Start date</span>
                      <input value={selectedItem.startDate} onChange={(event) => updateSelected({ startDate: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Due date</span>
                      <input value={selectedItem.dueDate} onChange={(event) => updateSelected({ dueDate: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Assignees</span>
                    <input value={listValue(selectedItem.assignees)} onChange={(event) => updateListField("assignees", event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Labels</span>
                    <input value={listValue(selectedItem.labels)} onChange={(event) => updateListField("labels", event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Relation</span>
                    <input value={selectedItem.relation} onChange={(event) => updateSelected({ relation: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Custom fields</p>
                    <div className="mt-3 grid gap-2">
                      {selectedItem.customFields.map((field) => (
                        <label key={field.key} className="grid gap-1">
                          <span className="text-xs font-semibold">{field.label}</span>
                          <input value={field.value} onChange={(event) => updateCustomField(field.key, event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none" />
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Notes</span>
                    <textarea value={listValue(selectedItem.notes)} onChange={(event) => updateListField("notes", event.target.value)} rows={2} className="resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <button type="button" onClick={() => moveSelected()} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
                      <ChevronRight className="h-4 w-4" />
                      Move
                    </button>
                    {canStageCoreDraft ? (
                      <button type="button" onClick={() => void stageCoreDraft(`Review edits for ${selectedItem.title}`, selectedItem)} disabled={stageState.state === "staging"} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        <CheckCircle2 className="h-4 w-4" />
                        {stageState.state === "staging" ? "Staging..." : "Stage edits"}
                      </button>
                    ) : (
                      <div className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-center text-sm font-semibold text-[var(--ink-muted)]">
                        Review only
                      </div>
                    )}
                  </div>
                </div>
              </article>

              {readModel.aiTools.length ? (
                <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-[var(--blue)]" />
                    <h2 className="font-semibold">AI</h2>
                  </div>
                  <div className="mt-4 space-y-2">
                    {readModel.aiTools.map((tool) => (
                      <button key={tool.key} type="button" onClick={() => stage(`${tool.label} approval preview staged`)} className="w-full rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]">
                        <div className="flex items-start justify-between gap-3">
                          <strong className="text-sm">{tool.label}</strong>
                          <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Off</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{tool.scope}</p>
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}

              <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--amber)]" />
                  <h2 className="font-semibold">Staged events</h2>
                </div>
                <div className="mt-4 space-y-2">
                  {stageState.message ? <div className={`rounded-[8px] border p-3 text-xs leading-5 ${stageState.state === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>{stageState.message}</div> : null}
                  {stagedEvents.length ? stagedEvents.map((event) => <div key={event} className="rounded-[8px] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">{event}</div>) : <p className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink-muted)]">No session events.</p>}
                </div>
              </article>

              <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-[var(--rose)]" />
                  <h2 className="font-semibold">Workflow status</h2>
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    ["Record update", readModel.boundaries.sourceWritesEnabled ? "Ready for review" : "Prepare draft"],
                    ["Data enrichment", readModel.boundaries.providerCallsEnabled ? "Available" : "Use stored data"],
                    ["AI assistance", readModel.boundaries.aiProviderCallsEnabled ? "Available" : "Not active"],
                    ["Attachment work", readModel.boundaries.fileUploadEnabled ? "Available" : "Use Files package"],
                    ["External message", readModel.boundaries.externalSendingEnabled ? "Available" : "Draft only"],
                  ].map(([label, state]) => (
                    <div key={label} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm">
                      <span>{label as string}</span>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{state as string}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
