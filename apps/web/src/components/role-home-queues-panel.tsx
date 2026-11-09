"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { RoleHomeQueueRow, RoleHomeQueuesReadModel } from "@/db/role-home-queues-read-model-repository";

type RoleQueuePayload = {
  status: "ready" | "not_configured" | "forbidden";
  readModel: RoleHomeQueuesReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: RoleQueuePayload; error: null }
  | { state: "error"; data: null; error: string };

type BucketKey = RoleHomeQueuesReadModel["workBuckets"][number]["key"];

type CommandRoute = {
  moduleLabel: "Project" | "CRM" | "Files" | "ERP" | "Loans" | "Sync";
  route: string;
  confirmation: string;
};

type CommandResult = {
  status: "created" | "idempotent_existing" | "blocked" | "invalid" | "network_error";
  message: string;
  commandId: string | null;
  applyGate: string | null;
};

async function loadRoleQueue(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/role-queues/read-model?role=${encodeURIComponent(role)}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Role queue returned HTTP ${response.status}`);
  return (await response.json()) as RoleQueuePayload;
}

function priorityClass(priority: string) {
  if (priority === "critical") return "border-rose-700/20 bg-rose-50 text-rose-950";
  if (priority === "high") return "border-amber-700/20 bg-amber-50 text-amber-950";
  if (priority === "medium") return "border-sky-700/20 bg-sky-50 text-sky-950";
  return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
}

function bucketClass(isActive: boolean) {
  return isActive
    ? "border-black bg-black text-white"
    : "border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]";
}

function isBlocked(row: RoleHomeQueueRow) {
  const blocker = row.blocker.toLowerCase();
  return (
    row.priority === "critical" ||
    blocker.includes("blocked") ||
    blocker.includes("not ready") ||
    blocker.includes("missing") ||
    blocker.includes("pending")
  );
}

function needsReview(row: RoleHomeQueueRow) {
  const action = row.nextAction.toLowerCase();
  return row.objectLabel.toLowerCase().includes("gate") || action.includes("review") || row.gateState.toLowerCase().includes("blocked");
}

function waitsOnGate(row: RoleHomeQueueRow) {
  const gate = row.gateState.toLowerCase();
  return gate.includes("gate") || gate.includes("release") || gate.includes("apply");
}

function matchesBucket(row: RoleHomeQueueRow, bucket: BucketKey) {
  if (bucket === "blocked") return isBlocked(row);
  if (bucket === "due_soon") return row.priority === "critical" || row.priority === "high";
  if (bucket === "needs_review") return needsReview(row);
  if (bucket === "waiting_on_gate") return waitsOnGate(row);
  return true;
}

function matchesSearch(row: RoleHomeQueueRow, searchTerm: string) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;

  return [
    row.title,
    row.market,
    row.objectLabel,
    row.state,
    row.workstream,
    row.blocker,
    row.nextAction,
    row.primaryModuleLabel,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function commandRouteForRow(row: RoleHomeQueueRow): CommandRoute {
  if (row.primaryModuleLabel === "CRM") {
    return { moduleLabel: "CRM", route: "/api/crays/core-command/crm-activity", confirmation: "stage-crm-activity-command" };
  }

  if (row.primaryModuleLabel === "Files") {
    return { moduleLabel: "Files", route: "/api/crays/core-command/files-package", confirmation: "stage-files-package-command" };
  }

  if (row.primaryModuleLabel === "ERP") {
    return { moduleLabel: "ERP", route: "/api/crays/core-command/erp-finance", confirmation: "stage-erp-finance-command" };
  }

  if (row.primaryModuleLabel === "Loans") {
    return { moduleLabel: "Loans", route: "/api/crays/core-command/loans-checklist", confirmation: "stage-loans-checklist-command" };
  }

  if (row.primaryModuleLabel === "Analytics") {
    return { moduleLabel: "Sync", route: "/api/crays/core-command/sync-preview", confirmation: "stage-sync-preview-command" };
  }

  return { moduleLabel: "Project", route: "/api/crays/core-command/project-work-item", confirmation: "stage-project-work-item-command" };
}

function commandBodyForRow(row: RoleHomeQueueRow, role: string, route: CommandRoute) {
  const base = {
    idempotencyKey: `role-workbench:${row.preparedOfferId}:${row.ownerRole}:${row.nextAction}`.toLowerCase().replaceAll(" ", "-"),
    actorRole: role,
    preparedOfferId: row.preparedOfferId,
    dealId: row.dealId,
    propertyCaseId: row.propertyCaseId,
  };
  const notes = `Role workbench drafted this command for ${row.title}. Target apply remains blocked until exact approval, scope and preflight are present.`;

  if (route.moduleLabel === "CRM") {
    return {
      ...base,
      commandType: "task",
      action: "create_task",
      subject: row.nextAction,
      body: notes,
      status: "drafted",
      priority: "normal",
      assigneeRole: role,
    };
  }

  if (route.moduleLabel === "Files") {
    return {
      ...base,
      commandType: "visibility_review",
      action: "request_visibility_review",
      title: row.nextAction,
      notes,
      status: "drafted",
      sectionKey: row.workstream.toLowerCase().replaceAll(" ", "-"),
      visibilityScope: "internal_review",
    };
  }

  if (route.moduleLabel === "ERP") {
    return {
      ...base,
      commandType: "finance_summary",
      action: "request_finance_review",
      title: row.nextAction,
      notes,
      status: "drafted",
      currency: "EUR",
    };
  }

  if (route.moduleLabel === "Loans") {
    return {
      ...base,
      commandType: "bank_package_checklist",
      action: "request_bank_review",
      title: row.nextAction,
      notes,
      status: "drafted",
      checklistItemKey: row.workstream.toLowerCase().replaceAll(" ", "-"),
    };
  }

  if (route.moduleLabel === "Sync") {
    return {
      ...base,
      commandType: "apply_gate_request",
      action: "request_apply_gate",
      title: row.nextAction,
      notes,
      status: "drafted",
      sourceModule: "crays-core",
      targetModule: row.primaryModuleLabel.toLowerCase(),
      entityTypeKey: "prepared-offer",
      rollbackPlan: "Target apply remains blocked until an exact execution gate is approved.",
    };
  }

  return {
    ...base,
    action: "update",
    title: row.nextAction,
    status: "drafted",
    priority: row.priority === "critical" ? "urgent" : "high",
    ownerRole: role,
    notes,
  };
}

async function stageNextAction(row: RoleHomeQueueRow, role: string): Promise<CommandResult> {
  const route = commandRouteForRow(row);
  try {
    const response = await fetch(route.route, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crays-dev-confirm": route.confirmation,
      },
      body: JSON.stringify(commandBodyForRow(row, role, route)),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      status?: string;
      reason?: string;
      error?: string;
      result?: {
        commandId?: string;
        commandStatus?: string;
        targetApplyStatus?: string;
        applyGate?: string;
      };
    };

    const status = response.ok
      ? payload.status === "idempotent_existing"
        ? "idempotent_existing"
        : "created"
      : payload.status === "invalid"
        ? "invalid"
        : "blocked";
    const commandStatus = payload.result?.commandStatus ? `, ${payload.result.commandStatus}` : "";
    const targetApplyStatus = payload.result?.targetApplyStatus ? `, apply ${payload.result.targetApplyStatus}` : "";
    return {
      status,
      message: response.ok ? `${route.moduleLabel} command draft stored${commandStatus}${targetApplyStatus}.` : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      commandId: payload.result?.commandId ?? null,
      applyGate: payload.result?.applyGate ?? null,
    };
  } catch (error) {
    return {
      status: "network_error",
      message: error instanceof Error ? error.message : "Command draft could not reach the local server.",
      commandId: null,
      applyGate: null,
    };
  }
}

export function RoleHomeQueuesPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeBucket, setActiveBucket] = useState<BucketKey>("my_work");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stagingId, setStagingId] = useState<string | null>(null);
  const [commandResults, setCommandResults] = useState<Record<string, CommandResult>>({});
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadRoleQueue(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Role queue failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.state === "ready" ? loadState.data.readModel : null;
  const filteredRows = useMemo(() => {
    if (!readModel) return [];
    return readModel.rows.filter((row) => matchesBucket(row, activeBucket) && matchesSearch(row, searchTerm));
  }, [activeBucket, readModel, searchTerm]);

  const selectedRow = filteredRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? readModel?.rows[0] ?? null;
  const buckets = readModel?.workBuckets ?? [];
  const selectedResult = selectedRow ? commandResults[selectedRow.id] : null;

  async function handleStage(row: RoleHomeQueueRow) {
    setStagingId(row.id);
    const result = await stageNextAction(row, role);
    setCommandResults((current) => ({ ...current, [row.id]: result }));
    setStagingId(null);
  }

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading role workbench
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Role workbench unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  if (!readModel) return null;

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Role operating workbench</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">{readModel.roleQueue.label}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {readModel.roleQueue.ownerRole} - {readModel.roleQueue.primaryAction}
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
          Refresh
        </button>
      </div>

      {selectedRow ? (
        <div className="grid gap-4 border-b border-[var(--line)] bg-white px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${priorityClass(selectedRow.priority)}`}>
                {selectedRow.priority}
              </span>
              <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Today priority</span>
            </div>
            <h3 className="mt-2 truncate text-lg font-semibold">{selectedRow.title}</h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {selectedRow.nextAction} - {selectedRow.blocker}
            </p>
            {selectedResult ? (
              <p className="mt-2 text-xs font-semibold text-[var(--accent)]">
                {selectedResult.commandId ? "Stored command draft - " : ""}
                {selectedResult.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleStage(selectedRow)}
              disabled={stagingId === selectedRow.id}
              aria-label={`Stage next action for ${selectedRow.title}`}
              className="inline-flex items-center gap-2 rounded-[8px] border border-black bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {stagingId === selectedRow.id ? "Staging..." : "Stage next action"}
            </button>
            <a
              href={selectedRow.caseHref}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
            >
              Open case
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-5">
        {buckets.map((bucket) => (
          <button
            key={bucket.key}
            type="button"
            onClick={() => setActiveBucket(bucket.key)}
            className={`min-w-0 rounded-[8px] border px-3 py-3 text-left transition ${bucketClass(activeBucket === bucket.key)}`}
            aria-pressed={activeBucket === bucket.key}
            title={bucket.description}
          >
            <span className="block truncate text-xs font-semibold uppercase opacity-70">{bucket.label}</span>
            <strong className="mt-2 block text-2xl">{bucket.count}</strong>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Search work items</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search work items"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)]">
          <ListChecks className="h-4 w-4 text-[var(--accent)]" />
          {filteredRows.length} visible of {readModel.rows.length}
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-[1060px] w-full border-collapse text-sm">
            <thead className="bg-white text-left text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-5 py-3 font-semibold">Work item</th>
                <th className="px-3 py-3 font-semibold">State</th>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-3 py-3 font-semibold">Blocker</th>
                <th className="px-3 py-3 font-semibold">Next action</th>
                <th className="px-5 py-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredRows.map((row) => {
                const selected = selectedRow?.id === row.id;
                return (
                  <tr key={row.id} className={`align-top transition ${selected ? "bg-emerald-50/45" : "hover:bg-white"}`}>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => setSelectedId(row.id)} className="block max-w-[280px] text-left">
                        <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{row.objectLabel}</span>
                        <strong className="mt-1 block">{row.title}</strong>
                        <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                          {row.market} - {row.workstream}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-4 text-[var(--ink-muted)]">
                      <p>{row.state}</p>
                      <p className="mt-2 text-xs">{row.changedLabel}</p>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${priorityClass(row.priority)}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-4 text-[var(--ink-muted)]">{row.blocker}</td>
                    <td className="max-w-[220px] px-3 py-4 font-semibold">{row.nextAction}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <a
                          href={row.caseHref}
                          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                        >
                          Case
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={row.primaryModuleHref}
                          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
                        >
                          Open {row.primaryModuleLabel}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredRows.length === 0 ? (
            <div className="border-t border-[var(--line)] px-5 py-8 text-sm text-[var(--ink-muted)]">
              No work items match this view.
              <button type="button" onClick={() => setSearchTerm("")} className="ml-2 font-semibold text-[var(--foreground)] underline underline-offset-4">
                Clear search
              </button>
            </div>
          ) : null}
        </div>

        <aside className="border-t border-[var(--line)] bg-white px-5 py-4 xl:border-l xl:border-t-0">
          {selectedRow ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  {isBlocked(selectedRow) ? <AlertTriangle className="h-4 w-4 text-[var(--rose)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected work item</p>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{selectedRow.title}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedRow.market}</p>
              </div>

              <dl className="grid gap-3 text-sm">
                {[
                  ["Owner", selectedRow.ownerRole],
                  ["Workstream", selectedRow.workstream],
                  ["State", selectedRow.state],
                  ["Gate state", selectedRow.gateState],
                  ["Command model", selectedRow.commandModel],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-[var(--line)] pb-2">
                    <dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</dt>
                    <dd className="min-w-0 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                </div>
                <p className="mt-2 text-sm font-semibold">{selectedRow.nextAction}</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedRow.blocker}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Evidence", selectedRow.evidenceSummary.evidencePackages],
                  ["Documents", `${selectedRow.evidenceSummary.approvedDocuments}/${selectedRow.evidenceSummary.documents}`],
                  ["Blocked gates", selectedRow.evidenceSummary.blockedGates],
                  ["Module signals", selectedRow.evidenceSummary.moduleSignals],
                ].map(([label, value]) => (
                  <div key={label} className="border-t border-[var(--line)] py-2">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                    <strong className="mt-1 block">{value}</strong>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStage(selectedRow)}
                  disabled={stagingId === selectedRow.id}
                  aria-label={`Stage selected action for ${selectedRow.title}`}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-black bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {stagingId === selectedRow.id ? "Staging..." : "Stage selected action"}
                </button>
                <a
                  href={selectedRow.caseHref}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                >
                  Open case
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href={selectedRow.primaryModuleHref}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                >
                  Open {selectedRow.primaryModuleLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Closed gates</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                  Apply, release, upload, external send, finance, bank, payment, deploy and VPS-changing actions remain closed.
                </p>
                {selectedResult ? (
                  <p className="mt-2 border-t border-[var(--line)] pt-2 text-xs font-semibold text-[var(--foreground)]">
                    {selectedResult.commandId ? "Stored command draft" : selectedResult.status}: {selectedResult.applyGate ? "Apply remains closed" : selectedResult.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Select a work item to inspect the case, gate and action context.</p>
          )}
        </aside>
      </div>
    </article>
  );
}
