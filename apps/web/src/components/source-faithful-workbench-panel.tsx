"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Columns3,
  Gauge,
  Kanban,
  LayoutList,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
} from "lucide-react";
import type { SourceFaithfulModuleKey, SourceFaithfulWorkbenchContract } from "@/lib/source-faithful-product-contract";

type Payload = {
  status: "ready" | "forbidden";
  readModel: SourceFaithfulWorkbenchContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type WorkbenchItem = {
  id: string;
  recordKey: string;
  identifier: string;
  itemType: "Project" | "Task" | "Milestone" | "Cycle" | "Module" | "Page";
  title: string;
  description: string;
  owner: string;
  assignees: string[];
  lane: "Backlog" | "In progress" | "Review" | "Handoff";
  priority: "Low" | "Medium" | "High" | "Critical";
  labels: string[];
  startDate: string;
  due: string;
  cycle: string;
  modules: string[];
  estimate: string;
  parent: string;
  blocking: string[];
  blockedBy: string[];
  relatesTo: string[];
  duplicateOf: string;
  links: string[];
  customFields: Array<{ key: string; label: string; value: string }>;
  comments: string[];
  stream: string;
  detail: string;
  nextStep: string;
};

const routeByModule: Partial<Record<SourceFaithfulModuleKey, string>> = {
  project: "/api/crays/project/workbench/read-model",
  crm: "/api/crays/crm/workbench/read-model",
  erp: "/api/crays/erp/workbench/read-model",
  files: "/api/crays/files/workbench/read-model",
  sync: "/api/crays/sync/workbench/read-model",
  analytics: "/api/crays/analytics/workbench/read-model",
  loans: "/api/crays/loans/workbench/read-model",
};

const laneOrder: WorkbenchItem["lane"][] = ["Backlog", "In progress", "Review", "Handoff"];
const priorityOptions: WorkbenchItem["priority"][] = ["Critical", "High", "Medium", "Low"];
const itemTypeOptions: WorkbenchItem["itemType"][] = ["Project", "Task", "Milestone", "Cycle", "Module", "Page"];

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function buildInitialWorkbenchItems(readModel: SourceFaithfulWorkbenchContract): WorkbenchItem[] {
  if (readModel.module.key === "project") {
    return [
      {
        id: "project-opening-plan",
        recordKey: "projects",
        identifier: "OPEN-001",
        itemType: "Project",
        title: "Westside opening plan",
        description: "Coordinate lease, fit-out, equipment, partner handoff and launch readiness.",
        owner: "Deal Manager",
        assignees: ["Deal Manager", "Project Lead"],
        lane: "In progress",
        priority: "High",
        labels: ["opening", "critical-path"],
        startDate: "2026-07-10",
        due: "This week",
        cycle: "Opening cycle",
        modules: ["Site readiness", "Partner handoff"],
        estimate: "8 points",
        parent: "",
        blocking: ["project-permit-blocker"],
        blockedBy: [],
        relatesTo: ["project-handoff-cycle"],
        duplicateOf: "",
        links: ["Lease checklist", "Opening budget"],
        customFields: [
          { key: "studio", label: "Studio", value: "Westside" },
          { key: "risk", label: "Risk level", value: "High" },
          { key: "gate", label: "Opening gate", value: "Build-out" },
        ],
        comments: ["Review permit timeline before next handoff."],
        stream: "Site readiness",
        detail: "Project shell for coordinating permits, fit-out, partner handoff and launch readiness inside CRAYS.",
        nextStep: "Resolve permit owner and confirm delivery sequence.",
      },
      {
        id: "project-permit-blocker",
        recordKey: "work-items",
        identifier: "OPEN-117",
        itemType: "Task",
        title: "Permit blocker review",
        description: "Review the permit blocker, define the owner, and keep the critical path visible to the Deal Manager.",
        owner: "Expansion Manager",
        assignees: ["Expansion Manager", "Reviewer"],
        lane: "Review",
        priority: "Critical",
        labels: ["permit", "blocker"],
        startDate: "2026-07-10",
        due: "Today",
        cycle: "Opening cycle",
        modules: ["Critical path"],
        estimate: "5 points",
        parent: "OPEN-001",
        blocking: [],
        blockedBy: ["Landlord document"],
        relatesTo: ["project-opening-plan"],
        duplicateOf: "",
        links: ["Permit evidence", "Landlord thread"],
        customFields: [
          { key: "approval", label: "Approval owner", value: "City office" },
          { key: "impact", label: "Launch impact", value: "7 days" },
          { key: "evidence", label: "Evidence state", value: "Requested" },
        ],
        comments: ["Keep partner-visible wording separate from internal note."],
        stream: "Critical path",
        detail: "Work item review surface for blocked opening tasks, owner assignment and escalation notes.",
        nextStep: "Confirm owner, blocker reason and review deadline.",
      },
      {
        id: "project-equipment-delivery",
        recordKey: "modules",
        identifier: "OPEN-M02",
        itemType: "Module",
        title: "Equipment delivery stream",
        description: "Group supplier delivery, installation, acceptance and dependency tasks in one delivery module.",
        owner: "Operations",
        assignees: ["Operations", "Vendor"],
        lane: "Backlog",
        priority: "Medium",
        labels: ["equipment", "supplier"],
        startDate: "2026-07-15",
        due: "Next week",
        cycle: "Build-out",
        modules: ["Supplier delivery"],
        estimate: "13 points",
        parent: "OPEN-001",
        blocking: [],
        blockedBy: ["project-permit-blocker"],
        relatesTo: ["project-handoff-cycle"],
        duplicateOf: "",
        links: ["Equipment package"],
        customFields: [
          { key: "supplier", label: "Supplier", value: "Equipment partner" },
          { key: "delivery", label: "Delivery window", value: "Week 31" },
          { key: "acceptance", label: "Acceptance state", value: "Not started" },
        ],
        comments: ["Dates stay draft until supplier confirmation."],
        stream: "Supplier delivery",
        detail: "Module shell for grouping supplier, delivery, installation and acceptance work items.",
        nextStep: "Create delivery milestones after write-adapter approval.",
      },
      {
        id: "project-handoff-cycle",
        recordKey: "cycles",
        identifier: "OPEN-C03",
        itemType: "Cycle",
        title: "Handoff readiness cycle",
        description: "Time-box final opening checklist, training, launch approvals and unresolved partner blockers.",
        owner: "Franchise Partner",
        assignees: ["Franchise Partner", "Deal Manager"],
        lane: "Handoff",
        priority: "High",
        labels: ["handoff", "launch"],
        startDate: "2026-07-22",
        due: "Friday",
        cycle: "Launch handoff",
        modules: ["Partner readiness"],
        estimate: "21 points",
        parent: "OPEN-001",
        blocking: [],
        blockedBy: [],
        relatesTo: ["project-opening-page"],
        duplicateOf: "",
        links: ["Launch checklist", "Training path"],
        customFields: [
          { key: "readiness", label: "Readiness", value: "82%" },
          { key: "training", label: "Training state", value: "In review" },
          { key: "handoff", label: "Handoff owner", value: "Deal Manager" },
        ],
        comments: ["Partner-visible checklist must exclude internal finance notes."],
        stream: "Partner readiness",
        detail: "Cycle view for the final opening checklist, partner training and unresolved launch blockers.",
        nextStep: "Review unresolved launch checklist items.",
      },
      {
        id: "project-opening-page",
        recordKey: "pages",
        identifier: "OPEN-P05",
        itemType: "Page",
        title: "Opening playbook page",
        description: "Maintain the CRAYS opening playbook, decisions, scoped handoff notes and launch knowledge.",
        owner: "Reviewer",
        assignees: ["Reviewer"],
        lane: "Review",
        priority: "Low",
        labels: ["page", "knowledge"],
        startDate: "2026-07-10",
        due: "Unscheduled",
        cycle: "Knowledge base",
        modules: ["Documentation"],
        estimate: "3 points",
        parent: "OPEN-001",
        blocking: [],
        blockedBy: [],
        relatesTo: ["project-handoff-cycle"],
        duplicateOf: "",
        links: ["Launch notes", "Scope policy"],
        customFields: [
          { key: "visibility", label: "Visibility", value: "Internal" },
          { key: "review", label: "Review state", value: "Draft" },
          { key: "template", label: "Template", value: "Opening playbook" },
        ],
        comments: ["Publish only after role-scope review."],
        stream: "Documentation",
        detail: "Page surface for launch knowledge, internal decisions and handoff context.",
        nextStep: "Review page sections before publishing to scoped roles.",
      },
    ];
  }

  return readModel.records.slice(0, 5).map((record, index) => ({
    id: `${readModel.module.key}-${record.key}`,
    recordKey: record.key,
    identifier: `${readModel.module.key.toUpperCase()}-${index + 1}`,
    itemType: "Task",
    title: record.label,
    description: `${record.label} is mapped as a CRAYS-native workbench record family.`,
    owner: readModel.role,
    assignees: [readModel.role],
    lane: laneOrder[index % laneOrder.length],
    priority: index === 0 ? "High" : "Medium",
    labels: [readModel.module.key],
    startDate: "2026-07-10",
    due: index === 0 ? "This week" : "Queued",
    cycle: readModel.module.label,
    modules: [record.scope],
    estimate: "Unestimated",
    parent: "",
    blocking: [],
    blockedBy: [],
    relatesTo: [],
    duplicateOf: "",
    links: [],
    customFields: [{ key: "scope", label: "Scope", value: record.scope }],
    comments: [],
    stream: record.scope,
    detail: `${record.label} is available as a role-scoped workbench record family.`,
    nextStep: "Map record lineage before any connected update is reviewed.",
  }));
}

async function loadWorkbench(module: SourceFaithfulModuleKey, role: string, signal: AbortSignal) {
  const base = routeByModule[module];
  if (!base) throw new Error("Workbench route is not available");
  const response = await fetch(`${base}?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Workbench returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function SourceFaithfulWorkbenchPanel({ moduleKey }: { moduleKey: string }) {
  const typedModule = moduleKey as SourceFaithfulModuleKey;
  const supported = Boolean(routeByModule[typedModule]);
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const requestedView = searchParams.get("view");
  const [activeView, setActiveView] = useState("list");
  const [activeRecordKey, setActiveRecordKey] = useState("all");
  const [activeLane, setActiveLane] = useState<"all" | WorkbenchItem["lane"]>("all");
  const [activeSettingsGroup, setActiveSettingsGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [workbenchItems, setWorkbenchItems] = useState<WorkbenchItem[]>([]);
  const [stagedEvents, setStagedEvents] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    loadWorkbench(typedModule, role, controller.signal)
      .then((data) => {
        const firstView = data.readModel.navigation.find((view) => view.key === requestedView)?.key ?? data.readModel.navigation[0]?.key ?? "list";
        const items = buildInitialWorkbenchItems(data.readModel);
        setLoadState({ state: "ready", data, error: null });
        setActiveView(firstView);
        setActiveRecordKey("all");
        setActiveLane("all");
        setActiveSettingsGroup(data.readModel.settingsGroups[0]?.key ?? null);
        setWorkbenchItems(items);
        setSelectedItemId(items[0]?.id ?? null);
        setStagedEvents([]);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Workbench failed" });
      });

    return () => controller.abort();
  }, [refreshKey, requestedView, role, supported, typedModule]);

  const readModel = loadState.data?.readModel;
  const selectedItem = workbenchItems.find((item) => item.id === selectedItemId) ?? workbenchItems[0] ?? null;
  const activeViewLabel = useMemo(
    () => readModel?.navigation.find((view) => view.key === activeView)?.label ?? readModel?.navigation[0]?.label ?? "List",
    [activeView, readModel],
  );
  const activeSettings = readModel?.settingsGroups.find((group) => group.key === activeSettingsGroup) ?? readModel?.settingsGroups[0] ?? null;

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return workbenchItems.filter((item) => {
      const matchesRecord = activeRecordKey === "all" || item.recordKey === activeRecordKey;
      const matchesLane = activeLane === "all" || item.lane === activeLane;
      const searchable = `${item.identifier} ${item.itemType} ${item.title} ${item.description} ${item.owner} ${item.assignees.join(" ")} ${item.labels.join(" ")} ${item.stream} ${item.detail} ${item.nextStep}`.toLowerCase();
      return matchesRecord && matchesLane && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeLane, activeRecordKey, query, workbenchItems]);

  if (!supported) return null;

  function stageEvent(label: string) {
    setStagedEvents((items) => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${label}`, ...items].slice(0, 6));
  }

  function createDraftItem() {
    const title = draftTitle.trim();
    if (!title) return;
    const item: WorkbenchItem = {
      id: `draft-${Date.now()}`,
      recordKey: typedModule === "project" ? "work-items" : readModel?.records[0]?.key ?? "records",
      identifier: `DRAFT-${workbenchItems.length + 1}`,
      itemType: "Task",
      title,
      description: "New staged work item draft.",
      owner: "Current role",
      assignees: ["Current role"],
      lane: "Backlog",
      priority: "Medium",
      labels: ["draft"],
      startDate: "2026-07-10",
      due: "Unscheduled",
      cycle: typedModule === "project" ? "Draft cycle" : readModel?.module.label ?? "Draft",
      modules: [typedModule === "project" ? "Planning review" : "Review workbench"],
      estimate: "Unestimated",
      parent: "",
      blocking: [],
      blockedBy: [],
      relatesTo: [],
      duplicateOf: "",
      links: [],
      customFields: [
        { key: "source", label: "Source", value: "CRAYS staged draft" },
        { key: "approval", label: "Approval", value: "Required" },
      ],
      comments: [],
      stream: typedModule === "project" ? "Planning review" : "Review workbench",
      detail: "Review draft staged in this workspace. Use the module command action to store a guarded Core command draft before any connected update.",
      nextStep: "Review the draft and approve the next controlled implementation step.",
    };
    setWorkbenchItems((items) => [item, ...items]);
    setSelectedItemId(item.id);
    setActiveRecordKey("all");
    setDraftTitle("");
    stageEvent(`Draft created: ${title}`);
  }

  function moveSelectedItem() {
    if (!selectedItem) return;
    const currentIndex = laneOrder.indexOf(selectedItem.lane);
    const nextLane = laneOrder[(currentIndex + 1) % laneOrder.length];
    setWorkbenchItems((items) => items.map((item) => (item.id === selectedItem.id ? { ...item, lane: nextLane } : item)));
    stageEvent(`${selectedItem.title} moved to ${nextLane}`);
  }

  function updateSelectedItem(update: Partial<WorkbenchItem>) {
    if (!selectedItem) return;
    setWorkbenchItems((items) => items.map((item) => (item.id === selectedItem.id ? { ...item, ...update } : item)));
  }

  function updateSelectedListField(field: "assignees" | "labels" | "modules" | "blocking" | "blockedBy" | "relatesTo" | "links" | "comments", value: string) {
    updateSelectedItem({
      [field]: value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    } as Partial<WorkbenchItem>);
  }

  function updateSelectedCustomField(key: string, value: string) {
    if (!selectedItem) return;
    updateSelectedItem({
      customFields: selectedItem.customFields.map((field) => (field.key === key ? { ...field, value } : field)),
    });
  }

  const renderRows = () => (
    <div className="divide-y divide-[var(--line)]">
      {filteredItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setSelectedItemId(item.id)}
          className={`grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface)] md:grid-cols-[minmax(0,1fr)_110px_104px] md:items-center ${
            selectedItem?.id === item.id ? "bg-sky-50" : "bg-white"
          }`}
        >
          <span className="min-w-0">
            <strong className="block text-sm">{item.identifier} · {item.title}</strong>
            <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{item.itemType} · {item.stream}</span>
          </span>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-center text-xs font-semibold">{item.lane}</span>
          <span className="text-xs font-semibold text-[var(--ink-muted)]">{item.priority}</span>
        </button>
      ))}
      {!filteredItems.length ? <p className="px-4 py-6 text-sm text-[var(--ink-muted)]">No workbench items match this view.</p> : null}
    </div>
  );

  const renderBoard = () => (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      {laneOrder.map((lane) => (
        <div key={lane} className="min-h-[180px] rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-xs uppercase text-[var(--ink-muted)]">{lane}</strong>
            <span className="rounded-[7px] border border-[var(--line)] px-2 py-0.5 text-xs font-semibold">{filteredItems.filter((item) => item.lane === lane).length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {filteredItems
              .filter((item) => item.lane === lane)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full rounded-[8px] border p-3 text-left transition hover:border-[var(--accent)] ${
                    selectedItem?.id === item.id ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)] bg-[var(--surface)]"
                  }`}
                >
                  <strong className="block text-sm">{item.title}</strong>
                  <span className="mt-2 block text-xs text-[var(--ink-muted)]">{item.identifier} · {item.owner}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-3 p-4">
      {filteredItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setSelectedItemId(item.id)}
          className={`grid w-full gap-3 rounded-[8px] border p-4 text-left md:grid-cols-[140px_minmax(0,1fr)_120px] ${
            selectedItem?.id === item.id ? "border-[var(--accent)] bg-sky-50" : "border-[var(--line)] bg-white"
          }`}
        >
          <span className="text-sm font-semibold">{item.due}</span>
          <span className="min-w-0">
            <strong className="block text-sm">{item.title}</strong>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.identifier} · {item.cycle}</span>
          </span>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-center text-xs font-semibold">{item.lane}</span>
        </button>
      ))}
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-2">
        {(readModel?.settingsGroups ?? []).map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveSettingsGroup(group.key)}
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
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Settings group</p>
        <h3 className="mt-2 text-xl font-semibold">{activeSettings?.label ?? "Settings"}</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(activeSettings?.items ?? []).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => stageEvent(`${item} setting selected`)}
              className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium transition hover:border-[var(--accent)]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    if (activeView === "board") return renderBoard();
    if (activeView === "timeline") return renderTimeline();
    if (activeView === "cycles" || activeView === "pages") return renderTimeline();
    if (activeView === "settings") return renderSettings();
    return renderRows();
  };

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Native workbench</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">{readModel?.module.label ?? "Module"} operations</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Role-scoped planning, views, settings and guarded action staging. Connected updates, uploads and external sends stay closed.
            </p>
          </div>
          <button
            type="button"
            aria-label={`Refresh ${readModel?.module.label ?? "module"} workbench`}
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {loadState.state === "error" ? <p className="mt-4 text-sm text-rose-700">{loadState.error}</p> : null}
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Workbench items", workbenchItems.length.toString()],
          ["Views", readModel ? readModel.navigation.length.toString() : "..."],
          ["Settings", readModel ? readModel.settingsGroups.length.toString() : "..."],
          ["AI tools", readModel ? readModel.aiTools.length.toString() : "..."],
          ["Staged events", stagedEvents.length.toString()],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] xl:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workbench"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Plus className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createDraftItem();
              }}
              placeholder={typedModule === "project" ? "Describe a work item" : "Describe next action"}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <button
            type="button"
            onClick={createDraftItem}
            disabled={!draftTitle.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
          >
            <Plus className="h-4 w-4" />
            Stage action
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveRecordKey("all")}
            className={`rounded-[8px] border px-3 py-2 text-xs font-semibold uppercase ${
              activeRecordKey === "all" ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white text-[var(--ink-muted)]"
            }`}
          >
            All records
          </button>
          {(readModel?.records ?? []).map((record) => (
            <button
              type="button"
              key={record.key}
              onClick={() => setActiveRecordKey(record.key)}
              className={`rounded-[8px] border px-3 py-2 text-xs font-semibold uppercase ${
                activeRecordKey === record.key ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white text-[var(--ink-muted)]"
              }`}
            >
              {record.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["all", ...laneOrder] as Array<"all" | WorkbenchItem["lane"]>).map((lane) => (
            <button
              type="button"
              key={lane}
              onClick={() => setActiveLane(lane)}
              className={`rounded-[8px] border px-3 py-2 text-xs font-semibold ${
                activeLane === lane ? "border-[var(--accent)] bg-sky-50 text-[var(--foreground)]" : "border-[var(--line)] bg-white text-[var(--ink-muted)]"
              }`}
            >
              {lane === "all" ? "All stages" : lane}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {activeView === "board" ? <Kanban className="h-4 w-4 text-[var(--accent)]" /> : <LayoutList className="h-4 w-4 text-[var(--accent)]" />}
                  <h2 className="font-semibold">Views</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{activeViewLabel}</p>
              </div>
            </div>
          </div>
          {renderActiveView()}
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Record detail</h2>
            </div>
            {selectedItem ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[8px] bg-white p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedItem.recordKey}</p>
                  <h3 className="mt-2 text-lg font-semibold">{selectedItem.identifier}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Every Project field is editable here as a CRAYS-staged change. No source write is executed.</p>
                </div>
                <div className="grid gap-3 text-sm">
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Title</span>
                    <input
                      value={selectedItem.title}
                      onChange={(event) => updateSelectedItem({ title: event.target.value })}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Description</span>
                    <textarea
                      value={selectedItem.description}
                      onChange={(event) => updateSelectedItem({ description: event.target.value, detail: event.target.value })}
                      rows={3}
                      className="resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Type</span>
                      <select
                        value={selectedItem.itemType}
                        onChange={(event) => updateSelectedItem({ itemType: event.target.value as WorkbenchItem["itemType"] })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      >
                        {itemTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">State</span>
                      <select
                        value={selectedItem.lane}
                        onChange={(event) => updateSelectedItem({ lane: event.target.value as WorkbenchItem["lane"] })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      >
                        {laneOrder.map((lane) => (
                          <option key={lane} value={lane}>
                            {lane}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Priority</span>
                      <select
                        value={selectedItem.priority}
                        onChange={(event) => updateSelectedItem({ priority: event.target.value as WorkbenchItem["priority"] })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Owner</span>
                      <input
                        value={selectedItem.owner}
                        onChange={(event) => updateSelectedItem({ owner: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Start date</span>
                      <input
                        value={selectedItem.startDate}
                        onChange={(event) => updateSelectedItem({ startDate: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Due date</span>
                      <input
                        value={selectedItem.due}
                        onChange={(event) => updateSelectedItem({ due: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Assignees</span>
                    <input
                      value={selectedItem.assignees.join(", ")}
                      onChange={(event) => updateSelectedListField("assignees", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Labels</span>
                    <input
                      value={selectedItem.labels.join(", ")}
                      onChange={(event) => updateSelectedListField("labels", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Cycle</span>
                      <input
                        value={selectedItem.cycle}
                        onChange={(event) => updateSelectedItem({ cycle: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Estimate</span>
                      <input
                        value={selectedItem.estimate}
                        onChange={(event) => updateSelectedItem({ estimate: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Modules</span>
                    <input
                      value={selectedItem.modules.join(", ")}
                      onChange={(event) => updateSelectedListField("modules", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Parent</span>
                      <input
                        value={selectedItem.parent}
                        onChange={(event) => updateSelectedItem({ parent: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Duplicate of</span>
                      <input
                        value={selectedItem.duplicateOf}
                        onChange={(event) => updateSelectedItem({ duplicateOf: event.target.value })}
                        className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Blocking</span>
                    <input
                      value={selectedItem.blocking.join(", ")}
                      onChange={(event) => updateSelectedListField("blocking", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Blocked by</span>
                    <input
                      value={selectedItem.blockedBy.join(", ")}
                      onChange={(event) => updateSelectedListField("blockedBy", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Relates to</span>
                    <input
                      value={selectedItem.relatesTo.join(", ")}
                      onChange={(event) => updateSelectedListField("relatesTo", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Links</span>
                    <input
                      value={selectedItem.links.join(", ")}
                      onChange={(event) => updateSelectedListField("links", event.target.value)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Next step</span>
                    <input
                      value={selectedItem.nextStep}
                      onChange={(event) => updateSelectedItem({ nextStep: event.target.value })}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Custom fields</p>
                    <div className="mt-3 grid gap-2">
                      {selectedItem.customFields.map((field) => (
                        <label key={field.key} className="grid gap-1">
                          <span className="text-xs font-semibold">{field.label}</span>
                          <input
                            value={field.value}
                            onChange={(event) => updateSelectedCustomField(field.key, event.target.value)}
                            className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Comments</span>
                    <textarea
                      value={selectedItem.comments.join(", ")}
                      onChange={(event) => updateSelectedListField("comments", event.target.value)}
                      rows={2}
                      className="resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={moveSelectedItem}
                  className="flex w-full items-center justify-between rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
                >
                  Move to next stage
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => stageEvent(`Review edits prepared for ${selectedItem.identifier}`)}
                  className="flex w-full items-center justify-between rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
                >
                  Stage field edits
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--ink-muted)]">Select an item to open the record detail.</p>
            )}
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">AI controls</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(readModel?.aiTools ?? []).map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => stageEvent(`${tool.label} queued for approval`)}
                  className="w-full rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm">{tool.label}</strong>
                    <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Approval</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{tool.scope}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Staged events</h2>
            </div>
            <div className="mt-4 space-y-2">
              {stagedEvents.length ? (
                stagedEvents.map((event) => (
                  <div key={event} className="rounded-[8px] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                    {event}
                  </div>
                ))
              ) : (
                <p className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink-muted)]">Use the workbench controls to prepare review actions.</p>
              )}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Settings map</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(readModel?.settingsGroups ?? []).map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => {
                  setActiveView("settings");
                  setActiveSettingsGroup(group.key);
                }}
                className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
              >
                {group.label}
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-[var(--rose)]" />
            <h2 className="font-semibold">Guarded actions</h2>
          </div>
          <div className="mt-4 space-y-2">
            {(readModel?.actions ?? []).map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => stageEvent(`${action.label} review selected: ${labelize(action.requires)}`)}
                className="flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
              >
                <span>{action.label}</span>
                <span className="text-[10px] uppercase text-[var(--ink-muted)]">{labelize(action.requires)}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[var(--amber)]" />
            <h2 className="font-semibold">Boundaries</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {["Source writes", "Sync writes", "AI calls", "Uploads", "External sending"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[8px] bg-white p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span>{item} off</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => stageEvent("Boundary review selected")}
              className="mt-1 flex items-center justify-between rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]"
            >
              Review boundary gates
              <TimerReset className="h-4 w-4" />
            </button>
          </div>
        </article>
      </section>
    </section>
  );
}
