"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useClubsCommandReconciliation } from "@/lib/clubs/use-command-reconciliation";
import { parseShiftWorkItemFocus, shiftWorkItemFocusDomId } from "@/lib/clubs/shift-work-item-focus";
import { ShiftFocusReturnLink } from "@/components/clubs/shift-focus-return-link";

type RecordItem = {
  selectionId: string | null;
  selectionReference: string | null;
  selectionStatus: string | null;
  selectionVersion: number | null;
  displayName: string | null;
  serviceType: string | null;
  chargeMode: string | null;
  quantity: number | null;
  bookingId: string;
  bookingReference: string;
  bookingAccountId: string;
  stayStatus: string;
  arrivalDate: string;
  departureDate: string;
  entitlementId: string | null;
  entitlementReference: string | null;
  entitlementStatus: string | null;
  entitlementVersion: number | null;
  scopeKey: string | null;
  validFrom: string | null;
  validUntil: string | null;
  paymentStatus: null;
  providerCredential: null;
};

type Offering = {
  offeringId: string;
  propertyId: string;
  serviceCode: string;
  serviceType: "add_on" | "hospitality_service" | "access_pass";
  displayName: string;
  fulfillmentMode: "scheduled" | "on_request" | "entitlement";
  chargeMode: "included" | "commerce";
  lifecycle: "draft" | "published" | "suspended" | "archived";
  version: number;
};

type Command =
  | "confirm_service"
  | "fulfil_service"
  | "issue_entitlement"
  | "activate_entitlement"
  | "suspend_entitlement"
  | "revoke_entitlement"
  | "consume_entitlement";

function nextActions(item: RecordItem): Command[] {
  if (item.selectionStatus === "requested") return ["confirm_service"];
  if (item.selectionStatus === "confirmed") return ["fulfil_service"];
  if (
    item.selectionStatus === "fulfilled"
    && item.serviceType === "access_pass"
    && !item.entitlementId
  ) return ["issue_entitlement"];
  if (item.entitlementStatus === "pending") return ["activate_entitlement", "revoke_entitlement"];
  if (item.entitlementStatus === "active") return ["consume_entitlement", "suspend_entitlement", "revoke_entitlement"];
  if (item.entitlementStatus === "suspended") return ["activate_entitlement", "revoke_entitlement"];
  return [];
}

function label(command: Command) {
  return command.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export function ServiceEntitlementQueue({
  properties,
  focusWorkItemId,
}: {
  properties: Array<{ propertyId: string; name: string }>;
  focusWorkItemId?: string;
}) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const commandKeys = useClubsCommandReconciliation();
  const parsedFocus = useMemo(() => parseShiftWorkItemFocus(focusWorkItemId), [focusWorkItemId]);
  const serviceFocus = parsedFocus && ["service", "entitlement"].includes(parsedFocus.kind)
    ? parsedFocus
    : null;
  const focusedRecord = serviceFocus
    ? records.find((item) => serviceFocus.kind === "service"
      ? item.selectionId === serviceFocus.recordId && item.selectionVersion === serviceFocus.version
      : item.entitlementId === serviceFocus.recordId && item.entitlementVersion === serviceFocus.version)
    : undefined;
  const currentFocusedRecord = serviceFocus
    ? records.find((item) => serviceFocus.kind === "service"
      ? item.selectionId === serviceFocus.recordId
      : item.entitlementId === serviceFocus.recordId)
    : undefined;
  const staleFocusedRecord = Boolean(serviceFocus && currentFocusedRecord && !focusedRecord);
  const [draft, setDraft] = useState({
    propertyId: properties[0]?.propertyId ?? "",
    serviceCode: "",
    displayName: "",
    serviceType: "hospitality_service" as Offering["serviceType"],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const focusQuery = serviceFocus ? `?focus=${encodeURIComponent(serviceFocus.raw)}` : "";
      const response = await fetch(`/api/crays/clubs/team/services${focusQuery}`, { cache: "no-store" });
      const payload = await response.json() as { records?: RecordItem[]; offerings?: Offering[] };
      if (!response.ok || !payload.records || !payload.offerings) {
        setError("Guest services and access operations are temporarily unavailable.");
        return;
      }
      setRecords(payload.records);
      setOfferings(payload.offerings);
    } catch {
      setError("Guest services are unavailable. No cached operational records are shown.");
    } finally {
      setLoading(false);
    }
  }, [serviceFocus]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!serviceFocus || loading || !focusedRecord) return;
    const element = document.getElementById(shiftWorkItemFocusDomId(serviceFocus.raw));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  }, [focusedRecord, loading, serviceFocus]);

  async function offeringMutation(body: Record<string, unknown>, targetId: string) {
    const commandScope = `service-offering:${targetId}`;
    setPending(targetId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/crays/clubs/team/services", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": commandKeys.acquire(commandScope, "clubs-service-offering"),
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: { outcome: string; reason: string | null; resultingStatus: string | null };
      };
      if (!response.ok || !payload.receipt) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setError(payload.receipt?.reason ?? payload.reason ?? "Offering command failed.");
        return false;
      }
      commandKeys.complete(commandScope);
      setNotice(`Offering persisted · ${payload.receipt.resultingStatus ?? payload.receipt.outcome}.`);
      await load();
      return true;
    } catch {
      setError("The offering outcome is unknown. Retry to reconcile the same command.");
      return false;
    } finally {
      setPending(null);
    }
  }

  async function createOffering() {
    const succeeded = await offeringMutation({
      type: "create_offering",
      propertyId: draft.propertyId,
      serviceCode: draft.serviceCode,
      displayName: draft.displayName,
      serviceType: draft.serviceType,
      fulfillmentMode: draft.serviceType === "access_pass" ? "entitlement" : "on_request",
      chargeMode: "included",
    }, "new-offering");
    if (succeeded) {
      setDraft((current) => ({ ...current, serviceCode: "", displayName: "" }));
    }
  }

  async function apply(item: RecordItem, command: Command) {
    const targetId = item.entitlementId ?? item.selectionId ?? item.bookingId;
    const commandScope = `service-operation:${command}:${targetId}`;
    setPending(targetId);
    setError("");
    setNotice("");
    const body = command === "issue_entitlement"
      ? {
          type: command, bookingId: item.bookingId, selectionId: item.selectionId,
          accountId: item.bookingAccountId,
          validFrom: `${item.arrivalDate}T00:00:00.000Z`,
          validUntil: `${item.departureDate}T00:00:00.000Z`,
        }
      : command.endsWith("_service")
      ? {
          type: command, selectionId: item.selectionId,
          expectedVersion: item.selectionVersion,
          reason: `${label(command)} authorized by Holiday Manager`,
        }
      : {
          type: command, entitlementId: item.entitlementId,
          expectedVersion: item.entitlementVersion,
          reason: `${label(command)} authorized by Holiday Manager`,
        };
    try {
      const response = await fetch("/api/crays/clubs/team/services", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": commandKeys.acquire(commandScope, "clubs-service-operation"),
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: { outcome: string; reason: string | null; resultingStatus: string | null; replayed: boolean };
      };
      if (!response.ok || !payload.receipt) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setError(payload.receipt?.reason ?? payload.reason ?? "Service operation failed.");
        return;
      }
      commandKeys.complete(commandScope);
      setNotice(`${payload.receipt.replayed ? "Replayed safely" : "Operation persisted"} · ${payload.receipt.resultingStatus ?? payload.receipt.outcome}.`);
      await load();
    } catch {
      setError("The service outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5" aria-labelledby="clubs-service-queue-title" aria-busy={loading || pending !== null}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-petrol)]">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Guest service queue
          </p>
          <h2 id="clubs-service-queue-title" className="mt-2 text-lg font-semibold">Services & access</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Operate hospitality requests and bounded access without changing accommodation inventory or asserting payment.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>
      {error ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-[#C8103E] bg-[#C8103E]/5 p-4 text-sm text-[var(--foreground)]" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /> {error}
        </div>
      ) : null}
      {notice ? <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]" role="status">{notice}</p> : null}
      {serviceFocus && !loading && !focusedRecord ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          {currentFocusedRecord
            ? `This record changed from v${serviceFocus.version} to v${serviceFocus.kind === "service" ? currentFocusedRecord.selectionVersion : currentFocusedRecord.entitlementVersion}. Refresh Today to reconcile the current state. `
            : "The exact Service/Entitlement record is no longer in this authorized queue. Refresh Today to reconcile the next safe action. "}
          <ShiftFocusReturnLink className="font-semibold underline" />
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <h3 className="text-sm font-semibold">Governed service catalog</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Operational metadata only. Vendure remains the future authority for sellable pricing.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {offerings.map((offering) => (
              <article key={offering.offeringId} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{offering.displayName}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">{offering.serviceCode} · v{offering.version}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[11px] font-semibold">{offering.lifecycle}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">{offering.serviceType} · {offering.chargeMode}</p>
                {offering.lifecycle !== "archived" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(offering.lifecycle === "published" ? ["suspended"] : ["published", "archived"]).map((lifecycle) => (
                      <button
                        key={lifecycle}
                        type="button"
                        disabled={pending === offering.offeringId}
                        onClick={() => void offeringMutation({
                          type: "transition_offering",
                          offeringId: offering.offeringId,
                          expectedVersion: offering.version,
                          lifecycle,
                          reason: `${lifecycle} authorized by Holiday Manager`,
                        }, offering.offeringId)}
                        className="min-h-11 rounded-lg border border-[var(--border)] px-2.5 text-xs font-semibold disabled:opacity-50"
                      >
                        {lifecycle}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {!offerings.length ? <p className="text-xs text-[var(--muted-foreground)]">No governed offering exists yet.</p> : null}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <h3 className="text-sm font-semibold">New included offering</h3>
          <div className="mt-3 grid gap-2">
            <select value={draft.propertyId} onChange={(event) => setDraft((current) => ({ ...current, propertyId: event.target.value }))} className="h-11 rounded-lg border border-[var(--border)] px-3 text-sm">
              {properties.map((property) => <option key={property.propertyId} value={property.propertyId}>{property.name}</option>)}
            </select>
            <input value={draft.serviceCode} onChange={(event) => setDraft((current) => ({ ...current, serviceCode: event.target.value.toUpperCase() }))} placeholder="SERVICE_CODE" maxLength={40} className="h-11 rounded-lg border border-[var(--border)] px-3 text-sm" />
            <input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" maxLength={120} className="h-11 rounded-lg border border-[var(--border)] px-3 text-sm" />
            <select value={draft.serviceType} onChange={(event) => setDraft((current) => ({ ...current, serviceType: event.target.value as Offering["serviceType"] }))} className="h-11 rounded-lg border border-[var(--border)] px-3 text-sm">
              <option value="hospitality_service">Hospitality service</option>
              <option value="add_on">Add-on</option>
              <option value="access_pass">Access pass</option>
            </select>
            <button type="button" disabled={pending === "new-offering" || !draft.propertyId || draft.serviceCode.length < 3 || draft.displayName.trim().length < 2} onClick={() => void createOffering()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--foreground)] px-4 text-sm font-semibold text-white disabled:opacity-50">
              {pending === "new-offering" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Create draft
            </button>
          </div>
        </div>
      </div>
      {loading && !records.length ? (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-white" role="status" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-petrol)]" aria-hidden="true" />
          <span className="ml-2 text-sm">Loading authorized service work…</span>
        </div>
      ) : !records.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-white p-6 text-center">
          <ShieldAlert className="mx-auto h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">No service or access work</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">No authorized requested service or active entitlement needs action.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {records.map((item, index) => {
            const rowId = item.entitlementId ?? item.selectionId ?? `${item.bookingId}:${index}`;
            return (
              <article
                key={rowId}
                id={focusedRecord === item && serviceFocus ? shiftWorkItemFocusDomId(serviceFocus.raw) : undefined}
                tabIndex={focusedRecord === item ? -1 : undefined}
                data-shift-record-focus={focusedRecord === item ? "exact" : undefined}
                className={`rounded-xl border bg-white p-4 shadow-[0_8px_24px_rgba(16,37,45,0.04)] outline-none ${focusedRecord === item ? "border-[var(--color-petrol)] ring-4 ring-[var(--color-petrol)]/20" : "border-[var(--border)]"}`}
              >
                {focusedRecord === item ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-petrol)]/30 bg-[var(--color-petrol)]/5 p-3 text-xs" role="status">
                    <span className="font-semibold text-[var(--color-petrol)]">Exact Today record</span>
                    <ShiftFocusReturnLink className="font-semibold text-[var(--color-petrol)] underline" />
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[var(--color-petrol)]">{item.entitlementReference ?? item.selectionReference ?? item.bookingReference}</p>
                    <h3 className="mt-1 font-semibold">{item.displayName ?? item.scopeKey ?? "Access entitlement"}</h3>
                  </div>
                  <KeyRound className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-[var(--border)] py-3 text-xs">
                  <div><dt className="text-[var(--muted-foreground)]">Service</dt><dd className="mt-1 font-semibold">{item.selectionStatus ?? "—"}</dd></div>
                  <div><dt className="text-[var(--muted-foreground)]">Access</dt><dd className="mt-1 font-semibold">{item.entitlementStatus ?? "—"}</dd></div>
                  <div><dt className="text-[var(--muted-foreground)]">Stay</dt><dd className="mt-1 font-semibold">{item.stayStatus}</dd></div>
                  <div><dt className="text-[var(--muted-foreground)]">Commerce</dt><dd className="mt-1 font-semibold">{item.chargeMode === "commerce" ? "Awaiting Stage 7 authority" : "Included / no payment assertion"}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {nextActions(item).map((command) => (
                    <button key={command} type="button" disabled={pending === rowId || (staleFocusedRecord && currentFocusedRecord === item)} onClick={() => void apply(item, command)} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-50 ${command.includes("revoke") ? "bg-[#C8103E]" : "bg-[var(--foreground)]"}`}>
                      {pending === rowId ? <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                      {label(command)}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
