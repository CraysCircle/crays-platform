"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { defaultRole, type RoleKey } from "@/lib/roles";

type ReleaseGate = {
  key: string;
  label: string;
  status: "ready" | "pending" | "blocked";
  current: string;
  requiredFor: string;
};

type ReleaseReadinessPayload = {
  status: "ready" | "forbidden";
  readModel: {
    role: RoleKey;
    access: {
      allowed: boolean;
      reason: string;
    };
    offer: {
      offerId: string;
      propertyCaseId: string | null;
      title: string;
      market: string | null;
      status: string;
      candidateReleaseState: string;
      publicTeaserEnabled: boolean;
      partnerHandoffStatus: string;
      propertyCaseStatus: string | null;
      propertyCasePhase: string | null;
      propertyHandoffStatus: string | null;
    } | null;
    counts: {
      evidencePackages: number;
      releasableEvidencePackages: number;
      preparedOfferDocuments: number;
      approvedPreparedOfferDocuments: number;
      propertyCaseDocuments: number;
      approvedPropertyCaseDocuments: number;
      workflowEvents: number;
    };
    gates: ReleaseGate[];
    releaseDecision: {
      status: "not_ready" | "approval_required" | "already_released";
      readyForDecision: boolean;
      explicitDecisionRequired: boolean;
      requiredNextActions: string[];
    };
    liveBusinessRecordReturned: boolean;
    candidateReleaseEnabled: false;
    candidateReleasePerformed: boolean;
    candidatePrivateDataReturned: false;
    bankDataReturned: false;
    fileUploadEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    publicTeaserEnabled: boolean;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: ReleaseReadinessPayload; error: null }
  | { state: "error"; data: null; error: string };

const visibleRoles = new Set(["deal-manager", "reviewer", "crays-management", "admin"]);

function statusLabel(value: string | null | boolean) {
  return String(value ?? "none").replaceAll("_", " ");
}

function gateTone(status: ReleaseGate["status"]) {
  if (status === "ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "pending") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-rose-700/20 bg-rose-50 text-rose-950";
}

async function loadReadiness(role: RoleKey, signal?: AbortSignal) {
  const response = await fetch(`/api/crays/prepared-offers/release/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Candidate release readiness returned HTTP ${response.status}`);
  }

  return (await response.json()) as ReleaseReadinessPayload;
}

export function PreparedOfferReleaseReadinessPanel() {
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") ?? defaultRole) as RoleKey;
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const isVisible = visibleRoles.has(role);

  useEffect(() => {
    if (!isVisible) return;

    const controller = new AbortController();
    loadReadiness(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Candidate release readiness failed",
        });
      });

    return () => controller.abort();
  }, [isVisible, refreshKey, role]);

  const data = loadState.data?.readModel;
  const offer = data?.offer;
  const gates = data?.gates ?? [];
  const approvedDocuments = (data?.counts.approvedPreparedOfferDocuments ?? 0) + (data?.counts.approvedPropertyCaseDocuments ?? 0);
  const boundary = useMemo(
    () => [
      ["Ready for decision", data?.releaseDecision.readyForDecision ? "true" : "false"],
      ["Candidate release", data?.candidateReleaseEnabled ? "true" : "false"],
      ["Public release", data?.publicReleaseEnabled ? "true" : "false"],
      ["File upload", data?.fileUploadEnabled ? "true" : "false"],
      ["Provider calls", data?.providerCallsEnabled ? "true" : "false"],
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
              <BadgeCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Candidate release readiness</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">Prepared offer release gate</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Internal release checklist for reviewed offers before any Candidate-visible access is approved.
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
            ["Offer status", offer ? statusLabel(offer.status) : "..."],
            ["Release state", offer ? statusLabel(offer.candidateReleaseState) : "..."],
            ["Approved docs", loadState.state === "loading" ? "..." : String(approvedDocuments)],
            ["Decision", data ? statusLabel(data.releaseDecision.status) : "..."],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
              <strong className="mt-2 block break-words text-lg font-semibold">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid gap-3 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {loadState.state === "loading" ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="h-4 w-40 max-w-full rounded bg-[var(--surface-strong)]" />
                <div className="mt-3 h-3 w-full rounded bg-[var(--surface-strong)]" />
              </div>
            ))
          ) : gates.length ? (
            gates.map((gate) => (
              <div key={gate.key} className={`rounded-[8px] border p-4 ${gateTone(gate.status)}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{gate.label}</strong>
                  <span className="rounded-[7px] bg-white/70 px-2 py-1 text-xs font-semibold uppercase">{gate.status}</span>
                </div>
                <p className="mt-3 text-sm opacity-80">{gate.current}</p>
                <span className="mt-3 block text-xs font-semibold uppercase opacity-70">{gate.requiredFor}</span>
              </div>
            ))
          ) : (
            <div className="rounded-[8px] border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-muted)]">No prepared offer is ready for release review.</div>
          )}
        </div>
      </article>

      <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-[var(--accent)]" />
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
        <div className="mt-4 rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <strong className="text-sm">Scoped output</strong>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            Candidate-private data, bank data, uploads, provider calls and external sending remain disabled.
          </p>
        </div>
      </aside>
    </section>
  );
}
