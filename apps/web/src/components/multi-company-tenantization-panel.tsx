"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArchiveX, Building2, DatabaseZap, Fingerprint, LockKeyhole, RefreshCw, ShieldCheck, Store, WalletCards } from "lucide-react";
import {
  emptyMultiCompanyTenantizationReadiness,
  type MultiCompanyTenantizationReadiness,
} from "@/lib/multi-company-tenantization-contract";
import { roleByKey } from "@/lib/roles";

type Payload = {
  status: "ready" | "forbidden";
  readModel: MultiCompanyTenantizationReadiness;
  fitYesCommercialPilotApproved: false;
  productionTenantCreated: false;
  tenantWritesPerformed: false;
  externalActionsPerformed: false;
  billingActionsEnabled: false;
  exportExecutionEnabled: false;
  retentionDeleteExecutionEnabled: false;
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

async function loadTenantization(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/tenantization/multi-company/readiness?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Multi-company tenantization returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function MultiCompanyTenantizationPanel() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "admin";
  const roleKey = roleByKey(role).key;
  const fallback = emptyMultiCompanyTenantizationReadiness(roleKey);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });

  useEffect(() => {
    if (!fallback.access.allowed) return;

    const controller = new AbortController();
    loadTenantization(roleKey, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          state: "error",
          data: null,
          error: error instanceof Error ? error.message : "Multi-company tenantization failed",
        });
      });

    return () => controller.abort();
  }, [fallback.access.allowed, refreshKey, roleKey]);

  const readModel = loadState.data?.readModel ?? fallback;
  const boundaryRows = useMemo(
    () => [
      { label: "Production tenant migration", enabled: readModel.boundaries.productionTenantMigrationEnabled },
      { label: "Live tenant provisioning", enabled: readModel.boundaries.liveTenantProvisioningEnabled },
      { label: "Tenant data writes", enabled: readModel.boundaries.tenantDataWritesEnabled },
      { label: "Cross-tenant data sharing", enabled: readModel.boundaries.crossTenantDataSharingEnabled },
      { label: "Unscoped queries", enabled: readModel.boundaries.unscopedQueriesEnabled },
      { label: "Billing actions", enabled: readModel.boundaries.billingActionsEnabled },
      { label: "Export execution", enabled: readModel.boundaries.exportExecutionEnabled },
      { label: "Retention delete execution", enabled: readModel.boundaries.retentionDeleteExecutionEnabled },
      { label: "Production deploy", enabled: readModel.boundaries.productionDeployEnabled },
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
              <Building2 className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Multi-company tenantization</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Tenant operating model</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              CRAYS Core becomes tenant-ready without copying business data into FitYes, without live provisioning and without unscoped reads, commands, billing, exports or retention actions.
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh multi-company tenantization"
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
          ["Tenant blocks", readModel.summary.tenantBlocks.toString()],
          ["Prepared", readModel.summary.preparedBlocks.toString()],
          ["Blocked", readModel.summary.blockedBlocks.toString()],
          ["Tenants", readModel.summary.tenantsPrepared.toString()],
          ["Scope rules", readModel.summary.scopeRules.toString()],
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
              <Store className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Tenant register</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Tenants are modeled before any live provisioning or production migration.</p>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {readModel.tenants.map((tenant) => (
              <article key={tenant.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <strong className="text-sm">{tenant.label}</strong>
                  <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                    {stateLabel(tenant.state)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{stateLabel(tenant.businessDataState)}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{tenant.nextAction}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">Closed tenant gates</h2>
          </div>
          <div className="mt-4 space-y-2">
            {boundaryRows.map(({ label, enabled }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                <span className="text-[var(--ink-muted)]">{label}</span>
                <strong>{enabled ? "true" : "false"}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Tenant block plan</h2>
            </div>
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
              <Fingerprint className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Scope enforcement</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.scopeRules.map((rule) => (
                <div key={rule.key} className="rounded-[8px] bg-white p-3">
                  <strong className="text-sm">{rule.label}</strong>
                  <p className="mt-1 text-xs uppercase text-[var(--ink-muted)]">{rule.enforcedLayer}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Regression checks</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.regressionChecks.map((check) => (
                <div key={check.key} className="rounded-[8px] bg-white p-3">
                  <strong className="text-sm">{check.label}</strong>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{check.proves}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Module templates</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Every tenant module carries a tenant-scope contract before it can work with records.</p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {readModel.moduleTemplates.map((template) => (
              <article key={template.module} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{template.module}</p>
                <strong className="mt-2 block text-sm">{template.label}</strong>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{template.requiredTenantScope}</p>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Commercial controls</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.commercialControls.map((control) => (
                <div key={control.key} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span>{control.label}</span>
                  <strong className="text-xs uppercase text-[var(--ink-muted)]">{stateLabel(control.state)}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <ArchiveX className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Retention controls</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.retentionControls.map((control) => (
                <div key={control.key} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm">
                  <span>{control.label}</span>
                  <strong className="text-xs uppercase text-[var(--ink-muted)]">{stateLabel(control.state)}</strong>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
