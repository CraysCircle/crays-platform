"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import type { CaseWorkspaceReadModel } from "@/db/case-workspace-read-model-repository";

type CaseWorkspacePayload = {
  status: "ready" | "not_configured" | "not_found" | "forbidden";
  readModel: CaseWorkspaceReadModel;
};

type CaseWorkspaceLoadState =
  | { state: "idle"; data: null; error: null }
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: CaseWorkspacePayload; error: null }
  | { state: "error"; data: null; error: string };

type ModuleKey = "crm" | "project" | "erp" | "files" | "analytics" | "loans" | "operations";

async function loadCaseWorkspace(search: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`/api/crays/case-workspace/read-model?${search.toString()}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Case workspace returned HTTP ${response.status}`);
  return (await response.json()) as CaseWorkspacePayload;
}

function statusClass(status: string) {
  if (status === "ready") return "border-emerald-700/20 bg-emerald-50 text-emerald-950";
  if (status === "blocked") return "border-rose-700/20 bg-rose-50 text-rose-950";
  if (status === "waiting") return "border-amber-700/20 bg-amber-50 text-amber-950";
  return "border-sky-700/20 bg-sky-50 text-sky-950";
}

function labelize(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Pending";
}

export function CaseWorkspaceContextPanel({ moduleKey, role: roleOverride }: { moduleKey: ModuleKey; role?: string }) {
  const searchParams = useSearchParams();
  const role = roleOverride ?? searchParams.get("role") ?? "deal-manager";
  const caseId = searchParams.get("case") ?? searchParams.get("preparedOfferId");
  const dealId = searchParams.get("deal") ?? searchParams.get("dealId");
  const propertyCaseId = searchParams.get("propertyCase") ?? searchParams.get("propertyCaseId");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<CaseWorkspaceLoadState>({ state: "idle", data: null, error: null });

  const query = useMemo(() => {
    if (!caseId) return null;
    const params = new URLSearchParams({ role, preparedOfferId: caseId });
    if (dealId) params.set("dealId", dealId);
    if (propertyCaseId) params.set("propertyCaseId", propertyCaseId);
    return params;
  }, [caseId, dealId, propertyCaseId, role]);

  useEffect(() => {
    if (!query) {
      return;
    }
    const controller = new AbortController();
    loadCaseWorkspace(query, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Case workspace failed" });
      });

    return () => controller.abort();
  }, [query, refreshKey]);

  if (!caseId) return null;

  if (loadState.state === "idle" || loadState.state === "loading") {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading active case context
        </div>
      </article>
    );
  }

  if (loadState.state === "error") {
    return (
      <article className="rounded-[8px] border border-rose-700/20 bg-rose-50 p-5 text-rose-950">
        <p className="text-sm font-semibold">Active case context unavailable</p>
        <p className="mt-1 text-sm opacity-75">{loadState.error}</p>
      </article>
    );
  }

  const readModel = loadState.data?.readModel ?? null;
  if (!readModel?.case) {
    return (
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <p className="text-sm font-semibold">Active case context</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">No CRAYS Core case was found for this module link.</p>
      </article>
    );
  }

  const activeLink = readModel.moduleDeepLinks.find((link) => link.moduleKey === moduleKey);

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
              Active case
            </span>
            <span className="rounded-[7px] border border-emerald-700/20 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-950">
              Core context
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold">{readModel.case.title}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {readModel.case.market} - {labelize(readModel.case.status)} - {readModel.case.nextAction}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoadState({ state: "loading", data: null, error: null });
            setRefreshKey((value) => value + 1);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh case
        </button>
      </div>

      <div className="grid gap-3 px-5 py-4 md:grid-cols-4">
        {[
          ["Sections", `${readModel.summary.readySections}/${readModel.summary.sections} ready`],
          ["Blockers", String(readModel.summary.blockedSections)],
          ["Command drafts", String(readModel.summary.commandDrafts)],
          ["Current module", activeLink?.moduleLabel ?? moduleKey],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-sm">{value}</strong>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-t border-[var(--line)] px-5 py-4 xl:grid-cols-7">
        {readModel.sections.map((section) => (
          <div key={section.key} className={`rounded-[8px] border p-3 ${statusClass(section.status)}`}>
            <p className="text-[11px] font-semibold uppercase opacity-70">{section.ownerRole}</p>
            <strong className="mt-2 block text-sm">{section.label}</strong>
            <span className="mt-1 block text-xs opacity-75">{section.state}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-t border-[var(--line)] px-5 py-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">Case handoffs</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {readModel.moduleDeepLinks.map((link) => (
              <a
                key={link.moduleKey}
                href={link.href}
                className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-xs font-semibold transition ${
                  link.moduleKey === moduleKey
                    ? "border-[var(--foreground)] bg-[var(--foreground)] !text-white hover:!text-white"
                    : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                }`}
              >
                {link.moduleLabel}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <strong className="text-sm">Gates remain closed</strong>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            Apply, sync apply, upload, send, release, finance, bank, payment, deploy and server-changing work are blocked.
          </p>
        </div>
      </div>
    </article>
  );
}
