"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, ShieldCheck, Workflow } from "lucide-react";

type ControlItem = {
  key: string;
  label: string;
  path: string;
  valuePath: string[];
};

type ControlPayload = {
  status: "ready" | "forbidden";
  [key: string]: unknown;
};

type LoadedControl = ControlItem & {
  status: "ready" | "forbidden" | "error";
  value: string;
};

type LoadState =
  | { state: "loading"; controls: LoadedControl[]; error: null }
  | { state: "ready"; controls: LoadedControl[]; error: null }
  | { state: "error"; controls: LoadedControl[]; error: string };

const controls: ControlItem[] = [
  {
    key: "source-evidence",
    label: "Source evidence",
    path: "/api/crays/adapters/source-smoke/evidence?role=admin",
    valuePath: ["readModel", "summary", "boundedSmokesComplete"],
  },
  {
    key: "write-decision",
    label: "Write decision",
    path: "/api/crays/adapters/write-decision/contract?role=admin",
    valuePath: ["contract", "decision", "approvedWriteAdapters"],
  },
  {
    key: "reconciliation",
    label: "Reconciliation",
    path: "/api/crays/sync/reconciliation/contract?role=admin",
    valuePath: ["contract", "decision", "reconciliationExecutionApproved"],
  },
  {
    key: "audit",
    label: "Audit events",
    path: "/api/crays/adapters/audit/contract?role=admin",
    valuePath: ["contract", "audit", "auditWritesEnabled"],
  },
  {
    key: "seed-cleanup",
    label: "Seed cleanup",
    path: "/api/crays/test-data/seed-cleanup/contract?role=admin",
    valuePath: ["contract", "cleanup", "cleanupExecutionEnabled"],
  },
  {
    key: "package-readiness",
    label: "Package readiness",
    path: "/api/crays/packages/readiness/expansion?role=admin",
    valuePath: ["contract", "readiness", "packageCreationEnabled"],
  },
  {
    key: "write-candidate",
    label: "Write candidate",
    path: "/api/crays/adapters/write-candidate/contract?role=admin",
    valuePath: ["contract", "finalDecision", "approvedWriteAdapters"],
  },
];

function valueAt(payload: ControlPayload, path: string[]) {
  return path.reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, payload);
}

function displayValue(value: unknown) {
  if (value === false) return "Disabled";
  if (value === true) return "Enabled";
  if (value === 0) return "0";
  if (typeof value === "number") return new Intl.NumberFormat("en").format(value);
  if (typeof value === "string") return value.replaceAll("_", " ");
  return "Ready";
}

async function loadControl(control: ControlItem, signal: AbortSignal): Promise<LoadedControl> {
  const response = await fetch(control.path, { cache: "no-store", signal });
  const payload = (await response.json()) as ControlPayload;

  return {
    ...control,
    status: response.ok ? payload.status : "error",
    value: response.ok ? displayValue(valueAt(payload, control.valuePath)) : `HTTP ${response.status}`,
  };
}

async function loadControls(signal: AbortSignal) {
  const results = await Promise.all(controls.map((control) => loadControl(control, signal)));
  return results;
}

export function SyncControlsPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", controls: [], error: null });

  useEffect(() => {
    const controller = new AbortController();

    loadControls(controller.signal)
      .then((data) => setLoadState({ state: "ready", controls: data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          controls: [],
          error: error instanceof Error ? error.message : "Sync controls failed",
        });
      });

    return () => controller.abort();
  }, [refreshKey]);

  const controlsToRender = loadState.controls.length
    ? loadState.controls
    : controls.map((control) => ({ ...control, status: "ready" as const, value: "..." }));

  const disabledCount = useMemo(() => controlsToRender.filter((control) => control.value === "Disabled" || control.value === "0").length, [controlsToRender]);

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Sync controls</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Readiness gates</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Source smoke, reconciliation, audit, cleanup, package and write-candidate gates in one operator view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadState({ state: "loading", controls: [], error: null });
              setRefreshKey((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loadState.state === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadState.state === "error" ? (
          <div className="mt-5 flex gap-3 rounded-[8px] border border-rose-700/20 bg-rose-50 p-4 text-sm leading-6 text-rose-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadState.error}</span>
          </div>
        ) : null}
      </article>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Tracked gates", controls.length.toString()],
          ["Disabled gates", loadState.state === "loading" ? "..." : disabledCount.toString()],
          ["Control actions", "Disabled"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="font-semibold">Gate status</h2>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {controlsToRender.map((control) => (
            <div key={control.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileSearch className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <strong className="truncate text-sm">{control.label}</strong>
                </div>
                <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{control.status}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                <span>{control.value}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-semibold">Blocked by default</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
          {["Source writes", "Sync writes", "Retries", "Reconciliation", "Provider calls", "Uploads", "External sending"].map((item) => (
            <span key={item} className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-2">
              {item}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}
