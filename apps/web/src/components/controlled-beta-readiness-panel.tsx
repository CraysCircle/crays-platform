"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DoorClosed, Flag, LockKeyhole, RefreshCw, RotateCcw, ShieldCheck, TestTube2, UsersRound } from "lucide-react";
import {
  emptyControlledBetaReadiness,
  type ControlledBetaReadiness,
} from "@/lib/controlled-beta-readiness-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ControlledBetaReadiness;
  betaApproved: false;
  betaLaunched: false;
  productionDeployPerformed: false;
  externalActionsPerformed: false;
  openedExactGates: 0;
  toolApplyEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

const blockTone = {
  prepared: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  blocked: "border-orange-700/20 bg-orange-50 text-orange-950",
  closed: "border-rose-700/20 bg-rose-50 text-rose-950",
};

async function loadControlledBeta(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/beta-readiness/controlled/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Controlled beta readiness returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function ControlledBetaReadinessPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyControlledBetaReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadControlledBeta(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Controlled beta readiness failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Beta launch", enabled: readModel.boundaries.betaLaunched },
      { label: "Production deploy", enabled: readModel.boundaries.productionDeployEnabled },
      { label: "Live external reads", enabled: readModel.boundaries.liveExternalReadsEnabled },
      { label: "Approved apply gates", enabled: readModel.boundaries.approvedApplyGatesOpened },
      { label: "Tool apply", enabled: readModel.boundaries.toolApplyEnabled },
      { label: "External sending", enabled: readModel.boundaries.externalSendingEnabled },
      { label: "Candidate release", enabled: readModel.boundaries.candidateReleaseEnabled },
      { label: "Bank release", enabled: readModel.boundaries.bankReleaseEnabled },
      { label: "Payment initiation", enabled: readModel.boundaries.paymentInitiationEnabled },
    ],
    [readModel],
  );

  if (!fallback.access.allowed) return null;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Controlled beta readiness</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Controlled beta release</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Beta work is prepared as explicit scope, room, gate and recovery decisions. Nothing launches, deploys, releases, writes, uploads, sends or pays until a later exact gate opens it.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh controlled beta readiness"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Beta blocks", readModel.summary.betaBlocks.toString()],
          ["Prepared", readModel.summary.preparedBlocks.toString()],
          ["Blocked", readModel.summary.blockedBlocks.toString()],
          ["Gate prep", readModel.summary.exactGatePreparations.toString()],
          ["Rooms", readModel.summary.externalRoomsPrepared.toString()],
          ["Side effects", readModel.summary.openSideEffectGates.toString()],
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
              <Flag className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Beta block register</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Each block defines the work outcome and the gate that remains closed.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.blocks.map((block) => (
              <article key={block.blockRange} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{block.blockRange}</p>
                    <strong className="mt-1 block text-sm">{block.label}</strong>
                  </div>
                  <span className={`rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${blockTone[block.status]}`}>
                    {stateLabel(block.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{block.outcome}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Still gated: {block.stillGated}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              <h2 className="font-semibold">Closed execution gates</h2>
            </div>
            <div className="mt-4 space-y-2">
              {boundaryRows.map(({ label, enabled }) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span className="text-[var(--ink-muted)]">{label}</span>
                  <strong>{enabled ? "true" : "false"}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Recovery controls</h2>
            </div>
            <div className="mt-4 space-y-3">
              {readModel.recoveryControls.map((control) => (
                <div key={control.key} className="rounded-[8px] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm">{control.label}</strong>
                    <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                      {control.state}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Exact gate preparations</h2>
            </div>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.exactGatePreparations.map((gate) => (
              <article key={gate.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{gate.label}</strong>
                  <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                    {stateLabel(gate.state)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{gate.prerequisite}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <DoorClosed className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold">Prepared rooms</h2>
          </div>
          <div className="mt-4 space-y-3">
            {readModel.betaRooms.map((room) => (
              <div key={room.audience} className="rounded-[8px] bg-white p-3">
                <strong className="text-sm">{room.audience}</strong>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{room.visibleScope}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-semibold">Operations and support queues</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {readModel.opsSupportReadiness.map((item) => (
            <article key={item.surface} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.surface}</p>
              <strong className="mt-2 block text-sm">{item.queue}</strong>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Owner: {item.ownerRole}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
