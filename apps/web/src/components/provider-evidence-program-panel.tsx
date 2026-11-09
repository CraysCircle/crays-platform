"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Boxes, CheckCircle2, DatabaseZap, MapPinned, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";
import type {
  LocationNoCallScaffoldContract,
  ProviderEvidenceProgramReadiness,
} from "@/lib/provider-evidence-program-readiness-contract";

type ProgramPayload = {
  status: "ready" | "forbidden";
  readModel: ProviderEvidenceProgramReadiness;
};

type ScaffoldPayload = {
  status: "ready" | "forbidden";
  scaffold: LocationNoCallScaffoldContract;
};

type LoadState =
  | { state: "loading"; program: null; scaffold: null; error: null }
  | { state: "ready"; program: ProgramPayload; scaffold: ScaffoldPayload; error: null }
  | { state: "error"; program: null; scaffold: null; error: string };

async function loadProgram(role: string, signal: AbortSignal) {
  const [programResponse, scaffoldResponse] = await Promise.all([
    fetch(`/api/crays/provider-evidence/program/readiness?role=${role}`, { cache: "no-store", signal }),
    fetch(`/api/crays/location-intelligence/no-call/scaffold?role=${role}`, { cache: "no-store", signal }),
  ]);

  if (!programResponse.ok) throw new Error(`Provider Evidence program returned HTTP ${programResponse.status}`);
  if (!scaffoldResponse.ok) throw new Error(`Location Intelligence scaffold returned HTTP ${scaffoldResponse.status}`);

  const program = (await programResponse.json()) as ProgramPayload;
  const scaffold = (await scaffoldResponse.json()) as ScaffoldPayload;
  return { program, scaffold };
}

export function ProviderEvidenceProgramPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", program: null, scaffold: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadProgram(role, controller.signal)
      .then(({ program, scaffold }) => setLoadState({ state: "ready", program, scaffold, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", program: null, scaffold: null, error: error instanceof Error ? error.message : "Program readiness failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.program?.readModel;
  const scaffold = loadState.scaffold?.scaffold;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Provider Evidence program</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Evidence program</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Controlled CRAYS evidence layer for location, property, rent, deal economics and banking readiness. Default mode is no-call and no-release.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Provider Evidence program"
            onClick={() => {
              setLoadState({ state: "loading", program: null, scaffold: null, error: null });
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
          ["Mode", "No-call"],
          ["Evidence surfaces", readModel ? readModel.evidenceSurfaces.length.toString() : "..."],
          ["Core tables", readModel ? readModel.persistenceTables.length.toString() : "..."],
          ["Live reads", "Off"],
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
            <h2 className="font-semibold">Block groups</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Prepared program layers before any sandbox or live provider decision.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {(readModel?.blockGroups ?? []).map((group) => (
              <article key={group.range} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[var(--surface)] text-[var(--accent)]">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{group.range}</p>
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
              <MapPinned className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Decision scaffold</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              {scaffold
                ? `${scaffold.syntheticFixtures.length} synthetic fixtures, cache fill off, live read off.`
                : "Loading no-call fixture scaffold."}
            </p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Persistence</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Evidence Core migration is dry-run ready. Database apply remains blocked.</p>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Closed controls</h2>
            </div>
            <div className="mt-4 space-y-2">
              {["Live provider reads", "Owner submission writes", "Candidate release", "Bank release", "Payment initiation", "Production deploy"].map((item) => (
                <div key={item} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
