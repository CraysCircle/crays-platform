"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowRight, GitBranch, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { MonitoringReadModel, MonitoringRecord } from "@/db/monitoring-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = { status: string; readModel: MonitoringReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance", "studio-manager"];
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/monitoring/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(`Monitoring returned HTTP ${response.status}`);
  return payload;
}

async function stageMonitoringReview(role: string, readModel: MonitoringReadModel, record: MonitoringRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `block67-monitoring-${role}-${record.id}`,
      actorRole: role,
      commandType: record.status === "blocked" ? "conflict_review" : "diff_review",
      action: record.status === "blocked" ? "classify_conflict" : "classify_diff",
      title: `Review monitoring signal for ${record.label}`,
      notes: `${record.currentState} ${record.recoveryAction} This stores a monitoring review draft only. No retry, source write, sync apply, tool apply, target apply, external send, release, payment, finance posting, upload or live AI execution is triggered.`,
      status: record.status,
      syncMappingId: record.id,
      sourceModule: "monitoring",
      targetModule: record.moduleKey,
      entityTypeKey: record.family,
      conflictClass: "monitoring_review",
      retryClass: "review-only",
      rollbackPlan: "Keep the current Core projection unchanged; use the draft only for review notes until apply gates are explicitly opened in a future controlled process.",
    }),
  });
  const payload = (await response.json()) as { result?: { commandId?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Monitoring review command returned HTTP ${response.status}`);
  return {
    commandId: payload.result?.commandId ?? null,
    message: payload.result?.targetApplyStatus === "blocked" ? "Monitoring review stored. Target apply remains blocked." : "Monitoring review stored.",
  };
}

export function MonitoringPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <MonitoringContent key={role} role={role} />;
}

function MonitoringContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("all");
  const [moduleKey, setModuleKey] = useState("all");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Monitoring unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const records = useMemo(() => {
    const term = search.trim().toLowerCase();
    return readModel?.records.filter((record) => {
      if (family !== "all" && record.family !== family) return false;
      if (moduleKey !== "all" && record.moduleKey !== moduleKey) return false;
      if (status !== "all" && record.status !== status) return false;
      if (owner !== "all" && record.owner !== owner) return false;
      if (!term) return true;
      return [record.label, record.moduleKey, record.owner, record.status, record.currentState, record.recoveryAction, record.family].join(" ").toLowerCase().includes(term);
    }) ?? [];
  }, [family, moduleKey, owner, readModel, search, status]);
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (!allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Monitoring</p>
        <h2 className="mt-2 text-2xl font-semibold">Monitoring is internal-only</h2>
        <p className="mt-2 text-sm">This role has no monitoring scope and no monitoring API request is made from this surface.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading monitoring signals</section>;
  if (loadState.state === "error" || !readModel) return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950"><h3 className="font-semibold">Monitoring unavailable</h3><p className="mt-2 text-sm">{loadState.error}</p></section>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Activity className="h-4 w-4 text-emerald-700" /> Monitoring</p>
          <h2 className="mt-2 text-2xl font-semibold">Operational health and gate monitoring</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">Runtime connections, source families, sync jobs, Core identity coverage, command-gate states and recovery work are composed into one read-only monitoring surface.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.records} signals</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.blocked} blocked</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.attention} attention</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.commandGateBlocked} command gates closed</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.owners} owners</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh monitoring</button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="relative"><span className="sr-only">Search monitoring signals</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search signal or owner" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" /></label>
        <select value={family} onChange={(event) => setFamily(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All families</option>{readModel.controls.families.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All modules</option>{readModel.controls.modules.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All statuses</option>{readModel.controls.statuses.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All owners</option>{readModel.controls.owners.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]"><tr><th className="px-4 py-3">Signal</th><th className="px-4 py-3">Family</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommand({ state: "idle", message: null, commandId: null }); }} className={`cursor-pointer border-t ${selected?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                  <td className="px-4 py-3"><strong>{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.currentState}</p></td>
                  <td className="px-4 py-3">{title(record.family)}</td>
                  <td className="px-4 py-3">{title(record.moduleKey)}</td>
                  <td className="px-4 py-3">{record.owner}</td>
                  <td className="px-4 py-3"><span className={`rounded-[7px] px-2 py-1 text-xs font-semibold ${record.status === "blocked" ? "bg-rose-100 text-rose-950" : record.status === "attention" ? "bg-amber-100 text-amber-950" : record.status === "stale" ? "bg-sky-100 text-sky-950" : "bg-emerald-100 text-emerald-950"}`}>{title(record.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No monitoring signal matches these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected monitoring signal</p><h3 className="mt-2 text-lg font-semibold">{selected.label}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.recoveryAction}</p></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[["Priority", title(selected.priority)], ["Records", String(selected.records)], ["Conflicts", String(selected.conflicts)], ["Freshness", selected.staleMinutes === null ? "Not time-based" : `${selected.staleMinutes} minutes`]].map(([term, value]) => (
                  <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>
                ))}
              </dl>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm"><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Current state</p><p className="mt-2 leading-6">{selected.currentState}</p></div>
              <div className="grid gap-2">
                <a href={selected.href} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected surface <ArrowRight className="h-4 w-4" /></a>
                {readModel.actions.stageMonitoringReviewAllowed ? <button type="button" onClick={() => { setCommand({ state: "submitting", message: "Staging guarded monitoring review", commandId: null }); stageMonitoringReview(role, readModel, selected).then((result) => setCommand({ state: "ready", message: result.message, commandId: result.commandId })).catch((error: unknown) => setCommand({ state: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null })); }} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><GitBranch className="h-4 w-4" /> Stage monitoring review</button> : null}
              </div>
              {command.state !== "idle" ? <div className={`rounded-[8px] border p-3 text-sm ${command.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}><strong>{command.message}</strong>{command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}<p className="mt-1 text-xs">{readModel.actions.applyGate} remains closed.</p></div> : null}
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select a monitoring signal.</p>}
        </aside>
      </div>

      <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Hard boundary</p>
        <p className="mt-2">Monitoring is read-only. Retry execution, source writes, sync apply, tool apply, target apply, destructive apply, release, send, bank action, payment, finance posting, upload, live AI and production deploy remain disabled.</p>
      </div>
    </section>
  );
}
