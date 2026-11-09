"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, GitBranch, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type CardStatus = "ready" | "attention" | "blocked";
type OpeningRecord = {
  id: string; family: string; label: string; craysEntityType: string; craysEntityId: string; status: string; priority: string; owner: string; audience: string;
  value: string | number | boolean | null; unit: string | null; context: string; currentState: string; nextAction: string; dueDate: string | null;
  milestoneId: string | null; predecessorId: string | null; successorId: string | null; linkedObjectId: string | null; identifier: string | null; href: string; fields: Record<string, unknown>;
};
type Option = { key: string; label: string; rows: number };
type Payload = {
  status: "ready" | "release_blocked" | "forbidden";
  readModel: {
    access: { allowed: boolean; level: string; reason: string; canStageWorkItem: boolean; canViewFinanceImpact: boolean; canViewInternalReview: boolean };
    projectContext: { projectId: string; decisionId: string; dealId: string; propertyCaseId: string; studioId: string; studioName: string; siteName: string; address: string; partnerName: string; partnerCompany: string; targetOpeningDate: string; journey: string };
    summary: { records: number; sourceRecords: number; linkedPartnerDecisionRecords: number; linkedFilesRecords: number; linkedForecastRecords: number; readinessScore: number; blockers: number; overdue: number; criticalPathItems: number; scheduleContingencyDays: number | null; targetOpeningDate: string; freshnessMinutes: number | null };
    cards: Array<{ key: string; label: string; value: string; context: string; status: CardStatus; filterFamily: string }>;
    records: OpeningRecord[];
    controls: { families: Option[]; statuses: Option[]; priorities: Option[]; owners: Option[]; milestones: Option[] };
    actions: { stageWorkItemAllowed: boolean; commandRoute: "/api/crays/core-command/project-work-item"; confirmationHeader: "stage-project-work-item-command"; applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY" };
  };
};
type LoadState = { state: "loading"; data: null; error: null } | { state: "ready"; data: Payload; error: null } | { state: "error"; data: null; error: string };
type CommandState = { status: string; commandId: string | null; applyGate: string | null; message: string };

const allowedRoles = new Set(["admin", "crays-management", "deal-manager", "reviewer", "expansion-manager", "finance", "franchise-partner", "studio-manager"]);
const tone: Record<CardStatus, string> = { ready: "border-emerald-200 bg-emerald-50 text-emerald-950", attention: "border-amber-200 bg-amber-50 text-amber-950", blocked: "border-rose-200 bg-rose-50 text-rose-950" };
const words = (value: string) => value.replaceAll("_", " ").replaceAll("-", " ");
const label = (value: string) => words(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
function valueLabel(value: OpeningRecord["value"], unit: string | null) { if (value === null) return "Not available"; if (typeof value === "boolean") return value ? "Yes" : "No"; if (typeof value === "string") return words(value); if (unit === "EUR") return `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`; if (unit === "score") return `${Math.round(value)}/100`; if (unit === "percent") return `${value}%`; if (unit === "days") return `${value} days`; return value.toLocaleString("en-US"); }
function freshness(minutes: number | null) { if (minutes === null) return "Freshness not recorded"; if (minutes < 60) return `${minutes} min freshness`; return `${Math.round(minutes / 60)} h freshness`; }
function routeFamily(view: string | null) { if (view === "board") return "project-summary"; if (view === "timeline") return "milestone"; if (view === "cycles") return "dependency"; if (view === "modules") return "forecast-impact"; if (view === "pages") return "evidence-link"; if (view === "settings") return "opening-review-actions"; if (view === "work-items" || view === "views") return "work-item"; return "all"; }

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/project/opening-project/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = await response.json() as Payload;
  if (!response.ok && response.status !== 403 && response.status !== 423) throw new Error(`Opening Project returned HTTP ${response.status}`);
  return payload;
}

async function stage(role: string, readModel: Payload["readModel"], record: OpeningRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `opening-project:${record.id}:${role}:block56-v1`, actorRole: role,
      projectId: readModel.projectContext.projectId, workItemId: record.identifier ?? record.id, dealId: readModel.projectContext.dealId,
      propertyCaseId: readModel.projectContext.propertyCaseId, action: "update", title: `Review ${record.label}`, status: record.status,
      priority: record.priority, dueDate: record.dueDate, ownerRole: record.owner,
      notes: `${record.nextAction} This stores a guarded Opening Project command draft only; Project apply, source writes, uploads, external sending and stakeholder release remain closed.`,
    }),
  });
  const payload = await response.json() as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return { status: payload.status ?? "created", commandId: payload.result?.commandId ?? null, applyGate: payload.result?.applyGate ?? null, message: payload.result?.targetApplyStatus === "blocked" ? "Opening Project review stored in Command History. Project apply remains closed." : "Opening Project review stored in Command History." };
}

export function OpeningProjectWorkflowPanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role")).key;
  const scopedFamily = routeFamily(searchParams.get("view"));
  return <OpeningProjectContent key={`${role}:${scopedFamily}`} role={role} initialFamily={scopedFamily} />;
}

function OpeningProjectContent({ role, initialFamily }: { role: string; initialFamily: string }) {
  const clientAllowed = allowedRoles.has(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [family, setFamily] = useState(initialFamily);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [owner, setOwner] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState | null>(null);

  useEffect(() => {
    if (!clientAllowed) return;
    const controller = new AbortController();
    load(role, controller.signal).then((data) => setLoadState({ state: "ready", data, error: null })).catch((error: unknown) => { if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Opening Project data unavailable." }); });
    return () => controller.abort();
  }, [clientAllowed, refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const records = useMemo(() => (readModel?.records ?? []).filter((record) => {
    const term = search.trim().toLowerCase();
    const haystack = [record.label, record.identifier, record.family, record.status, record.priority, record.owner, record.context, record.currentState, record.nextAction, record.milestoneId].join(" ").toLowerCase();
    return (family === "all" || record.family === family) && (status === "all" || record.status === status) && (priority === "all" || record.priority === priority) && (owner === "all" || record.owner === owner) && (!term || haystack.includes(term));
  }), [family, owner, priority, readModel?.records, search, status]);
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (!clientAllowed) return <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950"><p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Opening Project</p><h2 className="mt-2 text-2xl font-semibold">Opening Project is release-gated</h2><p className="mt-2 text-sm">This role has no released Opening Project scope.</p></section>;
  if (loadState.state === "loading") return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Opening Project workflow</section>;
  if (loadState.state === "error" || !readModel) return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950"><h3 className="font-semibold">Opening Project unavailable</h3><p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p></section>;
  if (!readModel.access.allowed) return <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950"><p className="text-xs font-semibold uppercase">Opening Project</p><h2 className="mt-2 text-2xl font-semibold">Opening Project is release-gated</h2><p className="mt-2 text-sm">{readModel.access.reason}</p></section>;

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><CalendarDays className="h-4 w-4 text-emerald-700" /> Opening Project</p>
          <h2 className="mt-2 text-2xl font-semibold">{readModel.projectContext.studioName} opening plan</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">Milestones, owned work, dependencies, evidence and schedule impact for the {readModel.projectContext.targetOpeningDate} opening.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.records} scoped records</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.readinessScore}% readiness</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.blockers} blockers</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.scheduleContingencyDays ?? 0} days contingency</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{freshness(readModel.summary.freshnessMinutes)}</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((value) => value + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {readModel.cards.map((card) => <button key={card.key} type="button" onClick={() => { setFamily(card.filterFamily); setSelectedId(null); setCommand(null); }} className={`rounded-[8px] border p-4 text-left ${tone[card.status]} ${family === card.filterFamily ? "ring-2 ring-black/20" : ""}`}><div className="flex items-center justify-between gap-3"><strong>{card.label}</strong><span className="text-xl">{card.value}</span></div><p className="mt-2 text-xs leading-5">{card.context}</p></button>)}
      </div>

      <div className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-white p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,auto))]">
        <label className="flex items-center gap-2 rounded-[8px] border px-3"><Search className="h-4 w-4 text-[var(--ink-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, owners or dependencies" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" /></label>
        <select value={family} onChange={(event) => setFamily(event.target.value)} className="rounded-[8px] border bg-white px-3 py-2 text-sm"><option value="all">All workflow records</option>{readModel.controls.families.map((option) => <option key={option.key} value={option.key}>{option.label} ({option.rows})</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-[8px] border bg-white px-3 py-2 text-sm"><option value="all">All statuses</option>{readModel.controls.statuses.map((option) => <option key={option.key} value={option.key}>{option.label} ({option.rows})</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-[8px] border bg-white px-3 py-2 text-sm"><option value="all">All priorities</option>{readModel.controls.priorities.map((option) => <option key={option.key} value={option.key}>{option.label} ({option.rows})</option>)}</select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="rounded-[8px] border bg-white px-3 py-2 text-sm"><option value="all">All owners</option>{readModel.controls.owners.map((option) => <option key={option.key} value={option.key}>{option.label} ({option.rows})</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-x-auto rounded-[8px] border border-[var(--line)] bg-white">
          <table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]"><tr><th className="px-4 py-3">Work</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommand(null); }} className={`cursor-pointer border-t ${selected?.id === record.id ? "bg-emerald-50" : "bg-white"}`}><td className="px-4 py-3"><strong>{record.identifier ? `${record.identifier} · ` : ""}{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{label(record.family)}{record.milestoneId ? ` · ${label(record.milestoneId)}` : ""}</p></td><td className="px-4 py-3">{record.owner}</td><td className="px-4 py-3">{record.dueDate ?? "Not set"}</td><td className="px-4 py-3">{label(record.status)}</td><td className="px-4 py-3">{label(record.priority)}</td></tr>)}</tbody></table>
          {!records.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No Opening Project records match these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border border-[var(--line)] bg-white p-5">
          {selected ? <>
            <div><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected work</p><h3 className="mt-2 text-lg font-semibold">{selected.label}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.context}</p></div>
            <dl className="grid grid-cols-2 gap-3 text-sm">{[["Family", label(selected.family)], ["Owner", selected.owner], ["Status", label(selected.status)], ["Priority", label(selected.priority)], ["Due date", selected.dueDate ?? "Not set"], ["Value", valueLabel(selected.value, selected.unit)]].map(([term, value]) => <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
            {selected.predecessorId || selected.successorId ? <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><GitBranch className="h-4 w-4" /> Dependency</p><p className="mt-2">{selected.predecessorId ? `From ${label(selected.predecessorId)}` : ""}{selected.predecessorId && selected.successorId ? " → " : ""}{selected.successorId ? `To ${label(selected.successorId)}` : ""}</p></div> : null}
            <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm"><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Current state</p><p className="mt-2 leading-6">{selected.currentState}</p><p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">Next safe action</p><p className="mt-2 leading-6">{selected.nextAction}</p></div>
            <a href={selected.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected workflow <ArrowRight className="h-4 w-4" /></a>
            {readModel.actions.stageWorkItemAllowed ? <button type="button" onClick={() => { setCommand({ status: "staging", commandId: null, applyGate: readModel.actions.applyGate, message: "Staging guarded Opening Project command" }); stage(role, readModel, selected).then(setCommand).catch((error: unknown) => setCommand({ status: "error", commandId: null, applyGate: readModel.actions.applyGate, message: error instanceof Error ? error.message : "Command draft failed." })); }} className="w-full rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Stage opening work review</button> : null}
            {command ? <div className={`rounded-[8px] border p-3 text-sm ${command.status === "error" ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}><strong>{command.message}</strong>{command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}{command.applyGate ? <p className="mt-1 text-xs">{command.applyGate} remains closed.</p> : null}</div> : null}
          </> : <p className="text-sm text-[var(--ink-muted)]">Select an Opening Project record.</p>}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Source lineage</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{readModel.summary.linkedPartnerDecisionRecords} partner decision · {readModel.summary.linkedFilesRecords} Files · {readModel.summary.linkedForecastRecords} Forecast records linked.</p></div>
        <div className="rounded-[8px] border bg-white p-4"><p className="text-sm font-semibold">Project identity</p><p className="mt-2 break-all text-xs leading-5 text-[var(--ink-muted)]">{readModel.projectContext.projectId}<br />{readModel.projectContext.dealId}</p></div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="h-4 w-4" /> Closed execution boundary</p><p className="mt-2 text-xs leading-5">Project apply, uploads, private preview, external sending, stakeholder release, finance posting and payment initiation remain closed.</p></div>
      </div>
    </section>
  );
}
