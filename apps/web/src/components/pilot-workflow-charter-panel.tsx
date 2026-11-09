"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Gauge, LockKeyhole, RefreshCw, ShieldCheck, UsersRound, Waypoints } from "lucide-react";
import { getPilotWorkflowCharterContract, type PilotWorkflowCharterContract } from "@/lib/pilot-workflow-charter-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: PilotWorkflowCharterContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadPilotWorkflowCharter(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/pilot-workflow/charter/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Pilot Workflow charter returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

export function PilotWorkflowCharterPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadPilotWorkflowCharter(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Pilot Workflow charter failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel ?? getPilotWorkflowCharterContract(roleByKey(role).key);

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Pilot Workflow charter</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Pilot workflow charter</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              End-to-end pilot scope across property, evidence, economics, Candidate intent, bank package readiness and opening handoff.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh Pilot Workflow charter"
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
          ["Phases", readModel ? readModel.summary.phases.toString() : "..."],
          ["Roles", readModel ? readModel.summary.owningRoles.toString() : "..."],
          ["Surfaces", readModel ? readModel.summary.moduleSurfaces.toString() : "..."],
          ["QA evidence", readModel ? readModel.summary.qaEvidenceItems.toString() : "..."],
          ["Apply ready", readModel ? readModel.summary.applyReady.toString() : "..."],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Waypoints className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Pilot phases</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Role-owned phases before exact apply, send, upload or release gates.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {(readModel?.phases ?? []).map((phase) => (
              <article key={phase.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{phase.blockRange}</p>
                    <h3 className="mt-1 font-semibold">{phase.label}</h3>
                  </div>
                  <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                    {phase.ownerRole}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{phase.visibleOutcome}</p>
                <div className="mt-4 grid gap-2 text-xs leading-5 text-[var(--foreground)]">
                  <p>
                    <strong>Core:</strong> {phase.coreObjects.join(", ")}
                  </p>
                  <p>
                    <strong>Surfaces:</strong> {phase.moduleSurfaces.join(", ")}
                  </p>
                  <p>
                    <strong>Gate:</strong> {phase.gatePosture}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Role ownership</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(readModel?.roleMap ?? []).map((item) => (
                <div key={item.role} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.role}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.owns}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{item.visibilityRule}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">QA evidence</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(readModel?.qaEvidenceModel ?? []).map((item) => (
                <div key={item.key} className="rounded-[8px] bg-white p-3 text-sm">
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.requiredProof}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              <h2 className="font-semibold">Closed controls</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              {["Live external reads", "Source writes", "Sync writes", "Tool apply", "Uploads", "External sending", "Candidate release", "Bank send", "Finance writes", "Production deploy"].map((item) => (
                <div key={item} className="rounded-[8px] bg-white px-3 py-2">
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Next inputs</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(readModel?.nextBlockInputs ?? []).map((item) => (
                <div key={item.blockRange} className="rounded-[8px] bg-white p-3 text-sm">
                  <p className="font-semibold">{item.blockRange}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.requiredInput}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
