"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { defaultRole, type RoleKey } from "@/lib/roles";

type PreparedOfferReviewItem = {
  offerId: string;
  propertyCaseId: string | null;
  title: string;
  market: string | null;
  ownerRole: string;
  status: string;
  candidateReleaseState: string;
  publicTeaserEnabled: boolean;
  partnerHandoffStatus: string;
  propertyCaseStatus: string | null;
  propertyCasePhase: string | null;
  propertyHandoffStatus: string | null;
  locationAnalysisLinked: boolean;
  evidencePackageLinked: boolean;
  eventCount: number;
  latestEventAt: string | null;
};

type PreparedOfferReviewPayload = {
  status: "ready" | "forbidden";
  readModel: {
    role: RoleKey;
    access: {
      allowed: boolean;
      reason: string;
    };
    records: PreparedOfferReviewItem[];
    summary: {
      total: number;
      draft: number;
      review: number;
      released: number;
      candidateReleased: number;
      publicTeaserEnabled: number;
    };
    liveBusinessRecordsReturned: boolean;
    candidatePrivateDataReturned: false;
    bankDataReturned: false;
    fileUploadEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: PreparedOfferReviewPayload; error: null }
  | { state: "error"; data: null; error: string };

const visibleRoles = new Set(["deal-manager", "reviewer", "crays-management", "admin"]);

function statusLabel(value: string | null | boolean) {
  return String(value ?? "none").replaceAll("_", " ");
}

async function loadReview(role: RoleKey, signal?: AbortSignal) {
  const response = await fetch(`/api/crays/prepared-offers/review?role=${role}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Prepared-offer review returned HTTP ${response.status}`);
  }

  return (await response.json()) as PreparedOfferReviewPayload;
}

export function PreparedOfferReviewPanel() {
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") ?? defaultRole) as RoleKey;
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const isVisible = visibleRoles.has(role);

  useEffect(() => {
    if (!isVisible) return;

    const controller = new AbortController();
    loadReview(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Prepared-offer review failed",
        });
      });

    return () => controller.abort();
  }, [isVisible, refreshKey, role]);

  const data = loadState.data?.readModel;
  const records = data?.records ?? [];
  const summary = data?.summary;
  const boundary = useMemo(
    () => [
      ["Candidate private data", data?.candidatePrivateDataReturned ? "true" : "false"],
      ["Bank data", data?.bankDataReturned ? "true" : "false"],
      ["File upload", data?.fileUploadEnabled ? "true" : "false"],
      ["Provider calls", data?.providerCallsEnabled ? "true" : "false"],
      ["Public release", data?.publicReleaseEnabled ? "true" : "false"],
    ],
    [data],
  );

  if (!isVisible) return null;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Deal review</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">Prepared offer drafts</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Internal draft offers linked to reviewed property handoff readiness.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadState.state === "error" ? (
          <div className="m-5 rounded-[8px] border border-rose-700/20 bg-rose-50 p-4 text-sm font-medium text-rose-950">{loadState.error}</div>
        ) : null}

        <div className="grid gap-3 p-4 md:grid-cols-4">
          {[
            ["Total", summary ? String(summary.total) : "..."],
            ["Draft", summary ? String(summary.draft) : "..."],
            ["Candidate released", summary ? String(summary.candidateReleased) : "..."],
            ["Public teaser", summary ? String(summary.publicTeaserEnabled) : "..."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
              <strong className="mt-2 block text-xl font-semibold">{value}</strong>
            </div>
          ))}
        </div>

        <div className="divide-y divide-[var(--line)]">
          {loadState.state === "loading" ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="px-5 py-4">
                <div className="h-4 w-64 max-w-full rounded bg-[var(--surface-strong)]" />
                <div className="mt-3 h-3 w-96 max-w-full rounded bg-[var(--surface-strong)]" />
              </div>
            ))
          ) : records.length ? (
            records.map((record) => (
              <div key={record.offerId} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_170px_160px] lg:items-center">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{record.title}</strong>
                  <span className="mt-1 block text-sm text-[var(--ink-muted)]">{record.market ?? "Market pending"}</span>
                  <span className="mt-2 block break-all font-mono text-xs text-[var(--ink-muted)]">{record.offerId}</span>
                </div>
                <div className="text-sm text-[var(--ink-muted)]">
                  <strong className="block font-semibold text-[var(--foreground)]">{statusLabel(record.status)}</strong>
                  <span>{statusLabel(record.candidateReleaseState)}</span>
                </div>
                <div className="text-sm text-[var(--ink-muted)]">
                  <strong className="block font-semibold text-[var(--foreground)]">{record.eventCount} events</strong>
                  <span>{statusLabel(record.partnerHandoffStatus)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-[var(--ink-muted)]">No prepared offer drafts are ready for this review queue.</div>
          )}
        </div>
      </article>

      <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-semibold">Release boundary</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{data?.access.reason ?? "Checking scoped access."}</p>
        <div className="mt-4 space-y-3">
          {boundary.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
              <span className="text-[var(--ink-muted)]">{label}</span>
              <strong>{loadState.state === "loading" ? "..." : value}</strong>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
