"use client";

import {
  AlertTriangle,
  ArrowDown,
  CalendarRange,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ClubsQloBookingOperation } from "@/lib/clubs/qlo-booking-operations-contract";

type QloCounts = Readonly<{
  bookingRequests: number;
  bookingLifecycle: number;
  bookingChangeRequests: number;
}>;

type QloOperationsPayload = Readonly<{
  status: string;
  operations: readonly ClubsQloBookingOperation[];
  counts: QloCounts;
  readiness: Readonly<{
    assuranceLevel: "aal1" | "aal2" | "aal3";
    omittedUnsafeRecords: number;
    sourceIntegrity: "canonical_records_safe" | "unsafe_canonical_records_omitted";
  }>;
  paymentAuthority: false;
  providerAuthority: false;
  productionAuthority: false;
}>;

const endpoint = "/api/crays/clubs/team/qlo/booking-operations";

const operationLabels: Record<ClubsQloBookingOperation["kind"], string> = {
  booking_request: "Booking request",
  booking_lifecycle: "Booking / stay",
  booking_change_request: "Change request",
};

const queueAnchors: Record<ClubsQloBookingOperation["kind"], string> = {
  booking_request: "#booking-request-queue-title",
  booking_lifecycle: "#clubs-booking-lifecycle-title",
  booking_change_request: "#clubs-booking-lifecycle-title",
};

function safeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(parsed);
}

function displayState(value: string) {
  return value.replaceAll("_", " ");
}

function OperationCard({ operation }: { operation: ClubsQloBookingOperation }) {
  const readyActions = operation.nextActions.filter((action) => action.ready);
  const stayLabel = operation.stay
    ? `${operation.stay.arrivalDate} → ${operation.stay.departureDate}`
    : operation.hold
      ? `${displayState(operation.hold.status)} hold${operation.hold.expired ? " · expired" : ""}`
      : operation.change
        ? `${displayState(operation.change.type)} change`
        : null;

  return (
    <article className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(16,37,45,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-petrol)]">
            {operationLabels[operation.kind]}
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-[var(--foreground)]">
            {operation.publicReference}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold capitalize">
          {displayState(operation.status)}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted-foreground)]">Property / unit</dt>
          <dd className="mt-1 truncate font-mono font-semibold">
            {[operation.propertyId, operation.stayUnit].filter(Boolean).join(" · ") || "Not projected"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted-foreground)]">Current operation</dt>
          <dd className="mt-1 font-semibold">{stayLabel ?? "Canonical record"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted-foreground)]">Reconciliation</dt>
          <dd className="mt-1 font-semibold capitalize">{displayState(operation.reconcileState)}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted-foreground)]">Updated / effective</dt>
          <dd className="mt-1 font-semibold">{safeDate(operation.occurredAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
          {readyActions.length ? (
            <CheckCircle2 className="h-4 w-4 text-[var(--color-petrol)]" aria-hidden="true" />
          ) : (
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          )}
          {readyActions.length
            ? `${readyActions.length} authorized ${readyActions.length === 1 ? "action" : "actions"}`
            : operation.nextActions.length
              ? "Step-up required for next action"
              : "Read-only current state"}
        </span>
        <a href={queueAnchors[operation.kind]} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold transition hover:bg-[var(--surface-subtle)]">
          Open operating queue <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function QloBookingOperationsOverview() {
  const [payload, setPayload] = useState<QloOperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const body = await response.json().catch(() => null) as QloOperationsPayload | null;
      if (!response.ok || !body || !Array.isArray(body.operations) || !body.counts) {
        throw new Error(body?.status ?? "operator_projection_unavailable");
      }
      setPayload(body);
    } catch (reason) {
      setPayload(null);
      setError(reason instanceof Error ? reason.message : "operator_projection_unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pendingLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(pendingLoad);
  }, [load]);

  const total = payload
    ? payload.counts.bookingRequests
      + payload.counts.bookingLifecycle
      + payload.counts.bookingChangeRequests
    : 0;

  return (
    <section id="qlo-booking-operations" className="scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,#ffffff_0%,#f4f9f8_100%)] p-4 shadow-[0_10px_30px_rgba(16,37,45,0.04)] sm:p-5" aria-labelledby="qlo-booking-operations-title" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-petrol)]">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            Holiday Manager · QLO operations
          </p>
          <h2 id="qlo-booking-operations-title" className="mt-2 text-xl font-semibold">Live booking operations</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Tenant-scoped operator records from the existing CRAYS Booking Core/QLO contract. Commands remain in the authorized queues below.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-[#C8103E] bg-[#C8103E]/5 p-4 text-sm" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#C8103E]" aria-hidden="true" />
          <div>
            <p className="font-semibold">The QLO operator projection is not available.</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Safe status: {displayState(error)}. No fallback or mock records are shown.</p>
          </div>
        </div>
      ) : null}

      {loading && !payload ? (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-white" role="status" aria-live="polite">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-petrol)]" aria-hidden="true" />
          <span className="ml-2 text-sm">Loading authorized QLO operations…</span>
        </div>
      ) : payload ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="QLO operation counts">
            {[
              ["Booking requests", payload.counts.bookingRequests],
              ["Bookings & stays", payload.counts.bookingLifecycle],
              ["Change requests", payload.counts.bookingChangeRequests],
              ["Total operations", total],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-[var(--border)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-3 text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-petrol)]" aria-hidden="true" />
              {payload.readiness.sourceIntegrity === "canonical_records_safe"
                ? "Canonical source integrity PASS"
                : `${payload.readiness.omittedUnsafeRecords} unsafe records omitted`}
            </span>
            <span>Assurance: {payload.readiness.assuranceLevel.toUpperCase()}</span>
            <span>Provider and payment authority remain separate; payments are payment_setup_pending.</span>
          </div>

          {payload.operations.length ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {payload.operations.slice(0, 6).map((operation) => (
                <OperationCard key={operation.operationReference} operation={operation} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-white p-6 text-center">
              <ShieldCheck className="mx-auto h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">No authorized booking operations</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">The live tenant scope is active and currently contains no safe QLO operator records.</p>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
