"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  Bot,
  CheckCircle2,
  ChevronRight,
  X,
  Columns3,
  FileText,
  History,
  LayoutList,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type {
  ProjectNativeOperabilityReadModel,
  ProjectNativeWorkItem,
  ProjectStateGroup,
} from "@/lib/project-native-operability-read-model";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ProjectNativeOperabilityReadModel;
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

type ProjectCommandResponse = {
  status?: string;
  error?: string;
  result?: {
    commandId?: string;
    targetApplyStatus?: string;
    applyGate?: string;
  };
};

type ProjectViewKey = ProjectNativeOperabilityReadModel["navigation"][number]["key"];
type ListField = "State" | "Priority" | "Assignees" | "Labels" | "Cycle" | "Modules" | "Estimate" | "Due date" | "Lead";
type WorkItemListField = "assignees" | "labels" | "modules" | "blocking" | "blockedBy" | "related" | "links" | "comments";

const priorityOptions: ProjectNativeWorkItem["priority"][] = ["Urgent", "High", "Medium", "Low", "None"];
const priorityRank: Record<ProjectNativeWorkItem["priority"], number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  None: 4,
};
const typeOptions: ProjectNativeWorkItem["type"][] = ["Project", "Task", "Epic", "Milestone", "Bug", "Page"];
const defaultVisibleFields: ListField[] = ["State", "Priority", "Assignees", "Cycle", "Due date"];
const relationFields: Array<{ label: string; field: WorkItemListField }> = [
  { label: "Blocking", field: "blocking" },
  { label: "Blocked by", field: "blockedBy" },
  { label: "Related", field: "related" },
  { label: "Links", field: "links" },
];

async function loadProjectWorkbench(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/project/native-operability/read-model?role=${role}&mode=real-product`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Project workbench returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function asList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listValue(items: string[]) {
  return items.join(", ");
}

function eventLabel(label: string) {
  return `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${label}`;
}

function fieldValue(item: ProjectNativeWorkItem, field: ListField) {
  if (field === "State") return item.state;
  if (field === "Priority") return item.priority;
  if (field === "Assignees") return item.assignees.join(", ");
  if (field === "Labels") return item.labels.join(", ");
  if (field === "Cycle") return item.cycle;
  if (field === "Modules") return item.modules.join(", ");
  if (field === "Estimate") return item.estimate;
  if (field === "Due date") return item.dueDate;
  return item.lead;
}

function emptyWorkItem(title: string, count: number): ProjectNativeWorkItem {
  return {
    id: `crays-draft-${Date.now()}`,
    identifier: `DRAFT-${count + 1}`,
    type: "Task",
    title,
    description: "Draft work item staged for review.",
    state: "Backlog",
    priority: "Medium",
    lead: "Current role",
    assignees: ["Current role"],
    labels: ["draft"],
    startDate: "2026-07-10",
    dueDate: "Unscheduled",
    cycle: "Draft cycle",
    modules: ["Planning"],
    estimate: "Unestimated",
    parent: "",
    blocking: [],
    blockedBy: [],
    related: [],
    duplicateOf: "",
    links: [],
    customFields: [
      { key: "approval", label: "Approval", type: "select", value: "Required" },
      { key: "risk", label: "Risk level", type: "select", value: "Medium" },
    ],
    comments: [],
    history: ["Draft staged for review"],
  };
}

export function ProjectNativeWorkbenchPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const requestedView = searchParams.get("view");
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<ProjectViewKey>("work-items");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ProjectNativeWorkItem["type"]>("all");
  const [stateFilter, setStateFilter] = useState<"all" | ProjectStateGroup>("all");
  const [groupBy, setGroupBy] = useState("State");
  const [sortBy, setSortBy] = useState("Priority");
  const [displayOpen, setDisplayOpen] = useState(false);
  const [visibleFields, setVisibleFields] = useState<ListField[]>(defaultVisibleFields);
  const [items, setItems] = useState<ProjectNativeWorkItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [stagedEvents, setStagedEvents] = useState<string[]>([]);
  const [stageState, setStageState] = useState<StageState>({ state: "idle", message: null });
  const [aiPrompt, setAiPrompt] = useState("Summarize blockers for the current opening plan.");
  const [activeSettingsKey, setActiveSettingsKey] = useState("workspace");
  const [savedViewNames, setSavedViewNames] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    loadProjectWorkbench(role, controller.signal)
      .then((data) => {
        const firstView = data.readModel.navigation.find((view) => view.key === requestedView)?.key ?? data.readModel.navigation[0]?.key ?? "work-items";
        setLoadState({ state: "ready", data, error: null });
        setActiveView(firstView);
        setItems(data.readModel.workItems);
        setSelectedId(null);
        setDetailOpen(false);
        setActiveSettingsKey(data.readModel.settingsGroups[0]?.key ?? "workspace");
        setSavedViewNames(data.readModel.savedViews.map((view) => view.name));
        setStagedEvents([]);
        setStageState({ state: "idle", message: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Project workbench failed" });
      });

    return () => controller.abort();
  }, [refreshKey, requestedView, role]);

  const readModel = loadState.data?.readModel ?? null;
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const activeSettings = readModel?.settingsGroups.find((group) => group.key === activeSettingsKey) ?? readModel?.settingsGroups[0] ?? null;

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sorted = items
      .filter((item) => {
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        const matchesState = stateFilter === "all" || item.state === stateFilter;
        const searchable = [
          item.identifier,
          item.type,
          item.title,
          item.description,
          item.state,
          item.priority,
          item.lead,
          item.assignees.join(" "),
          item.labels.join(" "),
          item.cycle,
          item.modules.join(" "),
          item.customFields.map((field) => `${field.label} ${field.value}`).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return matchesType && matchesState && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sortBy === "Due date") return left.dueDate.localeCompare(right.dueDate);
        if (sortBy === "Updated") return right.history.length - left.history.length;
        if (sortBy === "Title") return left.title.localeCompare(right.title);
        return priorityRank[left.priority] - priorityRank[right.priority];
      });
    return sorted;
  }, [items, query, sortBy, stateFilter, typeFilter]);

  function stage(label: string) {
    setStagedEvents((events) => [eventLabel(label), ...events].slice(0, 8));
  }

  function openDetail(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function updateSelected(update: Partial<ProjectNativeWorkItem>) {
    if (!selectedItem) return;
    setItems((current) =>
      current.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              ...update,
              history: [`Edit staged for review`, ...item.history].slice(0, 6),
            }
          : item,
      ),
    );
  }

  function updateListField(field: WorkItemListField, value: string) {
    updateSelected({ [field]: asList(value) } as Partial<ProjectNativeWorkItem>);
  }

  function updateCustomField(key: string, value: string) {
    if (!selectedItem) return;
    updateSelected({
      customFields: selectedItem.customFields.map((field) => (field.key === key ? { ...field, value } : field)),
    });
  }

  function projectActorRole() {
    const allowed = ["deal-manager", "franchise-partner", "studio-manager", "reviewer", "admin", "crays-management"];
    return allowed.includes(role) ? role : "deal-manager";
  }

  function commandPayload(title: string, item: ProjectNativeWorkItem | null, action: "create" | "update" | "status_change") {
    const target = action === "create" ? item : item ?? selectedItem;
    return {
      idempotencyKey: `project:${target?.id ?? "new-work-item"}:${action}:${title}:${crypto.randomUUID()}`,
      actorRole: projectActorRole(),
      projectId: readModel?.workspace.projectId ?? null,
      workItemId: target?.id ?? null,
      action,
      title,
      status: target?.state ?? "Backlog",
      priority: target?.priority ?? "Medium",
      dueDate: target?.dueDate && target.dueDate !== "Unscheduled" ? target.dueDate : null,
      ownerRole: target?.lead ?? role,
      notes: target
        ? `${title} staged from Project for ${target.identifier}. Project apply, sync apply, uploads and external sending remain closed.`
        : `${title} staged from Project. Project apply, sync apply, uploads and external sending remain closed.`,
    };
  }

  async function stageCoreProjectCommand(title: string, item: ProjectNativeWorkItem | null, action: "create" | "update" | "status_change") {
    if (!readModel) return false;
    setStageState({ state: "staging", message: "Storing Project command draft for review..." });
    try {
      const response = await fetch("/api/crays/core-command/project-work-item", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-project-work-item-command",
        },
        body: JSON.stringify(commandPayload(title, item, action)),
      });
      const payload = (await response.json().catch(() => ({}))) as ProjectCommandResponse;
      if (!response.ok || payload.status === "blocked" || payload.status === "invalid") {
        throw new Error(payload.error ?? "Project command draft could not be stored.");
      }
      const stored = payload.result?.commandId ? "Stored command draft" : "Command draft reviewed";
      setStageState({ state: "done", message: `${stored}. Apply remains closed.` });
      stage(`${stored}: ${title}`);
      return true;
    } catch (error) {
      setStageState({ state: "error", message: error instanceof Error ? error.message : "Project command draft failed." });
      return false;
    }
  }

  async function createDraft() {
    const title = draftTitle.trim();
    if (!title) return;
    const stored = await stageCoreProjectCommand(title, null, "create");
    if (!stored) return;
    const draft = emptyWorkItem(title, items.length);
    setItems((current) => [draft, ...current]);
    setSelectedId(draft.id);
    setDetailOpen(true);
    setDraftTitle("");
  }

  function moveSelected(nextState?: ProjectStateGroup) {
    if (!selectedItem || !readModel) return;
    const currentIndex = readModel.stateGroups.indexOf(selectedItem.state);
    const state = nextState ?? readModel.stateGroups[(currentIndex + 1) % readModel.stateGroups.length];
    updateSelected({ state });
    stage(`${selectedItem.identifier} moved to ${state}`);
  }

  function toggleField(field: ListField) {
    setVisibleFields((fields) => (fields.includes(field) ? fields.filter((item) => item !== field) : [...fields, field]));
  }

  function saveCurrentView() {
    const name = `${typeFilter === "all" ? "All" : typeFilter} ${stateFilter === "all" ? "work" : stateFilter}`;
    setSavedViewNames((views) => (views.includes(name) ? views : [name, ...views]));
    stage(`View staged: ${name}`);
  }

  function activeViewLabel() {
    return readModel?.navigation.find((view) => view.key === activeView)?.label ?? "Work items";
  }

  if (loadState.state === "loading") {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading Project
        </div>
      </div>
    );
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-rose-200 bg-white p-6 text-sm text-rose-700">
        {loadState.error ?? "Project workbench is not available."}
      </div>
    );
  }

  const listFields: ListField[] = ["State", "Priority", "Assignees", "Labels", "Cycle", "Modules", "Estimate", "Due date", "Lead"];

  const renderWorkItems = () => (
    <div className="overflow-x-auto">
      <table className="min-w-[920px] w-full border-collapse text-left text-sm">
        <thead className="border-b border-[var(--line)] bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Work item</th>
            {visibleFields.map((field) => (
              <th key={field} className="px-3 py-3 font-semibold">
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)] bg-white">
          {filteredItems.map((item) => (
            <tr
              key={item.id}
              onClick={() => openDetail(item.id)}
              className={`cursor-pointer transition hover:bg-[var(--surface)] ${selectedItem?.id === item.id ? "bg-sky-50" : ""}`}
            >
              <td className="px-4 py-3">
                <div className="min-w-0">
                  <strong className="block text-sm">{item.identifier} - {item.title}</strong>
                  <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.type}</span>
                </div>
              </td>
              {visibleFields.map((field) => (
                <td key={field} className="max-w-[180px] px-3 py-3 text-xs text-[var(--ink-muted)]">
                  {fieldValue(item, field)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredItems.length ? <p className="px-4 py-8 text-sm text-[var(--ink-muted)]">No matching work items.</p> : null}
    </div>
  );

  const renderBoard = () => (
    <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-5">
      {readModel.stateGroups.map((state) => (
        <section key={state} className="min-h-[260px] rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{state}</h3>
            <span className="rounded-[7px] border border-[var(--line)] px-2 py-0.5 text-xs font-semibold">{filteredItems.filter((item) => item.state === state).length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {filteredItems
              .filter((item) => item.state === state)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openDetail(item.id)}
                  className={`w-full rounded-[8px] border p-3 text-left transition hover:border-[var(--accent)] ${
                    selectedItem?.id === item.id ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)] bg-[var(--surface)]"
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{item.identifier}</span>
                  <strong className="mt-1 block text-sm">{item.title}</strong>
                  <span className="mt-2 block text-xs text-[var(--ink-muted)]">{item.priority} - {item.assignees.join(", ")}</span>
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
        <button
          key={item.id}
          type="button"
          onClick={() => openDetail(item.id)}
          className={`grid w-full gap-3 rounded-[8px] border p-4 text-left lg:grid-cols-[150px_minmax(0,1fr)_140px] lg:items-center ${
            selectedItem?.id === item.id ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)] bg-white"
          }`}
        >
          <span className="text-xs font-semibold text-[var(--ink-muted)]">{item.startDate}<br />{item.dueDate}</span>
          <span className="min-w-0">
            <strong className="block text-sm">{item.identifier} - {item.title}</strong>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.cycle} - {item.modules.join(", ")}</span>
          </span>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-center text-xs font-semibold">{item.state}</span>
        </button>
      ))}
    </div>
  );

  const renderCycles = () => (
    <div className="grid gap-3 p-4 lg:grid-cols-3">
      {readModel.cycles.map((cycle) => (
        <article key={cycle.id} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{cycle.state}</p>
              <h3 className="mt-1 font-semibold">{cycle.name}</h3>
            </div>
            <span className="text-sm font-semibold">{cycle.progress}%</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-[var(--surface-strong)]">
            <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${cycle.progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-[var(--ink-muted)]">{cycle.startDate} - {cycle.endDate}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {cycle.workItemIds.map((id) => {
              const item = items.find((entry) => entry.id === id);
              if (!item) return null;
              return (
                <button key={id} type="button" onClick={() => openDetail(id)} className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-xs font-semibold">
                  {item.identifier}
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );

  const renderModules = () => (
    <div className="grid gap-3 p-4 lg:grid-cols-3">
      {readModel.modules.map((module) => (
        <article key={module.id} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{module.state}</p>
          <h3 className="mt-1 font-semibold">{module.name}</h3>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{module.lead}</p>
          <div className="mt-4 h-2 rounded-full bg-[var(--surface-strong)]">
            <div className="h-2 rounded-full bg-[var(--blue)]" style={{ width: `${module.progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-[var(--ink-muted)]">{module.startDate} - {module.dueDate}</p>
        </article>
      ))}
    </div>
  );

  const renderPages = () => (
    <div className="grid gap-3 p-4 lg:grid-cols-2">
      {readModel.pages.map((page) => (
        <article key={page.id} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{page.status}</p>
              <h3 className="mt-1 font-semibold">{page.title}</h3>
            </div>
            <FileText className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <textarea
            value={page.body}
            onChange={(event) => {
              const value = event.target.value;
              setLoadState((current) => {
                if (current.state !== "ready") return current;
                return {
                  ...current,
                  data: {
                    ...current.data,
                    readModel: {
                      ...current.data.readModel,
                      pages: current.data.readModel.pages.map((entry) => (entry.id === page.id ? { ...entry, body: value } : entry)),
                    },
                  },
                };
              });
            }}
            rows={4}
            className="mt-4 w-full resize-none rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button type="button" onClick={() => stage(`Page draft staged: ${page.title}`)} className="mt-3 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold">
            Stage page draft
          </button>
        </article>
      ))}
    </div>
  );

  const renderViews = () => (
    <div className="grid gap-3 p-4 lg:grid-cols-2">
      {[...savedViewNames].map((name) => {
        const sourceView = readModel.savedViews.find((view) => view.name === name);
        return (
          <article key={name} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{sourceView?.layout ?? "Local"}</p>
            <h3 className="mt-1 font-semibold">{name}</h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">{sourceView?.filters.join(", ") ?? "Current filters"}</p>
            <button type="button" onClick={() => stage(`Saved view selected: ${name}`)} className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold">
              Open view
            </button>
          </article>
        );
      })}
      {readModel.templates.map((template) => (
        <article key={template.id} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{template.type} template</p>
          <h3 className="mt-1 font-semibold">{template.name}</h3>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{template.fields.join(", ")}</p>
          <button type="button" onClick={() => stage(`Template selected for review: ${template.name}`)} className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold">
            Apply template
          </button>
        </article>
      ))}
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-2">
        {readModel.settingsGroups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveSettingsKey(group.key)}
            className={`flex w-full items-center justify-between rounded-[8px] border px-3 py-2 text-left text-sm font-semibold ${
              activeSettings?.key === group.key ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white text-[var(--foreground)]"
            }`}
          >
            {group.label}
            <ChevronRight className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
        <h3 className="font-semibold">{activeSettings?.label ?? "Settings"}</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(activeSettings?.items ?? []).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => stage(`${item.label} settings staged`)}
              className="flex items-center justify-between rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium"
            >
              <span>{item.label}</span>
              <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">{item.enabled ? "On" : "Off"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    if (activeView === "board") return renderBoard();
    if (activeView === "timeline") return renderTimeline();
    if (activeView === "cycles") return renderCycles();
    if (activeView === "modules") return renderModules();
    if (activeView === "pages") return renderPages();
    if (activeView === "views") return renderViews();
    if (activeView === "settings") return renderSettings();
    return renderWorkItems();
  };

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-5">
      <section className="rounded-[8px] border border-[var(--line)] bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--ink-muted)]">
              <span>Opening operating portfolio</span>
              <span>Opening workflow</span>
              <span>{readModel.workspace.lead}</span>
              <span>{readModel.workspace.timezone}</span>
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-normal max-[720px]:text-xl">{readModel.workspace.projectName.replace("Benchmark opening portfolio", "Opening portfolio")}</h1>
              <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--ink-muted)]">{readModel.workspace.visibility}</span>
              <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Draft only</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setLoadState({ state: "loading", data: null, error: null });
                setRefreshKey((value) => value + 1);
              }}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button type="button" onClick={saveCurrentView} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Save view
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="grid gap-3 2xl:grid-cols-[minmax(260px,1fr)_minmax(180px,0.45fr)_minmax(180px,0.45fr)_minmax(180px,0.45fr)_auto] 2xl:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search work" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium outline-none">
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium outline-none">
            <option value="all">All states</option>
            {readModel.stateGroups.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium outline-none">
            {["Priority", "Due date", "Updated", "Title"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <div className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Plus className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createDraft();
              }}
              placeholder="New work item"
              className="min-w-[150px] flex-1 bg-transparent text-sm outline-none"
            />
            <button type="button" onClick={() => void createDraft()} disabled={!draftTitle.trim() || stageState.state === "staging"} className="text-xs font-semibold text-[var(--accent)] disabled:text-[var(--ink-muted)]">
              {stageState.state === "staging" ? "Staging..." : "Stage"}
            </button>
          </div>
        </div>
        {stageState.message ? (
          <p className={`mt-3 rounded-[8px] border px-3 py-2 text-xs font-semibold ${stageState.state === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
            {stageState.message}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
            <LayoutList className="h-4 w-4 text-[var(--accent)]" />
            <span>{activeViewLabel()}</span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDisplayOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink-muted)]"
              aria-expanded={displayOpen}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Display
            </button>
            {displayOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-[8px] border border-[var(--line)] bg-white p-4 shadow-xl max-[720px]:right-auto max-[720px]:left-0 max-[720px]:w-[calc(100vw-48px)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                    <Columns3 className="h-3.5 w-3.5" />
                    Group by {groupBy}
                  </span>
                  <button type="button" onClick={() => setGroupBy(groupBy === "State" ? "Assignee" : "State")} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Change
                  </button>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-[var(--ink-muted)]">Fields</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {listFields.map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleField(field)}
                      className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold ${
                        visibleFields.includes(field) ? "border-[var(--accent)] bg-sky-50 text-[var(--foreground)]" : "border-[var(--line)] bg-white text-[var(--ink-muted)]"
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <article className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-semibold">{readModel.navigation.find((view) => view.key === activeView)?.label ?? "Work items"}</h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{filteredItems.length} visible records</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
              <SlidersHorizontal className="h-4 w-4" />
              {sortBy}
            </div>
          </div>
          {renderActiveView()}
        </article>
      </section>

      {detailOpen && selectedItem ? (
        <div className="fixed inset-0 z-30 bg-black/18 backdrop-blur-[1px]" onClick={() => setDetailOpen(false)}>
          <aside
            className="crays-scrollbar ml-auto h-full w-full max-w-[460px] overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            aria-label="Work item details"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-semibold">Properties</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--line)] bg-white text-[var(--ink-muted)] transition hover:text-[var(--foreground)]"
                aria-label="Close properties"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="space-y-3">
                <div className="rounded-[8px] bg-white p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedItem.identifier}</p>
                  <input
                    value={selectedItem.title}
                    onChange={(event) => updateSelected({ title: event.target.value })}
                    className="mt-2 w-full rounded-[8px] border border-transparent bg-[var(--surface)] px-3 py-2 text-lg font-semibold outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Description</span>
                  <textarea value={selectedItem.description} onChange={(event) => updateSelected({ description: event.target.value })} rows={3} className="resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]" />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Type</span>
                    <select value={selectedItem.type} onChange={(event) => updateSelected({ type: event.target.value as ProjectNativeWorkItem["type"] })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none">
                      {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">State</span>
                    <select value={selectedItem.state} onChange={(event) => moveSelected(event.target.value as ProjectStateGroup)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none">
                      {readModel.stateGroups.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Priority</span>
                    <select value={selectedItem.priority} onChange={(event) => updateSelected({ priority: event.target.value as ProjectNativeWorkItem["priority"] })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none">
                      {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Lead</span>
                    <input value={selectedItem.lead} onChange={(event) => updateSelected({ lead: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Start date</span>
                    <input value={selectedItem.startDate} onChange={(event) => updateSelected({ startDate: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Due date</span>
                    <input value={selectedItem.dueDate} onChange={(event) => updateSelected({ dueDate: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Assignees</span>
                  <input value={listValue(selectedItem.assignees)} onChange={(event) => updateListField("assignees", event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Labels</span>
                  <input value={listValue(selectedItem.labels)} onChange={(event) => updateListField("labels", event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Cycle</span>
                    <input value={selectedItem.cycle} onChange={(event) => updateSelected({ cycle: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Estimate</span>
                    <input value={selectedItem.estimate} onChange={(event) => updateSelected({ estimate: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Modules</span>
                  <input value={listValue(selectedItem.modules)} onChange={(event) => updateListField("modules", event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Parent</span>
                    <input value={selectedItem.parent} onChange={(event) => updateSelected({ parent: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Duplicate of</span>
                    <input value={selectedItem.duplicateOf} onChange={(event) => updateSelected({ duplicateOf: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                </div>
                {relationFields.map(({ label, field }) => (
                  <label key={field} className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">{label}</span>
                    <input value={listValue(selectedItem[field])} onChange={(event) => updateListField(field, event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                  </label>
                ))}
                <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Custom fields</p>
                  <div className="mt-3 grid gap-2">
                    {selectedItem.customFields.map((field) => (
                      <label key={field.key} className="grid gap-1 text-sm">
                        <span className="text-xs font-semibold">{field.label}</span>
                        <input value={field.value} onChange={(event) => updateCustomField(field.key, event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none" />
                      </label>
                    ))}
                  </div>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Comments</span>
                  <textarea value={listValue(selectedItem.comments)} onChange={(event) => updateListField("comments", event.target.value)} rows={2} className="resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none" />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <button type="button" onClick={() => moveSelected()} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
                    <ChevronRight className="h-4 w-4" />
                    Move
                  </button>
                  <button type="button" onClick={() => void stageCoreProjectCommand(`Review edits for ${selectedItem.identifier}`, selectedItem, "update")} disabled={stageState.state === "staging"} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" />
                    {stageState.state === "staging" ? "Staging..." : "Stage edits"}
                  </button>
                </div>
              </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">AI</h2>
            </div>
            <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} className="mt-4 w-full resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" />
            <div className="mt-3 grid gap-2">
              {readModel.aiCommands.map((command) => (
                <button key={command.key} type="button" onClick={() => stage(`${command.label} approval preview staged`)} className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm">{command.label}</strong>
                    <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Off</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{command.scope}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Activity</h2>
            </div>
            <div className="mt-4 space-y-2">
              {stageState.message ? <div className={`rounded-[8px] border p-3 text-xs leading-5 ${stageState.state === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>{stageState.message}</div> : null}
              {[...stagedEvents, ...(selectedItem?.history ?? [])].slice(0, 8).map((event) => (
                <div key={event} className="rounded-[8px] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">{event}</div>
              ))}
              {!stagedEvents.length && !selectedItem?.history.length ? <p className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink-muted)]">No activity yet.</p> : null}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-[var(--rose)]" />
              <h2 className="font-semibold">Workflow status</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {[
                ["Work item update", readModel.boundaries.sourceWritesEnabled ? "Ready for review" : "Prepare draft"],
                ["Sync result", readModel.boundaries.syncWritesEnabled ? "Available" : "Pending review"],
                ["Data enrichment", readModel.boundaries.providerCallsEnabled ? "Available" : "Use stored data"],
                ["AI assistance", readModel.boundaries.aiProviderCallsEnabled ? "Available" : "Not active"],
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
