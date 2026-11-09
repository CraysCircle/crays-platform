"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, LockKeyhole, RefreshCw, Search, SendHorizontal, ShieldCheck } from "lucide-react";
import type { ExternalPreflightReadModel, ExternalPreflightRoom } from "@/db/external-preflight-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = { status: string; readModel: ExternalPreflightReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "expansion-manager", "studio-manager", "franchise-candidate", "franchise-partner", "bank-partner", "landlord", "gym-member"];
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/external-preflight/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(`External Preflight returned HTTP ${response.status}`);
  return payload;
}

async function stagePreflightReview(role: string, readModel: ExternalPreflightReadModel, room: ExternalPreflightRoom) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `block65-external-preflight-${role}-${room.key}`,
      actorRole: role,
      commandType: room.status === "blocked" ? "conflict_review" : "diff_review",
      action: room.status === "blocked" ? "classify_conflict" : "classify_diff",
      title: `Review ${room.label}`,
      notes: `${room.currentState} This stores an external-preflight review draft only. External preview, release, send, upload, bank action, payment, finance posting and apply remain closed.`,
      status: room.status,
      syncMappingId: `external-preflight:${room.key}`,
      sourceModule: "external-preflight",
      targetModule: room.key,
      entityTypeKey: room.audienceRole,
      conflictClass: "external_preflight_review",
      retryClass: "review-only",
    }),
  });
  const payload = (await response.json()) as { result?: { commandId?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Preflight review command returned HTTP ${response.status}`);
  return {
    commandId: payload.result?.commandId ?? null,
    message: payload.result?.targetApplyStatus === "blocked" ? "Preflight review stored. Target apply remains blocked." : "Preflight review stored.",
  };
}

export function ExternalPreflightPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <ExternalPreflightContent key={role} role={role} />;
}

function ExternalPreflightContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("all");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "External Preflight unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const rooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return readModel?.rooms.filter((room) => {
      if (audience !== "all" && room.key !== audience) return false;
      if (status !== "all" && room.status !== status) return false;
      if (owner !== "all" && room.ownerRole !== owner) return false;
      if (!term) return true;
      return [room.label, room.audienceRole, room.ownerRole, room.currentState, room.nextAction, room.releaseGate, ...room.visibleFields, ...room.redactedFields].join(" ").toLowerCase().includes(term);
    }) ?? [];
  }, [audience, owner, readModel, search, status]);
  const selected = rooms.find((room) => room.key === selectedKey) ?? rooms[0] ?? null;

  if (!allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> External Preflight</p>
        <h2 className="mt-2 text-2xl font-semibold">External preflight is release-blocked</h2>
        <p className="mt-2 text-sm">This role has no released preflight scope and no preflight API request is made from this surface.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading external preflight</section>;
  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">External Preflight unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Eye className="h-4 w-4 text-emerald-700" /> External Preflight</p>
          <h2 className="mt-2 text-2xl font-semibold">Release-gated external visibility preflight</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            Candidate, Partner, Bank, Real Estate, Member and Guest visibility checks with exact redactions, prerequisites and release gates still closed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.rooms} rooms</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.packageRecords} package records</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.redactedChecks} redaction checks</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.missingPrerequisites} missing prerequisites</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold">
          <RefreshCw className="h-4 w-4" /> Refresh preflight
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="relative">
          <span className="sr-only">Search external preflight</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audience or gate" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" />
        </label>
        <select value={audience} onChange={(event) => setAudience(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All audiences</option>
          {readModel.controls.audiences.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All statuses</option>
          {readModel.controls.statuses.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All owners</option>
          {readModel.controls.owners.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-3">
          {rooms.map((room) => (
            <button key={room.key} type="button" onClick={() => { setSelectedKey(room.key); setCommand({ state: "idle", message: null, commandId: null }); }} className={`rounded-[8px] border bg-white p-4 text-left transition ${selected?.key === room.key ? "border-emerald-700 shadow-sm" : "border-[var(--line)] hover:border-black/30"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{title(room.key)} · {room.audienceRole}</p>
                  <h3 className="mt-1 text-lg font-semibold">{room.label}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">{room.currentState}</p>
                </div>
                <span className="rounded-[7px] border bg-[var(--surface)] px-3 py-1 text-xs font-semibold">{title(room.status)}</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {[["Visibility", `${room.visibilityScore}%`], ["Source records", room.sourceRecords], ["Package records", room.packageRecords], ["Missing", room.missingPrerequisites.length]].map(([label, value]) => (
                  <div key={label} className="rounded-[8px] bg-[var(--surface)] p-3"><p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p><strong className="mt-1 block">{value}</strong></div>
                ))}
              </div>
            </button>
          ))}
          {!rooms.length ? <p className="rounded-[8px] border bg-white p-6 text-sm text-[var(--ink-muted)]">No preflight room matches these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected preflight room</p>
                <h3 className="mt-2 text-lg font-semibold">{selected.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.nextAction}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[["Audience", title(selected.key)], ["Owner", selected.ownerRole], ["Release gate", selected.releaseGate], ["Status", title(selected.status)]].map(([term, value]) => (
                  <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>
                ))}
              </dl>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[8px] bg-emerald-50 p-3 text-sm text-emerald-950"><p className="text-xs font-semibold uppercase">Visible</p><ul className="mt-2 space-y-1">{selected.visibleFields.map((field) => <li key={field}>· {field}</li>)}</ul></div>
                <div className="rounded-[8px] bg-amber-50 p-3 text-sm text-amber-950"><p className="text-xs font-semibold uppercase">Redacted</p><ul className="mt-2 space-y-1">{selected.redactedFields.map((field) => <li key={field}>· {field}</li>)}</ul></div>
              </div>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Missing prerequisites</p>
                {selected.missingPrerequisites.length ? <ul className="mt-2 space-y-1">{selected.missingPrerequisites.map((item) => <li key={item}>· {item}</li>)}</ul> : <p className="mt-2">No missing prerequisite in this preflight room.</p>}
              </div>
              <div className="grid gap-2">
                <a href={selected.href} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected surface <ArrowRight className="h-4 w-4" /></a>
                {readModel.actions.stagePreflightReviewAllowed ? (
                  <button type="button" onClick={() => { setCommand({ state: "submitting", message: "Staging guarded preflight review", commandId: null }); stagePreflightReview(role, readModel, selected).then((result) => setCommand({ state: "ready", message: result.message, commandId: result.commandId })).catch((error: unknown) => setCommand({ state: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null })); }} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4" /> Stage preflight review
                  </button>
                ) : null}
              </div>
              {command.state !== "idle" ? <div className={`rounded-[8px] border p-3 text-sm ${command.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}><strong>{command.message}</strong>{command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}<p className="mt-1 text-xs">{readModel.actions.applyGate} remains closed.</p></div> : null}
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select a preflight room.</p>}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-emerald-700" /> Visibility proof</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Each room lists visible fields, redacted fields, linked objects and missing prerequisites.</p></div>
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Release-gated</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">External rooms remain preflight-only until an exact future release gate is approved.</p></div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><SendHorizontal className="h-4 w-4" /> No external action</p><p className="mt-2 text-xs leading-5">No preview, release, send, upload, bank action, payment, finance posting or apply execution is enabled.</p></div>
      </div>
    </section>
  );
}
