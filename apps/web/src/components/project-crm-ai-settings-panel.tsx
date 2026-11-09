"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import type { AiGovernanceContract, ProjectCrmParityContract } from "@/lib/source-faithful-product-contract";

type ParityPayload = {
  status: "ready" | "forbidden";
  contract: ProjectCrmParityContract;
};

type GovernancePayload = {
  status: "ready" | "forbidden";
  contract: AiGovernanceContract;
};

type LoadState =
  | { state: "loading"; parity: null; governance: null; error: null }
  | { state: "ready"; parity: ParityPayload; governance: GovernancePayload; error: null }
  | { state: "error"; parity: null; governance: null; error: string };

async function loadContracts(role: string, signal: AbortSignal) {
  const [parityResponse, governanceResponse] = await Promise.all([
    fetch(`/api/crays/adapters/source-faithful/parity?role=${role}`, { cache: "no-store", signal }),
    fetch(`/api/crays/ai/governance/contract?role=${role}`, { cache: "no-store", signal }),
  ]);

  if (!parityResponse.ok) throw new Error(`Parity returned HTTP ${parityResponse.status}`);
  if (!governanceResponse.ok) throw new Error(`Governance returned HTTP ${governanceResponse.status}`);

  return {
    parity: (await parityResponse.json()) as ParityPayload,
    governance: (await governanceResponse.json()) as GovernancePayload,
  };
}

export function ProjectCrmAiSettingsPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", parity: null, governance: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadContracts(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", parity: data.parity, governance: data.governance, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          parity: null,
          governance: null,
          error: error instanceof Error ? error.message : "AI and settings parity failed",
        });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const parity = loadState.parity?.contract;
  const governance = loadState.governance?.contract;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">AI and settings parity</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Project and CRM controls</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              CRAYS governance for module AI tools, settings maps, permissions, usage and disable controls.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh AI and settings parity"
            onClick={() => {
              setLoadState({ state: "loading", parity: null, governance: null, error: null });
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Parity modules</h2>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {(parity?.modules ?? []).map((module) => (
              <div key={module.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-[var(--accent)]" />
                  <h3 className="font-semibold">{module.label}</h3>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-[var(--ink-muted)]">AI controls</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {module.aiParity.map((item) => (
                    <span key={item.key} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium">
                      {item.label}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-[var(--ink-muted)]">Settings</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {module.settingsParity.slice(0, 12).map((item) => (
                    <span key={item.key} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium">
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Governance</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Providers returned", governance?.providerState.configuredProvidersReturned ? "Yes" : "No"],
                ["Live calls", governance?.providerState.liveProviderCallEnabled ? "On" : "Off"],
                ["Usage ledger", governance?.providerState.usageLedgerRequired ? "Required" : "Optional"],
                ["Approval gate", governance?.providerState.approvalGateRequired ? "Required" : "Optional"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <strong className="mt-1 block text-sm">{value}</strong>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
