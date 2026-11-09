"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { useClubsCommandReconciliation } from "@/lib/clubs/use-command-reconciliation";
import { parseShiftWorkItemFocus, shiftWorkItemFocusDomId } from "@/lib/clubs/shift-work-item-focus";
import { ShiftFocusReturnLink } from "@/components/clubs/shift-focus-return-link";

type QueueItem = {
  bookingRequestId: string;
  publicReference: string;
  propertyId: string;
  unitId: string;
  status: "submitted" | "under_review";
  version: number;
  submittedAt: string;
  holdStatus: string;
  holdExpiresAt: string;
  holdIsExpired: boolean;
  currency: string;
  totalMinor: string;
  nextActions: Array<"begin_review" | "accept" | "reject">;
  reservationStatus: null;
  bookingStatus: null;
  paymentStatus: null;
};

function money(minor: string, currency: string) {
  const value = BigInt(minor);
  const major = value / BigInt(100);
  const cents = (value % BigInt(100)).toString().padStart(2, "0");
  return `${currency} ${major.toLocaleString("en-GB")}.${cents}`;
}

function QueueCard({
  item,
  pending,
  focused,
  staleFocusBlocked,
  focusWorkItemId,
  onAction,
}: {
  item: QueueItem;
  pending: boolean;
  focused: boolean;
  staleFocusBlocked: boolean;
  focusWorkItemId?: string;
  onAction: (item: QueueItem, action: QueueItem["nextActions"][number], reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<QueueItem["nextActions"][number]>(
    item.nextActions[0],
  );
  const holdExpired = item.holdIsExpired;

  return (
    <article
      id={focused && focusWorkItemId ? shiftWorkItemFocusDomId(focusWorkItemId) : undefined}
      tabIndex={focused ? -1 : undefined}
      data-shift-record-focus={focused ? "exact" : undefined}
      className={`rounded-xl border bg-white p-4 shadow-[0_8px_24px_rgba(16,37,45,0.04)] outline-none ${focused ? "border-[var(--color-petrol)] ring-4 ring-[var(--color-petrol)]/20" : "border-[var(--border)]"}`}
    >
      {focused ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-petrol)]/30 bg-[var(--color-petrol)]/5 p-3 text-xs" role="status">
          <span className="font-semibold text-[var(--color-petrol)]">Exact Today record · v{item.version}</span>
          <ShiftFocusReturnLink className="font-semibold text-[var(--color-petrol)] underline" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-[var(--color-petrol)]">{item.publicReference}</p>
          <h3 className="mt-1 font-semibold">Booking Request</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Submitted {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.submittedAt))}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.status === "submitted" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {item.status === "submitted" ? "New" : "Under review"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-[var(--border)] py-4 text-sm">
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Property</dt>
          <dd className="mt-1 truncate font-mono text-xs">{item.propertyId}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Unit</dt>
          <dd className="mt-1 truncate font-mono text-xs">{item.unitId}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Frozen Quote</dt>
          <dd className="mt-1 font-semibold">{money(item.totalMinor, item.currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted-foreground)]">Inventory Hold</dt>
          <dd className={`mt-1 font-semibold ${holdExpired || item.holdStatus !== "active" ? "text-amber-800" : "text-[var(--color-petrol)]"}`}>
            {holdExpired ? "Expired" : item.holdStatus}
          </dd>
        </div>
      </dl>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        Request only. Accepting this review does not create a Reservation, confirm a Booking or settle payment.
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
        <label>
          <span className="sr-only">Review action</span>
          <select disabled={staleFocusBlocked} value={action} onChange={(event) => setAction(event.target.value as typeof action)} className="h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm disabled:opacity-50">
            {item.nextActions.map((value) => (
              <option key={value} value={value}>
                {value === "begin_review" ? "Begin review" : value === "accept" ? "Accept request" : "Reject request"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Decision reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Decision reason"
            maxLength={500}
            disabled={staleFocusBlocked}
            className="h-11 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={staleFocusBlocked || pending || reason.trim().length < 3}
          onClick={() => onAction(item, action, reason.trim())}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--foreground)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : action === "reject" ? <X className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          Apply
        </button>
      </div>
    </article>
  );
}

export function BookingRequestQueue({ focusWorkItemId }: { focusWorkItemId?: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const commandKeys = useClubsCommandReconciliation();
  const parsedFocus = useMemo(() => parseShiftWorkItemFocus(focusWorkItemId), [focusWorkItemId]);
  const requestFocus = parsedFocus?.kind === "request" ? parsedFocus : null;
  const focusedItem = requestFocus
    ? items.find((item) => item.bookingRequestId === requestFocus.recordId && item.version === requestFocus.version)
    : undefined;
  const currentFocusedItem = requestFocus
    ? items.find((item) => item.bookingRequestId === requestFocus.recordId)
    : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const focusQuery = requestFocus ? `?focus=${encodeURIComponent(requestFocus.raw)}` : "";
      const response = await fetch(`/api/crays/clubs/team/booking-requests${focusQuery}`, {
        cache: "no-store",
      });
      const payload = await response.json() as {
        requests?: QueueItem[];
      };
      if (!response.ok || !payload.requests) {
        setError("Booking Request queue is temporarily unavailable.");
        return;
      }
      setItems(payload.requests);
    } catch {
      setError("Booking Request queue is temporarily unavailable. No cached queue is shown.");
    } finally {
      setLoading(false);
    }
  }, [requestFocus]);

  useEffect(() => {
    const pendingLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(pendingLoad);
  }, [load]);

  useEffect(() => {
    if (!requestFocus || loading || !focusedItem) return;
    const element = document.getElementById(shiftWorkItemFocusDomId(requestFocus.raw));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  }, [focusedItem, loading, requestFocus]);

  async function apply(
    item: QueueItem,
    action: QueueItem["nextActions"][number],
    reason: string,
  ) {
    const commandScope = `booking-review:${action}:${item.bookingRequestId}`;
    setPendingId(item.bookingRequestId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/crays/clubs/team/booking-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": commandKeys.acquire(commandScope, "clubs-booking-review"),
        },
        body: JSON.stringify({
          type: action,
          requestId: item.bookingRequestId,
          expectedVersion: item.version,
          reason,
        }),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: {
          outcome: string;
          reason: string | null;
          resultingStatus: string | null;
          replayed: boolean;
        };
      };
      if (!response.ok || !payload.receipt) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setError(payload.receipt?.reason ?? payload.reason ?? "Review command failed.");
        return;
      }
      commandKeys.complete(commandScope);
      setNotice(
        `${payload.receipt.replayed ? "Replayed safely" : "Review persisted"} · ${payload.receipt.resultingStatus ?? payload.receipt.outcome}.`,
      );
      await load();
    } catch {
      setError("The review outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5" aria-labelledby="booking-request-queue-title" aria-busy={loading || pendingId !== null}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-petrol)]">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Prioritized queue
          </p>
          <h2 id="booking-request-queue-title" className="mt-2 text-lg font-semibold">Booking Requests</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Review customer intent without conflating it with reservation or payment authority.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>
      {error ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-[#C8103E] bg-[#C8103E]/5 p-4 text-sm text-[var(--foreground)]" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      {notice ? <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]" role="status">{notice}</p> : null}
      {requestFocus && !loading && !focusedItem ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          {currentFocusedItem
            ? `This Booking Request changed from v${requestFocus.version} to v${currentFocusedItem.version}. Refresh Today to reconcile the current state. `
            : "The exact Booking Request is no longer in this authorized queue. Refresh Today to reconcile the next safe action. "}
          <ShiftFocusReturnLink className="font-semibold underline" />
        </div>
      ) : null}
      {loading && !items.length ? (
        <div className="mt-4 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-white" role="status" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-petrol)]" aria-hidden="true" />
          <span className="ml-2 text-sm">Loading authorized requests…</span>
        </div>
      ) : !items.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-white p-6 text-center">
          <ShieldAlert className="mx-auto h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">No open Booking Requests</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">The queue contains no authorized submitted or under-review records.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <QueueCard
              key={item.bookingRequestId}
              item={item}
              pending={pendingId === item.bookingRequestId}
              focused={focusedItem?.bookingRequestId === item.bookingRequestId}
              staleFocusBlocked={Boolean(requestFocus && currentFocusedItem?.bookingRequestId === item.bookingRequestId && !focusedItem)}
              focusWorkItemId={focusWorkItemId}
              onAction={(target, action, reason) => void apply(target, action, reason)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
