"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BedDouble, ClipboardCheck, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { parseShiftWorkItemFocus } from "@/lib/clubs/shift-work-item-focus";

type ShiftItem = {
  workItemId: string;
  sortKey: string;
  kind: "request" | "arrival" | "departure" | "in_house" | "service" | "entitlement";
  publicReference: string;
  propertyId: string;
  propertyName: string;
  unitId: string | null;
  status: string;
  version: number;
  priority: number;
  reasonCode: string;
  localBusinessDate: string;
  sourceAuthority: "crays-booking-core";
  paymentState: "not_asserted";
  returnCursor?: string | null;
};

function target(item: ShiftItem, currentSearch: string) {
  const anchor = item.kind === "request"
    ? "booking-request-queue-title"
    : item.kind === "service" || item.kind === "entitlement"
      ? "clubs-service-queue-title"
      : "clubs-booking-lifecycle-title";
  const params = new URLSearchParams(currentSearch);
  params.set("focus", item.workItemId);
  params.set("returnFocus", item.workItemId);
  if (item.returnCursor) params.set("shiftCursor", item.returnCursor);
  else params.delete("shiftCursor");
  return `/en/clubs/operations?${params.toString()}#${anchor}`;
}

function label(item: ShiftItem) {
  return {
    request: item.reasonCode === "inventory_hold_reconciliation_required" ? "Reconcile Booking Request Hold" : "Review Booking Request",
    arrival: item.reasonCode === "overdue_arrival_no_show_decision_required"
      ? "Overdue arrival — decide no-show"
      : "Arrival today",
    departure: "Departure today",
    in_house: "Guest currently in house",
    service: "Service request",
    entitlement: "Access entitlement",
  }[item.kind];
}

function icon(kind: ShiftItem["kind"]) {
  if (kind === "request") return <ClipboardCheck className="h-4 w-4" aria-hidden="true" />;
  if (kind === "service" || kind === "entitlement") return <KeyRound className="h-4 w-4" aria-hidden="true" />;
  return <BedDouble className="h-4 w-4" aria-hidden="true" />;
}

export function HolidayManagerTodayQueue() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ShiftItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const requestGeneration = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const restoredReturnFocus = useRef<string | null>(null);

  const initialCursor = searchParams.get("shiftCursor");
  const returnFocusRaw = searchParams.get("returnFocus");
  const returnFocus = useMemo(() => parseShiftWorkItemFocus(returnFocusRaw), [returnFocusRaw]);
  const recoveryParams = new URLSearchParams(searchParams.toString());
  recoveryParams.delete("focus");
  recoveryParams.delete("returnFocus");
  recoveryParams.delete("shiftCursor");
  const recoveryQuery = recoveryParams.toString();
  const recoveryHref = `/en/clubs/operations${recoveryQuery ? `?${recoveryQuery}` : ""}#clubs-today-queue-title`;
  const load = useCallback(async (cursor: string | null = null, replace = false) => {
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (cursor && !replace) setLoadingMore(true);
    else setLoading(true);
    setError("");
    setPageError("");
    try {
      const query = new URLSearchParams({ limit: "50" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/crays/clubs/team/shift?${query}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json() as {
        status?: string;
        items?: ShiftItem[];
        totalCount?: number;
        truncated?: boolean;
        nextCursor?: string | null;
        snapshotAt?: string;
      };
      if (response.status === 403) throw new Error("shift_scope_denied");
      if (response.status === 410 && payload.status === "shift_snapshot_expired") {
        throw new Error("shift_snapshot_expired");
      }
      if (!response.ok || !payload.items || typeof payload.totalCount !== "number") {
        throw new Error("shift_queue_unavailable");
      }
      if (requestGeneration.current !== generation) return;
      const pageItems = payload.items.map((item) => ({ ...item, returnCursor: cursor }));
      setItems((current) => cursor && !replace
        ? [...new Map([...current, ...pageItems].map((item) => [item.sortKey, item])).values()]
        : pageItems);
      setTotalCount(payload.totalCount);
      setTruncated(payload.truncated === true);
      setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null);
      setSnapshotAt(typeof payload.snapshotAt === "string" ? payload.snapshotAt : "");
    } catch (cause) {
      if (controller.signal.aborted || requestGeneration.current !== generation) return;
      if (!cursor || replace) {
        setItems([]);
        setTotalCount(0);
        setTruncated(false);
        setNextCursor(null);
      }
      if (cursor && !replace) {
        setPageError("The next authorized queue page could not be loaded. Existing records remain visible; retry before claiming queue completion.");
      } else {
        const failure = cause instanceof Error ? cause.message : "shift_queue_unavailable";
        setError(
          failure === "shift_scope_denied"
            ? "Today is closed because the exact Holiday Manager reservation capability or current Store assignment is not active."
            : failure === "shift_snapshot_expired"
              ? "The Today snapshot expired. Recover from the first page before continuing."
              : "Today queue is temporarily unavailable. No cached or provider-side fallback work is shown.",
        );
      }
    } finally {
      if (requestGeneration.current !== generation) return;
      activeRequest.current = null;
      if (cursor && !replace) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pendingLoad = window.setTimeout(() => void load(initialCursor, true), 0);
    return () => {
      window.clearTimeout(pendingLoad);
      activeRequest.current?.abort();
    };
  }, [initialCursor, load]);

  useEffect(() => {
    if (window.location.hash !== "#clubs-today-queue-title" || loading) return;
    const restorationKey = returnFocus?.raw ?? "clubs-today-queue-title";
    if (restoredReturnFocus.current === restorationKey) return;
    const currentItem = returnFocus
      ? items.find((item) => {
        const parsed = parseShiftWorkItemFocus(item.workItemId);
        return parsed?.kind === returnFocus.kind && parsed.recordId === returnFocus.recordId;
      })
      : undefined;
    const targetId = currentItem
      ? `clubs-today-return-${encodeURIComponent(currentItem.workItemId)}`
      : "clubs-today-queue-title";
    const task = window.setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      element?.focus({ preventScroll: true });
      restoredReturnFocus.current = restorationKey;
    }, 0);
    return () => window.clearTimeout(task);
  }, [items, loading, returnFocus]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)] p-4 text-white shadow-[0_14px_38px_rgba(16,37,45,0.14)] sm:p-5" aria-labelledby="clubs-today-queue-title" aria-busy={loading || loadingMore}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Holiday Manager front desk</p>
          <h2 id="clubs-today-queue-title" tabIndex={-1} className="mt-2 text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/70">Today</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/70">Server-prioritized Store-local work from the authorized Booking Core scope. Payment and provider completion are not asserted.</p>
        </div>
        <button type="button" onClick={() => void load(null)} disabled={loading || loadingMore} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-semibold disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>
      {error ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-red-300/70 bg-red-950/40 p-4 text-sm" role="alert"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{error}{initialCursor ? <> <a href={recoveryHref} className="inline-flex min-h-11 items-center font-semibold underline">Recover from the first Today page</a></> : null}</span></div>
      ) : loading && !items.length ? (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-white/25" role="status" aria-live="polite"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /><span className="ml-2 text-sm">Loading authorized front-desk work…</span></div>
      ) : !items.length ? (
        <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-sm">No authorized Booking, arrival, departure, in-house or service record currently needs action.</div>
      ) : (
        <>
          <p className="mt-4 text-sm text-white/70">{totalCount} prioritized {totalCount === 1 ? "record" : "records"}{snapshotAt ? ` · snapshot ${new Date(snapshotAt).toLocaleString()}` : ""}</p>
          <ol className="mt-3 grid gap-2">
            {items.map((item) => (
              <li
                key={item.workItemId}
              >
                <a id={`clubs-today-return-${encodeURIComponent(item.workItemId)}`} href={target(item, searchParams.toString())} className="grid min-h-11 gap-3 rounded-xl border border-white/15 bg-white p-3 text-[var(--foreground)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/70 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-800">{icon(item.kind)} P{item.priority}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{label(item)}</span><span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{item.publicReference} · {item.propertyName} · {item.localBusinessDate} · {item.status}</span></span>
                  <span className="text-xs font-semibold text-[var(--color-petrol)]">Open record</span>
                </a>
              </li>
            ))}
          </ol>
          {pageError ? <div className="mt-3 flex gap-3 rounded-lg border border-red-300/70 bg-red-950/40 p-3 text-xs text-white" role="alert"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{pageError}</span></div> : null}
          {truncated && nextCursor ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/20 p-3 text-xs text-white/75">
              <span>Showing {items.length} of {totalCount} globally prioritized records. Load every server-side cursor page before claiming queue completion.</span>
              <button type="button" onClick={() => void load(nextCursor)} disabled={loadingMore} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 font-semibold text-white disabled:opacity-50">
                {loadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {loadingMore ? "Loading next page" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
