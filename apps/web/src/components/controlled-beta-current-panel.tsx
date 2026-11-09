"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Flag, GitBranch, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { ControlledBetaCurrentEvidence, ControlledBetaCurrentReadModel } from "@/db/controlled-beta-current-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = { status: string; readModel: ControlledBetaCurrentReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager", "expansion-manager"];
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/controlled-beta/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(`Controlled Beta Readiness returned HTTP ${response.status}`);
  return payload;
}

async function stageReadinessReview(role: string, readModel: ControlledBetaCurrentReadModel, evidence: ControlledBetaCurrentEvidence) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `block69-controlled-beta-${role}-${evidence.id}`,
      actorRole: role,
      commandType: evidence.status === "blocked" ? "conflict_review" : "diff_review",
      action: evidence.status === "blocked" ? "classify_conflict" : "classify_diff",
      title: `Review controlled beta readiness evidence for ${evidence.label}`,
      notes: `${evidence.currentState} ${evidence.nextAction} This stores a readiness review draft only. No beta launch, production deploy, release, send, upload, bank action, payment, finance posting, source write, sync apply, tool apply, target apply or destructive apply is executed.`,
      status: evidence.status,
      syncMappingId: evidence.id,
      sourceModule: "controlled-beta-readiness",
      targetModule: evidence.category,
      entityTypeKey: evidence.category,
      conflictClass: "controlled_beta_readiness_review",
      retryClass: "review-only",
      rollbackPlan: "Keep all hard gates closed; use the draft as review evidence only.",
    }),
  });
  const payload = (await response.json()) as { result?: { commandId?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Controlled Beta review command returned HTTP ${response.status}`);
  return {
    commandId: payload.result?.commandId ?? null,
    message: payload.result?.targetApplyStatus === "blocked" ? "Controlled beta readiness review stored. Target apply remains blocked." : "Controlled beta readiness review stored.",
  };
}

export function ControlledBetaCurrentPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <ControlledBetaCurrentContent key={role} role={role} />;
}

function ControlledBetaCurrentContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Controlled Beta Readiness unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const categories = useMemo(() => Array.from(new Set(readModel?.evidence.map((item) => item.category) ?? [])).sort(), [readModel]);
  const statuses = useMemo(() => Array.from(new Set(readModel?.evidence.map((item) => item.status) ?? [])).sort(), [readModel]);
  const evidence = useMemo(() => {
    const term = search.trim().toLowerCase();
    return readModel?.evidence.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (status !== "all" && item.status !== status) return false;
      if (!term) return true;
      return [item.label, item.owner, item.metric, item.source, item.currentState, item.nextAction].join(" ").toLowerCase().includes(term);
    }) ?? [];
  }, [category, readModel, search, status]);
  const selected = evidence.find((item) => item.id === selectedId) ?? evidence[0] ?? null;

  if (!allowed) return <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950"><p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Controlled Beta Readiness</p><h2 className="mt-2 text-2xl font-semibold">Controlled beta readiness is internal-only</h2><p className="mt-2 text-sm">This role has no beta-control scope and no readiness API request is made from this surface.</p></section>;
  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading controlled beta readiness</section>;
  if (loadState.state === "error" || !readModel) return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950"><h3 className="font-semibold">Controlled Beta Readiness unavailable</h3><p className="mt-2 text-sm">{loadState.error}</p></section>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Flag className="h-4 w-4 text-emerald-700" /> Controlled Beta Readiness</p>
          <h2 className="mt-2 text-2xl font-semibold">{readModel.decision.label}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">Evidence from dataset, identity, simulations, role scopes, external preflight, apply sandbox, monitoring, manual browser QA and closed beta gates is consolidated into one decision surface.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.evidenceSections} evidence sections</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.qaCases} QA cases</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.blockers} blockers</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.openSideEffectGates} side-effect gates open</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh readiness</button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="relative md:col-span-2"><span className="sr-only">Search readiness evidence</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search evidence, owner or blocker" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{title(item)}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{title(item)}</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]"><tr><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Metric</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{evidence.map((item) => <tr key={item.id} onClick={() => { setSelectedId(item.id); setCommand({ state: "idle", message: null, commandId: null }); }} className={`cursor-pointer border-t ${selected?.id === item.id ? "bg-emerald-50" : "bg-white"}`}><td className="px-4 py-3"><strong>{item.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{item.currentState}</p></td><td className="px-4 py-3">{title(item.category)}</td><td className="px-4 py-3">{item.owner}</td><td className="px-4 py-3">{item.metric}</td><td className="px-4 py-3">{title(item.status)}</td></tr>)}</tbody></table>
          {!evidence.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No readiness evidence matches these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected evidence</p><h3 className="mt-2 text-lg font-semibold">{selected.label}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.nextAction}</p></div>
              <dl className="grid grid-cols-2 gap-3 text-sm">{[["Status", title(selected.status)], ["Category", title(selected.category)], ["Owner", selected.owner], ["Source", selected.source]].map(([term, value]) => <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>
              <a href={selected.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open evidence surface <ArrowRight className="h-4 w-4" /></a>
              {readModel.actions.stageReadinessReviewAllowed ? <button type="button" onClick={() => { setCommand({ state: "submitting", message: "Staging guarded readiness review", commandId: null }); stageReadinessReview(role, readModel, selected).then((result) => setCommand({ state: "ready", message: result.message, commandId: result.commandId })).catch((error: unknown) => setCommand({ state: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null })); }} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><GitBranch className="h-4 w-4" /> Stage readiness review</button> : null}
              {command.state !== "idle" ? <div className={`rounded-[8px] border p-3 text-sm ${command.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}><strong>{command.message}</strong>{command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}<p className="mt-1 text-xs">{readModel.actions.applyGate} remains closed.</p></div> : null}
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select readiness evidence.</p>}
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[8px] border bg-[var(--surface)] p-5"><h3 className="font-semibold">Role acceptance</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{readModel.roleAcceptance.map((item) => <article key={item.role} className="rounded-[8px] bg-white p-3 text-sm"><div className="flex items-start justify-between gap-3"><strong>{item.role}</strong><span className="rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{title(item.status)}</span></div><p className="mt-2 leading-5 text-[var(--ink-muted)]">{item.evidence}</p><p className="mt-2 text-xs font-semibold text-amber-900">{item.remainingGate}</p></article>)}</div></section>
        <section className="rounded-[8px] border bg-[var(--surface)] p-5"><h3 className="font-semibold">Blockers and exact gates</h3><div className="mt-4 space-y-3">{readModel.blockers.map((item) => <article key={item.key} className="rounded-[8px] bg-white p-3 text-sm"><div className="flex items-start justify-between gap-3"><strong>{item.label}</strong><span className="rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{title(item.severity)}</span></div><p className="mt-2 leading-5 text-[var(--ink-muted)]">{item.evidence}</p><p className="mt-2 text-xs font-semibold">{item.nextAction}</p></article>)}</div></section>
      </div>

      <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Hard boundary</p><p className="mt-2">This readiness surface does not approve beta launch, production deploy, release, external send, bank send, payment, finance posting, upload, live AI, source write, sync apply, tool apply, target apply or destructive apply.</p></div>
    </section>
  );
}
