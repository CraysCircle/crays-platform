"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, DatabaseZap, LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react";

type Candidate = {
  bookingId: string; bookingVersion: number; bookingStatus: string; publicReference: string;
  propertyName: string; unitCode: string; arrivalDate: string; departureDate: string;
  reservedCapacity: number; expectedNightCount: number; allocationCount: number; releaseCount: number;
};
type RecoveryCase = {
  caseId: string; bookingIds: string[]; localDates: string[]; blockerCodes: string[];
  dueAt: string; expiresAt: string; nextSafeAction: string; state: string;
};
type QueuePayload = { candidates?: Candidate[]; recoveryCases?: RecoveryCase[] };

export function LegacyCapacityRecoveryQueue() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const commandKeys = useRef(new Map<string,string>());

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/crays/clubs/team/capacity-recovery", { cache: "no-store", signal: controller.signal });
      const payload = await response.json() as QueuePayload & { status?: string };
      if (response.status === 403 && payload.status === "capacity_reconciliation_authority_required") {
        setCandidates([]); setCases([]);
        setError("Capacity reconciliation is closed because the exact capability or current Store assignment is not active.");
        return;
      }
      if (!response.ok || !Array.isArray(payload.candidates) || !Array.isArray(payload.recoveryCases)) throw new Error("unavailable");
      setCandidates(payload.candidates); setCases(payload.recoveryCases);
    } catch {
      if (!controller.signal.aborted) {
        setCandidates([]); setCases([]);
        setError("Capacity reconciliation is temporarily unavailable. No cached result is shown.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(task); activeRequest.current?.abort(); };
  }, [load]);

  async function admit(candidate: Candidate) {
    const key = commandKeys.current.get(candidate.bookingId)
      ?? `clubs-capacity-admission-${crypto.randomUUID()}`;
    commandKeys.current.set(candidate.bookingId,key);
    setRunning(candidate.bookingId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/crays/clubs/team/capacity-recovery", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({
          type: "admit_legacy_capacity_component",
          bookingId: candidate.bookingId,
          expectedBookingVersion: candidate.bookingVersion,
        }),
      });
      const payload = await response.json() as { status?: string; receipt?: { admittedBookingCount?: number; admittedMovementCount?: number } };
      if (response.status === 403 && payload.status === "step_up_required") {
        setError("Microsoft MFA/AAL2 is required before this capacity command can run. No write was attempted.");
      } else if (response.status === 403) {
        commandKeys.current.delete(candidate.bookingId);
        setError("The exact capacity capability or Store assignment is no longer active. No Ledger movement was admitted.");
      } else if (response.status === 409) {
        commandKeys.current.delete(candidate.bookingId);
        setError("The Booking changed or the command key conflicted. Reload before deciding again.");
      } else if (!response.ok) {
        setError("The outcome is unknown. Reload reconciliation before issuing a new command.");
      } else if (payload.status === "recovery_required") {
        commandKeys.current.delete(candidate.bookingId);
        setNotice("The component was not admitted. Its exact blockers are now durable in the recovery queue.");
      } else {
        commandKeys.current.delete(candidate.bookingId);
        setNotice(`Capacity provenance admitted: ${payload.receipt?.admittedBookingCount ?? 0} Bookings and ${payload.receipt?.admittedMovementCount ?? 0} day movements.`);
      }
      await load();
    } catch {
      setError("The outcome is unknown. Reload reconciliation before issuing a new command.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_30px_rgba(16,37,45,0.04)] sm:p-5" aria-labelledby="clubs-capacity-recovery-title" aria-busy={loading || Boolean(running)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-petrol)]">Booking Core integrity</p>
          <h2 id="clubs-capacity-recovery-title" className="mt-2 text-lg font-semibold">Legacy capacity reconciliation</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Admit only a fully proven overlapping Booking component into the append-only Capacity Ledger. Inventory counters are verified, never rewritten by this action.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || Boolean(running)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />Refresh</button>
      </div>
      {error ? <div className="mt-4 flex gap-2 rounded-lg border border-[#C8103E]/30 bg-[#C8103E]/5 p-3 text-sm" role="alert"><AlertTriangle className="h-5 w-5 shrink-0 text-[#C8103E]" aria-hidden="true" />{error}</div> : null}
      {notice ? <div className="mt-4 rounded-lg border border-[var(--color-petrol)]/25 bg-[var(--color-petrol)]/5 p-3 text-sm" role="status">{notice}</div> : null}
      {loading ? <div className="mt-4 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)]"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />Loading exact capacity provenance…</div> : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Admission candidates <span className="text-[var(--muted-foreground)]">({candidates.length})</span></h3>
            {!candidates.length ? <p className="mt-2 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">No authorized active Booking currently has incomplete Capacity Ledger provenance.</p> : <ol className="mt-2 space-y-2">{candidates.map((candidate) => <li key={candidate.bookingId} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{candidate.publicReference} · {candidate.propertyName}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{candidate.unitCode} · {candidate.arrivalDate} to {candidate.departureDate} · {candidate.reservedCapacity} capacity · {candidate.allocationCount}/{candidate.expectedNightCount} allocations</p></div><button type="button" onClick={() => void admit(candidate)} disabled={Boolean(running)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-petrol)] px-3 text-sm font-semibold text-white disabled:opacity-50">{running === candidate.bookingId ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <DatabaseZap className="h-4 w-4" aria-hidden="true" />}Preflight and admit component</button></div>
            </li>)}</ol>}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recovery attention <span className="text-[var(--muted-foreground)]">({cases.length})</span></h3>
            {!cases.length ? <p className="mt-2 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">No unresolved capacity evidence case is assigned to this exact Store scope.</p> : <ol className="mt-2 space-y-2">{cases.map((item) => <li key={item.caseId} className="rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />{item.blockerCodes.join(", ")}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.bookingIds.length} Booking(s) · {item.localDates.length} day(s) · due {new Date(item.dueAt).toLocaleString()} · {item.nextSafeAction}</p><p className="mt-2 break-all font-mono text-[11px] text-[var(--muted-foreground)]">{item.caseId}</p>
            </li>)}</ol>}
          </div>
        </div>
      )}
    </section>
  );
}
