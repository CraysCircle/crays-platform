"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileCheck2, KeyRound, LockKeyhole, RefreshCw, Route, ShieldCheck } from "lucide-react";
import type { ControlledDevWriteModelContract } from "@/lib/controlled-dev-write-model-contract";

type Payload = {
  status: "ready" | "forbidden";
  readModel: ControlledDevWriteModelContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadWriteModel(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/controlled-dev-write-model/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Controlled Dev write model returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function ControlledDevWriteModelPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadWriteModel(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Controlled Dev write model failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Controlled Dev write models</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Controlled command model</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              CRAYS Core command envelopes before any tool apply, sync apply, upload, external send, finance action, bank action or release gate is opened.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh controlled Dev write models"
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
          ["Command models", readModel ? readModel.summary.commandModels.toString() : "..."],
          ["Model ready", readModel ? readModel.summary.modelReady.toString() : "..."],
          ["Apply ready", readModel ? readModel.summary.applyReady.toString() : "..."],
          ["Blocked apply", readModel ? readModel.summary.blockedApplyPaths.toString() : "..."],
          ["Exact gate", readModel ? "Required" : "..."],
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
            <h2 className="font-semibold">Command runway</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Model-ready CRAYS Core commands. Tool apply remains blocked.</p>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {(readModel?.commandModels ?? []).map((command) => (
              <article key={command.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{command.module}</p>
                    <h3 className="mt-1 font-semibold">{command.label}</h3>
                  </div>
                  <span className="rounded-[7px] border border-amber-700/20 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase text-amber-950">
                    {statusLabel(command.applyStatus)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{command.userAction}</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex gap-2">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span>{command.idempotencyPolicy}</span>
                  </div>
                  <div className="flex gap-2">
                    <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue)]" />
                    <span>{command.auditEvent}</span>
                  </div>
                  <div className="flex gap-2">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>Apply remains closed until the named workflow opens this action.</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Envelope</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(readModel?.commandEnvelope.requiredFields ?? []).slice(0, 8).map((field) => (
                <span key={field} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                  {field}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Gate checklist</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(readModel?.gateChecklist ?? []).map((item) => (
                <div key={item.key} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={`rounded-[7px] px-2 py-1 text-xs font-semibold uppercase ${item.status === "ready" ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}>
                      {item.status}
                    </span>
                  </div>
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
              {["Tool apply", "Sync apply", "Uploads", "External sending", "Finance actions", "Bank actions", "Releases"].map((item) => (
                <div key={item} className="rounded-[8px] bg-white px-3 py-2">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
