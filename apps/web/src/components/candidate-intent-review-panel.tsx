"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { defaultRole, type RoleKey } from "@/lib/roles";

type CandidateIntentReviewItem = {
  intentId: string;
  preparedOfferId: string;
  dealId: string | null;
  candidateAccountId: string | null;
  intentType: string;
  status: string;
  reviewStatus: string;
  regulatedCheckStatus: string;
  equityCheckStatus: string;
  bankHandoffStatus: string;
  candidateReleaseState: string | null;
  publicTeaserEnabled: boolean | null;
  createdAt: string;
  updatedAt: string;
};

type CandidateIntentReviewPayload = {
  status: "ready" | "forbidden";
  readModel: {
    configured: boolean;
    role: RoleKey;
    access: {
      allowed: boolean;
      reason: string;
    };
    records: CandidateIntentReviewItem[];
    summary: {
      total: number;
      purchase: number;
      financing: number;
      submitted: number;
      accepted: number;
    };
    liveIntentRecordsReturned: boolean;
    purchaseIntentWriteEnabled: false;
    financingIntentWriteEnabled: false;
    kycAmlStarted: false;
    equityCheckStarted: false;
    bankPackageCreated: false;
    externalSendingEnabled: false;
    providerCallsEnabled: false;
    publicReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  liveBusinessRecordReturned: boolean;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: CandidateIntentReviewPayload; error: null }
  | { state: "error"; data: null; error: string };

const visibleRoles = new Set(["deal-manager", "reviewer", "crays-management", "admin"]);

function compactDate(value: string | null) {
  if (!value) return "No update";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value: string | null | boolean) {
  return String(value ?? "none").replaceAll("_", " ");
}

async function loadReview(role: RoleKey, signal?: AbortSignal) {
  const response = await fetch(`/api/crays/candidate/prepared-offers/intent/review?role=${role}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Candidate intent review returned HTTP ${response.status}`);
  }

  return (await response.json()) as CandidateIntentReviewPayload;
}

export function CandidateIntentReviewPanel() {
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
          error: error instanceof Error ? error.message : "Candidate intent review failed",
        });
      });

    return () => controller.abort();
  }, [isVisible, refreshKey, role]);

  const data = loadState.data?.readModel;
  const records = data?.records ?? [];
  const summary = data?.summary;
  const boundary = useMemo(
    () => [
      ["Purchase write", data?.purchaseIntentWriteEnabled ? "true" : "false"],
      ["Financing write", data?.financingIntentWriteEnabled ? "true" : "false"],
      ["KYC / AML started", data?.kycAmlStarted ? "true" : "false"],
      ["Equity check", data?.equityCheckStarted ? "true" : "false"],
      ["Bank package", data?.bankPackageCreated ? "true" : "false"],
      ["External sending", data?.externalSendingEnabled ? "true" : "false"],
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
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Candidate intent review</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">Purchase and financing intents</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Deal Manager review queue for Candidate purchase or financing intent records after explicit offer release.
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
            ["Purchase", summary ? String(summary.purchase) : "..."],
            ["Financing", summary ? String(summary.financing) : "..."],
            ["Submitted", summary ? String(summary.submitted) : "..."],
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
              <div key={record.intentId} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_170px_170px] lg:items-center">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{statusLabel(record.intentType)} intent</strong>
                  <span className="mt-1 block break-all text-sm text-[var(--ink-muted)]">{record.preparedOfferId}</span>
                  <span className="mt-2 block break-all font-mono text-xs text-[var(--ink-muted)]">{record.intentId}</span>
                </div>
                <div className="text-sm text-[var(--ink-muted)]">
                  <strong className="block font-semibold text-[var(--foreground)]">{statusLabel(record.status)}</strong>
                  <span>{statusLabel(record.reviewStatus)}</span>
                </div>
                <div className="text-sm text-[var(--ink-muted)]">
                  <strong className="block font-semibold text-[var(--foreground)]">{compactDate(record.updatedAt)}</strong>
                  <span>{statusLabel(record.bankHandoffStatus)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-[var(--ink-muted)]">No Candidate intent records are ready for this review queue.</div>
          )}
        </div>
      </article>

      <aside className="space-y-4">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Intent boundary</h2>
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
        </article>

        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-[var(--amber)]" />
            <h2 className="font-semibold">Next review gate</h2>
          </div>
          <div className="mt-4 space-y-3">
            {["Confirm Candidate account scope", "Review intent status", "Keep bank handoff locked"].map((item) => (
              <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </aside>
    </section>
  );
}
