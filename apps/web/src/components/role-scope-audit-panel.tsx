"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { RoleScopeAuditReadModel, RoleScopeAuditRow } from "@/db/role-scope-audit-read-model-repository";
import { roleByKey } from "@/lib/roles";

type Payload = { status: string; readModel: RoleScopeAuditReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance", "studio-manager", "franchise-partner", "bank-partner"];
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/permissions/role-scope-audit/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(`Role Scope Audit returned HTTP ${response.status}`);
  return payload;
}

async function stageScopeReview(role: string, readModel: RoleScopeAuditReadModel, row: RoleScopeAuditRow) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `block64-role-scope-${role}-${row.id}`,
      actorRole: role,
      commandType: row.status === "review_required" ? "diff_review" : "mapping_preview",
      action: row.status === "review_required" ? "classify_diff" : "refresh_preview",
      title: `Review ${row.roleLabel} ${row.scenarioLabel} scope`,
      notes: `${row.currentState} This stores a permission-scope review draft only. Permission mutation, account mutation, role mutation, release, send, apply, payment and finance posting remain closed.`,
      status: row.status,
      syncMappingId: row.id,
      sourceModule: "permissions",
      targetModule: row.moduleKey,
      entityTypeKey: row.boundaryKind,
      conflictClass: "role_scope_audit_review",
      retryClass: "review-only",
    }),
  });
  const payload = (await response.json()) as { result?: { commandId?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Scope review command returned HTTP ${response.status}`);
  return {
    commandId: payload.result?.commandId ?? null,
    message: payload.result?.targetApplyStatus === "blocked" ? "Scope review stored. Target apply remains blocked." : "Scope review stored.",
  };
}

export function RoleScopeAuditPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <RoleScopeAuditContent key={role} role={role} />;
}

function RoleScopeAuditContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moduleKey, setModuleKey] = useState("all");
  const [status, setStatus] = useState("all");
  const [boundary, setBoundary] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Role Scope Audit unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return readModel?.rows.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (moduleKey !== "all" && row.moduleKey !== moduleKey) return false;
      if (status !== "all" && row.status !== status) return false;
      if (boundary !== "all" && row.boundaryKind !== boundary) return false;
      if (!term) return true;
      return [row.roleLabel, row.scenarioLabel, row.resource, row.permissionKey, row.currentState, row.nextAction, row.moduleKey].join(" ").toLowerCase().includes(term);
    }) ?? [];
  }, [boundary, moduleKey, readModel, roleFilter, search, status]);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  if (!allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Role Scopes</p>
        <h2 className="mt-2 text-2xl font-semibold">Role Scope Audit is internal-only</h2>
        <p className="mt-2 text-sm">This role has no permission-audit scope and no audit API request is made from this surface.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading role scope audit</section>;
  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Role Scope Audit unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><KeyRound className="h-4 w-4 text-emerald-700" /> Role Scopes</p>
          <h2 className="mt-2 text-2xl font-semibold">Permission, field and command boundary audit</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            Record access, field visibility, command staging and redaction proof across internal, partner, bank, owner, candidate, member and guest boundaries.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.auditedRoles} audited roles</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.rows} checks</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.redactedRows} redacted</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.blockedRows} blocked</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.commandDraftRows} command-draft checks</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold">
          <RefreshCw className="h-4 w-4" /> Refresh audit
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <label className="relative">
          <span className="sr-only">Search role scope audit</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search role or boundary" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" />
        </label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All audited roles</option>
          {readModel.controls.roles.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All modules</option>
          {readModel.controls.modules.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All statuses</option>
          {readModel.controls.statuses.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
        <select value={boundary} onChange={(event) => setBoundary(event.target.value)} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
          <option value="all">All boundaries</option>
          {readModel.controls.boundaries.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]">
              <tr><th className="px-4 py-3">Role boundary</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Boundary</th><th className="px-4 py-3">Permission</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} onClick={() => { setSelectedId(row.id); setCommand({ state: "idle", message: null, commandId: null }); }} className={`cursor-pointer border-t ${selected?.id === row.id ? "bg-emerald-50" : "bg-white"}`}>
                  <td className="px-4 py-3"><strong>{row.roleLabel}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{row.scenarioLabel} · {row.resource}</p></td>
                  <td className="px-4 py-3">{title(row.moduleKey)}</td>
                  <td className="px-4 py-3">{title(row.boundaryKind)}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs">{row.permissionKey}</span><p className="mt-1 text-xs text-[var(--ink-muted)]">{title(row.permissionRisk)} risk</p></td>
                  <td className="px-4 py-3">{title(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No boundary checks match these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected boundary</p>
                <h3 className="mt-2 text-lg font-semibold">{selected.roleLabel} · {selected.scenarioLabel}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.currentState}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Boundary", title(selected.boundaryKind)],
                  ["Status", title(selected.status)],
                  ["Scope", title(selected.scope)],
                  ["Module", title(selected.moduleKey)],
                ].map(([term, value]) => (
                  <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3">
                    <dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[8px] bg-emerald-50 p-3 text-sm text-emerald-950">
                  <p className="text-xs font-semibold uppercase">Visible fields</p>
                  <ul className="mt-2 space-y-1">{selected.visibleFields.map((field) => <li key={field}>· {field}</li>)}</ul>
                </div>
                <div className="rounded-[8px] bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="text-xs font-semibold uppercase">Redacted fields</p>
                  <ul className="mt-2 space-y-1">{selected.redactedFields.map((field) => <li key={field}>· {field}</li>)}</ul>
                </div>
              </div>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next safe action</p>
                <p className="mt-2 leading-6">{selected.nextAction}</p>
              </div>
              <div className="grid gap-2">
                <a href={selected.href} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open workflow <ArrowRight className="h-4 w-4" /></a>
                {readModel.actions.stageScopeReviewAllowed && selected.commandAvailable ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCommand({ state: "submitting", message: "Staging guarded scope review", commandId: null });
                      stageScopeReview(role, readModel, selected)
                        .then((result) => setCommand({ state: "ready", message: result.message, commandId: result.commandId }))
                        .catch((error: unknown) => setCommand({ state: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null }));
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <ShieldCheck className="h-4 w-4" /> Stage scope review
                  </button>
                ) : null}
              </div>
              {command.state !== "idle" ? (
                <div className={`rounded-[8px] border p-3 text-sm ${command.state === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <strong>{command.message}</strong>
                  {command.commandId ? <p className="mt-2 break-all font-mono text-xs">{command.commandId}</p> : null}
                  <p className="mt-1 text-xs">{readModel.actions.applyGate} remains closed.</p>
                </div>
              ) : null}
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select a boundary check.</p>}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-emerald-700" /> Policy-backed</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Rows are generated from the permission registry and role-tool matrix, not static filler.</p></div>
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Redaction explicit</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Visible and redacted fields are stated for each selected boundary.</p></div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="h-4 w-4" /> No mutation</p><p className="mt-2 text-xs leading-5">Permission, account, role, release, send, apply, bank, payment and finance actions remain closed.</p></div>
      </div>
    </section>
  );
}
