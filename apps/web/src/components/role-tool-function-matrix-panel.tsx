"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Grid3X3, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import type { RoleToolFunctionMatrixContract } from "@/lib/role-tool-function-matrix";

type Payload = {
  status: "ready" | "forbidden";
  readModel: RoleToolFunctionMatrixContract;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

async function loadMatrix(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/adapters/role-tool-function-matrix/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Role tool function matrix returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function modeLabel(mode: string) {
  return mode.replaceAll("_", " ");
}

export function RoleToolFunctionMatrixPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    loadMatrix(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Matrix failed" });
      });
    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel;
  const visibleRoleRows = useMemo(() => readModel?.roles.slice(0, readModel.access.level === "portal_scope" ? 1 : 8) ?? [], [readModel]);
  const functionFamilies = useMemo(() => {
    if (!readModel) return [];
    return Array.from(new Set(readModel.tools.flatMap((tool) => tool.functions.map((item) => item.family))));
  }, [readModel]);

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Role tool function matrix</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Role capability matrix</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Role-scoped coverage for every tool surface and function family before controlled Dev writes or sync are opened.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh role tool function matrix"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {[
          ["Roles", readModel ? readModel.summary.rolesMapped.toString() : "..."],
          ["Tools", readModel ? readModel.summary.toolsMapped.toString() : "..."],
          ["Families", readModel ? readModel.summary.functionFamiliesMapped.toString() : "..."],
          ["Entitlements", readModel ? readModel.summary.entitlementsMapped.toString() : "..."],
          ["Capabilities", readModel ? readModel.summary.capabilityScopesMapped.toString() : "..."],
          ["Departments", readModel ? readModel.summary.departmentsMapped.toString() : "..."],
          ["Missing keys", readModel ? readModel.summary.missingFunctionKeys.toString() : "..."],
        ].map(([label, value]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Role coverage</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Tool entitlements are scoped by role, surface and current execution mode.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {visibleRoleRows.map((roleRow) => (
              <div key={roleRow.key} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block text-sm">{roleRow.label}</strong>
                    <span className="mt-1 block text-sm text-[var(--ink-muted)]">{modeLabel(roleRow.mode)}</span>
                  </div>
                  <span className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                    {roleRow.entitlements.length} tools
                  </span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {roleRow.entitlements.slice(0, 6).map((entitlement) => (
                    <div key={`${roleRow.key}-${entitlement.module}`} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-sm">{entitlement.toolLabel}</strong>
                        <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{modeLabel(entitlement.currentMode)}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                        {entitlement.functions.length} functions, {entitlement.dataScopes.join(", ")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entitlement.functions.slice(0, 4).map((item) => (
                          <span key={item.key} className="rounded-[7px] bg-[var(--surface-strong)] px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
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
              <h2 className="font-semibold">Capability scopes</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(readModel?.fullOsCapabilityScopes ?? []).slice(0, 5).map((scope) => (
                <div key={scope.key} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm">{scope.capability}</strong>
                    <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">{scope.ownerDepartment}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                    {scope.coreObject} - {scope.commandModel}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{scope.craysOrchestration}</p>
                </div>
              ))}
              {readModel && readModel.fullOsCapabilityScopes.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No capability scopes are visible for this role.</p>
              ) : null}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Function families</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {functionFamilies.map((family) => (
                <span key={family} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                  {family}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Closed controls</h2>
            </div>
            <div className="mt-4 space-y-2">
              {[
                "Live source calls",
                "Source writes",
                "Sync writes",
                "Uploads",
                "External sending",
                "Finance writes",
                "Bank sends",
                "Production deploy",
              ].map((item) => (
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
