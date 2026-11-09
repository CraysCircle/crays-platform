"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Gauge, Power, RefreshCw, ShieldCheck, Siren, Waypoints } from "lucide-react";
import type {
  ProviderSandboxDecisionPack,
  ProviderSandboxPilotReadiness,
} from "@/lib/provider-sandbox-pilot-readiness-contract";

type ProgramPayload = {
  status: "ready" | "forbidden";
  readModel: ProviderSandboxPilotReadiness;
};

type DecisionPayload = {
  status: "ready" | "forbidden";
  contract: ProviderSandboxDecisionPack;
};

type LoadState =
  | { state: "loading"; program: null; decision: null; error: null }
  | { state: "ready"; program: ProgramPayload; decision: DecisionPayload; error: null }
  | { state: "error"; program: null; decision: null; error: string };

async function loadSandboxPilot(role: string, signal: AbortSignal) {
  const [programResponse, decisionResponse] = await Promise.all([
    fetch(`/api/crays/provider-sandbox-pilot/readiness?role=${role}`, { cache: "no-store", signal }),
    fetch(`/api/crays/provider-sandbox/decision-pack/readiness?role=${role}`, { cache: "no-store", signal }),
  ]);

  if (!programResponse.ok) throw new Error(`Sandbox Pilot readiness returned HTTP ${programResponse.status}`);
  if (!decisionResponse.ok) throw new Error(`Sandbox Decision Pack returned HTTP ${decisionResponse.status}`);

  const program = (await programResponse.json()) as ProgramPayload;
  const decision = (await decisionResponse.json()) as DecisionPayload;
  return { program, decision };
}

export function ProviderSandboxPilotPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", program: null, decision: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadSandboxPilot(role, controller.signal)
      .then(({ program, decision }) => setLoadState({ state: "ready", program, decision, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", program: null, decision: null, error: error instanceof Error ? error.message : "Sandbox pilot readiness failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.program?.readModel;
  const decision = loadState.decision?.contract;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Sandbox pilot</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Sandbox decision pilot</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Controlled sandbox and pilot readiness for location, property, banking, owner submission, economics and release shells. Execution remains off by default.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Sandbox Pilot readiness"
            onClick={() => {
              setLoadState({ state: "loading", program: null, decision: null, error: null });
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
          ["Coverage", readModel ? `${readModel.completedBlocks} / ${readModel.totalBlocks}` : "..."],
          ["Mode", "Sandbox-ready"],
          ["Sandbox paths", readModel ? readModel.sandboxPaths.length.toString() : "..."],
          ["Pilot surfaces", readModel ? readModel.pilotSurfaces.length.toString() : "..."],
          ["Execution", "Off"],
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
            <h2 className="font-semibold">Decision layers</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Sandbox and pilot readiness layers before any selected execution gate.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {(readModel?.blockGroups ?? []).map((group) => (
              <article key={group.range} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[var(--surface)] text-[var(--accent)]">
                    <Waypoints className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Governed layer</p>
                    <h3 className="mt-1 text-sm font-semibold">{group.label}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{group.outcome}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Decision pack</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              {decision ? `${decision.sandboxPaths.length} paths, ${decision.killSwitches.length} kill switches, ${decision.costLimits.length} cost limits.` : "Loading sandbox decision pack."}
            </p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Power className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Closed controls</h2>
            </div>
            <div className="mt-4 space-y-2">
              {["Sandbox execution", "Live provider reads", "Owner uploads", "Candidate release", "Bank release", "Payment initiation"].map((item) => (
                <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Approval boundary</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Next decision is one exact path: keep no-call, approve one sandbox read, approve storage-gated owner submissions or approve explicit pilot records.
            </p>
          </article>
        </aside>
      </section>
    </section>
  );
}
