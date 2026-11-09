"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  DoorClosed,
  Gauge,
  Handshake,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  emptyOperatingPlatformPrototypeReadiness,
  type OperatingPlatformPrototypeReadiness,
} from "@/lib/operating-platform-prototype-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: OperatingPlatformPrototypeReadiness;
  liveActionsExecuted: false;
  productionDeployPerformed: false;
  externalActionsPerformed: false;
  toolApplyEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  paymentInitiationEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type PrototypeCommandDraftStatus = "staging" | "created" | "idempotent_existing" | "blocked" | "invalid" | "network_error";

type PrototypeCommandDraft = {
  key: string;
  label: string;
  moduleLabel: "Project" | "Files" | "Loans";
  status: PrototypeCommandDraftStatus;
  message: string;
  commandId: string | null;
  applyGate: string | null;
  createdAt: string;
};

type PrototypeCommandResponse = {
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

const blockTone = {
  ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  prepared: "border-sky-700/20 bg-sky-50 text-sky-950",
  blocked: "border-orange-700/20 bg-orange-50 text-orange-950",
  closed: "border-rose-700/20 bg-rose-50 text-rose-950",
};

const actionTone = {
  stageable_local: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  read_only: "border-sky-700/20 bg-sky-50 text-sky-950",
  closed_gate: "border-rose-700/20 bg-rose-50 text-rose-950",
};

async function loadPrototype(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/operating-platform/prototype/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Operating platform prototype returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

function commandStatusLabel(status: PrototypeCommandDraftStatus) {
  if (status === "staging") return "Checking guard";
  if (status === "created") return "Stored in test DB";
  if (status === "idempotent_existing") return "Already stored";
  if (status === "blocked") return "Guard blocked";
  if (status === "invalid") return "Invalid draft";
  return "Network issue";
}

function commandStatusClass(status: PrototypeCommandDraftStatus) {
  if (status === "created" || status === "idempotent_existing") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "blocked") return "border-amber-200 bg-amber-50 text-amber-950";
  if (status === "invalid" || status === "network_error") return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-sky-200 bg-sky-50 text-sky-950";
}

function commandTargetForPrototypeAction(actionKey: string) {
  if (actionKey === "clear-bank-evidence") {
    return {
      moduleLabel: "Loans" as const,
      route: "/api/crays/core-command/loans-checklist",
      confirmation: "stage-loans-checklist-command",
    };
  }

  if (actionKey === "approve-release-gate" || actionKey === "prepare-owner-room") {
    return {
      moduleLabel: "Files" as const,
      route: "/api/crays/core-command/files-package",
      confirmation: "stage-files-package-command",
    };
  }

  return {
    moduleLabel: "Project" as const,
    route: "/api/crays/core-command/project-work-item",
    confirmation: "stage-project-work-item-command",
  };
}

function commandBodyForPrototypeAction(actionKey: string, label: string, role: string, moduleLabel: PrototypeCommandDraft["moduleLabel"]) {
  const base = {
    idempotencyKey: `operating-prototype:${role}:${actionKey}`,
    actorRole: role,
  };
  const notes = "Operating platform prototype command draft. Target apply remains blocked until exact approval, scope and rollback are present.";

  if (moduleLabel === "Loans") {
    return {
      ...base,
      commandType: "bank_package_checklist",
      action: "request_bank_review",
      title: label,
      notes,
      status: "drafted",
      checklistItemKey: actionKey,
    };
  }

  if (moduleLabel === "Files") {
    return {
      ...base,
      commandType: "visibility_review",
      action: "request_visibility_review",
      title: label,
      notes,
      status: "drafted",
      sectionKey: actionKey,
      visibilityScope: actionKey.includes("owner") ? "property_owner" : "internal_review",
    };
  }

  return {
    ...base,
    action: "update",
    title: label,
    status: "drafted",
    priority: "normal",
    ownerRole: role,
    notes,
  };
}

async function persistPrototypeCommandDraft(actionKey: string, label: string, role: string): Promise<Omit<PrototypeCommandDraft, "createdAt">> {
  const target = commandTargetForPrototypeAction(actionKey);

  try {
    const response = await fetch(target.route, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crays-dev-confirm": target.confirmation,
      },
      body: JSON.stringify(commandBodyForPrototypeAction(actionKey, label, role, target.moduleLabel)),
    });
    const payload = (await response.json().catch(() => ({}))) as PrototypeCommandResponse;
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
      key: actionKey,
      label,
      moduleLabel: target.moduleLabel,
      status,
      message: response.ok
        ? `${target.moduleLabel} command draft stored${commandStatus}${targetApplyStatus}.`
        : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      commandId: payload.result?.commandId ?? null,
      applyGate: payload.result?.applyGate ?? null,
    };
  } catch (error) {
    return {
      key: actionKey,
      label,
      moduleLabel: target.moduleLabel,
      status: "network_error",
      message: error instanceof Error ? error.message : "Command draft could not reach the local server.",
      commandId: null,
      applyGate: null,
    };
  }
}

export function OperatingPlatformPrototypePanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const roleKey = roleByKey(role).key;
  const fallback = emptyOperatingPlatformPrototypeReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [selectedQueueRole, setSelectedQueueRole] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const [commandDrafts, setCommandDrafts] = useState<PrototypeCommandDraft[]>([]);

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadPrototype(roleKey, controller.signal)
      .then((data) => {
        setLoadState({ state: "ready", data, error: null });
        setSelectedQueueRole(data.readModel.roleQueues[0]?.role ?? null);
        setActivity([]);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Operating prototype readiness failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const selectedQueue = readModel.roleQueues.find((queue) => queue.role === selectedQueueRole) ?? readModel.roleQueues[0] ?? null;
  const boundaryRows = useMemo(
    () => [
      { label: "Live action execution", enabled: readModel.boundaries.liveActionExecutionEnabled },
      { label: "Tenant provisioning", enabled: readModel.boundaries.tenantProvisioningEnabled },
      { label: "Module apply", enabled: readModel.boundaries.toolApplyEnabled },
      { label: "File upload", enabled: readModel.boundaries.fileUploadEnabled },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
      { label: "Candidate release", enabled: readModel.boundaries.candidateReleaseEnabled },
      { label: "Bank release", enabled: readModel.boundaries.bankReleaseEnabled },
      { label: "Payment initiation", enabled: readModel.boundaries.paymentInitiationEnabled },
      { label: "Production deploy", enabled: readModel.boundaries.productionDeployEnabled },
    ],
    [readModel],
  );

  const latestCommandDraft = commandDrafts[0] ?? null;

  function stage(label: string, actionKey?: string) {
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setActivity((items) => [`${stamp} - ${label}`, ...items].slice(0, 6));
    if (!actionKey) return;

    const target = commandTargetForPrototypeAction(actionKey);
    const stagingDraft: PrototypeCommandDraft = {
      key: actionKey,
      label,
      moduleLabel: target.moduleLabel,
      status: "staging",
      message: "Checking guarded test-database command route.",
      commandId: null,
      applyGate: null,
      createdAt: stamp,
    };
    setCommandDrafts((drafts) => [stagingDraft, ...drafts.filter((draft) => draft.key !== actionKey)].slice(0, 8));
    void persistPrototypeCommandDraft(actionKey, label, roleKey).then((draft) => {
      setCommandDrafts((drafts) => [{ ...draft, createdAt: stamp }, ...drafts.filter((item) => item.key !== actionKey)].slice(0, 8));
    });
  }

  if (!fallback.access.allowed) return null;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Operating control room</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Platform work control</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
              Coordinate role queues, active cases, handoffs, stakeholder rooms and closed execution gates from one working surface.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh operating platform prototype"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Workstreams", readModel.summary.prototypeBlocks.toString()],
          ["Ready controls", readModel.summary.readyBlocks.toString()],
          ["Prepared controls", readModel.summary.preparedBlocks.toString()],
          ["Role queues", readModel.summary.roleQueues.toString()],
          ["Case workspaces", readModel.summary.caseWorkspaces.toString()],
          ["Open gates", readModel.summary.openSideEffectGates.toString()],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Work queues</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Every role starts from owned work, records and next action.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-2">
              {readModel.roleQueues.map((queue) => (
                <button
                  key={queue.role}
                  type="button"
                  onClick={() => setSelectedQueueRole(queue.role)}
                  className={`w-full rounded-[8px] border p-3 text-left transition ${
                    selectedQueue?.role === queue.role ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase opacity-70">{queue.role}</span>
                  <strong className="mt-2 block text-sm">{queue.queue}</strong>
                  <span className="mt-1 block text-xs opacity-75">{queue.records} records</span>
                </button>
              ))}
            </div>
            <div className="rounded-[8px] border border-[var(--line)] bg-white p-5">
              {selectedQueue ? (
                <>
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedQueue.surface}</p>
                  <h3 className="mt-2 text-xl font-semibold">{selectedQueue.queue}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{selectedQueue.nextAction}</p>
                  <button
                    type="button"
                    onClick={() => stage(`${selectedQueue.queue} opened for ${selectedQueue.role}`, `queue-${selectedQueue.role}`)}
                    className="mt-5 inline-flex items-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
                  >
                    Open queue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">No queue selected.</p>
              )}
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              <h2 className="font-semibold">Closed execution gates</h2>
            </div>
            <div className="mt-4 space-y-2">
              {boundaryRows.map(({ label, enabled }) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{enabled ? "Open" : "Closed"}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Session activity</h2>
            </div>
            <div className="mt-4 space-y-2">
              {latestCommandDraft ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-xs">{latestCommandDraft.moduleLabel} command</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold ${commandStatusClass(latestCommandDraft.status)}`}>
                      {commandStatusLabel(latestCommandDraft.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{latestCommandDraft.label}</p>
                  {latestCommandDraft.commandId || latestCommandDraft.applyGate ? (
                    <p className="mt-2 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                      Stored command draft · apply closed
                    </p>
                  ) : null}
                </div>
              ) : null}
              {activity.length ? (
                activity.map((item) => (
                  <div key={item} className="rounded-[8px] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                    {item}
                  </div>
                ))
              ) : (
                <p className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink-muted)]">No session activity staged.</p>
              )}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Case workspaces</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.caseWorkspaces.map((workspace) => (
              <article key={workspace.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{workspace.title}</strong>
                  <span className="text-sm font-semibold text-[var(--accent)]">{workspace.readiness}%</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{workspace.nextAction}</p>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">{workspace.linkedSignals} linked module signals</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Acceptance criteria</h2>
          </div>
          <div className="mt-4 space-y-3">
            {readModel.acceptanceCriteria.map((criteria) => (
              <div key={criteria.key} className="rounded-[8px] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{criteria.label}</strong>
                  <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{criteria.state}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{criteria.evidence}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Workflow actions</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {readModel.workflowActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => stage(`${action.label} ${action.state === "closed_gate" ? "kept closed" : "staged"}`, action.key)}
                className={`rounded-[8px] border p-4 text-left transition hover:border-[var(--accent)] ${actionTone[action.state]}`}
              >
                <strong className="text-sm">{action.label}</strong>
                <p className="mt-2 text-xs font-semibold uppercase opacity-70">{stateLabel(action.state)}</p>
                <p className="mt-2 text-xs leading-5 opacity-80">{action.visibleResult}</p>
              </button>
            ))}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <DoorClosed className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Stakeholder rooms</h2>
          </div>
          <div className="mt-4 space-y-3">
            {readModel.stakeholderRooms.map((room) => (
              <div key={room.audience} className="rounded-[8px] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{room.audience}</strong>
                  <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{stateLabel(room.state)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{room.visibleScope}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Cross-module handoffs</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.crossModuleHandoffs.map((handoff) => (
              <article key={handoff.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{handoff.label}</strong>
                  <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{handoff.owner}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <span className="rounded-[7px] bg-emerald-50 px-2 py-1 text-emerald-950">{handoff.ready} ready</span>
                  <span className="rounded-[7px] bg-sky-50 px-2 py-1 text-sky-950">{handoff.waiting} waiting</span>
                  <span className="rounded-[7px] bg-rose-50 px-2 py-1 text-rose-950">{handoff.blocked} blocked</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{handoff.nextAction}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Control queue</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.blocks.map((block) => (
                <button
                  key={block.blockRange}
                  type="button"
                  onClick={() => stage(`${block.label} reviewed by ${block.ownerRole}`)}
                  className={`w-full rounded-[8px] border p-3 text-left transition hover:border-[var(--accent)] ${blockTone[block.status]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{block.label}</strong>
                    <span className="text-xs font-semibold uppercase">{block.status}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase opacity-70">{block.ownerRole}</p>
                  <p className="mt-2 text-xs leading-5 opacity-80">{block.stillGated}</p>
                </button>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
