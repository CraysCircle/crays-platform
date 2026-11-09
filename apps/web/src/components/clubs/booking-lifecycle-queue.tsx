"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useClubsCommandReconciliation } from "@/lib/clubs/use-command-reconciliation";
import { parseShiftWorkItemFocus, shiftWorkItemFocusDomId } from "@/lib/clubs/shift-work-item-focus";
import { ShiftFocusReturnLink } from "@/components/clubs/shift-focus-return-link";

type LifecycleRecord = {
  requestId: string;
  requestReference: string;
  requestVersion: number;
  bookingId: string | null;
  bookingReference: string | null;
  bookingStatus: string | null;
  bookingVersion: number | null;
  reservationStatus: string | null;
  stayId: string | null;
  stayStatus: string | null;
  stayVersion: number | null;
  propertyId: string;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  currency: string;
  totalMinor: string;
  paymentStatus: null;
  focusEligible: boolean;
  noShowEligible: boolean;
};

type Action =
  | "confirm_request"
  | "mark_ready"
  | "check_in"
  | "check_out"
  | "cancel_booking"
  | "mark_no_show";

function money(minor: string, currency: string) {
  const value = BigInt(minor);
  const major = value / BigInt(100);
  const cents = (value % BigInt(100)).toString().padStart(2, "0");
  return `${currency} ${major.toLocaleString("en-GB")}.${cents}`;
}

function actions(record: LifecycleRecord): Action[] {
  if (!record.bookingId) return ["confirm_request"];
  if (record.stayStatus === "not_started") {
    return record.noShowEligible
      ? ["mark_ready", "cancel_booking", "mark_no_show"]
      : ["mark_ready", "cancel_booking"];
  }
  if (record.stayStatus === "ready_for_check_in") {
    return record.noShowEligible
      ? ["check_in", "cancel_booking", "mark_no_show"]
      : ["check_in", "cancel_booking"];
  }
  if (record.stayStatus === "checked_in") return ["check_out"];
  return [];
}

function actionLabel(action: Action) {
  return {
    confirm_request: "Confirm reservation",
    mark_ready: "Ready for check-in",
    check_in: "Check in",
    check_out: "Check out",
    cancel_booking: "Cancel booking",
    mark_no_show: "Mark no-show",
  }[action];
}

export function BookingLifecycleQueue({ focusWorkItemId }: { focusWorkItemId?: string }) {
  const [records, setRecords] = useState<LifecycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const commandKeys = useClubsCommandReconciliation();
  const parsedFocus = useMemo(() => parseShiftWorkItemFocus(focusWorkItemId), [focusWorkItemId]);
  const lifecycleFocus = parsedFocus && ["arrival", "departure", "in_house"].includes(parsedFocus.kind)
    ? parsedFocus
    : null;
  const focusedRecord = lifecycleFocus
    ? records.find((record) => record.bookingId === lifecycleFocus.recordId
      && record.stayVersion === lifecycleFocus.version
      && record.focusEligible)
    : undefined;
  const currentFocusedRecord = lifecycleFocus
    ? records.find((record) => record.bookingId === lifecycleFocus.recordId)
    : undefined;
  const staleFocusedRecord = Boolean(lifecycleFocus && currentFocusedRecord && !focusedRecord);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const focusQuery = lifecycleFocus ? `?focus=${encodeURIComponent(lifecycleFocus.raw)}` : "";
      const response = await fetch(`/api/crays/clubs/team/booking-lifecycle${focusQuery}`, {
        cache: "no-store",
      });
      const payload = await response.json() as { records?: LifecycleRecord[] };
      if (!response.ok || !payload.records) {
        setError("Reservation and Stay operations are temporarily unavailable.");
        return;
      }
      setRecords(payload.records);
    } catch {
      setError("Reservation and Stay operations are unavailable. No cached records are shown.");
    } finally {
      setLoading(false);
    }
  }, [lifecycleFocus]);

  useEffect(() => {
    const pendingLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(pendingLoad);
  }, [load]);

  useEffect(() => {
    if (!lifecycleFocus || loading || !focusedRecord) return;
    const element = document.getElementById(shiftWorkItemFocusDomId(lifecycleFocus.raw));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  }, [focusedRecord, lifecycleFocus, loading]);

  async function apply(record: LifecycleRecord, action: Action, reason: string) {
    const target = record.bookingId ?? record.requestId;
    const commandScope = `booking-lifecycle:${action}:${target}`;
    setPendingId(target);
    setError("");
    setNotice("");
    const body =
      action === "confirm_request"
        ? { type: action, requestId: record.requestId, expectedVersion: record.requestVersion }
        : ["mark_ready", "check_in", "check_out"].includes(action)
          ? { type: action, stayId: record.stayId, expectedVersion: record.stayVersion, reason }
          : action === "mark_no_show"
            ? { type: action, bookingId: record.bookingId, expectedVersion: record.bookingVersion, expectedStayVersion: record.stayVersion, reason }
            : { type: action, bookingId: record.bookingId, expectedVersion: record.bookingVersion, reason };
    try {
      const response = await fetch("/api/crays/clubs/team/booking-lifecycle", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": commandKeys.acquire(commandScope, "clubs-booking-lifecycle"),
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: { outcome: string; reason: string | null; resultingStatus: string | null; replayed: boolean };
      };
      if (!response.ok || !payload.receipt) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setError(payload.receipt?.reason ?? payload.reason ?? "Lifecycle command failed.");
        return;
      }
      commandKeys.complete(commandScope);
      setNotice(
        `${payload.receipt.replayed ? "Replayed safely" : "Command persisted"} · ${payload.receipt.resultingStatus ?? payload.receipt.outcome}.`,
      );
      await load();
    } catch {
      setError("The lifecycle outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_30px_rgba(16,37,45,0.04)] sm:p-5" aria-labelledby="clubs-booking-lifecycle-title" aria-busy={loading || pendingId !== null}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-petrol)]">
            <BedDouble className="h-4 w-4" aria-hidden="true" />
            Reservation operations
          </p>
          <h2 id="clubs-booking-lifecycle-title" className="mt-2 text-lg font-semibold">Bookings & Stays</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Confirm accepted intent, operate arrival and departure, and preserve separate payment authority.
          </p>
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
      {notice ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]" role="status">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {notice}
        </p>
      ) : null}
      {lifecycleFocus && !loading && !focusedRecord ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          {currentFocusedRecord
            ? currentFocusedRecord.stayVersion === lifecycleFocus.version
              ? "This Booking/Stay no longer matches the requested shift task. Refresh Today to reconcile the current state. "
              : `This Booking/Stay changed from v${lifecycleFocus.version} to v${currentFocusedRecord.stayVersion ?? "unavailable"}. Refresh Today to reconcile the current state. `
            : "The exact Booking/Stay is no longer in this authorized queue. Refresh Today to reconcile the next safe action. "}
          <ShiftFocusReturnLink className="font-semibold underline" />
        </div>
      ) : null}
      {loading && !records.length ? (
        <div className="mt-4 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)]" role="status" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-petrol)]" aria-hidden="true" />
          <span className="ml-2 text-sm">Loading authorized lifecycle records…</span>
        </div>
      ) : !records.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center">
          <ShieldAlert className="mx-auto h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">No active lifecycle work</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">No authorized accepted Request, active Booking or current Stay needs action.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-[880px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Record</th>
                <th className="px-4 py-3 font-semibold">Stay</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Frozen Quote</th>
                <th className="px-4 py-3 font-semibold">Next safe action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {records.map((record) => {
                const availableActions = actions(record);
                const rowId = record.bookingId ?? record.requestId;
                return (
                  <tr
                    key={rowId}
                    id={focusedRecord && lifecycleFocus && rowId === focusedRecord.bookingId ? shiftWorkItemFocusDomId(lifecycleFocus.raw) : undefined}
                    tabIndex={focusedRecord && rowId === focusedRecord.bookingId ? -1 : undefined}
                    data-shift-record-focus={focusedRecord && rowId === focusedRecord.bookingId ? "exact" : undefined}
                    className={focusedRecord && rowId === focusedRecord.bookingId ? "align-top bg-[var(--color-petrol)]/5 outline-none ring-4 ring-inset ring-[var(--color-petrol)]/20" : "align-top"}
                  >
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-semibold text-[var(--color-petrol)]">{record.bookingReference ?? record.requestReference}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{record.bookingId ? "Booking" : "Accepted Request"}</p>
                      {focusedRecord && rowId === focusedRecord.bookingId ? <ShiftFocusReturnLink className="mt-2 inline-flex text-xs font-semibold text-[var(--color-petrol)] underline" /> : null}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{record.arrivalDate} → {record.departureDate}</p>
                      <p className="mt-1 max-w-48 truncate font-mono text-xs text-[var(--muted-foreground)]">{record.unitId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs font-semibold">
                        {record.stayStatus ?? "Awaiting confirmation"}
                      </span>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Payment: not asserted</p>
                    </td>
                    <td className="px-4 py-4 font-semibold">{money(record.totalMinor, record.currency)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {availableActions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            disabled={pendingId === rowId || (staleFocusedRecord && currentFocusedRecord?.bookingId === rowId)}
                            onClick={() => void apply(record, action, `${actionLabel(action)} authorized by Holiday Manager`)}
                            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-50 ${["cancel_booking", "mark_no_show"].includes(action) ? "bg-[#C8103E]" : "bg-[var(--foreground)]"}`}
                          >
                            {pendingId === rowId ? <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                            {actionLabel(action)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
