"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, LoaderCircle, Trash2 } from "lucide-react";
import type { HolidayManagerReadModel } from "@/db/clubs-holiday-manager-repository";

type Query = HolidayManagerReadModel["collection"]["query"];
type SavedView = HolidayManagerReadModel["savedViews"][number];

export function PropertySavedViewControl({
  query,
  savedViews,
}: {
  query: Query;
  savedViews: SavedView[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [requiresReload, setRequiresReload] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function saveView() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setMessage("Enter a name for this view.");
      return;
    }
    if (isMutating || requiresReload) return;
    setMessage("");
    setIsMutating(true);
    try {
      const existing = savedViews.find((view) => view.name === normalizedName);
      const response = await fetch("/api/crays/clubs/team/property/saved-view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          search: query.search,
          lifecycle: query.lifecycle,
          recordType: query.recordType,
          viewMode: query.viewMode,
          pageSize: query.pageSize,
          expectedVersion: existing?.version ?? 0,
          idempotencyKey: `clubs-saved-view:${crypto.randomUUID()}`,
        }),
      });
      const payload = await response.json().catch(() => null) as {
        reason?: string;
      } | null;
      if (!response.ok) {
        if (response.status >= 500) setRequiresReload(true);
        setMessage(payload?.reason ?? "The view could not be saved.");
        return;
      }
      setName("");
      setMessage("View saved.");
      startTransition(() => router.refresh());
    } catch {
      setRequiresReload(true);
      setMessage("The connection was interrupted. Reload the view before retrying.");
    } finally {
      setIsMutating(false);
    }
  }

  async function archiveView(savedView: SavedView) {
    if (isMutating || requiresReload) return;
    setMessage("");
    setIsMutating(true);
    try {
      const response = await fetch("/api/crays/clubs/team/property/saved-view", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          savedViewId: savedView.savedViewId,
          expectedVersion: savedView.version,
          idempotencyKey: `clubs-saved-view:${crypto.randomUUID()}`,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as {
          reason?: string;
        } | null;
        if (response.status >= 500) setRequiresReload(true);
        setMessage(payload?.reason ?? "The view could not be removed.");
        return;
      }
      setMessage("View removed.");
      startTransition(() => router.refresh());
    } catch {
      setRequiresReload(true);
      setMessage("The connection was interrupted. Reload the view before retrying.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_30px_rgba(16,37,45,0.04)]" aria-busy={isPending || isMutating}>
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-[var(--color-petrol)]" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Saved views</h2>
      </div>
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="clubs-saved-view-name">
          View name
        </label>
        <input
          id="clubs-saved-view-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="e.g. Units in review"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-petrol)] focus:ring-2 focus:ring-[var(--color-petrol)]/15"
        />
        <button
          type="button"
          disabled={isPending || isMutating || requiresReload}
          onClick={() => void saveView()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-petrol)] px-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
        Saves the current search, filters, page size and table or board mode to your account.
      </p>
      {message ? (
        <p className="mt-2 text-xs font-medium text-[var(--color-petrol)]" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      {savedViews.length ? (
        <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
          {savedViews.map((view) => {
            const params = new URLSearchParams();
            if (view.search) params.set("q", view.search);
            if (view.lifecycle) params.set("lifecycle", view.lifecycle);
            if (view.recordType !== "all") params.set("recordType", view.recordType);
            params.set("mode", view.viewMode);
            params.set("pageSize", String(view.pageSize));
            return (
              <li key={view.savedViewId} className="group flex items-center gap-2">
                <a
                  href={`/en/clubs/operations?${params.toString()}`}
                  className="min-w-0 flex-1 rounded-lg px-2 py-2 text-sm font-medium transition hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-petrol)]"
                >
                  <span className="block truncate">{view.name}</span>
                  <span className="mt-0.5 block text-xs font-normal capitalize text-[var(--muted-foreground)]">
                    {view.viewMode} · {view.recordType}
                  </span>
                </a>
                <button
                  type="button"
                  disabled={isPending || isMutating || requiresReload}
                  onClick={() => void archiveView(view)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[#C8103E]/5 hover:text-[#C8103E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8103E]"
                  aria-label={`Remove saved view ${view.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted-foreground)]">
          No personal views saved yet.
        </p>
      )}
    </aside>
  );
}
