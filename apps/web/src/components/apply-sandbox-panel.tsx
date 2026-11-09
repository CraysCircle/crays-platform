"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, GitBranch, LockKeyhole, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import type { ApplySandboxItem, ApplySandboxReadModel } from "@/db/apply-sandbox-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = { status: string; readModel: ApplySandboxReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance", "studio-manager", "franchise-partner"];
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/apply-sandbox/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(`Apply Sandbox returned HTTP ${response.status}`);
  return payload;
}

async function stageSandboxReview(role: string, readModel: ApplySandboxReadModel, item: ApplySandboxItem) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `block66-apply-sandbox-${role}-${item.commandId}`,
      actorRole: role,
      commandType: item.status === "gate_blocked" ? "rollback_plan" : "diff_review",
      action: item.status === "gate_blocked" ? "stage_rollback" : "classify_diff",
      title: `Review apply sandbox for ${item.label}`,
      notes: `${item.nextAction} This stores an apply-sandbox review draft only. No source, sync, tool, target or destructive apply is executed.`,
      status: item.status,
      syncMappingId: item.commandId,
      sourceModule: "apply-sandbox",
      targetModule: item.moduleKey,
      entityTypeKey: item.diffClass,
      conflictClass: "apply_sandbox_review",
      retryClass: "review-only",
      rollbackPlan: item.rollbackPlan,
    }),
  });
  const payload = (await response.json()) as { result?: { commandId?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Apply Sandbox command returned HTTP ${response.status}`);
  return {
    commandId: payload.result?.commandId ?? null,
    message: payload.result?.targetApplyStatus === "blocked" ? "Apply sandbox review stored. Target apply remains blocked." : "Apply sandbox review stored.",
  };
}

export function ApplySandboxPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <ApplySandboxContent key={role} role={role} />;
}

function ApplySandboxContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [moduleKey, setModuleKey] = useState("all");
  const [status, setStatus] = useState("all");
  const [gate, setGate] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Apply Sandbox unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return readModel?.items.filter((item) => {
      if (moduleKey !== "all" && item.moduleKey !== moduleKey) return false;
      if (status !== "all" && item.status !== status) return false;
      if (gate !== "all" && item.applyGate !== gate) return false;
      if (owner !== "all" && item.departmentOwner !== owner) return false;
      if (!term) return true;
      return [item.label, item.commandId, item.commandKey, item.targetObject, item.diffClass, item.rollbackPlan, item.applyGateLabel].join(" ").toLowerCase().includes(term);
    }) ?? [];
  }, [gate, moduleKey, owner, readModel, search, status]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  if (!allowed) return <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950"><p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Apply Sandbox</p><h2 className="mt-2 text-2xl font-semibold">Apply Sandbox is internal-only</h2><p className="mt-2 text-sm">This role has no apply-sandbox scope and no API request is made from this surface.</p></section>;
  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading apply sandbox</section>;
  if (loadState.state === "error" || !readModel) return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950"><h3 className="font-semibold">Apply Sandbox unavailable</h3><p className="mt-2 text-sm">{loadState.error}</p></section>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><RotateCcw className="h-4 w-4 text-emerald-700" /> Apply Sandbox</p>
          <h2 className="mt-2 text-2xl font-semibold">Reviewable apply simulation design</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">Core command drafts mapped to simulated target adapters, diff classes, rollback plans, idempotency policy and audit evidence while all apply gates stay closed.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.items} sandbox items</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.gateBlocked} gate-blocked</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.rollbackReady} rollback-ready</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.idempotentItems} idempotent</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh sandbox</button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="relative"><span className="sr-only">Search apply sandbox</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search command or diff" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" /></label>
        <select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All modules</option>{readModel.controls.modules.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All statuses</option>{readModel.controls.statuses.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={gate} onChange={(event) => setGate(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All gates</option>{readModel.controls.gates.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All owners</option>{readModel.controls.owners.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]"><tr><th className="px-4 py-3">Sandbox item</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Diff</th><th className="px-4 py-3">Gate</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => { setSelectedId(item.id); setCommand({ state: "idle", message: null, commandId: null }); }} className={`cursor-pointer border-t ${selected?.id === item.id ? "bg-emerald-50" : "bg-white"}`}><td className="px-4 py-3"><strong>{item.label}</strong><p className="mt-1 break-all font-mono text-xs text-[var(--ink-muted)]">{item.commandId}</p></td><td className="px-4 py-3">{item.moduleLabel}</td><td className="px-4 py-3">{title(item.diffClass)}</td><td className="px-4 py-3">{item.applyGateLabel}</td><td className="px-4 py-3">{title(item.status)}</td></tr>)}</tbody></table>
          {!items.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No sandbox item matches these filters.</p> : null}
        </div>
        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected sandbox item</p><h3 className="mt-2 text-lg font-semibold">{selected.label}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.nextAction}</p></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">{[["Target", selected.simulatedTarget], ["Validation", title(selected.validationState)], ["Dry run", title(selected.dryRunState)], ["Gate", selected.applyGateLabel]].map(([term, value]) => <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm"><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Rollback plan</p><p className="mt-2 leading-6">{selected.rollbackPlan}</p></div>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm"><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Idempotency policy</p><p className="mt-2 leading-6">{selected.idempotencyPolicy}</p></div>
              <div className="rounded-[8px] bg-emerald-50 p-3 text-sm text-emerald-950"><p className="text-xs font-semibold uppercase">Audit evidence</p><ul className="mt-2 space-y-1">{selected.auditEvidence.map((item) => <li key={item}>· {item}</li>)}</ul></div>
              <div className="grid gap-2"><a href={selected.href} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected module <ArrowRight className="h-4 w-4" /></a>{readModel.actions.stageSandboxReviewAllowed ? <button type="button" onClick={() => { setCommand({ state: "submitting", message: "Staging guarded sandbox review", commandId: null }); stageSandboxReview(role, readModel, selected).then((result) => setCommand({ state: "ready", message: result.message, commandId: result.commandId })).catch((error: unknown) => setCommand({ state: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null })); }} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><GitBranch className="h-4 w-4" /> Stage sandbox review</button> : null}</div>
              {command.state !== "idle" ? <div className={`rounded-[8px] border p-3 text-sm ${command.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}><strong>{command.message}</strong>{command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}<p className="mt-1 text-xs">{readModel.actions.applyGate} remains closed.</p></div> : null}
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select a sandbox item.</p>}
        </aside>
      </div>

      <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Hard boundary</p><p className="mt-2">This sandbox designs reviewable applies only. Source apply, sync apply, tool apply, target apply, destructive apply, release, send, payment, finance posting, upload, live AI and deployment remain disabled.</p></div>
    </section>
  );
}
