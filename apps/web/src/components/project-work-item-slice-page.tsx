"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, CalendarDays, GitBranch, GripVertical, LockKeyhole, RefreshCw, Search, ShieldCheck, Undo2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { CommandReceipt } from "@/components/crays/forms/command-receipt";
import { EntityTable, type EntityTableRecord, type EntityTableStatus } from "@/components/crays/table/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createDefaultEntityTableState, type EntityTableState } from "@/lib/query-state/entity-table-query";
import type { ResourceCommandReceipt, ResourceFilter, ResourceFieldDescriptor } from "@/lib/resources";
import { roleByKey } from "@/lib/roles";

// Plane metadata discovery remains a server-side contract; the visible product UI uses work-queue language.
type ProjectWorkItemRow = EntityTableRecord & {
  id: string;
  workItemId: string;
  projectId: string;
  studioName?: string;
  siteName?: string;
  address?: string;
  preparedOfferId: string;
  dealId: string;
  propertyCaseId: string;
  title: string;
  family: string;
  stateKey: string;
  currentState: string;
  priority: string;
  owner: string;
  audience: string;
  dueDate: string | null;
  milestoneId: string | null;
  predecessorId: string | null;
  successorId: string | null;
  blocker: string;
  nextAction: string;
  updatedAt: string;
  href: string;
  value: string | number | boolean | null;
  unit: string | null;
  fields?: Record<string, unknown>;
};

export type ProjectWorkItemsPayload = {
  status: "ready" | "release_blocked" | "forbidden";
  payloadMode?: "initial-page" | "full";
  resource: {
    sourceSystem: string;
    schemaStatus: string;
    fields: ResourceFieldDescriptor[];
  };
  access: {
    allowed: boolean;
    reason: string;
    canStageWorkItem: boolean;
  };
  projectContext: {
    projectId: string;
    studioName: string;
    siteName: string;
    targetOpeningDate: string;
  };
  summary: {
    records: number;
    activeProjects?: number;
    readinessScore: number;
    blockers: number;
    overdue: number;
    criticalPathItems: number;
    scheduleContingencyDays: number | null;
    freshnessMinutes: number | null;
  };
  rows: ProjectWorkItemRow[];
  fullRowsAvailable?: number;
  actions: {
    canStageCommandDraft: boolean;
    commandRoute: "/api/crays/project/work-items/command";
    planeNativeWritesEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
  };
  note: string;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: ProjectWorkItemsPayload; error: null }
  | { state: "error"; data: null; error: string };

const columns: ColumnDef<ProjectWorkItemRow, unknown>[] = [
  { accessorKey: "title", header: "Work item", meta: { label: "Work item" } },
  { accessorKey: "studioName", header: "Project", meta: { label: "Project" } },
  { accessorKey: "stateKey", header: "State", meta: { label: "State" } },
  { accessorKey: "priority", header: "Priority", meta: { label: "Priority" } },
  { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
  { accessorKey: "dueDate", header: "Due", meta: { label: "Due" } },
];

function labelize(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replaceAll("-", " ") : "Not set";
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

function compareValues(left: unknown, right: unknown) {
  return String(left ?? "").localeCompare(String(right ?? ""), "en", { numeric: true, sensitivity: "base" });
}

function matchesFilter(row: ProjectWorkItemRow, filter: ResourceFilter) {
  const value = row[filter.field];
  const expected = filter.value;

  switch (filter.operator) {
    case "eq":
      return text(value) === text(expected);
    case "neq":
      return text(value) !== text(expected);
    case "contains":
      return text(value).includes(text(expected));
    case "startsWith":
      return text(value).startsWith(text(expected));
    case "in":
      return Array.isArray(expected) ? expected.map(text).includes(text(value)) : text(value) === text(expected);
    case "gt":
      return compareValues(value, expected) > 0;
    case "gte":
      return compareValues(value, expected) >= 0;
    case "lt":
      return compareValues(value, expected) < 0;
    case "lte":
      return compareValues(value, expected) <= 0;
    case "isNull":
      return value === null || value === undefined || value === "";
    default:
      return text(value).includes(text(expected));
  }
}

function applyTableState(rows: ProjectWorkItemRow[], state: EntityTableState) {
  const search = state.search.trim().toLowerCase();
  const searched = search
    ? rows.filter((row) => [row.title, row.studioName, row.siteName, row.address, row.family, row.stateKey, row.priority, row.owner, row.currentState, row.blocker, row.nextAction, row.milestoneId].join(" ").toLowerCase().includes(search))
    : rows;
  const filtered = state.filters.reduce((current, filter) => current.filter((row) => matchesFilter(row, filter)), searched);
  const sorted = [...filtered].sort((left, right) => {
    for (const sort of state.sorting) {
      const result = compareValues(left[sort.id], right[sort.id]);
      if (result !== 0) return result * (sort.desc ? -1 : 1);
    }
    return 0;
  });
  const start = state.pagination.pageIndex * state.pagination.pageSize;

  return {
    total: sorted.length,
    rows: sorted.slice(start, start + state.pagination.pageSize),
  };
}

async function loadProjectWorkItems(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/project/work-items/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as ProjectWorkItemsPayload;

  if (!response.ok && response.status !== 403 && response.status !== 423) {
    throw new Error(`Project work items returned HTTP ${response.status}`);
  }

  return payload;
}

async function stageWorkItem(role: string, route: string, row: ProjectWorkItemRow, targetState = row.stateKey) {
  const response = await fetch(`${route}?role=${role}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: `project-work-item:${row.workItemId}:${role}:${targetState}:block82-v1`,
      projectId: row.projectId,
      workItemId: row.workItemId,
      preparedOfferId: row.preparedOfferId,
      dealId: row.dealId,
      propertyCaseId: row.propertyCaseId,
      title: `Review ${row.title}`,
      status: targetState,
      previousStatus: row.stateKey,
      targetState,
      priority: row.priority,
      dueDate: row.dueDate,
      ownerRole: row.owner,
    }),
  });
  const payload = (await response.json()) as { receipt?: ResourceCommandReceipt; message?: string };

  if (!payload.receipt) throw new Error(payload.message ?? `Project command returned HTTP ${response.status}`);
  return payload.receipt;
}

function statusForLoad(loadState: LoadState, data: ProjectWorkItemsPayload | null): EntityTableStatus {
  if (loadState.state === "loading") return { state: "loading", message: "Resolving Project work items through CRAYS Core." };
  if (loadState.state === "error") return { state: "error", message: loadState.error };
  if (!data?.access.allowed) return { state: "permission", message: data?.access.reason ?? "This role cannot access Project work items." };
  return { state: "ready" };
}

function freshness(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "freshness unknown";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function normalizedStateOrder(states: string[]) {
  const preferred = ["blocked", "attention", "ready", "in_review", "done"];
  const known = preferred.filter((state) => states.includes(state));
  const remaining = states.filter((state) => !preferred.includes(state)).sort((left, right) => compareValues(left, right));
  return [...known, ...remaining];
}

function effectiveBoardRows(rows: ProjectWorkItemRow[], overrides: Record<string, string>) {
  return rows.map((row) => (overrides[row.id] ? { ...row, stateKey: overrides[row.id], currentState: labelize(overrides[row.id]) } : row));
}

function BoardColumn({
  stateKey,
  rows,
  total,
  onSelect,
}: {
  stateKey: string;
  rows: ProjectWorkItemRow[];
  total: number;
  onSelect: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${stateKey}`,
    data: { type: "column", stateKey },
  });

  return (
    <section className={`flex min-h-[520px] min-w-[280px] flex-1 flex-col rounded-[16px] border bg-card shadow-sm transition ${isOver ? "border-emerald-500 ring-2 ring-emerald-200" : "border-border"}`}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">{labelize(stateKey)}</h3>
          <Badge variant={stateKey === "blocked" ? "warning" : stateKey === "ready" ? "success" : "secondary"}>{total.toLocaleString("en-US")}</Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Plane state projection. Apply remains gated through CRAYS.</p>
      </div>
      <div ref={setNodeRef} className="min-h-[460px] flex-1 space-y-3 overflow-y-auto p-3">
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row) => (
            <ProjectBoardCard key={row.id} row={row} onSelect={onSelect} />
          ))}
        </SortableContext>
        {rows.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            No matching work items in this state. Clear the board search or inspect another state.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProjectBoardCard({ row, onSelect }: { row: ProjectWorkItemRow; onSelect: (id: string) => void }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: row.id,
    data: { type: "work-item", rowId: row.id, stateKey: row.stateKey },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-[12px] border border-border bg-background p-3 shadow-sm transition ${isDragging ? "opacity-70 ring-2 ring-emerald-300" : "hover:border-emerald-700/30"}`}
      onClick={() => onSelect(row.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{row.studioName ?? row.projectId}</p>
          <h4 className="mt-1 line-clamp-2 text-sm font-semibold">{row.title}</h4>
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-card p-1.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Drag ${row.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={row.priority === "critical" ? "danger" : row.priority === "high" ? "warning" : "secondary"}>{labelize(row.priority)}</Badge>
        <Badge variant="secondary">{row.owner}</Badge>
        {row.dueDate ? <Badge variant="info">{row.dueDate}</Badge> : null}
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{row.blocker || row.nextAction}</p>
    </article>
  );
}

function ProjectBoard({
  rows,
  boardSearch,
  boardNotice,
  localStateOverrides,
  onBoardSearchChange,
  onDragEnd,
  onSelect,
}: {
  rows: ProjectWorkItemRow[];
  boardSearch: string;
  boardNotice: string | null;
  localStateOverrides: Record<string, string>;
  onBoardSearchChange: (value: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onSelect: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const normalizedRows = React.useMemo(() => effectiveBoardRows(rows, localStateOverrides), [rows, localStateOverrides]);
  const search = boardSearch.trim().toLowerCase();
  const filteredRows = React.useMemo(
    () =>
      search
        ? normalizedRows.filter((row) =>
            [row.title, row.studioName, row.siteName, row.address, row.owner, row.priority, row.stateKey, row.blocker, row.nextAction].join(" ").toLowerCase().includes(search),
          )
        : normalizedRows,
    [normalizedRows, search],
  );
  const allStates = React.useMemo(() => normalizedStateOrder(Array.from(new Set(normalizedRows.map((row) => row.stateKey)))), [normalizedRows]);
  const rowsByState = React.useMemo(() => {
    const groups = new Map<string, ProjectWorkItemRow[]>();
    for (const state of allStates) groups.set(state, []);
    for (const row of filteredRows) groups.get(row.stateKey)?.push(row);
    for (const [, stateRows] of groups) {
      stateRows.sort((left, right) => compareValues(left.dueDate ?? "9999-99-99", right.dueDate ?? "9999-99-99") || compareValues(left.priority, right.priority));
    }
    return groups;
  }, [allStates, filteredRows]);
  const totalsByState = React.useMemo(() => {
    const groups = new Map<string, number>();
    for (const state of allStates) groups.set(state, 0);
    for (const row of normalizedRows) groups.set(row.stateKey, (groups.get(row.stateKey) ?? 0) + 1);
    return groups;
  }, [allStates, normalizedRows]);

  return (
    <section className="min-w-0 rounded-[16px] border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Project board</h2>
            <Badge variant="success">dnd-kit enabled</Badge>
            <Badge variant="secondary">{allStates.length} live states</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Drag cards between real Project states with pointer or keyboard. The move is staged through CRAYS and rolls back while external project-system apply remains closed.
          </p>
        </div>
        <label className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search project board</span>
          <input
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            value={boardSearch}
            onChange={(event) => onBoardSearchChange(event.target.value)}
            placeholder="Search board by project, owner, blocker..."
          />
        </label>
      </div>

      {boardNotice ? (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <Undo2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{boardNotice}</p>
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {allStates.map((stateKey) => (
            <BoardColumn
              key={stateKey}
              stateKey={stateKey}
              rows={rowsByState.get(stateKey) ?? []}
              total={totalsByState.get(stateKey) ?? 0}
              onSelect={onSelect}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}

export function ProjectWorkItemSlicePage({ role, view, initialPayload = null }: { role?: string; view?: string; initialPayload?: ProjectWorkItemsPayload | null }) {
  const activeRole = roleByKey(role).key;

  return <ProjectWorkItemSliceContent key={`${activeRole}:${view ?? "work-items"}`} activeRole={activeRole} view={view} initialPayload={initialPayload} />;
}

function ProjectWorkItemSliceContent({ activeRole, view, initialPayload }: { activeRole: string; view?: string; initialPayload?: ProjectWorkItemsPayload | null }) {
  const [loadState, setLoadState] = React.useState<LoadState>(() => (initialPayload ? { state: "ready", data: initialPayload, error: null } : { state: "loading", data: null, error: null }));
  const skipInitialFetchRef = React.useRef(Boolean(initialPayload));
  const hydrateFullPayloadRef = React.useRef(initialPayload?.payloadMode === "initial-page");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [tableState, setTableState] = React.useState<EntityTableState>(() => createDefaultEntityTableState({ pagination: { pageIndex: 0, pageSize: 10 } }));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<ResourceCommandReceipt | null>(null);
  const [stageError, setStageError] = React.useState<string | null>(null);
  const [stagingId, setStagingId] = React.useState<string | null>(null);
  const [localStateOverrides, setLocalStateOverrides] = React.useState<Record<string, string>>({});
  const [boardSearch, setBoardSearch] = React.useState("");
  const [boardNotice, setBoardNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      if (!hydrateFullPayloadRef.current) return;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        loadProjectWorkItems(activeRole, controller.signal)
          .then((payload) => {
            hydrateFullPayloadRef.current = false;
            setLoadState({ state: "ready", data: { ...payload, payloadMode: "full" }, error: null });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            setLoadState((current) =>
              current.state === "ready"
                ? current
                : { state: "error", data: null, error: error instanceof Error ? error.message : "Project work items unavailable." },
            );
          });
      }, 120);

      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const controller = new AbortController();

    loadProjectWorkItems(activeRole, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Project work items unavailable." });
      });

    return () => controller.abort();
  }, [activeRole, refreshKey]);

  const data = loadState.data;
  const isBoardView = view === "board";
  const visible = React.useMemo(() => applyTableState(data?.rows ?? [], tableState), [data?.rows, tableState]);
  const selectedRow = React.useMemo(() => {
    if (!data?.rows.length || visible.total === 0) return null;
    const boardSelected = isBoardView && selectedId ? data.rows.find((row) => row.id === selectedId) : null;
    return boardSelected ?? visible.rows.find((row) => row.id === selectedId) ?? visible.rows[0] ?? null;
  }, [data, isBoardView, selectedId, visible]);
  const stageDisabledReason = data?.actions.canStageCommandDraft ? "" : data?.access.reason ?? "This role can inspect project work but cannot stage a review.";
  const isStagingSelected = Boolean(selectedRow && stagingId === selectedRow.id);

  function clearLocalBoardOverride(rowId: string) {
    setLocalStateOverrides((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  }

  async function handleBoardDragEnd(event: DragEndEvent) {
    if (!data?.actions.canStageCommandDraft) {
      setBoardNotice(stageDisabledReason || "This role can inspect the board but cannot stage transitions.");
      return;
    }

    const rowId = String(event.active.id);
    const row = data.rows.find((candidate) => candidate.id === rowId);
    if (!row || !event.over) return;

    const overData = event.over.data.current as { type?: string; stateKey?: string } | undefined;
    const targetState = overData?.stateKey ?? (String(event.over.id).startsWith("column:") ? String(event.over.id).slice("column:".length) : undefined);
    const currentState = localStateOverrides[row.id] ?? row.stateKey;
    if (!targetState || targetState === currentState) return;

    setSelectedId(row.id);
    setStageError(null);
    setReceipt(null);
    setBoardNotice(`Staging ${row.title} from ${labelize(currentState)} to ${labelize(targetState)} through CRAYS Core.`);
    setLocalStateOverrides((current) => ({ ...current, [row.id]: targetState }));
    setStagingId(row.id);

    try {
      const nextReceipt = await stageWorkItem(activeRole, data.actions.commandRoute, row, targetState);
      setReceipt(nextReceipt);
      clearLocalBoardOverride(row.id);
      setBoardNotice(
        `Move to ${labelize(targetState)} was staged as ${nextReceipt.commandId}. The board rolled back to server state because external project-system apply is still closed by ${nextReceipt.gate?.key ?? "the apply gate"}.`,
      );
    } catch (error) {
      clearLocalBoardOverride(row.id);
      setStageError(error instanceof Error ? error.message : "Project board transition failed.");
      setBoardNotice(`Move to ${labelize(targetState)} was rolled back because the CRAYS transition draft could not be staged.`);
    } finally {
      setStagingId(null);
    }
  }

  function selectSavedView(viewId: string) {
    if (viewId === "critical-path") {
      setTableState((current) =>
        createDefaultEntityTableState({
          ...current,
          savedViewId: viewId,
          search: "",
          filters: [{ field: "priority", operator: "in", value: ["critical", "high"] }],
          sorting: [{ id: "dueDate", desc: false }],
          pagination: { ...current.pagination, pageIndex: 0 },
          rowSelection: {},
        }),
      );
      setSelectedId(null);
      setReceipt(null);
      return;
    }

    if (viewId === "blocked-opening") {
      setTableState((current) =>
        createDefaultEntityTableState({
          ...current,
          savedViewId: viewId,
          search: "",
          filters: [{ field: "blocker", operator: "neq", value: "" }],
          sorting: [{ id: "priority", desc: false }],
          pagination: { ...current.pagination, pageIndex: 0 },
          rowSelection: {},
        }),
      );
      setSelectedId(null);
      setReceipt(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
      <section className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <CalendarDays className="size-4 text-emerald-700" aria-hidden="true" />
              Project work items
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{!data || (data.summary.activeProjects && data.summary.activeProjects > 1) ? "Opening project portfolio work queue" : `${data.projectContext.studioName} work queue`}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              Opening work organized by owner, due date, blocker and next safe action. Reviews are staged in CRAYS before any external project-system update can be applied.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{data?.summary.records ?? 0} records</Badge>
            {data?.payloadMode === "initial-page" ? <Badge variant="secondary">{data.rows.length} loaded above fold</Badge> : null}
            <Badge variant="success">{data?.summary.activeProjects ?? 1} active projects</Badge>
            <Badge variant={data?.summary.blockers ? "warning" : "success"}>{data?.summary.blockers ?? 0} blockers</Badge>
            <Badge variant="secondary">{data?.summary.criticalPathItems ?? 0} critical path</Badge>
            <Badge variant="secondary">{freshness(data?.summary.freshnessMinutes)}</Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        {isBoardView ? (
          <ProjectBoard
            rows={data?.access.allowed ? data.rows : []}
            boardSearch={boardSearch}
            boardNotice={boardNotice}
            localStateOverrides={localStateOverrides}
            onBoardSearchChange={setBoardSearch}
            onDragEnd={handleBoardDragEnd}
            onSelect={(id) => {
              setSelectedId(id);
              setReceipt(null);
            }}
          />
        ) : (
          <EntityTable
            resourceLabel="Project work items"
            resourceDescription="Search, filter, sort and page the opening plan. Select a row to inspect ownership, dependencies and the next safe review action."
            columns={columns}
            data={visible.rows}
            state={tableState}
            status={statusForLoad(loadState, data)}
            pageInfo={{
              pageIndex: tableState.pagination.pageIndex,
              pageSize: tableState.pagination.pageSize,
              total: data?.fullRowsAvailable ?? visible.total,
              totalReliable: true,
              hasNextPage: (tableState.pagination.pageIndex + 1) * tableState.pagination.pageSize < (data?.fullRowsAvailable ?? visible.total),
              hasPreviousPage: tableState.pagination.pageIndex > 0,
            }}
            savedViews={[
              { id: "critical-path", label: "Critical path", scope: "team" },
              { id: "blocked-opening", label: "Blocked opening work", scope: "role" },
            ]}
            bulkActions={[{ id: "focus-selected", label: "Focus selected" }]}
            onStateChange={(nextState) => {
              setTableState(nextState);
              setSelectedId(null);
              setReceipt(null);
            }}
            onSavedViewSelect={selectSavedView}
            onRowOpen={(row) => {
              setSelectedId(String(row.id));
              setReceipt(null);
            }}
            onBulkAction={(_actionId, selectedRowIds) => {
              const nextSelectedId = selectedRowIds[0];
              if (nextSelectedId) setSelectedId(nextSelectedId);
            }}
          />
        )}

        <aside className="space-y-4">
          <section className="rounded-[16px] border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Selected work item</h2>
            {selectedRow ? (
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Title</p>
                  <p className="mt-1 font-medium">{selectedRow.title}</p>
                </div>
                <dl className="grid gap-x-4 gap-y-3 rounded-md border border-border bg-background p-3 sm:grid-cols-2">
                  {[
                    ["Project", selectedRow.studioName ?? selectedRow.projectId],
                    ["Site", selectedRow.siteName ?? selectedRow.address ?? "Not set"],
                    ["State", labelize(selectedRow.stateKey)],
                    ["Owner", selectedRow.owner],
                    ["Priority", labelize(selectedRow.priority)],
                    ["Due date", selectedRow.dueDate ?? "Not set"],
                    ["Blocker", selectedRow.blocker || "No blocker recorded"],
                    ["Next action", selectedRow.nextAction],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                {selectedRow.predecessorId || selectedRow.successorId ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <GitBranch className="size-4" aria-hidden="true" />
                      Dependency
                    </p>
                    <p className="mt-2 text-xs leading-5">
                      {selectedRow.predecessorId ? `From ${labelize(selectedRow.predecessorId)}` : ""}
                      {selectedRow.predecessorId && selectedRow.successorId ? " -> " : ""}
                      {selectedRow.successorId ? `To ${labelize(selectedRow.successorId)}` : ""}
                    </p>
                  </div>
                ) : null}
                <Button asChild variant="outline">
                  <Link href={`/dashboard?role=${activeRole}&view=case&case=${selectedRow.preparedOfferId}&deal=${selectedRow.dealId}&propertyCase=${selectedRow.propertyCaseId}`}>
                    Open case workspace
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  disabled={!data?.actions.canStageCommandDraft || isStagingSelected}
                  title={data?.actions.canStageCommandDraft ? undefined : stageDisabledReason}
                  onClick={async () => {
                    if (!data?.actions.canStageCommandDraft || isStagingSelected) return;
                    setStageError(null);
                    setReceipt(null);
                    setStagingId(selectedRow.id);
                    try {
                      setReceipt(await stageWorkItem(activeRole, data.actions.commandRoute, selectedRow));
                    } catch (error) {
                      setStageError(error instanceof Error ? error.message : "Project command draft failed.");
                    } finally {
                      setStagingId(null);
                    }
                  }}
                >
                  {isStagingSelected ? "Staging review..." : "Stage CRAYS project review"}
                </Button>
                {!data?.actions.canStageCommandDraft ? <p className="text-xs leading-5 text-muted-foreground">{stageDisabledReason}</p> : null}
                {stageError ? <p className="text-sm font-medium text-destructive">{stageError}</p> : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Select a project work item to inspect state, owner, blocker and next action.</p>
            )}
          </section>

          {receipt ? <CommandReceipt receipt={receipt} /> : null}

          <section className="rounded-[16px] border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            <div className="flex items-start gap-2">
              {data?.actions.canStageCommandDraft ? <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <p>
                {data?.actions.canStageCommandDraft
                  ? "Review staging is available. External project-system changes remain closed until an apply gate is explicitly opened."
                  : stageDisabledReason}
              </p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
