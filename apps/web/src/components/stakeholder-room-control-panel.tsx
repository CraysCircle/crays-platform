"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  DoorOpen,
  FileText,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import type {
  StakeholderRoomControlItem,
  StakeholderRoomControlReadModel,
} from "@/db/stakeholder-room-control-read-model-repository";

type Payload = {
  status: "ready" | "forbidden" | "not_configured" | "not_found";
  readModel: StakeholderRoomControlReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type Feedback = {
  status: "created" | "idempotent_existing" | "blocked" | "invalid" | "not_allowed" | "network_error";
  message: string;
  commandId: string | null;
  applyGate: string | null;
};

const stageRoles = new Set(["deal-manager", "reviewer", "admin", "crays-management"]);

const statusClass = {
  blocked: "border-rose-700/20 bg-rose-50 text-rose-950",
  attention: "border-amber-700/20 bg-amber-50 text-amber-950",
  review_ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
};

const priorityClass = {
  critical: "border-rose-700/20 bg-rose-50 text-rose-950",
  high: "border-amber-700/20 bg-amber-50 text-amber-950",
  medium: "border-sky-700/20 bg-sky-50 text-sky-950",
};

function matchesRoom(room: StakeholderRoomControlItem, searchTerm: string, status: string) {
  if (status !== "all" && room.status !== status) return false;
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return [
    room.label,
    room.audience,
    room.audienceProfile.partyName,
    room.audienceProfile.relationship,
    room.ownerRole,
    room.blocker,
    room.nextAction,
    room.releaseGateLabel,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

async function loadRooms(searchParams: URLSearchParams, signal: AbortSignal) {
  const params = new URLSearchParams();
  params.set("role", searchParams.get("role") ?? "deal-manager");
  ["case", "deal", "propertyCase", "preparedOfferId", "dealId", "propertyCaseId"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  });
  const response = await fetch(`/api/crays/stakeholder-rooms/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Stakeholder rooms returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

async function stageRoomPreflight(role: string, readModel: StakeholderRoomControlReadModel, room: StakeholderRoomControlItem): Promise<Feedback> {
  if (!stageRoles.has(role)) {
    return {
      status: "not_allowed",
      message: "This role can review room preflight but cannot stage room preflight command drafts from this surface.",
      commandId: null,
      applyGate: null,
    };
  }

  if (!readModel.case) {
    return {
      status: "invalid",
      message: "Open a prepared deal case before staging room preflight.",
      commandId: null,
      applyGate: null,
    };
  }

  try {
    const response = await fetch("/api/crays/workflow-actions/stage", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crays-dev-confirm": "stage-workflow-action-command",
      },
      body: JSON.stringify({
        actorRole: role,
        actionKey: "stage-room-preflight",
        preparedOfferId: readModel.case.preparedOfferId,
        dealId: readModel.case.dealId,
        propertyCaseId: readModel.case.propertyCaseId,
        room: room.key,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      status?: Feedback["status"];
      reason?: string;
      error?: string;
      result?: {
        commandId?: string;
        targetApplyStatus?: string;
        applyGate?: string;
      };
    };

    return {
      status: response.ok ? (payload.status === "idempotent_existing" ? "idempotent_existing" : "created") : (payload.status ?? "blocked"),
      message: response.ok
        ? `Room preflight command draft stored for ${room.audience}, apply ${payload.result?.targetApplyStatus ?? "blocked"}.`
        : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      commandId: payload.result?.commandId ?? null,
      applyGate: payload.result?.applyGate ?? null,
    };
  } catch (error) {
    return {
      status: "network_error",
      message: error instanceof Error ? error.message : "Room preflight command could not reach the local server.",
      commandId: null,
      applyGate: null,
    };
  }
}

function feedbackClass(status: Feedback["status"]) {
  if (status === "created" || status === "idempotent_existing") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "not_allowed" || status === "blocked") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-rose-200 bg-rose-50 text-rose-950";
}

export function StakeholderRoomControlPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadRooms(searchParams, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Stakeholder rooms failed" });
      });
    return () => controller.abort();
  }, [refreshKey, searchParams]);

  const readModel = loadState.state === "ready" ? loadState.data.readModel : null;
  const visibleRooms = useMemo(() => {
    if (!readModel) return [];
    return readModel.rooms.filter((room) => matchesRoom(room, searchTerm, status));
  }, [readModel, searchTerm, status]);
  const selectedRoom = visibleRooms.find((room) => room.key === selectedKey) ?? visibleRooms[0] ?? readModel?.rooms[0] ?? null;
  const scopedView = searchTerm.trim().length > 0 || status !== "all";
  const topRoom = scopedView ? (visibleRooms[0] ?? readModel?.rooms[0] ?? null) : (readModel?.rooms[0] ?? null);

  async function handleStage(room: StakeholderRoomControlItem | null) {
    if (!readModel || !room) return;
    setStaging(true);
    const result = await stageRoomPreflight(role, readModel, room);
    setFeedback(result);
    setStaging(false);
  }

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading stakeholder rooms
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Stakeholder rooms unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  if (!readModel) return null;

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Stakeholder rooms</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Room control center</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {readModel.case ? readModel.case.title : "Open a prepared deal case"} - preflight visibility, redactions and release blockers before any external room opens.
          </p>
          {readModel.case ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
              {[readModel.case.propertyTitle, readModel.case.propertyAddress, readModel.case.candidateName, readModel.case.bankName].filter(Boolean).map((item) => (
                <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 font-semibold">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
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
          Refresh rooms
        </button>
      </div>

      {topRoom ? (
        <div className="grid gap-4 border-b border-[var(--line)] bg-white px-5 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${priorityClass[topRoom.priority]}`}>
                {topRoom.priority}
              </span>
              <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next room decision</span>
            </div>
            <h3 className="mt-2 truncate text-lg font-semibold">{topRoom.label}</h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {topRoom.audienceProfile.partyName} - {topRoom.blocker} {topRoom.nextAction}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleStage(topRoom)}
              disabled={staging}
              className="inline-flex items-center gap-2 rounded-[8px] border border-neutral-950 bg-neutral-950 px-3 py-2 text-xs font-semibold !text-white transition hover:bg-neutral-800 hover:!text-white disabled:opacity-60"
            >
              {staging ? "Staging..." : "Stage preflight"}
            </button>
            <a href={topRoom.links.caseHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
              Open case
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 border-b border-[var(--line)] px-5 py-4 md:grid-cols-6">
        {[
          ["Rooms", readModel.summary.rooms, "controlled room shells"],
          ["Blocked", readModel.summary.blockedRooms, "need release work"],
          ["Ready", readModel.summary.reviewReadyRooms, "review-ready rooms"],
          ["Gates", readModel.summary.blockedGates, "release gates closed"],
          ["Redactions", readModel.summary.redactions, "items to review"],
          ["Docs", `${readModel.summary.approvedDocuments}/${readModel.summary.documents}`, "approved metadata"],
        ].map(([label, value, context]) => (
          <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-2xl">{value}</strong>
            <span className="mt-1 block text-xs text-[var(--ink-muted)]">{context}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Search rooms</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search rooms"
            className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {["all", "blocked", "attention", "review_ready"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-[8px] border px-3 py-2 text-xs font-semibold capitalize transition ${
                status === item ? "border-neutral-950 bg-neutral-950 !text-white" : "border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--accent)]"
              }`}
              aria-pressed={status === item}
            >
              {item.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 divide-y divide-[var(--line)]">
          {visibleRooms.map((room) => {
            const selected = selectedRoom?.key === room.key;
            return (
              <button
                key={room.key}
                type="button"
                onClick={() => setSelectedKey(room.key)}
                className={`grid w-full gap-4 px-5 py-4 text-left transition lg:grid-cols-[minmax(0,1.3fr)_180px_150px_150px] lg:items-center ${
                  selected ? "bg-emerald-50/45" : "hover:bg-white"
                }`}
              >
                <div className="min-w-0">
                  <strong className="block">{room.label}</strong>
                  <span className="mt-1 block text-xs text-[var(--ink-muted)]">{room.audience}</span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--ink)]">{room.audienceProfile.partyName}</span>
                  <span className="mt-1 block text-xs text-[var(--ink-muted)]">{room.audienceProfile.relationship}</span>
                  <span className="mt-2 block text-xs font-semibold text-[var(--ink-muted)]">{room.nextAction}</span>
                </div>
                <span className="text-sm text-[var(--ink-muted)]">{room.ownerRole}</span>
                <span className={`w-fit rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass[room.status]}`}>{room.status.replace("_", " ")}</span>
                <span className="text-sm text-[var(--ink-muted)]">{room.blocker}</span>
              </button>
            );
          })}
          {visibleRooms.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--ink-muted)]">No stakeholder rooms match this view.</p> : null}
        </div>

        <aside className="space-y-4 border-t border-[var(--line)] bg-white px-5 py-4 xl:border-l xl:border-t-0">
          {selectedRoom ? (
            <>
              <div>
                <div className="flex items-center gap-2">
                  {selectedRoom.status === "blocked" ? <ShieldAlert className="h-4 w-4 text-[var(--rose)]" /> : <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected room</p>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{selectedRoom.label}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedRoom.audience}</p>
                <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Audience</p>
                  <strong className="mt-1 block text-sm">{selectedRoom.audienceProfile.partyName}</strong>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{selectedRoom.audienceProfile.partyType}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{selectedRoom.audienceProfile.relationship}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Documents", `${selectedRoom.approvedDocuments}/${selectedRoom.documents}`],
                  ["Missing", selectedRoom.missingDocuments],
                  ["Gates", selectedRoom.blockedGates],
                  ["Redactions", selectedRoom.redactions.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                    <strong className="mt-1 block">{value}</strong>
                  </div>
                ))}
              </div>

              <div className="rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-rose-950">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase">{selectedRoom.releaseGateLabel}</p>
                </div>
                <p className="mt-2 text-xs leading-5">
                  {selectedRoom.reviewStatus}. Room release, external send, upload, preview, apply, finance, bank, payment, deploy and VPS-changing work remain closed.
                </p>
              </div>

              {[
                ["Included records", selectedRoom.includedRecords],
                ["Excluded records", selectedRoom.excludedRecords],
                ["Visible sections", selectedRoom.visibleSections],
                ["Hidden sections", selectedRoom.hiddenSections],
                ["Redactions", selectedRoom.redactions.length > 0 ? selectedRoom.redactions : ["No redactions listed"]],
              ].map(([label, values]) => (
                <div key={label as string} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(values as string[]).map((value) => (
                      <span key={value} className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleStage(selectedRoom)}
                disabled={staging}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-neutral-950 bg-neutral-950 px-3 py-2 text-sm font-semibold !text-white transition hover:bg-neutral-800 hover:!text-white disabled:opacity-60"
              >
                {staging ? "Staging..." : stageRoles.has(role) ? selectedRoom.actionLabel : "Review access only"}
              </button>

              {feedback ? (
                <div className={`rounded-[8px] border p-3 text-sm ${feedbackClass(feedback.status)}`}>
                  <strong className="block">{feedback.commandId ? "Stored command draft" : feedback.status}</strong>
                  <p className="mt-1 text-xs leading-5">{feedback.message}</p>
                  {feedback.applyGate ? <p className="mt-1 text-xs font-semibold">Apply remains closed</p> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <a href={selectedRoom.links.caseHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
                  Open case
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a href={selectedRoom.links.filesHref} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]">
                  Open Files
                  <FileText className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Select a room to inspect visibility, redactions and release blockers.</p>
          )}
        </aside>
      </div>
    </article>
  );
}
