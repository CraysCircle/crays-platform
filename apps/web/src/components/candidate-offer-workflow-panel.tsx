"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Handshake, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type DecisionStatus = "ready" | "attention" | "blocked";

type CandidateOfferRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  status: string;
  priority: string;
  owner: string;
  audience: string;
  value: string | number | boolean | null;
  unit: string | null;
  context: string;
  nextAction: string;
  href: string;
  dueDate: string | null;
  fields: Record<string, unknown>;
};

type Payload = {
  status: "ready" | "release_blocked" | "forbidden";
  readModel: {
    access: {
      allowed: boolean;
      level: string;
      reason: string;
      canStageOfferReview: boolean;
      canViewInternalRecords: boolean;
      canViewCandidateScopedRecords: boolean;
    };
    offerContext: {
      offerId: string;
      dealId: string;
      propertyCaseId: string;
      candidateName: string;
      candidateCompany: string;
      siteName: string;
      address: string;
      journey: string;
    };
    summary: {
      records: number;
      sourceRecords: number;
      linkedFinancialWorkbookRecords: number;
      linkedForecastRecords: number;
      linkedLocationRecords: number;
      linkedBankPackageRecords: number;
      linkedRealEstateRecords: number;
      linkedFilesRecords: number;
      readinessScore: number;
      blockers: number;
      midCaseYear3Revenue: number | null;
      paybackYears: number | null;
      equityRequirement: number | null;
      freshnessMinutes: number | null;
    };
    decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterFamily: string }>;
    records: CandidateOfferRecord[];
    controls: {
      families: Array<{ key: string; label: string; rows: number }>;
      statuses: Array<{ key: string; label: string; rows: number }>;
      priorities: Array<{ key: string; label: string; rows: number }>;
      audiences: Array<{ key: string; label: string; rows: number }>;
    };
    actions: {
      stageOfferReviewAllowed: boolean;
      commandRoute: "/api/crays/core-command/crm-activity";
      confirmationHeader: "stage-crm-activity-command";
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY";
    };
  };
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandState = { status: string; message: string; commandId: string | null; applyGate: string | null };

const allowedRoles = new Set(["admin", "crays-management", "deal-manager", "reviewer", "finance", "expansion-manager", "franchise-candidate", "franchise-partner"]);
const toneByStatus: Record<DecisionStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-950",
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  blocked: "border-rose-200 bg-rose-50 text-rose-950",
};

function money(value: number | null) {
  if (value === null) return "not available";
  return `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortFreshness(minutes: number | null) {
  if (minutes === null) return "freshness not recorded";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function words(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function fieldLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueLabel(value: string | number | boolean | null, unit: string | null) {
  if (value === null) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return words(value);
  if (unit === "EUR" || unit === "EUR_per_sqm") return money(value);
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (unit === "score") return `${Math.round(value * (value <= 1 ? 100 : 1))}/100`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  if (unit === "ratio") return `${value.toFixed(1)}x`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return words(value);
  return null;
}

function facts(record: CandidateOfferRecord, internal: boolean) {
  const hidden = new Set([
    "moduleKey",
    "seedBatch",
    "sourceAsOf",
    "sourceDatasets",
    "candidateReleaseEnabled",
    "publicReleaseEnabled",
    "candidateSendEnabled",
    "candidatePortalSubmissionEnabled",
    "uploadsEnabled",
    "externalSendingEnabled",
    "sourceWritesEnabled",
    "syncApplyEnabled",
    "targetApplyEnabled",
    "financePostingEnabled",
    "accountingExportsEnabled",
    "paymentInitiationEnabled",
    "liveAiEnabled",
    "href",
  ]);
  return Object.entries(record.fields)
    .filter(([key]) => !hidden.has(key))
    .filter(([key]) => internal || !["hiddenForCandidate", "internalNotes", "landlordContact"].includes(key))
    .map(([key, value]) => [fieldLabel(key), fieldValue(value)] as const)
    .filter(([, value]) => value !== null && value !== "")
    .slice(0, 14);
}

function routeFamily(view: string | null, record: string | null) {
  if (view === "home") return "offer-summary";
  if (view === "inbox" || record === "emails") return "offer-review-actions";
  if (view === "calendar" || record === "calendar-events") return "offer-review-actions";
  if (view === "timeline" || record === "activities") return "evidence-package";
  if (view === "reports" || record === "reports") return "financial-decision";
  if (view === "workflow") return "offer-review-actions";
  if (view === "settings") return "candidate-redactions";
  if (view === "pipeline") return "offer-summary";
  if (record === "companies" || record === "opportunities" || view === "candidate-offer") return "offer-summary";
  if (record === "people" || record === "leads") return "candidate-intent";
  if (record === "tasks") return "offer-review-actions";
  if (record === "notes") return "candidate-redactions";
  if (record === "files") return "evidence-package";
  if (view === "financial-decision") return "financial-decision";
  if (view === "location-decision") return "location-decision";
  if (view === "bank-package") return "bank-package-readiness";
  if (view === "real-estate") return "real-estate-readiness";
  return "all";
}

async function loadCandidateOffer(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/candidate/offer-workflow/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as Payload;
  if (!response.ok && response.status !== 403 && response.status !== 423) throw new Error(`Candidate Offer returned HTTP ${response.status}`);
  return payload;
}

async function stageOfferReview(role: string, readModel: Payload["readModel"], record: CandidateOfferRecord) {
  const response = await fetch(readModel.actions.commandRoute, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crays-dev-confirm": readModel.actions.confirmationHeader },
    body: JSON.stringify({
      idempotencyKey: `candidate-offer:${record.id}:${role}:block54-v1`,
      actorRole: role,
      commandType: "task",
      action: "create_task",
      subject: `Review ${record.label}`,
      body: `${record.nextAction} This stores a guarded CRM candidate-offer task only; no Candidate release, send, upload, source write or apply is executed.`,
      status: record.status,
      priority: record.priority,
      dueDate: record.dueDate,
      assigneeRole: record.owner,
      companyId: String(record.fields.candidateOrganizationId ?? ""),
      personId: String(record.fields.candidateAccountId ?? ""),
      opportunityId: readModel.offerContext.offerId,
      preparedOfferId: readModel.offerContext.offerId,
      propertyCaseId: readModel.offerContext.propertyCaseId,
      dealId: readModel.offerContext.dealId,
    }),
  });
  const payload = (await response.json()) as { status?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Command draft returned HTTP ${response.status}`);
  return {
    status: payload.status ?? "created",
    message: payload.result?.targetApplyStatus === "blocked" ? "Candidate Offer review stored in Command History. Candidate release and send remain closed." : "Candidate Offer review stored in Command History.",
    commandId: payload.result?.commandId ?? null,
    applyGate: payload.result?.applyGate ?? null,
  };
}

export function CandidateOfferWorkflowPanel() {
  const searchParams = useSearchParams();
  const role = roleByKey(searchParams.get("role")).key;
  const routeScopedFamily = routeFamily(searchParams.get("view"), searchParams.get("record"));

  return <CandidateOfferWorkflowContent key={`${role}:${routeScopedFamily}`} role={role} routeScopedFamily={routeScopedFamily} />;
}

function CandidateOfferWorkflowContent({ role, routeScopedFamily }: { role: string; routeScopedFamily: string }) {
  const clientRoleAllowed = allowedRoles.has(role);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [family, setFamily] = useState(routeScopedFamily);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [audience, setAudience] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  useEffect(() => {
    if (!clientRoleAllowed) return;
    const controller = new AbortController();
    loadCandidateOffer(role, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Candidate Offer data unavailable." });
      });
    return () => controller.abort();
  }, [clientRoleAllowed, role]);

  const readModel = loadState.data?.readModel;
  const familyScopedRecords = useMemo(() => {
    const rows = readModel?.records ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((record) => {
      const matchesFamily = family === "all" || record.family === family;
      const haystack = [record.label, record.family, record.status, record.priority, record.owner, record.audience, record.context, record.nextAction].join(" ").toLowerCase();
      return matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, readModel?.records, search]);
  const statusScopedRecords = useMemo(() => familyScopedRecords.filter((record) => status === "all" || record.status === status), [familyScopedRecords, status]);
  const priorityScopedRecords = useMemo(() => statusScopedRecords.filter((record) => priority === "all" || record.priority === priority), [priority, statusScopedRecords]);
  const records = useMemo(() => priorityScopedRecords.filter((record) => audience === "all" || record.audience === audience), [audience, priorityScopedRecords]);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const statusOptions = useMemo(() => (readModel?.controls.statuses ?? []).map((option) => ({ ...option, rows: familyScopedRecords.filter((record) => record.status === option.key).length })).filter((option) => option.rows > 0), [familyScopedRecords, readModel?.controls.statuses]);
  const priorityOptions = useMemo(() => (readModel?.controls.priorities ?? []).map((option) => ({ ...option, rows: statusScopedRecords.filter((record) => record.priority === option.key).length })).filter((option) => option.rows > 0), [readModel?.controls.priorities, statusScopedRecords]);
  const audienceOptions = useMemo(() => (readModel?.controls.audiences ?? []).map((option) => ({ ...option, rows: priorityScopedRecords.filter((record) => record.audience === option.key).length })).filter((option) => option.rows > 0), [priorityScopedRecords, readModel?.controls.audiences]);

  if (!clientRoleAllowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><Handshake className="h-4 w-4" /> Candidate Offer</p>
        <h2 className="mt-2 text-2xl font-semibold">Candidate Offer is not available for this role</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">This role needs a reviewed Candidate Offer release before offer records are visible.</p>
      </section>
    );
  }

  if (loadState.state === "loading") return <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">Loading Candidate Offer workflow</section>;

  if (loadState.state === "error" || !readModel) {
    return (
      <section className="rounded-[8px] border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <h3 className="font-semibold">Candidate Offer unavailable</h3>
        <p className="mt-2 text-sm">{loadState.error ?? "Read model did not return data."}</p>
      </section>
    );
  }

  if (!readModel.access.allowed) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase"><Handshake className="h-4 w-4" /> Candidate Offer</p>
        <h2 className="mt-2 text-2xl font-semibold">Candidate Offer is release-gated</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{readModel.access.reason}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ink-muted)]"><Handshake className="h-4 w-4 text-emerald-700" /> Candidate Offer</p>
          <h2 className="mt-2 text-2xl font-semibold">Candidate offer workflow</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">
            {readModel.offerContext.candidateName} / {readModel.offerContext.candidateCompany}: financial decision, location fit, bank package, real estate readiness and evidence package in one candidate-safe offer flow.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.records} scoped records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.sourceRecords} source records</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.readinessScore}% offer readiness</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{money(readModel.summary.midCaseYear3Revenue)} Year-3 result</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.paybackYears ?? "n/a"} years payback</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{readModel.summary.blockers} blockers</span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1">{shortFreshness(readModel.summary.freshnessMinutes)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--ink-muted)]">
            <span>Workbook {readModel.summary.linkedFinancialWorkbookRecords}</span>
            <span>Forecast {readModel.summary.linkedForecastRecords}</span>
            <span>Location {readModel.summary.linkedLocationRecords}</span>
            <span>Bank Package {readModel.summary.linkedBankPackageRecords}</span>
            <span>Real Estate {readModel.summary.linkedRealEstateRecords}</span>
            <span>Files {readModel.summary.linkedFilesRecords}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setStatus("all");
            setPriority("all");
            setAudience("all");
            setSearch("");
            setSelectedId(null);
            setCommandState(null);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Reset offer view
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-9">
        {readModel.decisionCards.map((card) => (
          <button
            type="button"
            key={card.key}
            onClick={() => {
              setFamily(card.filterFamily);
              setStatus("all");
              setPriority("all");
              setAudience("all");
              setSearch("");
              setSelectedId(null);
              setCommandState(null);
            }}
            className={`rounded-[8px] border p-4 text-left ${toneByStatus[card.status]}`}
          >
            <ShieldCheck className="h-5 w-5" />
            <p className="mt-4 text-xs font-semibold uppercase">{card.label}</p>
            <strong className="mt-2 block text-xl">{card.value}</strong>
            <p className="mt-2 text-xs leading-5">{card.context}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_410px]">
        <div className="min-w-0 rounded-[8px] border border-[var(--line)] bg-white">
          <div className="space-y-3 border-b border-[var(--line)] p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFamily("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All offer records {readModel.summary.records}</button>
              {readModel.controls.families.map((option) => (
                <button key={option.key} type="button" onClick={() => setFamily(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${family === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStatus("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${status === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All statuses</button>
              {statusOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setStatus(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${status === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPriority("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${priority === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All priorities</button>
              {priorityOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setPriority(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${priority === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAudience("all")} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${audience === "all" ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>All audiences</button>
              {audienceOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setAudience(option.key)} className={`rounded-[7px] border px-3 py-2 text-sm font-medium ${audience === option.key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}>{option.label} {option.rows}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              <span className="sr-only">Search candidate offer records</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search offer, finance, location or blockers" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>

          <div className="max-h-[580px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Offer record</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => { setSelectedId(record.id); setCommandState(null); }} className={`cursor-pointer border-t border-[var(--line)] ${selectedRecord?.id === record.id ? "bg-emerald-50" : "bg-white"}`}>
                    <td className="px-4 py-3"><strong>{record.label}</strong><p className="mt-1 text-xs text-[var(--ink-muted)]">{words(record.family)}</p></td>
                    <td className="px-4 py-3">{record.audience}</td>
                    <td className="px-4 py-3">{record.owner}</td>
                    <td className="px-4 py-3 font-semibold">{valueLabel(record.value, record.unit)}</td>
                    <td className="px-4 py-3">{words(record.status)}</td>
                    <td className="px-4 py-3">{record.dueDate ?? "not scheduled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p className="p-6 text-sm text-[var(--ink-muted)]">No candidate offer records match this view.</p> : null}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <h3 className="font-semibold">Selected offer workflow</h3>
          {selectedRecord ? (
            <div className="mt-4 space-y-3 text-sm">
              <strong className="block">{selectedRecord.label}</strong>
              {[
                ["Family", words(selectedRecord.family)],
                ["Audience", selectedRecord.audience],
                ["Owner", selectedRecord.owner],
                ["Status", words(selectedRecord.status)],
                ["Priority", selectedRecord.priority],
                ["Value", valueLabel(selectedRecord.value, selectedRecord.unit)],
                ["Entity", words(selectedRecord.craysEntityType)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Source facts</p>
                <div className="mt-2 space-y-2">
                  {facts(selectedRecord, readModel.access.canViewInternalRecords).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[145px_minmax(0,1fr)] gap-2 text-xs">
                      <span className="text-[var(--ink-muted)]">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Context</p>
                <p className="mt-1 leading-6">{selectedRecord.context}</p>
              </div>
              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next action</p>
                <p className="mt-1 leading-6">{selectedRecord.nextAction}</p>
              </div>
              <a href={selectedRecord.href} className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-black px-4 py-2 text-sm font-semibold !text-white">Open connected workflow <ArrowRight className="h-4 w-4" /></a>
              {readModel.actions.stageOfferReviewAllowed ? (
                <button
                  type="button"
                  onClick={() => {
                    setCommandState({ status: "staging", message: "Staging Candidate Offer review", commandId: null, applyGate: null });
                    stageOfferReview(role, readModel, selectedRecord)
                      .then((result) => setCommandState(result))
                      .catch((error: unknown) => setCommandState({ status: "error", message: error instanceof Error ? error.message : "Command draft failed.", commandId: null, applyGate: null }));
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Stage candidate offer review
                </button>
              ) : (
                <p className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                  {readModel.access.canViewCandidateScopedRecords ? "This role can inspect scoped offer evidence. Review staging is reserved for internal Deal Manager ownership." : "Candidate release is closed for this role."}
                </p>
              )}
              {commandState ? (
                <div className={`rounded-[8px] border p-3 text-xs ${commandState.status === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                  <p className="font-semibold">{commandState.message}</p>
                  {commandState.commandId ? <p className="mt-1">Command History updated.</p> : null}
                  {commandState.applyGate ? <p className="mt-1">Candidate release, send, upload, source write and apply remain closed.</p> : null}
                </div>
              ) : null}
              <div className="flex items-start gap-2 rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Candidate release, public release, send, submission, upload, source write, sync apply and target apply remain closed.</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">Select an offer record to inspect source facts, connected workflow routing or guarded review action.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
