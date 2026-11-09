"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardList, MapPinned, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { LocationIntelligenceAdapterDecisionContract } from "@/lib/location-intelligence-adapter-decision-contract";

type Payload = {
  status: "ready" | "forbidden";
  contract: LocationIntelligenceAdapterDecisionContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadLocationDecision(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/location-intelligence/adapter-decision/contract?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Location Intelligence decision returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function LocationIntelligenceDecisionPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadLocationDecision(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Decision contract failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const contract = loadState.data?.contract;
  const readClasses = contract?.readClasses ?? [];
  const fieldPolicies = contract?.fieldPolicies ?? [];

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Location Intelligence decision</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Location Intelligence decision</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Read-only adapter decision for reachability, travel-time, statistics, places and score evidence. The next step is a no-call scaffold, not a live provider read.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Location Intelligence decision"
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
          ["Decision", "Read-only"],
          ["Read classes", contract ? contract.readClasses.length.toString() : "..."],
          ["Field policies", contract ? contract.fieldPolicies.length.toString() : "..."],
          ["Live read", "Off"],
          ["Next block", contract?.recommendedNextBlock ?? "..."],
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
            <h2 className="font-semibold">Allowed read classes</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each class defines bounded inputs and CRAYS-owned derived evidence.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readClasses.map((readClass) => (
              <article key={readClass.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[var(--surface)] text-[var(--accent)]">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{readClass.label}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{readClass.derivedEvidence.join(", ")}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">Blocked: {readClass.blockedOutputs.join(", ")}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Outcome</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{contract?.outcome ?? "Loading decision."}</p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Closed controls</h2>
            <div className="mt-4 space-y-2">
              {["Live provider read", "Raw payload return", "Client-side provider call", "Owner submission write", "Candidate release", "Bank release"].map((item) => (
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
          <h2 className="font-semibold">Field policies</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {fieldPolicies.map((policy) => (
            <article key={policy.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{policy.label}</p>
              <p className="mt-2 text-sm leading-5">{policy.retentionRule}</p>
              <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">Allowed: {policy.allowedFields.slice(0, 5).join(", ")}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
