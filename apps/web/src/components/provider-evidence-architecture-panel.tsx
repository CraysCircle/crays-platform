"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, CheckCircle2, ClipboardList, MapPinned, RefreshCw, ShieldCheck, Workflow } from "lucide-react";
import type { ProviderEvidenceArchitectureContract } from "@/lib/provider-evidence-architecture-contract";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ProviderEvidenceArchitectureContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadProviderEvidence(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/provider-evidence/architecture/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Provider evidence architecture returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function laneIcon(key: string) {
  if (key.includes("location")) return MapPinned;
  if (key.includes("bank")) return Banknote;
  return ClipboardList;
}

export function ProviderEvidenceArchitecturePanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadProviderEvidence(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Readiness failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const lanes = readModel?.evidenceLanes ?? [];
  const guards = readModel?.adapterGuards ?? [];

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Provider evidence architecture</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Evidence architecture</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Internal evidence lanes for Location Intelligence, Property Feed, Banking Evidence and Source Work Items before any live read, write, upload or release.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh provider evidence architecture"
            onClick={() => {
              setLoadState({ state: "loading", data: null, error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {loadState.state === "error" ? <p className="mt-4 text-sm text-rose-700">{loadState.error}</p> : null}
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Blocks", readModel ? `${readModel.completedBlocks} / ${readModel.totalBlocks}` : "..."],
          ["Evidence lanes", readModel ? readModel.evidenceLanes.length.toString() : "..."],
          ["Adapter guards", readModel ? readModel.adapterGuards.length.toString() : "..."],
          ["Live calls", "0"],
          ["First path", "Location Intelligence"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Evidence lanes</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each lane converts external or source signals into CRAYS-owned evidence before release.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {lanes.map((lane) => {
              const Icon = laneIcon(lane.key);
              return (
                <article key={lane.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[var(--surface)] text-[var(--accent)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{lane.label}</h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{lane.purpose}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lane.craysObjects.slice(0, 4).map((object) => (
                      <span key={object} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--ink-muted)]">
                        {object}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{lane.nextSafeAction}</p>
                </article>
              );
            })}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">North star</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{readModel?.northStar.goal ?? "Loading readiness."}</p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Closed controls</h2>
            <div className="mt-4 space-y-2">
              {["Live provider reads", "Source writes", "Owner submission writes", "Uploads", "Candidate release", "Bank send", "Payment initiation"].map((item) => (
                <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-semibold">Adapter guards</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {guards.map((guard) => (
            <article key={guard.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{guard.label}</p>
              <p className="mt-2 text-sm font-semibold">Allowed read classes</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{guard.allowedReadClasses.join(", ")}</p>
              <p className="mt-3 text-sm font-semibold">Blocked actions</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{guard.blockedActionClasses.join(", ")}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
