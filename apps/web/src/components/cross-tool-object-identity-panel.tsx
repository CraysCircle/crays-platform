"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, DatabaseZap, GitBranch, Link2, LockKeyhole, Network, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";
import type { CrossToolObjectIdentityReadModel, ObjectIdentityCluster } from "@/db/cross-tool-object-identity-read-model-repository";

type Payload = { status: string; readModel: CrossToolObjectIdentityReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };
type CommandState = { state: "idle" | "submitting" | "ready" | "error"; message: string | null; commandId: string | null };

const allowedRoles = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager", "expansion-manager"];
const moduleLabels: Record<string, string> = { analytics: "Analytics", crm: "CRM", erp: "ERP", files: "Files", learning: "Learning", loans: "Loans", operations: "Operations", project: "Project", support: "Support", sync: "Sync" };
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const moduleLabel = (value: string) => moduleLabels[value] ?? title(value);
const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "No timestamp";

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/object-identity/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = await response.json() as Payload;
  if (!response.ok) throw new Error(`Object Identity returned HTTP ${response.status}`);
  return payload;
}

async function stageIdentityReview(role: string, cluster: ObjectIdentityCluster) {
  const response = await fetch("/api/crays/core-command/sync-preview", {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": "stage-sync-preview-command" },
    body: JSON.stringify({
      idempotencyKey: `block62-object-identity-${role}-${cluster.id}`,
      actorRole: role,
      commandType: cluster.conflicts > 0 ? "conflict_review" : "mapping_preview",
      action: cluster.conflicts > 0 ? "classify_conflict" : "refresh_preview",
      title: `Review ${cluster.label} identity links`,
      notes: `Block 62 object identity review for ${cluster.primaryCoreId}. Target apply, source writes and sync apply remain closed.`,
      status: cluster.status,
      syncMappingId: cluster.id,
      sourceModule: cluster.modules[0] ?? "sync",
      targetModule: cluster.modules[1] ?? cluster.modules[0] ?? "sync",
      entityTypeKey: cluster.objectType,
      conflictClass: cluster.conflicts > 0 ? "identity_conflict_review" : "identity_lineage_review",
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error ?? `Command returned HTTP ${response.status}`);
  return payload as { status: string; result?: { commandId?: string; targetApplyStatus?: string; applyGate?: string } };
}

export function CrossToolObjectIdentityPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <CrossToolObjectIdentityContent key={role} role={role} />;
}

function CrossToolObjectIdentityContent({ role }: { role: string }) {
  const allowed = allowedRoles.includes(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [moduleKey, setModuleKey] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState>({ state: "idle", message: null, commandId: null });

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Object Identity unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const clusters = useMemo(() => readModel?.clusters.filter((cluster) => {
    if (kind !== "all" && cluster.kind !== kind) return false;
    if (moduleKey !== "all" && !cluster.modules.includes(moduleKey)) return false;
    if (status !== "all" && cluster.status !== status) return false;
    const term = search.trim().toLowerCase();
    return !term || [
      cluster.label,
      cluster.objectType,
      cluster.primaryCoreId,
      cluster.owner,
      cluster.scope,
      cluster.currentState,
      cluster.blocker,
      cluster.nextAction,
      cluster.modules.join(" "),
      cluster.sourceSystems.join(" "),
      cluster.coreIds.map((item) => item.id).join(" "),
      cluster.sourceLinks.map((link) => `${link.entityType} ${link.entityId} ${link.label}`).join(" "),
    ].join(" ").toLowerCase().includes(term);
  }) ?? [], [kind, moduleKey, readModel, search, status]);
  const selected = clusters.find((cluster) => cluster.id === selectedId) ?? clusters[0] ?? null;

  async function onStageIdentityReview() {
    if (!selected) return;
    setCommandState({ state: "submitting", message: "Staging identity review draft", commandId: null });
    try {
      const result = await stageIdentityReview(role, selected);
      setCommandState({
        state: "ready",
        message: `${result.status === "created" ? "Stored" : "Already stored"} in Core command history. Target apply stays ${result.result?.targetApplyStatus ?? "blocked"}.`,
        commandId: result.result?.commandId ?? null,
      });
    } catch (error) {
      setCommandState({ state: "error", message: error instanceof Error ? error.message : "Identity review draft could not be staged.", commandId: null });
    }
  }

  if (!allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Object Identity</p>
        <h2 className="mt-2 text-2xl font-semibold">Internal identity control only</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6">This role does not receive cross-tool Core identity lineage. The browser does not request source-link data for this role.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Object Identity</section>;
  if (loadState.state === "error" || !readModel) return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950"><h3 className="font-semibold">Object Identity unavailable</h3><p className="mt-2 text-sm">{loadState.error}</p></section>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Network className="h-4 w-4 text-emerald-700" /> Cross-tool Object Identity</p>
          <h2 className="mt-2 text-2xl font-semibold">Core identities, source IDs and object timelines</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">Proves how CRAYS Core objects connect to CRM, ERP, Project, Loans, Files, Operations, Support and Analytics records without opening source writes or sync apply.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.clusters} clusters</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.sourceLinks} source links</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.coreObjects} Core objects</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.modules} modules</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.timelineEvents} timeline events</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.conflicts} governed conflicts</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setSelectedId(null); setCommandState({ state: "idle", message: null, commandId: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh identity</button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard icon={GitBranch} label="Case spines" value={readModel.summary.caseSpines} copy="Prepared offers, deals, property cases and properties kept together as one object chain." />
        <MetricCard icon={Link2} label="Cross-source objects" value={readModel.summary.crossSourceObjects} copy="Core objects with more than one source system or module attached." />
        <MetricCard icon={DatabaseZap} label="Module coverage" value={readModel.summary.moduleCoverageClusters} copy="Identity coverage clusters for module owners and data governance." />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
        <label className="relative">
          <span className="sr-only">Search object identities</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search object, Core ID, source ID or owner" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" />
        </label>
        <select value={kind} onChange={(event) => { setKind(event.target.value); setSelectedId(null); }} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All identity types</option>{readModel.controls.kinds.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={moduleKey} onChange={(event) => { setModuleKey(event.target.value); setSelectedId(null); }} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All modules</option>{readModel.controls.modules.map((item) => <option key={item.key} value={item.key}>{moduleLabel(item.key)} ({item.rows})</option>)}</select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setSelectedId(null); }} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All statuses</option>{readModel.controls.statuses.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]">
              <tr><th className="px-4 py-3">Object identity</th><th className="px-4 py-3">Modules</th><th className="px-4 py-3">Source systems</th><th className="px-4 py-3">Links</th><th className="px-4 py-3">Timeline</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody>{clusters.map((cluster) => <IdentityRow key={cluster.id} cluster={cluster} selected={selected?.id === cluster.id} onSelect={() => { setSelectedId(cluster.id); setCommandState({ state: "idle", message: null, commandId: null }); }} />)}</tbody>
          </table>
          {!clusters.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No object identities match these filters.</p> : null}
        </div>

        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{title(selected.kind)}</p>
                <h3 className="mt-2 text-lg font-semibold">{selected.label}</h3>
                <p className="mt-1 break-words font-mono text-xs text-[var(--ink-muted)]">{selected.primaryCoreId}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{selected.currentState}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailTile label="Owner" value={selected.owner} />
                <DetailTile label="Scope" value={selected.scope} />
                <DetailTile label="Source links" value={selected.sourceLinkCount} />
                <DetailTile label="Conflicts" value={selected.conflicts} />
              </div>

              <div className={`rounded-[8px] p-3 text-sm ${selected.status === "linked" ? "bg-emerald-50 text-emerald-950" : selected.status === "attention" ? "bg-amber-50 text-amber-950" : "bg-rose-50 text-rose-950"}`}>
                <p className="flex items-center gap-2 font-semibold">{selected.status === "linked" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {title(selected.status)}</p>
                <p className="mt-2 leading-6">{selected.blocker}</p>
                <p className="mt-1 leading-6">{selected.nextAction}</p>
              </div>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Core IDs</p>
                <div className="space-y-2">{selected.coreIds.map((item) => <div key={`${item.type}:${item.id}`} className="rounded-[8px] bg-[var(--surface)] p-3"><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 break-words font-mono text-xs text-[var(--ink-muted)]">{item.id}</p></div>)}</div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source IDs</p>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {selected.sourceLinks.slice(0, 12).map((link) => (
                    <div key={`${link.sourceSystem}:${link.entityType}:${link.entityId}`} className="rounded-[8px] border p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <strong>{moduleLabel(link.moduleKey)} - {title(link.entityType)}</strong>
                        <span className={`rounded-[7px] px-2 py-1 font-semibold ${link.syncStatus === "conflict" ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-900"}`}>{title(link.syncStatus)}</span>
                      </div>
                      <p className="mt-1 break-words text-[var(--ink-muted)]">{link.label}</p>
                      <p className="mt-1 break-words font-mono text-[11px]">{link.sourceSystem}:{link.entityId}</p>
                    </div>
                  ))}
                  {!selected.sourceLinks.length ? <p className="rounded-[8px] bg-[var(--surface)] p-3 text-xs text-[var(--ink-muted)]">No direct source links in this scoped cluster.</p> : null}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Object timeline</p>
                <div className="space-y-2">
                  {selected.timeline.slice(0, 5).map((event, index) => (
                    <div key={`${selected.id}:timeline:${index}:${event.source}:${event.eventType}:${event.occurredAt ?? "no-time"}`} className="rounded-[8px] bg-[var(--surface)] p-3 text-xs">
                      <p className="flex items-center gap-2 font-semibold"><Clock3 className="h-3.5 w-3.5" /> {title(event.source)} - {title(event.eventType)}</p>
                      <p className="mt-1 leading-5 text-[var(--ink-muted)]">{event.summary}</p>
                      <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{formatTime(event.occurredAt)}{event.actorRole ? ` - ${title(event.actorRole)}` : ""}</p>
                    </div>
                  ))}
                  {!selected.timeline.length ? <p className="rounded-[8px] bg-[var(--surface)] p-3 text-xs text-[var(--ink-muted)]">No timeline events for this exact Core object yet.</p> : null}
                </div>
              </section>

              <div className="grid gap-2">
                <a href={selected.href} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open object workflow <ArrowRight className="h-4 w-4" /></a>
                {readModel.actions.stageIdentityReviewAllowed ? <button type="button" onClick={onStageIdentityReview} disabled={commandState.state === "submitting"} className="inline-flex items-center justify-center gap-2 rounded-[8px] border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"><ShieldCheck className="h-4 w-4" /> Stage identity review</button> : null}
              </div>

              {commandState.message ? (
                <div className={`rounded-[8px] p-3 text-sm ${commandState.state === "error" ? "bg-rose-50 text-rose-950" : "bg-emerald-50 text-emerald-950"}`}>
                  <p>{commandState.message}</p>
                  {commandState.commandId ? <p className="mt-1 break-words font-mono text-xs">{commandState.commandId}</p> : null}
                </div>
              ) : null}
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select an object identity cluster.</p>}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-700" /> Source-backed identity</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Clusters are composed from Core external record maps, prepared-offer spine data, command history and evidence timelines.</p></div>
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-emerald-700" /> URL-safe drilldown</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Object workflow links preserve role, case, deal and property-case state where available.</p></div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Review draft only</p><p className="mt-2 text-xs leading-5">Identity review can create a guarded Core draft. Sync apply, source writes, target apply, sends, uploads, payments, releases and deploys stay closed.</p></div>
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, copy }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; copy: string }) {
  return (
    <article className="rounded-[8px] border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
        <Icon className="h-4 w-4 text-emerald-700" />
      </div>
      <strong className="mt-3 block text-3xl font-semibold">{value}</strong>
      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{copy}</p>
    </article>
  );
}

function DetailTile({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>;
}

function IdentityRow({ cluster, selected, onSelect }: { cluster: ObjectIdentityCluster; selected: boolean; onSelect: () => void }) {
  return (
    <tr onClick={onSelect} className={`cursor-pointer border-t ${selected ? "bg-emerald-50" : "bg-white"}`}>
      <td className="px-4 py-3">
        <strong>{cluster.label}</strong>
        <p className="mt-1 break-words font-mono text-xs text-[var(--ink-muted)]">{cluster.primaryCoreId}</p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">{title(cluster.kind)} - {cluster.owner}</p>
      </td>
      <td className="px-4 py-3">{cluster.modules.slice(0, 4).map(moduleLabel).join(", ")}{cluster.modules.length > 4 ? ` +${cluster.modules.length - 4}` : ""}</td>
      <td className="px-4 py-3">{cluster.sourceSystems.slice(0, 3).join(", ")}{cluster.sourceSystems.length > 3 ? ` +${cluster.sourceSystems.length - 3}` : ""}</td>
      <td className="px-4 py-3">{cluster.sourceLinkCount}</td>
      <td className="px-4 py-3">{cluster.timeline.length}</td>
      <td className="px-4 py-3"><span className={`rounded-[7px] px-2 py-1 text-xs font-semibold ${cluster.status === "linked" ? "bg-emerald-100 text-emerald-900" : cluster.status === "attention" ? "bg-amber-100 text-amber-950" : "bg-rose-100 text-rose-950"}`}>{title(cluster.status)}</span></td>
    </tr>
  );
}
