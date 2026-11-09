"use client";

import { useRef, useState } from "react";
import { FilePlus2, LoaderCircle, Pencil, RotateCw } from "lucide-react";
import { useClubsCommandReconciliation } from "@/lib/clubs/use-command-reconciliation";

type Item = {
  recordType: "property" | "unit";
  recordId: string;
  propertyId: string;
  name: string;
  code: string;
  lifecycle: string;
  version: number;
  updatedAt: string;
};
type Notice = { alert: boolean; text: string };
type Payload = {
  status?: string;
  reason?: string;
  receipt?: {
    outcome?: string;
    receiptId?: string;
    previousVersion?: number | null;
    resultingVersion?: number | null;
  };
};

function notice(action: string, http: number, payload: Payload): Notice {
  const outcome = payload.receipt?.outcome ?? payload.status;
  if (outcome === "applied" || outcome === "replayed") {
    return {
      alert: false,
      text: action + " persisted"
        + (payload.receipt?.resultingVersion ? " as v" + payload.receipt.resultingVersion : "")
        + (payload.receipt?.receiptId ? " ? Receipt " + payload.receipt.receiptId : "")
        + ". Reload to reconcile the collection.",
    };
  }
  if (http === 409 || outcome === "conflict") {
    return {
      alert: false,
      text: "Conflict: the record changed after this screen loaded"
        + (payload.receipt?.previousVersion ? " and is now v" + payload.receipt.previousVersion : "")
        + ". Reload before retrying.",
    };
  }
  if (outcome === "denied") {
    return { alert: true, text: "Denied: the active role or Property scope does not authorize this command." };
  }
  return { alert: http >= 500, text: payload.reason ?? "The command did not return an applied receipt." };
}

export function PropertyRecordCommandPanel({ items }: { items: Item[] }) {
  const properties = items.filter((item) => item.recordType === "property");
  const [propertyId, setPropertyId] = useState(properties[0]?.recordId ?? "");
  const [unitName, setUnitName] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [editKey, setEditKey] = useState(items[0] ? items[0].recordType + ":" + items[0].recordId : "");
  const [editName, setEditName] = useState(items[0]?.name ?? "");
  const [pending, setPending] = useState<"create" | "edit" | null>(null);
  const [message, setMessage] = useState<Notice | null>(null);
  const createTargetId = useRef<string | null>(null);
  const commandKeys = useClubsCommandReconciliation();
  const property = properties.find((item) => item.recordId === propertyId);
  const editItem = items.find((item) => item.recordType + ":" + item.recordId === editKey);
  const control = "min-h-11 rounded-lg border border-[var(--border)] bg-white px-3";

  async function run(action: string, scope: string, body: Record<string, unknown>) {
    const response = await fetch("/api/crays/clubs/team/property/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, idempotencyKey: commandKeys.acquire(scope, "clubs-property") }),
    });
    const payload = await response.json().catch(() => ({})) as Payload;
    if (response.status < 500) commandKeys.complete(scope);
    setMessage(notice(action, response.status, payload));
    return payload.receipt?.outcome === "applied" || payload.receipt?.outcome === "replayed";
  }

  async function createUnit() {
    const canonicalName = unitName.trim();
    const canonicalCode = unitCode.trim();
    if (!property || !canonicalName || !canonicalCode) {
      setMessage({ alert: false, text: "Choose a Property and enter both Unit name and canonical code." });
      return;
    }
    const targetId = createTargetId.current ?? "clubs_unit_" + crypto.randomUUID();
    createTargetId.current = targetId;
    const scope = "create-unit:" + property.recordId + ":" + targetId;
    setPending("create");
    setMessage(null);
    try {
      if (await run("Draft Unit created", scope, {
        commandType: "create_unit",
        propertyId: property.recordId,
        targetId,
        expectedVersion: property.version,
        canonicalName,
        canonicalCode,
      })) {
        createTargetId.current = null;
        setUnitName("");
        setUnitCode("");
      }
    } catch {
      setMessage({ alert: true, text: "Create outcome unknown. Retry unchanged to reconcile the same command key." });
    } finally {
      setPending(null);
    }
  }

  async function editRecord() {
    const canonicalName = editName.trim();
    if (!editItem || !canonicalName) {
      setMessage({ alert: false, text: "Choose a record and enter its canonical name." });
      return;
    }
    const scope = "edit-" + editItem.recordType + ":" + editItem.recordId + ":" + editItem.version + ":" + canonicalName;
    setPending("edit");
    setMessage(null);
    try {
      await run("Record update", scope, {
        commandType: editItem.recordType === "property" ? "edit_property" : "edit_unit",
        propertyId: editItem.propertyId,
        targetId: editItem.recordId,
        expectedVersion: editItem.version,
        canonicalName,
      });
    } catch {
      setMessage({ alert: true, text: "Edit outcome unknown. Retry unchanged to reconcile the same command key." });
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="record-commands-title" aria-busy={pending !== null} className="border-b border-[var(--border)] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Governed record commands</p>
          <h2 id="record-commands-title" className="mt-1 text-base font-semibold">Create or update authorized inventory</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Creation starts in Draft. Commands are tenant-scoped, version-checked and return a durable receipt.</p>
        </div>
        <button type="button" onClick={() => window.location.reload()} className={control + " inline-flex items-center gap-2 text-sm font-semibold"}>
          <RotateCw className="h-4 w-4" aria-hidden="true" /> Reload collection
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={(event) => { event.preventDefault(); void createUnit(); }} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <h3 className="flex items-center gap-2 font-semibold"><FilePlus2 className="h-4 w-4 text-[var(--color-petrol)]" aria-hidden="true" /> New Unit</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">Authorized Property
              <select value={propertyId} onChange={(event) => { setPropertyId(event.target.value); createTargetId.current = null; }} disabled={pending !== null || !properties.length} className={control}>
                {!properties.length ? <option value="">No authorized Property</option> : null}
                {properties.map((item) => <option key={item.recordId} value={item.recordId}>{item.name} ? v{item.version}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Unit name
              <input value={unitName} onChange={(event) => { setUnitName(event.target.value); createTargetId.current = null; }} maxLength={240} required className={control} />
            </label>
            <label className="grid gap-1 text-sm font-medium">Canonical code
              <input value={unitCode} onChange={(event) => { setUnitCode(event.target.value); createTargetId.current = null; }} maxLength={80} required pattern="[A-Za-z0-9][A-Za-z0-9:_-]*" className={control + " font-mono"} />
            </label>
          </div>
          <button type="submit" disabled={pending !== null || !property} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-petrol)] px-4 text-sm font-semibold text-white disabled:opacity-50">
            {pending === "create" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FilePlus2 className="h-4 w-4" aria-hidden="true" />} Create Draft Unit
          </button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void editRecord(); }} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <h3 className="flex items-center gap-2 font-semibold"><Pencil className="h-4 w-4 text-[var(--color-petrol)]" aria-hidden="true" /> Edit canonical name</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Authorized record
              <select value={editKey} onChange={(event) => {
                const key = event.target.value;
                const next = items.find((item) => item.recordType + ":" + item.recordId === key);
                setEditKey(key);
                setEditName(next?.name ?? "");
              }} disabled={pending !== null || !items.length} className={control}>
                {!items.length ? <option value="">No authorized record</option> : null}
                {items.map((item) => <option key={item.recordType + ":" + item.recordId} value={item.recordType + ":" + item.recordId}>{item.name} ? {item.recordType} ? v{item.version}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Canonical name
              <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={240} required className={control} />
            </label>
          </div>
          <button type="submit" disabled={pending !== null || !editItem} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-petrol)] bg-white px-4 text-sm font-semibold text-[var(--color-petrol)] disabled:opacity-50">
            {pending === "edit" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />} Save new version
          </button>
        </form>
      </div>
      {message ? <p role={message.alert ? "alert" : "status"} aria-live={message.alert ? "assertive" : "polite"} className="mt-4 rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm">{message.text}</p> : null}
    </section>
  );
}
