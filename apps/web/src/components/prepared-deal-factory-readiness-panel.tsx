"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, Building2, CheckCircle2, ClipboardList, Factory, MapPinned, PauseCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { PreparedDealFactoryReadinessContract } from "@/lib/prepared-deal-factory-readiness-contract";

type Payload = {
  status: "ready" | "forbidden";
  readModel: PreparedDealFactoryReadinessContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadFactoryReadiness(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/prepared-deal-factory/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Prepared deal factory returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stageIcon(key: string) {
  if (key.includes("owner") || key.includes("property")) return Building2;
  if (key.includes("location")) return MapPinned;
  if (key.includes("bank")) return Banknote;
  return ClipboardList;
}

export function PreparedDealFactoryReadinessPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadFactoryReadiness(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Factory check failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const firstStages = readModel?.sourceChain.slice(0, 8) ?? [];
  const dataRequirements = readModel?.dataRequirements.slice(0, 6) ?? [];

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Prepared deal factory</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Prepared deal decision chain</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Property owner fit, property supply, location evidence, deal economics, Candidate intent, bank package readiness and opening handoff as one CRAYS data chain.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh prepared deal factory"
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
          ["Coverage", readModel ? `${readModel.completedBlocks} / ${readModel.totalBlocks}` : "..."],
          ["Stages", readModel ? readModel.sourceChain.length.toString() : "..."],
          ["Boundaries", readModel ? readModel.integrationBoundaries.length.toString() : "..."],
          ["Writes", "0"],
          ["Next review", "Product decision"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Factory chain</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Every prepared deal must trace through these governed stages.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {firstStages.map((stage) => {
              const Icon = stageIcon(stage.key);
              return (
                <article key={stage.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[var(--surface)] text-[var(--accent)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{stage.label}</h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{stage.purpose}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stage.craysCoreObjects.slice(0, 4).map((object) => (
                      <span key={object} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--ink-muted)]">
                        {object}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{stage.releaseGate}</p>
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
            <div className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Decision gate</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Future source reads or write adapters require a separate product decision. This view is not an approval by itself.
            </p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Closed controls</h2>
            <div className="mt-4 space-y-2">
              {["Provider calls", "Source writes", "Uploads", "Candidate release", "Bank send", "Payment initiation"].map((item) => (
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
          <h2 className="font-semibold">Required decision data</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dataRequirements.map((requirement) => (
            <article key={requirement.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{requirement.requiredFor}</p>
              <h3 className="mt-2 text-sm font-semibold">{requirement.label}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{requirement.readinessRule}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
