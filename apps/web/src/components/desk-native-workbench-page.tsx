"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ClipboardList,
  Columns3,
  DatabaseZap,
  FileText,
  Kanban,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { ModuleDefinition } from "@/lib/modules";
import type { RoleToolEntitlement, RoleToolFunctionMatrixContract, ToolFunction } from "@/lib/role-tool-function-matrix";

type NativeRecord = {
  id: string;
  type: string;
  title: string;
  owner: string;
  status: "Inbox" | "Active" | "Review" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  due: string;
  scope: string;
  linkedCore: string[];
};

type Payload = {
  status: "ready" | "forbidden";
  readModel: RoleToolFunctionMatrixContract;
};

const statusOrder: NativeRecord["status"][] = ["Inbox", "Active", "Review", "Done"];
const displayModeOptions = [
  { key: "workspace", label: "Workspace" },
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "reports", label: "Reports" },
];

async function loadMatrix(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/adapters/role-tool-function-matrix/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Tool matrix returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function buildRecords(module: ModuleDefinition, functions: ToolFunction[]): NativeRecord[] {
  const primary = module.primaryRecords.map((record, index) => ({
    id: `${module.key}-record-${index}`,
    type: record,
    title: `${record} workspace`,
    owner: module.workstreams[index % module.workstreams.length]?.owner ?? module.label,
    status: statusOrder[index % statusOrder.length],
    priority: (index === 0 ? "High" : "Medium") as NativeRecord["priority"],
    due: index === 0 ? "This week" : "Queued",
    scope: module.purpose,
    linkedCore: ["People", "Companies", "Files", "Events"].slice(0, 2 + (index % 3)),
  }));
  const functionRecords = functions.slice(0, 8).map((fn, index) => ({
    id: `${module.key}-function-${fn.key}`,
    type: fn.label,
    title: `${fn.label} control`,
    owner: module.workstreams[index % module.workstreams.length]?.owner ?? module.label,
    status: statusOrder[(index + 1) % statusOrder.length],
    priority: (fn.family === "finance" || fn.family === "admin" ? "High" : "Medium") as NativeRecord["priority"],
    due: "Mapped",
    scope: fn.description,
    linkedCore: ["People", "Companies", "Files", "Events", "KPIs"].slice(0, 3),
  }));
  return [...primary, ...functionRecords];
}

function findModuleEntitlement(readModel: RoleToolFunctionMatrixContract, role: string, moduleKey: string) {
  const currentRole = readModel.roles.find((roleRow) => roleRow.key === role);
  return (
    currentRole?.entitlements.find((item) => item.module === moduleKey) ??
    readModel.roles.flatMap((roleRow) => roleRow.entitlements).find((item) => item.module === moduleKey)
  );
}

export function DeskNativeWorkbenchPage({ module }: { module: ModuleDefinition }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const requestedView = searchParams.get("view") ?? "workspace";
  const [loadState, setLoadState] = useState<{ state: "loading" | "ready" | "error"; data: Payload | null; error: string | null }>({
    state: "loading",
    data: null,
    error: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState(requestedView);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<NativeRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [stagedEvents, setStagedEvents] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    loadMatrix(role, controller.signal)
      .then((data) => {
        const entitlement = findModuleEntitlement(data.readModel, role, module.key);
        const tool = data.readModel.tools.find((item) => item.module === module.key);
        setLoadState({ state: "ready", data, error: null });
        setRecords(buildRecords(module, entitlement?.functions ?? tool?.functions ?? []));
        setActiveView(requestedView);
        setSelectedId(null);
        setDetailOpen(false);
        setStagedEvents([]);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Workbench failed" });
      });
    return () => controller.abort();
  }, [module, refreshKey, requestedView, role]);

  const readModel = loadState.data?.readModel;
  const entitlement = readModel ? (findModuleEntitlement(readModel, role, module.key) as RoleToolEntitlement | undefined) : undefined;
  const tool = readModel?.tools.find((item) => item.module === module.key);
  const functions = entitlement?.functions ?? tool?.functions ?? [];
  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const searchable = `${record.type} ${record.title} ${record.owner} ${record.status} ${record.scope} ${record.linkedCore.join(" ")}`.toLowerCase();
      return !normalized || searchable.includes(normalized);
    });
  }, [query, records]);

  function stage(label: string) {
    setStagedEvents((events) => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${label}`, ...events].slice(0, 8));
  }

  function displayModeLabel(value: string) {
    return displayModeOptions.find((option) => option.key === value)?.label ?? "List";
  }

  function createDraft() {
    const title = draftTitle.trim();
    if (!title) return;
    const draft: NativeRecord = {
      id: `${module.key}-draft-${Date.now()}`,
      type: "Draft",
      title,
      owner: "Current role",
      status: "Inbox",
      priority: "Medium",
      due: "Unscheduled",
      scope: "Review draft before connected workflow update.",
      linkedCore: ["People", "Companies", "Events"],
    };
    setRecords((current) => [draft, ...current]);
    setSelectedId(draft.id);
    setDetailOpen(true);
    setDraftTitle("");
    stage(`Draft staged: ${title}`);
  }

  function updateSelected(update: Partial<NativeRecord>) {
    if (!selectedRecord) return;
    setRecords((current) => current.map((record) => (record.id === selectedRecord.id ? { ...record, ...update } : record)));
  }

  const renderWorkspace = () => (
    <div className="space-y-5 p-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Records", records.length.toString(), "role scoped", ClipboardList],
          ["Functions", functions.length.toString(), "mapped", Columns3],
          ["Workstreams", module.workstreams.length.toString(), "operating queues", Kanban],
          ["Related areas", "Shared", "workflow context", DatabaseZap],
        ].map(([label, value, context, Icon]) => {
          const CardIcon = Icon as React.ComponentType<{ className?: string }>;
          return (
            <article key={label as string} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label as string}</p>
                <CardIcon className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <strong className="mt-3 block text-2xl font-semibold">{value as string}</strong>
              <span className="mt-2 block text-sm text-[var(--ink-muted)]">{context as string}</span>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <h3 className="font-semibold">Workspace objects</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {module.primaryRecords.map((record) => (
              <button key={record} type="button" onClick={() => { setActiveView("list"); setQuery(record); }} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]">
                <strong className="block text-sm">{record}</strong>
                <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">List, form, report, calendar and workflow-ready object surface.</span>
              </button>
            ))}
          </div>
        </article>
        <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <h3 className="font-semibold">Next actions</h3>
          <div className="mt-4 space-y-2">
            {module.workstreams.map((item) => (
              <button key={item.title} type="button" onClick={() => { setActiveView("list"); setQuery(item.title); stage(`${item.title} selected`); }} className="flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--accent)]">
                <span>{item.next}</span>
                <ChevronRight className="h-4 w-4 text-[var(--ink-muted)]" />
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );

  const renderList = () => (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full border-collapse text-left text-sm">
        <thead className="border-b border-[var(--line)] bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Record</th>
            <th className="px-3 py-3 font-semibold">Type</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Priority</th>
            <th className="px-3 py-3 font-semibold">Owner</th>
            <th className="px-3 py-3 font-semibold">Related areas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)] bg-white">
          {filteredRecords.map((record) => (
            <tr key={record.id} onClick={() => { setSelectedId(record.id); setDetailOpen(true); }} className="cursor-pointer transition hover:bg-[var(--surface)]">
              <td className="px-4 py-3">
                <strong className="block text-sm">{record.title}</strong>
                <span className="mt-1 block text-xs text-[var(--ink-muted)]">{record.scope}</span>
              </td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{record.type}</td>
              <td className="px-3 py-3 text-xs font-semibold">{record.status}</td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{record.priority}</td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{record.owner}</td>
              <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{record.linkedCore.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBoard = () => (
    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
      {statusOrder.map((status) => (
        <section key={status} className="min-h-[240px] rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{status}</h3>
            <span className="rounded-[7px] border border-[var(--line)] px-2 py-0.5 text-xs font-semibold">{filteredRecords.filter((record) => record.status === status).length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {filteredRecords.filter((record) => record.status === status).map((record) => (
              <button key={record.id} type="button" onClick={() => { setSelectedId(record.id); setDetailOpen(true); }} className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]">
                <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{record.type}</span>
                <strong className="mt-1 block text-sm">{record.title}</strong>
                <span className="mt-2 block text-xs text-[var(--ink-muted)]">{record.owner}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  const renderReports = () => (
    <div className="grid gap-4 p-4 lg:grid-cols-3">
      {["List view", "Form view", "Report builder", "Calendar view", "Timeline view", "Workflow review"].map((surface) => (
        <button key={surface} type="button" onClick={() => { setActiveView(surface.includes("Report") ? "reports" : surface.includes("Calendar") || surface.includes("Timeline") ? "board" : "list"); stage(`${surface} selected`); }} className="rounded-[8px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)]">
          <FileText className="h-5 w-5 text-[var(--accent)]" />
          <strong className="mt-4 block text-base">{surface}</strong>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Role-scoped surface for records, forms, reporting and review work.</p>
        </button>
      ))}
    </div>
  );

  const renderActiveView = () => {
    if (activeView === "workspace") return renderWorkspace();
    if (activeView === "board") return renderBoard();
    if (activeView === "reports" || activeView === "settings") return renderReports();
    return renderList();
  };

  if (loadState.state === "loading") {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading {module.label}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-5">
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Native tool workspace</p>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">{module.label}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">{module.purpose}</p>
          </div>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {loadState.state === "error" ? <p className="mt-4 text-sm text-rose-700">{loadState.error}</p> : null}
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto_auto] xl:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspace" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <label className="flex min-w-0 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
            <Plus className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createDraft();
              }}
              placeholder="Describe next action"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <button type="button" onClick={createDraft} disabled={!draftTitle.trim()} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]">
            <Plus className="h-3.5 w-3.5" />
            Stage action
          </button>
          <label className="inline-flex min-w-[170px] items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <span className="text-[var(--ink-muted)]">Display</span>
            <select value={displayModeOptions.some((option) => option.key === activeView) ? activeView : "list"} onChange={(event) => setActiveView(event.target.value)} className="min-w-0 bg-transparent font-semibold outline-none">
              {displayModeOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="font-semibold">{displayModeLabel(activeView)}</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{filteredRecords.length} visible records</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
            <SlidersHorizontal className="h-4 w-4" />
            {entitlement ? `${entitlement.functions.length} role functions` : "Function coverage"}
          </div>
        </div>
        {renderActiveView()}
      </section>

      {detailOpen && selectedRecord ? (
        <div className="fixed inset-0 z-30 bg-black/18 backdrop-blur-[1px]" onClick={() => setDetailOpen(false)}>
          <aside className="crays-scrollbar ml-auto h-full w-full max-w-[460px] overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] shadow-2xl" onClick={(event) => event.stopPropagation()} aria-label={`${module.label} record details`}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-semibold">Properties</h2>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} aria-label="Close properties" className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--line)] bg-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedRecord.type}</p>
                <input value={selectedRecord.title} onChange={(event) => updateSelected({ title: event.target.value })} className="mt-2 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-lg font-semibold outline-none" />
                <textarea value={selectedRecord.scope} onChange={(event) => updateSelected({ scope: event.target.value })} rows={3} className="mt-3 w-full resize-none rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none" />
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Status</span>
                    <select value={selectedRecord.status} onChange={(event) => updateSelected({ status: event.target.value as NativeRecord["status"] })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
                      {statusOrder.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">Owner</span>
                    <input value={selectedRecord.owner} onChange={(event) => updateSelected({ owner: event.target.value })} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2" />
                  </label>
                </div>
                <button type="button" onClick={() => stage(`Review edits prepared for ${selectedRecord.title}`)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white">
                  Stage edits
                </button>
              </article>

              <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <h3 className="font-semibold">Session activity</h3>
                <div className="mt-3 space-y-2">
                  {stagedEvents.length ? stagedEvents.map((event) => <div key={event} className="rounded-[8px] bg-[var(--surface)] p-3 text-xs text-[var(--ink-muted)]">{event}</div>) : <p className="text-sm text-[var(--ink-muted)]">No session events.</p>}
                </div>
              </article>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
