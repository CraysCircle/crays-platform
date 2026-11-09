"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, MessageSquare, RefreshCw, Search, Send, ShieldCheck, UserRound } from "lucide-react";
import type {
  CaseCommunicationConversation,
  CaseCommunicationWorkbenchReadModel,
} from "@/db/case-communication-workbench-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "not_configured" | "not_found" | "forbidden";
  readModel: CaseCommunicationWorkbenchReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type DraftState =
  | { state: "idle"; message: "" }
  | { state: "staging"; message: string }
  | { state: "done"; message: string; commandId: string | null }
  | { state: "error"; message: string };

async function loadCommunication(role: string, signal: AbortSignal) {
  const params = new URLSearchParams({ role, limit: "12" });
  const response = await fetch(`/api/crays/communication/case-workbench/read-model?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Communication returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function titleize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function visibilityClass(value: string) {
  if (value === "internal") return "border-sky-700/20 bg-sky-50 text-sky-950";
  if (value === "external") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
}

function statusCopy(conversation: CaseCommunicationConversation) {
  if (conversation.status === "pending") return "Waiting";
  if (conversation.status === "blocked") return "Attention";
  if (conversation.status === "closed") return "Closed";
  return "Open";
}

export function CaseCommunicationWorkbenchPanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role")).key;
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftState, setDraftState] = useState<DraftState>({ state: "idle", message: "" });

  useEffect(() => {
    const controller = new AbortController();
    loadCommunication(role, controller.signal)
      .then((data) => {
        setLoadState({ state: "ready", data, error: null });
        setSelectedConversationId((current) => current ?? data.readModel.conversations[0]?.conversationId ?? null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Communication failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const normalizedSearch = search.trim().toLowerCase();
  const conversations = useMemo(() => {
    const rows = readModel?.conversations ?? [];
    if (!normalizedSearch) return rows;
    return rows.filter((conversation) => {
      const text = `${conversation.title} ${conversation.conversationType} ${conversation.status} ${conversation.nextAction} ${conversation.participants.map((participant) => participant.role).join(" ")}`.toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [normalizedSearch, readModel]);
  const selectedConversation =
    conversations.find((conversation) => conversation.conversationId === selectedConversationId) ?? conversations[0] ?? null;

  async function stageDraft(kind: "reply" | "internal-note") {
    if (!readModel?.case || !selectedConversation) return;
    const body = draftBody.trim() || (kind === "internal-note" ? "Internal note for the selected case conversation." : "Reply draft for review.");
    setDraftState({ state: "staging", message: "Saving draft for review..." });
    try {
      const response = await fetch("/api/crays/communication/case-workbench/command-draft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-case-communication-command",
        },
        body: JSON.stringify({
          actorRole: role,
          preparedOfferId: readModel.case.preparedOfferId,
          dealId: readModel.case.dealId,
          propertyCaseId: readModel.case.propertyCaseId,
          conversationId: selectedConversation.conversationId,
          draftKind: kind,
          subject: kind === "internal-note" ? "Internal note draft" : "Reply draft for review",
          body,
          clientDraftId: `${selectedConversation.conversationId}-${Date.now()}`,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { result?: { commandId?: string }; error?: string; reason?: string };
      if (!response.ok) throw new Error(payload.error ?? payload.reason ?? `HTTP ${response.status}`);
      setDraftState({ state: "done", message: "Draft stored for review.", commandId: payload.result?.commandId ?? null });
      setDraftBody("");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setDraftState({ state: "error", message: error instanceof Error ? error.message : "Draft could not be stored." });
    }
  }

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading communication workspace
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="font-semibold">Communication unavailable</p>
        <p className="mt-1 text-sm opacity-80">{loadState.error}</p>
      </article>
    );
  }

  if (!readModel?.case) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <p className="font-semibold">No case conversation loaded</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">There are no role-visible threads for the current case.</p>
      </article>
    );
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              <MessageSquare className="h-3.5 w-3.5" />
              Case communication
            </span>
            <span className="rounded-[7px] border border-emerald-700/20 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-950">
              Review workflow
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Inbox, threads and review drafts</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Internal notes, shared case comments and stakeholder questions are kept in separate visibility lanes for the active deal.
          </p>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Active case</p>
          <strong className="mt-2 block text-sm">{readModel.case.title}</strong>
          <span className="mt-1 block text-xs text-[var(--ink-muted)]">{titleize(readModel.case.status)}</span>
        </div>
      </div>

      <section className="grid gap-3 border-b border-[var(--line)] px-5 py-4 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["Threads", readModel.summary.conversations],
          ["Messages", readModel.summary.messages],
          ["Internal", readModel.summary.internalMessages],
          ["Shared", readModel.summary.sharedMessages],
          ["Review", readModel.summary.needsReview],
          ["Waiting", readModel.summary.waitingThreads],
          ["Consents", `${readModel.summary.activeConsents}/${readModel.summary.pendingConsents}`],
          ["Drafts", readModel.summary.commandDrafts],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-lg">{value}</strong>
          </div>
        ))}
      </section>

      <div className="grid min-h-[620px] xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <aside className="border-b border-[var(--line)] bg-white p-4 xl:border-b-0 xl:border-r">
          <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--ink-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search threads" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="mt-4 space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                type="button"
                onClick={() => setSelectedConversationId(conversation.conversationId)}
                className={`w-full rounded-[8px] border p-3 text-left transition ${
                  selectedConversation?.conversationId === conversation.conversationId
                    ? "border-[var(--foreground)] bg-[var(--surface)]"
                    : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{conversation.title}</strong>
                    <span className="mt-1 block text-xs text-[var(--ink-muted)]">{titleize(conversation.conversationType)}</span>
                  </div>
                  <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[10px] font-semibold uppercase">{statusCopy(conversation)}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{conversation.nextAction}</p>
              </button>
            ))}
            {conversations.length === 0 ? <p className="rounded-[8px] border border-[var(--line)] p-3 text-sm text-[var(--ink-muted)]">No visible threads.</p> : null}
          </div>
        </aside>

        <section className="min-w-0 border-b border-[var(--line)] bg-[var(--surface)] xl:border-b-0 xl:border-r">
          {selectedConversation ? (
            <>
              <div className="border-b border-[var(--line)] bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{titleize(selectedConversation.conversationType)}</p>
                <h2 className="mt-1 text-xl font-semibold">{selectedConversation.title}</h2>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{selectedConversation.nextAction}</p>
              </div>
              <div className="space-y-3 p-5">
                {selectedConversation.messages.map((message) => (
                  <article key={message.messageId} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{titleize(message.senderRole)}</p>
                        <p className="mt-1 text-sm leading-6">{message.body}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${visibilityClass(message.visibility)}`}>
                          {message.visibility}
                        </span>
                        {message.reviewStatus === "needs_review" ? (
                          <span className="rounded-[7px] border border-amber-700/20 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase text-amber-950">
                            Review
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
                      <span>{titleize(message.channel)}</span>
                      <span>{titleize(message.deliveryStatus)}</span>
                      {message.relatedDocumentIds.length ? <span>{message.relatedDocumentIds.length} linked documents</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <aside className="space-y-4 bg-white p-4">
          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Draft for review</h3>
            </div>
            <textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={5}
              placeholder="Write a reply or internal note"
              className="mt-3 w-full resize-none rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => stageDraft("reply")}
                disabled={!readModel.availableActions.canStageReplyDraft || draftState.state === "staging"}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-black bg-black px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
              >
                {draftState.state === "staging" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save reply draft
              </button>
              {readModel.availableActions.canWriteInternalNote ? (
                <button
                  type="button"
                  onClick={() => stageDraft("internal-note")}
                  disabled={draftState.state === "staging"}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Save internal note
                </button>
              ) : null}
            </div>
            {draftState.message ? (
              <p className={`mt-3 text-xs leading-5 ${draftState.state === "error" ? "text-rose-700" : "text-[var(--ink-muted)]"}`}>
                {draftState.message}
                {draftState.state === "done" && draftState.commandId ? <span className="mt-1 block">Stored command draft</span> : null}
              </p>
            ) : null}
          </section>

          <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Participants</h3>
            </div>
            <div className="mt-3 space-y-2">
              {selectedConversation?.participants.map((participant) => (
                <div key={participant.participantId} className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div>
                    <strong className="block text-xs">{titleize(participant.role)}</strong>
                    <span className="mt-1 block text-[11px] text-[var(--ink-muted)]">{titleize(participant.participantType)}</span>
                  </div>
                  <span className={`rounded-[7px] border px-2 py-1 text-[10px] font-semibold uppercase ${visibilityClass(participant.visibilityLevel)}`}>
                    {participant.visibilityLevel}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {readModel.consents.length ? (
            <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold">Consent status</h3>
              </div>
              <div className="mt-3 space-y-2">
                {readModel.consents.map((consent) => (
                  <div key={consent.consentId} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-xs">{titleize(consent.channel)}</strong>
                      <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{consent.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{consent.purpose}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
