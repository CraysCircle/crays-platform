"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useClubsCommandReconciliation } from "@/lib/clubs/use-command-reconciliation";

type Unit = {
  recordId: string;
  propertyId: string;
  name: string;
  code: string;
};

type InventoryReadModel = {
  status: "ready" | "empty";
  unit: {
    unitId: string;
    propertyId: string;
    name: string;
    code: string;
  };
  calendar: null | {
    calendarId: string;
    timezone: string;
    capacityModel: "exclusive_unit" | "sellable_count";
    defaultCapacity: number;
    lifecycle: string;
    version: number;
  };
  days: Array<{
    date: string;
    availabilityState: "open" | "closed";
    totalCapacity: number;
    heldCapacity: number;
    bookedCapacity: number;
    availableCapacity: number;
    minimumStayNights: number | null;
    maximumStayNights: number | null;
    arrivalAllowed: boolean;
    departureAllowed: boolean;
    version: number;
  }>;
};

const weekdays = [
  { label: "Sun", bit: 1 },
  { label: "Mon", bit: 2 },
  { label: "Tue", bit: 4 },
  { label: "Wed", bit: 8 },
  { label: "Thu", bit: 16 },
  { label: "Fri", bit: 32 },
  { label: "Sat", bit: 64 },
];

function isoOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function UnitInventoryCalendar({
  unit,
  onClose,
}: {
  unit: Unit;
  onClose: () => void;
}) {
  const [readModel, setReadModel] = useState<InventoryReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [startsOn, setStartsOn] = useState(isoOffset(0));
  const [endsOn, setEndsOn] = useState(isoOffset(60));
  const [capacity, setCapacity] = useState(1);
  const [minimumStay, setMinimumStay] = useState(1);
  const [maximumStay, setMaximumStay] = useState(30);
  const [availabilityState, setAvailabilityState] = useState<"open" | "closed">("open");
  const [weekdaysBitmask, setWeekdaysBitmask] = useState(127);
  const commandKeys = useClubsCommandReconciliation();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      propertyId: unit.propertyId,
      unitId: unit.recordId,
      from: isoOffset(-7),
      until: isoOffset(85),
    });
    try {
      const response = await fetch(`/api/crays/clubs/team/inventory?${params}`, {
        cache: "no-store",
      });
      const payload = await response.json() as {
        reason?: string;
        readModel?: InventoryReadModel;
      };
      if (!response.ok || !payload.readModel) {
        setError(payload.reason ?? "Availability could not be loaded.");
        return;
      }
      setReadModel(payload.readModel);
      setCapacity(payload.readModel.calendar?.defaultCapacity ?? 1);
    } catch {
      setError("Availability is temporarily unavailable. No cached values are shown.");
    } finally {
      setLoading(false);
    }
  }, [unit.propertyId, unit.recordId]);

  useEffect(() => {
    const pendingLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(pendingLoad);
  }, [load]);

  const events = useMemo(
    () => (readModel?.days ?? []).map((day) => ({
      id: `${unit.recordId}:${day.date}`,
      start: day.date,
      allDay: true,
      title:
        day.availabilityState === "closed"
          ? "Closed"
          : `${day.availableCapacity} available`,
      backgroundColor:
        day.availabilityState === "closed"
          ? "#9ca3af"
          : day.availableCapacity === 0
            ? "#b45309"
            : "#0f766e",
      borderColor: "transparent",
      extendedProps: day,
    })),
    [readModel?.days, unit.recordId],
  );

  function toggleWeekday(bit: number) {
    setWeekdaysBitmask((current) => {
      const next = current ^ bit;
      return next || current;
    });
  }

  async function publish() {
    const commandScope = `inventory-publish:${unit.recordId}`;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/crays/clubs/team/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: unit.propertyId,
          unitId: unit.recordId,
          expectedCalendarVersion: readModel?.calendar?.version ?? 0,
          defaultCapacity: capacity,
          projectedFrom: startsOn,
          projectedUntil: endsOn,
          changeReason: "Holiday Manager availability publication",
          idempotencyKey: commandKeys.acquire(commandScope, "clubs-inventory"),
          rules: [{
            priority: 100,
            startsOn,
            endsOn,
            weekdaysBitmask,
            availabilityState,
            capacityOverride: availabilityState === "closed" ? 0 : capacity,
            minimumStayNights: availabilityState === "open" ? minimumStay : null,
            maximumStayNights: availabilityState === "open" ? maximumStay : null,
            arrivalAllowed: availabilityState === "open",
            departureAllowed: availabilityState === "open",
          }],
        }),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: {
          outcome: string;
          replayed: boolean;
          reason: string | null;
          projectedDayCount: number;
          projectionSha256: string | null;
        };
      };
      if (!response.ok || !payload.receipt) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setError(
          payload.receipt?.reason
          ?? payload.reason
          ?? (response.status === 409
            ? "The calendar changed. Reload and review before publishing again."
            : "Availability publication failed."),
        );
        return;
      }
      commandKeys.complete(commandScope);
      setNotice(
        `${payload.receipt.replayed ? "Replayed safely" : "Published"} · ${payload.receipt.projectedDayCount} days · receipt ${payload.receipt.projectionSha256?.slice(0, 12) ?? "pending"}…`,
      );
      await load();
    } catch {
      setError("The publication outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setSaving(false);
    }
  }

  async function checkAvailability() {
    const commandScope = `availability-check:${unit.recordId}`;
    setChecking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/crays/clubs/team/availability/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: unit.propertyId,
          unitId: unit.recordId,
          arrivalDate: startsOn,
          departureDate: endsOn,
          requestedCapacity: capacity,
          idempotencyKey: commandKeys.acquire(commandScope, "clubs-availability"),
        }),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: {
          outcome: string;
          reason: string | null;
          lockedNightCount: number;
          minimumRemainingCapacity: number | null;
          inventorySnapshotSha256: string | null;
          replayed: boolean;
        };
      };
      if (!response.ok || !payload.receipt) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setError(payload.receipt?.reason ?? payload.reason ?? "Availability check failed.");
        return;
      }
      if (payload.receipt.outcome !== "available") {
        commandKeys.complete(commandScope);
        setError(`Not available: ${payload.receipt.reason ?? "inventory constraints"}.`);
        return;
      }
      commandKeys.complete(commandScope);
      setNotice(
        `${payload.receipt.replayed ? "Replayed safely" : "Transactionally checked"} · ${payload.receipt.lockedNightCount} nights · minimum ${payload.receipt.minimumRemainingCapacity ?? 0} remaining · ${payload.receipt.inventorySnapshotSha256?.slice(0, 12) ?? "receipt"}…`,
      );
    } catch {
      setError("The availability outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section
      className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-busy={loading || checking || saving}
      aria-labelledby="inventory-title"
    >
      <div className="flex h-full w-full max-w-[980px] flex-col overflow-hidden bg-[var(--background)] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-petrol)]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Inventory calendar
            </p>
            <h2 id="inventory-title" className="mt-1 truncate text-xl font-semibold tracking-[-0.025em]">
              {unit.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">{unit.code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inventory calendar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white transition hover:bg-[var(--surface-subtle)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_330px] lg:overflow-hidden">
          <main className="min-w-0 p-4 sm:p-6 lg:overflow-y-auto">
            {loading ? (
              <div className="flex min-h-80 items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
                <LoaderCircle className="h-6 w-6 animate-spin text-[var(--color-petrol)]" aria-hidden="true" />
                <span className="ml-3 text-sm font-medium">Loading authoritative inventory…</span>
              </div>
            ) : error && !readModel ? (
              <div className="rounded-2xl border border-[#C8103E] bg-[#C8103E]/5 p-6" role="alert">
                <AlertTriangle className="h-6 w-6 text-[#C8103E]" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-[var(--foreground)]">Inventory unavailable</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{error}</p>
                <button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8103E] bg-white px-4 text-sm font-semibold text-[#C8103E]">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Timezone</p>
                    <p className="mt-2 text-sm font-semibold">{readModel?.calendar?.timezone ?? "Inherited on first publish"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Calendar version</p>
                    <p className="mt-2 text-sm font-semibold">v{readModel?.calendar?.version ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Projected days</p>
                    <p className="mt-2 text-sm font-semibold">{readModel?.days.length ?? 0}</p>
                  </div>
                </div>
                {readModel?.status === "empty" ? (
                  <div className="mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted-foreground)]">
                    No inventory has been published for this Unit. Define the first governed rule on the right.
                  </div>
                ) : null}
                <div className="rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[0_10px_30px_rgba(16,37,45,0.04)] sm:p-5">
                  <FullCalendar
                    plugins={[dayGridPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,listMonth",
                    }}
                    events={events}
                    height="auto"
                    eventDisplay="block"
                    dayMaxEvents={3}
                    nowIndicator
                  />
                </div>
              </>
            )}
          </main>

          <aside className="border-t border-[var(--border)] bg-white p-5 sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--color-petrol)]" aria-hidden="true" />
              <h3 className="font-semibold">Publish availability</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Previewed dates are resolved in the Store timezone. Publishing creates a versioned rule set and durable receipt.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Start date
                <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className="h-11 rounded-lg border border-[var(--border)] px-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                End date
                <input type="date" value={endsOn} min={startsOn} onChange={(event) => setEndsOn(event.target.value)} className="h-11 rounded-lg border border-[var(--border)] px-3" />
              </label>
              <fieldset>
                <legend className="text-sm font-medium">Operating days</legend>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {weekdays.map((day) => {
                    const active = (weekdaysBitmask & day.bit) !== 0;
                    return (
                      <button
                        key={day.bit}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleWeekday(day.bit)}
                        className={`min-h-11 rounded-lg border px-2 text-xs font-semibold transition ${active ? "border-[var(--color-petrol)] bg-[var(--color-petrol)] text-white" : "border-[var(--border)] bg-white"}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="grid gap-1.5 text-sm font-medium">
                State
                <select value={availabilityState} onChange={(event) => setAvailabilityState(event.target.value as "open" | "closed")} className="h-11 rounded-lg border border-[var(--border)] bg-white px-3">
                  <option value="open">Open for booking</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Sellable capacity
                <input type="number" min={1} max={10000} disabled={availabilityState === "closed"} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="h-11 rounded-lg border border-[var(--border)] px-3 disabled:bg-[var(--surface-subtle)]" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Min. nights
                  <input type="number" min={1} max={3650} disabled={availabilityState === "closed"} value={minimumStay} onChange={(event) => setMinimumStay(Number(event.target.value))} className="h-11 min-w-0 rounded-lg border border-[var(--border)] px-3 disabled:bg-[var(--surface-subtle)]" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Max. nights
                  <input type="number" min={minimumStay} max={3650} disabled={availabilityState === "closed"} value={maximumStay} onChange={(event) => setMaximumStay(Number(event.target.value))} className="h-11 min-w-0 rounded-lg border border-[var(--border)] px-3 disabled:bg-[var(--surface-subtle)]" />
                </label>
              </div>
            </div>

            {error && readModel ? (
              <div className="mt-5 rounded-lg border border-[#C8103E] bg-[#C8103E]/5 p-3 text-sm text-[var(--foreground)]" role="alert">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="mt-5 flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]" role="status">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{notice}</span>
              </div>
            ) : null}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={checking || saving || loading || !readModel?.calendar || endsOn <= startsOn}
                onClick={() => void checkAvailability()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-petrol)] bg-white px-4 text-sm font-semibold text-[var(--color-petrol)] transition hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                Check stay transactionally
              </button>
              <button
                type="button"
                disabled={saving || checking || loading || endsOn < startsOn || maximumStay < minimumStay}
                onClick={() => void publish()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-petrol)] px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                Publish and project
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
