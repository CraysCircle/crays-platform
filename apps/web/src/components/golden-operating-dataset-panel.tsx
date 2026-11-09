"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowRight, DatabaseZap, LockKeyhole, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { roleByKey } from "@/lib/roles";
import type { GoldenDatasetRecord, GoldenOperatingDatasetReadModel } from "@/db/golden-operating-dataset-read-model-repository";

type Payload = { status: string; readModel: GoldenOperatingDatasetReadModel };
type LoadState = { state: "loading" | "ready" | "error"; data: Payload | null; error: string | null };

const moduleLabels: Record<string, string> = { crm: "CRM", erp: "ERP", files: "Files", analytics: "Analytics", loans: "Loans", operations: "Operations", project: "Project", support: "Support", hr: "HR", learning: "Learning", sync: "Sync" };
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const moduleLabel = (value: string) => moduleLabels[value] ?? title(value);
const cleanText = (value: string) => value.replace(/\u00c2?\u00b7/g, "-");
const clientAccess = (role: string) => ["admin", "crays-management", "reviewer"].includes(role);

async function load(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/golden-operating-dataset/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = await response.json() as Payload;
  if (!response.ok) throw new Error(`Golden Operating Dataset returned HTTP ${response.status}`);
  return payload;
}

export function GoldenOperatingDatasetPanel() {
  const params = useSearchParams();
  const role = roleByKey(params.get("role")).key;
  return <GoldenOperatingDatasetContent key={role} role={role} />;
}

function GoldenOperatingDatasetContent({ role }: { role: string }) {
  const allowed = clientAccess(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [journey, setJourney] = useState("all");
  const [moduleKey, setModuleKey] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    load(role, controller.signal)
      .then((data) => setLoadState({ state: "ready", data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Golden Operating Dataset unavailable." });
      });
    return () => controller.abort();
  }, [allowed, refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const anchorByJourney = useMemo(() => new Map(readModel?.journeys.map((item) => [item.key, cleanText(item.anchor)]) ?? []), [readModel]);
  const records = useMemo(() => readModel?.records.filter((record) => {
    if (journey !== "all" && record.journeyKey !== journey) return false;
    if (moduleKey !== "all" && record.moduleKey !== moduleKey) return false;
    if (status !== "all" && record.status !== status) return false;
    const term = search.trim().toLowerCase();
    return !term || [record.journeyLabel, anchorByJourney.get(record.journeyKey), record.moduleKey, record.sourceSystem, record.owner, record.context, record.nextAction].join(" ").toLowerCase().includes(term);
  }) ?? [], [anchorByJourney, journey, moduleKey, readModel, search, status]);
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  if (!allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><LockKeyhole className="h-4 w-4" /> Golden Operating Dataset</p>
        <h2 className="mt-2 text-2xl font-semibold">Internal dataset control only</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6">This role has no operating-dataset audit scope. The browser does not request internal lineage records for this role.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Golden Operating Dataset</section>;
  if (loadState.state === "error" || !readModel) return <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950"><h3 className="font-semibold">Golden Operating Dataset unavailable</h3><p className="mt-2 text-sm">{loadState.error}</p></section>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><DatabaseZap className="h-4 w-4 text-emerald-700" /> Golden Operating Dataset</p>
          <h2 className="mt-2 text-2xl font-semibold">Realistic Core dataset and source lineage</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">One internal audit surface for the coherent CRAYS operating dataset across franchise deal, studio operations, finance, bank, evidence and benchmark portfolio journeys.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.sourceMaps} source maps</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.records} source families</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.journeys} journeys</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.activePlaceholderHits} active placeholder hits</span>
            <span className="rounded-[7px] border bg-white px-3 py-1">{readModel.summary.immutableHistoryHits} preserved history row</span>
          </div>
        </div>
        <button type="button" onClick={() => { setLoadState({ state: "loading", data: null, error: null }); setRefreshKey((key) => key + 1); }} className="inline-flex items-center gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh dataset</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {readModel.journeys.map((item) => (
          <button key={item.key} type="button" onClick={() => { setJourney(item.key); setSelectedId(null); }} className={`rounded-[8px] border p-4 text-left transition ${journey === item.key ? "border-emerald-300 bg-emerald-50" : "bg-white hover:border-emerald-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{item.owner}</p>
                <h3 className="mt-2 text-base font-semibold">{item.label}</h3>
              </div>
              <span className={`rounded-[7px] px-2 py-1 text-xs font-semibold ${item.status === "ready" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>{title(item.status)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{cleanText(item.anchor)}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <span><strong className="block text-base">{item.sourceMaps}</strong> maps</span>
              <span><strong className="block text-base">{item.sourceFamilies}</strong> families</span>
              <span><strong className="block text-base">{item.conflicts}</strong> conflicts</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
        <label className="relative">
          <span className="sr-only">Search dataset records</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search journey, source or owner" className="h-10 w-full rounded-[8px] border bg-white pl-9 pr-3 text-sm" />
        </label>
        <select value={journey} onChange={(event) => { setJourney(event.target.value); setSelectedId(null); }} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All journeys</option>{readModel.controls.journeys.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
        <select value={moduleKey} onChange={(event) => { setModuleKey(event.target.value); setSelectedId(null); }} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All modules</option>{readModel.controls.modules.map((item) => <option key={item.key} value={item.key}>{moduleLabel(item.key)} ({item.rows})</option>)}</select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setSelectedId(null); }} className="h-10 rounded-[8px] border bg-white px-3 text-sm"><option value="all">All statuses</option>{readModel.controls.statuses.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.rows})</option>)}</select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]"><tr><th className="px-4 py-3">Dataset slice</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Maps</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody>{records.map((record) => <DatasetRow key={record.id} record={record} selected={selected?.id === record.id} onSelect={() => setSelectedId(record.id)} />)}</tbody>
          </table>
          {!records.length ? <p className="p-6 text-sm text-[var(--ink-muted)]">No dataset slices match these filters.</p> : null}
        </div>
        <aside className="space-y-4 rounded-[8px] border bg-white p-5">
          {selected ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Selected dataset slice</p>
                <h3 className="mt-2 text-lg font-semibold">{selected.journeyLabel}</h3>
                <p className="mt-1 text-sm font-medium">{anchorByJourney.get(selected.journeyKey)}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selected.context}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[["Module", moduleLabel(selected.moduleKey)], ["Source", selected.sourceSystem], ["Owner", selected.owner], ["Status", title(selected.status)], ["Source maps", selected.records], ["Identity refs", selected.identities]].map(([term, value]) => <div key={term} className="rounded-[8px] bg-[var(--surface)] p-3"><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{term}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}
              </dl>
              <div className="rounded-[8px] bg-[var(--surface)] p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next safe action</p>
                <p className="mt-2 leading-6">{selected.nextAction}</p>
              </div>
              <a href={selected.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected workflow <ArrowRight className="h-4 w-4" /></a>
            </>
          ) : <p className="text-sm text-[var(--ink-muted)]">Select a dataset slice.</p>}
        </aside>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Active dataset clean</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">The active Core dataset has zero placeholder-name hits after the Golden Dataset migration.</p></div>
        <div className="rounded-[8px] border bg-white p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-emerald-700" /> Real identity anchors</p><p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">Rotkreuzplatz, Schwabing, Berlin operations and benchmark portfolio records stay separated by source lineage and Core identity.</p></div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" /> Review-only boundary</p><p className="mt-2 text-xs leading-5">This surface reads Core lineage only. Source writes, sync apply, tool apply, release, sends, payments and deploys remain closed.</p></div>
      </div>
    </section>
  );
}

function DatasetRow({ record, selected, onSelect }: { record: GoldenDatasetRecord; selected: boolean; onSelect: () => void }) {
  return (
    <tr onClick={onSelect} className={`cursor-pointer border-t ${selected ? "bg-emerald-50" : "bg-white"}`}>
      <td className="px-4 py-3"><strong>{record.journeyLabel}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{record.owner} - {record.conflicts ? `${record.conflicts} classified conflicts` : "no conflicts"}</p></td>
      <td className="px-4 py-3">{moduleLabel(record.moduleKey)}</td>
      <td className="px-4 py-3">{record.sourceSystem}</td>
      <td className="px-4 py-3">{record.records}</td>
      <td className="px-4 py-3">{title(record.status)}</td>
    </tr>
  );
}
