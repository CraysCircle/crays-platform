"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type {
  DocumentLifecycleReadModel,
  DocumentLifecycleItem,
  DocumentRequirement,
  DocumentRoomPreflight,
} from "@/db/document-lifecycle-read-model-repository";
import { roleByKey, type RoleKey } from "@/lib/roles";

type DocumentLifecyclePayload = {
  status: "ready" | "not_configured" | "not_found" | "forbidden";
  readModel: DocumentLifecycleReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: DocumentLifecyclePayload; error: null }
  | { state: "error"; data: null; error: string };

type StageFeedback = {
  commandId: string | null;
  message: string;
};

const stageRoomPreflightRoles: RoleKey[] = ["deal-manager", "reviewer", "admin", "crays-management"];

type CaseQuery = {
  role: RoleKey;
  preparedOfferId: string;
  dealId: string | null;
  propertyCaseId: string | null;
  params: URLSearchParams;
};

function buildQuery(searchParams: Pick<URLSearchParams, "get">) {
  const role = roleByKey(searchParams.get("role")).key;
  const preparedOfferId = searchParams.get("case") ?? searchParams.get("preparedOfferId");
  const dealId = searchParams.get("deal") ?? searchParams.get("dealId");
  const propertyCaseId = searchParams.get("propertyCase") ?? searchParams.get("propertyCaseId");

  if (!preparedOfferId) return null;

  const params = new URLSearchParams({ role, preparedOfferId });
  if (dealId) params.set("dealId", dealId);
  if (propertyCaseId) params.set("propertyCaseId", propertyCaseId);
  return { role, preparedOfferId, dealId, propertyCaseId, params };
}

function buildQueryFromCase(role: RoleKey, caseRecord: { preparedOfferId?: string | null; dealId?: string | null; propertyCaseId?: string | null }) {
  if (!caseRecord.preparedOfferId) return null;
  const params = new URLSearchParams({ role, preparedOfferId: caseRecord.preparedOfferId });
  if (caseRecord.dealId) params.set("dealId", caseRecord.dealId);
  if (caseRecord.propertyCaseId) params.set("propertyCaseId", caseRecord.propertyCaseId);
  return {
    role,
    preparedOfferId: caseRecord.preparedOfferId,
    dealId: caseRecord.dealId ?? null,
    propertyCaseId: caseRecord.propertyCaseId ?? null,
    params,
  } satisfies CaseQuery;
}

async function loadDocumentLifecycle(params: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`/api/crays/documents/lifecycle/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Document lifecycle returned HTTP ${response.status}`);
  return (await response.json()) as DocumentLifecyclePayload;
}

async function loadActiveCase(role: RoleKey, signal: AbortSignal) {
  const params = new URLSearchParams({ role });
  const response = await fetch(`/api/crays/bank-readiness/workbench/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Active case returned HTTP ${response.status}`);
  const payload = (await response.json()) as {
    readModel?: {
      case?: {
        preparedOfferId?: string | null;
        dealId?: string | null;
        propertyCaseId?: string | null;
      } | null;
    };
  };
  return payload.readModel?.case ?? null;
}

async function loadRoomControlCase(role: RoleKey, signal: AbortSignal) {
  const params = new URLSearchParams({ role });
  const response = await fetch(`/api/crays/stakeholder-rooms/read-model?${params.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Room control case returned HTTP ${response.status}`);
  const payload = (await response.json()) as {
    readModel?: {
      case?: {
        preparedOfferId?: string | null;
        dealId?: string | null;
        propertyCaseId?: string | null;
      } | null;
    };
  };
  return payload.readModel?.case ?? null;
}

function statusClass(status: DocumentRequirement["status"] | DocumentLifecycleItem["status"] | DocumentRoomPreflight["status"]) {
  if (status === "approved" || status === "review_ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "missing" || status === "blocked") return "border-rose-700/20 bg-rose-50 text-rose-950";
  return "border-amber-700/20 bg-amber-50 text-amber-950";
}

function titleize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DocumentsLifecyclePanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role")).key;
  const parentView = searchParams.get("view");
  const urlCaseQuery = useMemo(() => buildQuery(searchParams), [searchParams]);
  const [activeCaseQuery, setActiveCaseQuery] = useState<CaseQuery | null>(null);
  const caseQuery = urlCaseQuery ?? (activeCaseQuery?.role === role ? activeCaseQuery : null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [search, setSearch] = useState("");
  const [staging, setStaging] = useState(false);
  const [feedback, setFeedback] = useState<StageFeedback | null>(null);

  useEffect(() => {
    if (urlCaseQuery) return;

    const controller = new AbortController();
    const loadCase = parentView === "rooms" ? loadRoomControlCase : loadActiveCase;
    loadCase(role, controller.signal)
      .then((caseRecord) => setActiveCaseQuery(caseRecord ? buildQueryFromCase(role, caseRecord) : null))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Active case failed" });
      });

    return () => controller.abort();
  }, [role, parentView, urlCaseQuery, refreshKey]);

  useEffect(() => {
    if (!caseQuery) return;
    const controller = new AbortController();
    loadDocumentLifecycle(caseQuery.params, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Document lifecycle failed" });
      });

    return () => controller.abort();
  }, [caseQuery, refreshKey]);

  if (loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading document lifecycle
        </div>
      </article>
    );
  }

  if (!caseQuery) return null;

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Document lifecycle unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  const readModel = loadState.data.readModel;
  const caseRecord = readModel.case;
  if (!caseRecord) return null;
  const activeCase = caseRecord;

  const roleAllowed = stageRoomPreflightRoles.includes(role);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleDocuments = readModel.documents.filter((document) =>
    normalizedSearch
      ? [document.label, document.requiredFor, document.grantSummary, document.redactionState, document.nextAction].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        )
      : true,
  );

  async function stageRoomPreflight() {
    setStaging(true);
    try {
      const response = await fetch("/api/crays/workflow-actions/stage", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crays-dev-confirm": "stage-workflow-action-command",
        },
        body: JSON.stringify({
          actionKey: "stage-room-preflight",
          actorRole: role,
          preparedOfferId: activeCase.preparedOfferId,
          dealId: activeCase.dealId,
          propertyCaseId: activeCase.propertyCaseId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        action?: { label?: string };
        result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string };
        reason?: string;
        error?: string;
      };
      setFeedback({
        commandId: payload.result?.commandId ?? null,
        message: response.ok
          ? `${payload.action?.label ?? "Room preflight"} draft stored for review.`
          : (payload.reason ?? payload.error ?? `HTTP ${response.status}`),
      });
      setRefreshKey((value) => value + 1);
    } finally {
      setStaging(false);
    }
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              <FileText className="h-3.5 w-3.5" />
              Package workbench
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold">Documents, grants and recipient packages</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            Assemble case documents, check grants and prepare recipient-specific packages for the active deal.
          </p>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Active case</p>
          <strong className="mt-2 block text-sm">{activeCase.title}</strong>
          <span className="mt-1 block text-xs text-[var(--ink-muted)]">{titleize(activeCase.status)}</span>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--line)] px-5 py-4 md:grid-cols-4 xl:grid-cols-6">
        {[
          ["Required", readModel.summary.requiredDocuments],
          ["Approved", readModel.summary.approvedDocuments],
          ["Missing", readModel.summary.missingDocuments],
          ["Blocked", readModel.summary.blockedDocuments],
          ["Rooms", `${readModel.summary.roomReadyForReview}/${readModel.summary.roomPreflights}`],
          ["Preflight issues", readModel.summary.releaseGatesBlocked],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-lg">{value}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Required document work</h3>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs font-semibold uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3">Requirement</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {readModel.requirements.map((requirement) => (
                  <tr key={requirement.key}>
                    <td className="px-4 py-3 align-top">
                      <strong>{requirement.label}</strong>
                      <span className="mt-1 block text-xs text-[var(--ink-muted)]">{requirement.requiredFor}</span>
                    </td>
                    <td className="px-4 py-3 align-top capitalize">{requirement.room}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(requirement.status)}`}>
                        {requirement.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">{requirement.ownerRole}</td>
                    <td className="max-w-[260px] px-4 py-3 align-top font-semibold">{requirement.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Package review action</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
              Creates a package-review draft for the reviewer queue before any recipient sharing can happen.
            </p>
            <button
              type="button"
              onClick={stageRoomPreflight}
              disabled={!roleAllowed || staging}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-black bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
            >
              {staging ? <RefreshCw className="h-4 w-4 animate-spin" /> : roleAllowed ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
              {roleAllowed ? "Start package review" : "Role locked"}
            </button>
            {feedback ? (
              <div className="mt-3 rounded-[8px] border border-emerald-700/20 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">
                <strong className="block">{feedback.commandId ? "Stored command draft" : "Command not stored"}</strong>
                <span className="mt-1 block">{feedback.message}</span>
              </div>
            ) : null}
          </div>

          {readModel.roomPreflights.map((room) => (
            <div key={room.room} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{room.targetAudience}</p>
                  <h3 className="mt-1 text-sm font-semibold">{room.label}</h3>
                </div>
                <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(room.status)}`}>
                  {room.status.replaceAll("_", " ")}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-semibold uppercase text-[var(--ink-muted)]">Documents</dt>
                  <dd className="mt-1 text-sm font-semibold">{room.approvedDocuments}/{room.documents}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-[var(--ink-muted)]">Missing</dt>
                  <dd className="mt-1 text-sm font-semibold">{room.missingDocuments}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-[var(--ink-muted)]">Issues</dt>
                  <dd className="mt-1 text-sm font-semibold">{room.blockedGates}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-[var(--ink-muted)]">Sharing</dt>
                  <dd className="mt-1 text-sm font-semibold">Review required</dd>
                </div>
              </dl>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{room.nextAction}</p>
            </div>
          ))}
        </aside>
      </div>

      <section className="border-t border-[var(--line)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Document metadata and grants</h3>
          </div>
          <label className="relative min-w-[260px]">
            <span className="sr-only">Search documents</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents"
              className="h-10 w-full rounded-[8px] border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visibleDocuments.slice(0, 12).map((document) => (
            <article key={document.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{document.requiredFor}</p>
                  <h4 className="mt-1 text-sm font-semibold">{document.label}</h4>
                </div>
                <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(document.status)}`}>
                  {document.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[var(--ink-muted)] sm:grid-cols-2">
                <span>{document.versionLabel}</span>
                <span>{document.grantSummary}</span>
                <span>{document.redactionState}</span>
                <span>{document.roomScopes.map(titleize).join(", ")}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-[var(--foreground)]">{document.nextAction}</p>
            </article>
          ))}
          {visibleDocuments.length === 0 ? (
            <p className="rounded-[8px] border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-muted)]">
              No document metadata matches this search.
            </p>
          ) : null}
        </div>
      </section>
    </article>
  );
}
