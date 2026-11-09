"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type QueueItem = {
  commandId: string;
  commandKey: string;
  moduleKey: string;
  moduleLabel: string;
  departmentOwner: string;
  owner: string;
  label: string;
  actorRole: string;
  targetObject: string;
  commandStatus: string;
  validationStatus: string;
  dryRunStatus: string;
  targetApplyStatus: string;
  applyGate: string;
  applyGateLabel: string;
  applyGateStatus: string;
  ageMinutes: number;
  queueState: string;
  nextReviewAction: string;
  preflight: {
    validation: string;
    dryRun: string;
    apply: string;
    summary: string;
  };
  rollback: {
    policy: string;
    availableBeforeApply: boolean;
  };
  history: {
    eventCount: number;
    latestEvent: string;
    previewCount: number;
    latestPreview: string;
    gateReviewCount: number;
    latestGateReview: string;
  };
  gateReview: {
    status: string;
    message: string;
  };
};

type GateReviewReadModel = {
  access: { allowed: boolean };
  summary: {
    total: number;
    returned: number;
    departments: number;
    modules: number;
    needsReview: number;
    applyBlocked: number;
    oldestAgeMinutes: number;
  };
  queue: QueueItem[];
  departmentBreakdown: Array<{ department: string; count: number }>;
  moduleBreakdown: Array<{ module: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
};

type Payload = { status: "ready" | "forbidden" | "not_configured"; readModel: GateReviewReadModel };

function words(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function moduleHref(moduleKey: string, role: string) {
  return `/${moduleKey}?role=${role}`;
}

async function loadGateReview(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/management/gate-review/read-model?role=${role}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Command queue is not available for this role.");
  return (await response.json()) as Payload;
}

export function ManagementGateReviewPanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role")).key;
  const [refreshKey, setRefreshKey] = useState(0);
  const [department, setDepartment] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; data: Payload | null; error: string | null }>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    loadGateReview(role, controller.signal)
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Gate review failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  if (state.status === "error") return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">{state.error}</section>;
  const readModel = state.data?.readModel;
  if (!readModel?.access.allowed) return null;

  const filteredQueue = readModel.queue.filter((item) => {
    const matchesDepartment = department === "all" || item.departmentOwner === department;
    const haystack = `${item.label} ${item.targetObject} ${item.commandId} ${item.moduleLabel} ${item.owner}`.toLowerCase();
    return matchesDepartment && haystack.includes(query.toLowerCase());
  });
  const selected = filteredQueue.find((item) => item.commandId === selectedCommandId) ?? filteredQueue[0];

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Management gate review</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Command history and apply queue</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Review persisted command drafts by module, owner, object, preflight, rollback policy and audit history before any apply or release can move.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${state.status === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Queue", readModel.summary.returned],
          ["Modules", readModel.summary.modules],
          ["Departments", readModel.summary.departments],
          ["Needs review", readModel.summary.needsReview],
          ["Apply blocked", readModel.summary.applyBlocked],
          ["Oldest age", `${readModel.summary.oldestAgeMinutes}m`],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Review queue</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input aria-label="Search command queue" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands or objects" className="min-w-[220px] flex-1 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <select aria-label="Filter department" value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
                <option value="all">All departments</option>
                {readModel.departmentBreakdown.map((item) => <option key={item.department} value={item.department}>{item.department}</option>)}
              </select>
            </div>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {filteredQueue.slice(0, 12).map((item) => (
              <button type="button" onClick={() => setSelectedCommandId(item.commandId)} key={item.commandId} className={`grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[minmax(0,1fr)_180px_150px_110px] lg:items-center ${selected?.commandId === item.commandId ? "bg-emerald-50" : "bg-white hover:bg-black/[0.02]"}`}>
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{item.label}</strong>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.moduleLabel} · {item.targetObject}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {item.history.eventCount} audit events · {item.rollback.availableBeforeApply ? "Rollback ready" : "Rollback pending"}
                  </p>
                </div>
                <div className="text-sm">
                  <strong>{item.departmentOwner}</strong>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.owner}</p>
                </div>
                <div className="text-sm">
                  <strong>{item.queueState}</strong>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.nextReviewAction}</p>
                </div>
                <div className="text-xs text-[var(--ink-muted)]">
                  <p>{words(item.targetApplyStatus)} apply</p>
                  <p>{item.ageMinutes}m old</p>
                </div>
              </button>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          {selected ? (
            <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected command</p>
              <h2 className="mt-2 font-semibold">{selected.label}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-[var(--ink-muted)]">Object</dt><dd className="mt-1 font-medium">{selected.targetObject}</dd></div>
                <div><dt className="text-[var(--ink-muted)]">Owner</dt><dd className="mt-1 font-medium">{selected.owner}</dd></div>
                <div><dt className="text-[var(--ink-muted)]">Preflight</dt><dd className="mt-1 font-medium">{selected.preflight.summary}</dd></div>
                <div><dt className="text-[var(--ink-muted)]">Apply gate</dt><dd className="mt-1 font-medium">{selected.applyGateLabel}</dd></div>
                <div><dt className="text-[var(--ink-muted)]">Gate review</dt><dd className="mt-1 font-medium">{selected.gateReview.message}</dd></div>
                <div><dt className="text-[var(--ink-muted)]">Rollback</dt><dd className="mt-1 font-medium">{selected.rollback.policy}</dd></div>
                <div>
                  <dt className="text-[var(--ink-muted)]">Audit history</dt>
                  <dd className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                    {selected.history.eventCount} events · latest {selected.history.latestEvent}; {selected.history.previewCount} previews · {selected.history.latestPreview}; {selected.history.gateReviewCount} gate reviews · {selected.history.latestGateReview}
                  </dd>
                </div>
              </dl>
              <Link href={moduleHref(selected.moduleKey, role)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-3 py-2 text-sm font-semibold text-white">
                Open related module
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Review is available here. Applying this command remains closed until the approved operating workflow opens that exact action.</p>
            </article>
          ) : null}

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Module load</h2>
            <div className="mt-4 space-y-2">
              {readModel.moduleBreakdown.map((item) => (
                <div key={item.module} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{item.module}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Queue state</h2>
            <div className="mt-4 space-y-2">
              {readModel.statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{item.status}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Department load</h2>
            <div className="mt-4 space-y-2">
              {readModel.departmentBreakdown.map((item) => (
                <div key={item.department} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{item.department}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Review controls</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Apply, release, source writes and external sending stay closed until a named workflow opens the exact action.
            </p>
          </article>
        </aside>
      </section>
    </section>
  );
}
