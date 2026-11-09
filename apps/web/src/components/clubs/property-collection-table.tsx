"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  CalendarDays,
  CheckSquare2,
  Download,
  FileUp,
  LoaderCircle,
  Play,
  ShieldCheck,
  Square,
} from "lucide-react";
import type { HolidayManagerReadModel } from "@/db/clubs-holiday-manager-repository";
import { UnitInventoryCalendar } from "@/components/clubs/unit-inventory-calendar";
import { useClubsCommandReconciliation } from "@/lib/clubs/use-command-reconciliation";
import { PropertyRecordCommandPanel } from "@/components/clubs/property-record-command-panel";

type Item = HolidayManagerReadModel["collection"]["items"][number];
type CommandType =
  | "submit_property_review"
  | "submit_unit_review"
  | "return_property_to_draft"
  | "return_unit_to_draft"
  | "publish_property"
  | "publish_unit"
  | "suspend_property"
  | "suspend_unit"
  | "archive_property"
  | "archive_unit";

const lifecycleTone: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  review: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-[var(--color-petrol)] bg-[var(--surface-subtle)] text-[var(--color-petrol)]",
  suspended: "border-orange-200 bg-orange-50 text-orange-800",
  archived: "border-zinc-200 bg-zinc-100 text-zinc-700",
};
const lifecycleLabels: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  suspended: "Suspended",
  archived: "Archived",
};

function commandFor(type: Item["recordType"], action: string): CommandType {
  if (action === "submit") return `submit_${type}_review` as CommandType;
  if (action === "return") return `return_${type}_to_draft` as CommandType;
  return `${action}_${type}` as CommandType;
}

export function PropertyCollectionTable({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("submit");
  const [status, setStatus] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activeInventoryUnit, setActiveInventoryUnit] = useState<Item | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportIdempotencyKeyRef = useRef<string | null>(null);
  const commandKeys = useClubsCommandReconciliation();
  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(`${item.recordType}:${item.recordId}`)),
    [items, selected],
  );

  function toggle(key: string) {
    setBatchId(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function preview(rows: Item[], source?: { filename: string; sha256: string }) {
    if (!rows.length) {
      setStatus("Select at least one record.");
      return;
    }
    const types = new Set(rows.map((item) => item.recordType));
    if (types.size > 1) {
      setStatus("Choose only Properties or only Units for one bulk command.");
      return;
    }
    setPending(true);
    setStatus("");
    setBatchId(null);
    const commandScope = `bulk-preview:${action}:${source?.sha256 ?? rows
      .map((item) => `${item.recordType}:${item.recordId}:${item.version}`)
      .sort()
      .join("|")}`;
    try {
      const commandType = commandFor(rows[0].recordType, action);
      const response = await fetch("/api/crays/clubs/team/property/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          commandType,
          idempotencyKey: commandKeys.acquire(commandScope, "clubs-bulk"),
          operationKind: source ? "csv_import" : "bulk_command",
          sourceFilename: source?.filename,
          sourceSha256: source?.sha256,
          items: rows.map((item) => ({
            propertyId: item.propertyId,
            targetId: item.recordId,
            expectedVersion: item.version,
          })),
        }),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: {
          batchId?: string;
          validCount?: number;
          failedCount?: number;
        };
      };
      if (!response.ok || !payload.receipt?.batchId) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setStatus(payload.reason ?? "Preview failed.");
        return;
      }
      commandKeys.complete(commandScope);
      setBatchId(payload.receipt.batchId);
      setStatus(
        `Preview ready: ${payload.receipt.validCount ?? 0} valid, ${payload.receipt.failedCount ?? 0} blocked.`,
      );
    } catch {
      setStatus("The Preview outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setPending(false);
    }
  }

  async function apply() {
    if (!batchId) return;
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/api/crays/clubs/team/property/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "apply", batchId }),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: {
          status?: string;
          applied_count?: number;
          failed_count?: number;
          skipped_count?: number;
        };
      };
      if (!response.ok) {
        setStatus(payload.reason ?? "Apply failed.");
        return;
      }
      setStatus(
        `Batch ${payload.receipt?.status ?? "completed"}: ${payload.receipt?.applied_count ?? 0} applied, ${payload.receipt?.failed_count ?? 0} failed, ${payload.receipt?.skipped_count ?? 0} skipped. Reload to reconcile the collection.`,
      );
      setBatchId(null);
      setSelected(new Set());
    } catch {
      setStatus("The Apply outcome is unknown. Reload the collection before retrying.");
    } finally {
      setPending(false);
    }
  }

  async function exportCsv() {
    setPending(true);
    setStatus("");
    try {
      const idempotencyKey = exportIdempotencyKeyRef.current
        ?? `clubs-property-export:${crypto.randomUUID()}`;
      exportIdempotencyKeyRef.current = idempotencyKey;
      const response = await fetch("/api/crays/clubs/team/property/export", {
        method: "POST",
        headers: {
          "idempotency-key": idempotencyKey,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { reason?: string } | null;
        if (response.status < 500) exportIdempotencyKeyRef.current = null;
        setStatus(payload?.reason ?? "Export failed.");
        return;
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = "crays-clubs-property-export.csv";
      anchor.click();
      URL.revokeObjectURL(href);
      exportIdempotencyKeyRef.current = null;
      setStatus(
        `Export ready: ${response.headers.get("x-crays-row-count") ?? "0"} rows with durable SHA-256 receipt.`,
      );
    } catch {
      setStatus(
        "The export outcome is unknown. Retry to reconcile with the same command key.",
      );
    } finally {
      setPending(false);
    }
  }

  async function generateProjection(item: Item) {
    const commandScope = `public-projection:${item.propertyId}`;
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/api/crays/clubs/team/property/projection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: item.propertyId,
          idempotencyKey: commandKeys.acquire(commandScope, "clubs-projection"),
        }),
      });
      const payload = await response.json() as {
        reason?: string;
        receipt?: { status?: string; payloadSha256?: string; payload_sha256?: string };
      };
      if (!response.ok) {
        if (payload.receipt || response.status < 500) commandKeys.complete(commandScope);
        setStatus(payload.reason ?? "Public projection failed.");
        return;
      }
      commandKeys.complete(commandScope);
      const hash = payload.receipt?.payloadSha256 ?? payload.receipt?.payload_sha256;
      setStatus(
        `Public projection ${payload.receipt?.status ?? "generated"}${hash ? ` · SHA-256 ${hash.slice(0, 12)}…` : ""}.`,
      );
    } catch {
      setStatus("The projection outcome is unknown. Retry to reconcile the same command.");
    } finally {
      setPending(false);
    }
  }

  async function importCsv(file: File) {
    if (file.size > 2_000_000) {
      setStatus("CSV files are limited to 2 MB.");
      return;
    }
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length || parsed.data.length > 100) {
      setStatus(parsed.errors.length ? "CSV parsing failed." : "A preview is limited to 100 rows.");
      return;
    }
    const rows = parsed.data.map((row) => ({
      recordType: row.record_type as Item["recordType"],
      recordId: row.record_id,
      propertyId: row.property_id,
      name: row.name,
      code: row.code,
      lifecycle: row.lifecycle,
      version: Number(row.version),
      updatedAt: row.updated_at,
    })).filter((row) =>
      ["property", "unit"].includes(row.recordType)
      && Boolean(row.recordId && row.propertyId)
      && Number.isSafeInteger(row.version),
    );
    if (rows.length !== parsed.data.length) {
      setStatus("CSV contains invalid or missing governed fields.");
      return;
    }
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(await file.text()));
    const sha256 = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await preview(rows, { filename: file.name, sha256 });
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <>
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_30px_rgba(16,37,45,0.04)]" aria-busy={pending}>
      <PropertyRecordCommandPanel items={items} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => `${item.recordType}:${item.recordId}`)))}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold"
          >
            {allSelected ? <CheckSquare2 className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
            {selected.size ? `${selected.size} selected` : "Select page"}
          </button>
          <label>
            <span className="sr-only">Bulk action</span>
            <select value={action} onChange={(event) => { setAction(event.target.value); setBatchId(null); }} className="h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm">
              <option value="submit">Submit for review</option>
              <option value="return">Return to draft</option>
              <option value="publish">Publish</option>
              <option value="suspend">Suspend</option>
              <option value="archive">Archive</option>
            </select>
          </label>
          <button type="button" disabled={pending || !selected.size} onClick={() => void preview(selectedItems)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--foreground)] px-3 text-sm font-semibold text-white disabled:opacity-50">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Preview
          </button>
          {batchId ? (
            <button type="button" disabled={pending} onClick={() => void apply()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-petrol)] px-3 text-sm font-semibold text-white disabled:opacity-50">
              <Play className="h-4 w-4" aria-hidden="true" /> Apply valid records
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importCsv(file);
              event.target.value = "";
            }}
          />
          <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold disabled:opacity-50">
            <FileUp className="h-4 w-4" aria-hidden="true" /> Import CSV
          </button>
          <button type="button" disabled={pending} onClick={() => void exportCsv()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold disabled:opacity-50">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Export
          </button>
        </div>
      </div>
      {status ? <p role="status" aria-live="polite" className="border-b border-[var(--border)] bg-white px-5 py-3 text-sm">{status}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <caption className="sr-only">Authorized Properties and Units</caption>
          <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
            <tr>
              <th scope="col" className="w-12 px-4 py-3.5"><span className="sr-only">Select</span></th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Record</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Type</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Lifecycle</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Version</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Updated</th>
              <th scope="col" className="px-5 py-3.5 font-semibold">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const key = `${item.recordType}:${item.recordId}`;
              return (
                <tr key={key} className="transition hover:bg-[var(--surface-subtle)]">
                  <td className="px-4 py-4">
                    <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-[var(--color-petrol)]">
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} aria-label={`Select ${item.name}`} className="h-4 w-4 rounded border-[var(--border)] accent-[var(--color-petrol)]" />
                    </label>
                  </td>
                  <th scope="row" className="px-5 py-4">
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 font-mono text-xs font-normal text-[var(--muted-foreground)]">{item.code}</p>
                  </th>
                  <td className="px-5 py-4 text-sm capitalize">{item.recordType}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${lifecycleTone[item.lifecycle] ?? lifecycleTone.draft}`}>
                      {lifecycleLabels[item.lifecycle] ?? item.lifecycle}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm">v{item.version}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted-foreground)]">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(item.updatedAt))}</td>
                  <td className="px-5 py-4">
                    {item.recordType === "unit" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setActiveInventoryUnit(item)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--color-petrol)] transition hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                      >
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        Availability
                      </button>
                    ) : item.lifecycle === "published" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void generateProjection(item)}
                        className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--color-petrol)] transition hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                      >
                        Generate
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">Not eligible</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
    {activeInventoryUnit ? (
      <UnitInventoryCalendar
        unit={activeInventoryUnit}
        onClose={() => setActiveInventoryUnit(null)}
      />
    ) : null}
    </>
  );
}
