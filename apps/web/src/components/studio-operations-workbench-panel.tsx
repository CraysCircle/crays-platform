"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, Dumbbell, RefreshCw, Search, UsersRound, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudioOperationsAction, StudioOperationsWorkbenchReadModel } from "@/db/studio-operations-workbench-read-model-repository";
import { roleByKey, type RoleKey } from "@/lib/roles";

type Payload = {
  status: StudioOperationsWorkbenchReadModel["queryStatus"] | "ready" | "forbidden";
  readModel: StudioOperationsWorkbenchReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type StageFeedback = {
  status: string;
  commandId: string | null;
  message: string;
};

type FilterKey = "all" | "blocked" | "attention" | "ready";
type MetricCard = [label: string, value: string, Icon: LucideIcon];

const studioOperationsRoles = new Set(["studio-manager", "franchise-partner", "finance", "deal-manager", "hr", "reviewer", "crays-management", "admin", "vendor"]);

function words(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2") : "Pending";
}

function statusClass(status: StudioOperationsAction["status"]) {
  if (status === "ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "attention") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-rose-700/20 bg-rose-50 text-rose-950";
}

function priorityClass(priority: StudioOperationsAction["priority"]) {
  if (priority === "critical") return "text-rose-700";
  if (priority === "high") return "text-amber-700";
  return "text-[var(--ink-muted)]";
}

function compactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Stored";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function actionEntityPayload(action: StudioOperationsAction | null) {
  if (!action?.entityId) return {};
  if (action.commandType === "member_recovery") return { memberId: action.entityId };
  if (action.commandType === "booking_follow_up") return { bookingId: action.entityId };
  if (action.commandType === "trainer_capacity_review") return { trainerId: action.entityId };
  if (action.commandType === "support_escalation") return { supportRequestId: action.entityId };
  if (action.commandType === "training_plan_update") return { trainingPlanId: action.entityId };
  return { studioId: action.entityId };
}

function selectedOrFirst(actions: StudioOperationsAction[], selectedKey: string | null) {
  return actions.find((action) => action.key === selectedKey) ?? actions[0] ?? null;
}

async function loadStudioOperations(role: RoleKey, signal: AbortSignal) {
  const response = await fetch(`/api/crays/operations/studio-workbench/read-model?role=${encodeURIComponent(role)}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Studio operations returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function StudioOperationsWorkbenchPanel({ role: roleOverride }: { role?: string } = {}) {
  const searchParams = useSearchParams();
  const role = roleByKey(roleOverride ?? searchParams.get("role")).key;
  const clientRoleAllowed = studioOperationsRoles.has(role);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [feedback, setFeedback] = useState<StageFeedback | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadStudioOperations(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Studio operations failed" });
    });
    return () => controller.abort();
  }, [clientRoleAllowed, role, refreshKey]);

  const readModel = loadState.state === "ready" ? loadState.data.readModel : null;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleActions = useMemo(() => {
    const actions = readModel?.actions ?? [];
    return actions.filter((action) => {
      const matchesFilter = filter === "all" || action.status === filter;
      const matchesSearch =
        !normalizedSearch ||
        [action.label, action.ownerRole, action.current, action.nextAction, action.commandType].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesFilter && matchesSearch;
    });
  }, [filter, normalizedSearch, readModel?.actions]);

  async function stageAction(action: StudioOperationsAction | null) {
    if (!action || !readModel?.studio || !readModel.access.canStageOperationalDraft) return;
    setStaging(true);
    try {
      const response = await fetch(`/api/crays/operations/studio-workbench/command-draft?role=${encodeURIComponent(role)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-studio-operations-command",
        },
        body: JSON.stringify({
          idempotencyKey: `studio-operations:${readModel.studio.studioId}:${action.key}:${role}:block18-v1`,
          actorRole: role,
          studioId: readModel.studio.studioId,
          commandType: action.commandType,
          action: "stage_action",
          title: action.nextAction,
          notes: `${action.label}. Current state: ${action.current}. Payment execution, external messages and target apply wait for approval.`,
          priority: action.priority,
          ownerRole: action.ownerRole,
          status: "drafted",
          ...actionEntityPayload(action),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        status?: string;
        result?: { commandId?: string; targetApplyStatus?: string };
        error?: string;
      };
      setFeedback({
        status: payload.status ?? `HTTP ${response.status}`,
        commandId: payload.result?.commandId ?? null,
        message: payload.error ?? `${action.label} draft stored; execution remains ${payload.result?.targetApplyStatus ?? "blocked"}.`,
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({
        status: "error",
        commandId: null,
        message: error instanceof Error ? error.message : "Studio action draft failed.",
      });
    } finally {
      setStaging(false);
    }
  }

  if (!clientRoleAllowed) {
    return (
      <article className="rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase">
          <Dumbbell className="h-4 w-4" />
          Studio cockpit
        </div>
        <h2 className="mt-3 text-xl font-semibold">Studio operations are not available for this role</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6">
          Internal studio, finance and review roles can inspect operational source records. External and public roles receive only released portal surfaces.
        </p>
      </article>
    );
  }

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading studio operations
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Studio operations unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  const model = loadState.data.readModel;
  const selectedAction = selectedOrFirst(visibleActions.length ? visibleActions : model.actions, selectedKey ?? model.nextAction.actionKey);

  if (!model.studio) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(model.nextAction.status)}`}>{words(model.queryStatus)}</span>
        <h2 className="mt-3 text-xl font-semibold">{model.nextAction.label}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">{model.nextAction.copy}</p>
      </article>
    );
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              <Dumbbell className="h-3.5 w-3.5" />
              Studio cockpit
            </span>
            <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(model.nextAction.status)}`}>
              {model.nextAction.status}
            </span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              {words(model.access.level)}
            </span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              Member App bridge
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold">Studio operations workbench</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            {model.studio.label} - members, bookings, trainer capacity, support and recovery work from the Member App bridge.
          </p>
        </div>
        <aside className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next role action</p>
          <strong className="mt-2 block text-base">{model.nextAction.label}</strong>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{model.nextAction.copy}</p>
          {model.access.canStageOperationalDraft ? (
            <button
              type="button"
              onClick={() => stageAction(selectedAction)}
              disabled={!selectedAction || staging}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
            >
              {staging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Stage action draft
            </button>
          ) : (
            <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center text-sm font-semibold text-[var(--ink-muted)]">
              Review only
            </div>
          )}
        </aside>
      </div>

      <div className="grid gap-3 border-b border-[var(--line)] px-5 py-4 md:grid-cols-2 xl:grid-cols-6">
        {([
          ["Active members", String(model.summary.membersActive), UsersRound],
          ["Check-ins today", String(model.summary.checkinsToday), CheckCircle2],
          ["Classes today", String(model.summary.classesToday), CalendarClock],
          ["Payment exceptions", String(model.summary.paymentExceptions), AlertTriangle],
          ["Support open", String(model.summary.openSupportRequests), Wrench],
          ["Drafts", String(model.summary.commandDrafts), CheckCircle2],
        ] satisfies MetricCard[]).map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
              <Icon className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <strong className="mt-2 block text-lg">{value}</strong>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <span className="sr-only">Search studio actions</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search actions, owners and member work"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "blocked", "attention", "ready"] as FilterKey[]).map((item) => (
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

      <div className="grid min-h-[440px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-white text-xs font-semibold uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Current</th>
                <th className="px-5 py-3">Next</th>
                <th className="px-5 py-3 text-right">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleActions.map((action) => (
                <tr key={action.key} className={selectedAction?.key === action.key ? "bg-white" : ""}>
                  <td className="px-5 py-3">
                    <strong className="block text-sm">{action.label}</strong>
                    <span className={`mt-1 block text-xs font-semibold ${priorityClass(action.priority)}`}>{action.priority}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-[7px] border px-2 py-1 text-xs font-semibold capitalize ${statusClass(action.status)}`}>{action.status}</span>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-muted)]">{action.ownerRole}</td>
                  <td className="max-w-[280px] px-5 py-3 text-[var(--ink-muted)]">{action.current}</td>
                  <td className="max-w-[240px] px-5 py-3">{action.nextAction}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(action.key)}
                      className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleActions.length ? <p className="p-5 text-sm text-[var(--ink-muted)]">No studio action matches the current filter.</p> : null}
        </div>

        <aside className="border-t border-[var(--line)] bg-white p-5 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-semibold">Selected action</h3>
          {selectedAction ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedAction.ownerRole}</p>
                <h4 className="mt-2 text-lg font-semibold">{selectedAction.label}</h4>
                <span className={`mt-2 inline-flex rounded-[7px] border px-2 py-1 text-xs font-semibold capitalize ${statusClass(selectedAction.status)}`}>
                  {selectedAction.status}
                </span>
              </div>
              {[
                ["Current", selectedAction.current],
                ["Next action", selectedAction.nextAction],
                ["Workflow", words(selectedAction.commandType)],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-[var(--line)] pt-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <strong className="mt-1 block text-sm leading-6">{value}</strong>
                </div>
              ))}
              {model.access.canStageOperationalDraft ? (
                <button
                  type="button"
                  onClick={() => stageAction(selectedAction)}
                  disabled={staging}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
                >
                  {staging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Stage selected draft
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">Select an action from the table.</p>
          )}
        </aside>
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] px-5 py-4 xl:grid-cols-3">
        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <h3 className="text-sm font-semibold">Member recovery</h3>
          <div className="mt-3 space-y-2">
            {model.memberExceptions.slice(0, 5).map((member) => (
              <div key={member.memberId} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <strong className="block text-sm">{member.label}</strong>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                  {words(member.membershipStatus)} - payment {words(member.paymentStatus)} - plan {member.trainingPlan}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <h3 className="text-sm font-semibold">Bookings and trainer load</h3>
          <div className="mt-3 space-y-2">
            {[...model.bookings.slice(0, 3), ...model.trainerSchedules.slice(0, 2)].map((item) => (
              <div key={"bookingId" in item ? item.bookingId : item.trainerId} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <strong className="block text-sm">{item.label}</strong>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{"time" in item ? `${item.time} - ${words(item.status)}` : `${item.sessionsToday} sessions - ${words(item.status)}`}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <h3 className="text-sm font-semibold">Support queue</h3>
          <div className="mt-3 space-y-2">
            {model.supportRequests.map((request) => (
              <div key={request.requestId} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                <strong className="block text-sm">{request.label}</strong>
                <p className={`mt-1 text-xs font-semibold ${priorityClass(request.priority)}`}>{request.priority} - {words(request.status)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-[var(--line)] px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Action history</p>
            <h3 className="mt-1 text-sm font-semibold">Studio drafts after refresh</h3>
          </div>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
            {model.history.length} shown
          </span>
        </div>
        {feedback ? (
          <div className="mt-3 rounded-[8px] border border-emerald-700/20 bg-emerald-50 p-3 text-sm text-emerald-950">
            <strong className="block">{feedback.commandId ? "Stored command draft" : feedback.status}</strong>
            <p className="mt-1 text-xs leading-5">{feedback.message}</p>
          </div>
        ) : null}
        {model.history.length ? (
          <div className="mt-3 grid gap-2 xl:grid-cols-2">
            {model.history.map((item) => (
              <div key={item.commandId} className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="block text-sm leading-5">{item.label}</strong>
                    <span className="mt-1 block text-xs capitalize text-[var(--ink-muted)]">
                      {words(item.actorRole)} - {compactDate(item.createdAt)}
                    </span>
                  </div>
                  <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase">
                    {words(item.commandStatus)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{item.preflight}.</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">Stage an action draft to create the first persisted studio operations history item.</p>
        )}
      </div>
    </article>
  );
}
