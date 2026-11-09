"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DatabaseZap, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import type { RoleToolFunctionMatrixContract } from "@/lib/role-tool-function-matrix";

type Payload = {
  status: "ready" | "forbidden";
  readModel: RoleToolFunctionMatrixContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadMatrix(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/adapters/role-tool-function-matrix/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Core matrix returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function readable(value: string) {
  return value.replaceAll("_", " ");
}

export function SharedCoreDataPanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadMatrix(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Core matrix failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const sharedEntities = useMemo(
    () => readModel?.sharedCoreEntities.filter((entity) => entity.availableToTools.includes(moduleKey)) ?? [],
    [moduleKey, readModel],
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Shared Core data</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              This tool reads and writes through CRAYS Core entities instead of becoming an isolated data island.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh shared core data"
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {loadState.state === "error" ? <p className="px-5 py-4 text-sm text-rose-700">{loadState.error}</p> : null}
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {sharedEntities.map((entity) => (
            <article key={entity.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm">{entity.label}</strong>
                <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                  Core
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{entity.productRule}</p>
            </article>
          ))}
          {loadState.state === "loading" ? <p className="p-4 text-sm text-[var(--ink-muted)]">Loading shared entities...</p> : null}
          {loadState.state === "ready" && !sharedEntities.length ? <p className="p-4 text-sm text-[var(--ink-muted)]">No shared entities are visible for this scope.</p> : null}
        </div>
      </article>

      <aside className="space-y-4">
        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Target write models</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(readModel?.targetWriteModelPolicy ?? []).map((policy) => (
              <div key={policy.key} className="rounded-[8px] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{policy.label}</strong>
                  <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">{readable(policy.currentState)}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{policy.rule}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-[var(--rose)]" />
            <h2 className="font-semibold">Current gate</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {["Source writes", "Sync writes", "Uploads", "External sending", "Finance execution", "Bank sends"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm">
                <span>{item}</span>
                <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Off</span>
              </div>
            ))}
          </div>
        </article>
      </aside>
    </section>
  );
}
