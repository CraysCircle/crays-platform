import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type {
  CandidatePortalAction,
  CandidatePortalItemStatus,
  CandidatePortalReadModel,
  CandidatePortalTask,
} from "@/db/candidate-portal-read-model-repository";

export type CandidatePortalTab = "overview" | "deals" | "documents" | "finance" | "messages";

const tabs: Array<{ key: CandidatePortalTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "deals", label: "Deals" },
  { key: "documents", label: "Documents" },
  { key: "finance", label: "Finance" },
  { key: "messages", label: "Messages" },
];

const statusClass: Record<CandidatePortalItemStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
  available: "border-sky-200 bg-sky-50 text-sky-900",
  blocked: "border-amber-200 bg-amber-50 text-amber-950",
  locked: "border-zinc-200 bg-zinc-100 text-zinc-700",
  gated: "border-violet-200 bg-violet-50 text-violet-900",
};

function normalizeTab(tab: string | undefined): CandidatePortalTab {
  return tabs.some((item) => item.key === tab) ? (tab as CandidatePortalTab) : "overview";
}

function tabHref(tab: CandidatePortalTab) {
  return tab === "overview" ? "/pre-packed-deals/candidate" : `/pre-packed-deals/candidate?tab=${tab}`;
}

function StatusBadge({ status }: { status: CandidatePortalItemStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function ActionCard({ action }: { action: CandidatePortalAction }) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-black text-zinc-950">{action.label}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{action.reason}</p>
        {action.gate ? <p className="mt-2 text-[11px] font-black uppercase text-zinc-400">Gate: {action.gate}</p> : null}
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
    </div>
  );

  if (action.status === "available" && action.href) {
    return (
      <Link href={action.href} className="block rounded-[16px] border border-zinc-200 bg-white p-4 transition hover:border-[#ff0f5a]">
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-zinc-400" />
        <span className="text-[11px] font-black uppercase text-zinc-400">{action.status}</span>
      </div>
      {content}
    </div>
  );
}

function TaskList({ tasks }: { tasks: CandidatePortalTask[] }) {
  return (
    <div className="divide-y divide-zinc-200 rounded-[20px] border border-zinc-200 bg-white">
      {tasks.map((task) => (
        <article key={task.key} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_150px_120px] md:items-center">
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-950">{task.label}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{task.current}</p>
            <p className="mt-2 text-xs font-semibold text-zinc-500">{task.nextAction}</p>
          </div>
          <span className="text-sm font-semibold text-zinc-500">{task.owner}</span>
          <div className="flex items-center justify-start md:justify-end">
            <StatusBadge status={task.status} />
          </div>
        </article>
      ))}
    </div>
  );
}

function OverviewTab({ readModel }: { readModel: CandidatePortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5">
        <article className="rounded-[24px] border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#ff0f5a]" />
            <p className="text-sm font-black uppercase text-[#ff0f5a]">Candidate scope</p>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-normal">{readModel.currentState.title}</h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">{readModel.currentState.blocker}</p>
          <p className="mt-3 text-sm font-black text-zinc-950">Next safe action: {readModel.currentState.nextSafeAction}</p>
        </article>

        <TaskList tasks={readModel.tasks.slice(0, 8)} />
      </section>

      <aside className="space-y-4">
        {readModel.actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </aside>
    </div>
  );
}

function DealsTab({ readModel }: { readModel: CandidatePortalReadModel }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {[
        ["Public DTO packages", readModel.summary.publicDealPackages, "Released public packages only"],
        ["Candidate offers", readModel.summary.candidateVisibleOffers, "Requires account scope and CRAYS release"],
        ["Available sections", readModel.summary.availableSections, "Candidate-visible now"],
      ].map(([label, value, detail]) => (
        <article key={label} className="rounded-[20px] border border-zinc-200 bg-white p-5">
          <p className="text-[11px] font-black uppercase text-zinc-400">{label}</p>
          <p className="mt-3 text-4xl font-black text-zinc-950">{value}</p>
          <p className="mt-2 text-sm text-zinc-500">{detail}</p>
        </article>
      ))}
      <article className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 lg:col-span-3">
        <p className="text-sm font-black text-amber-950">Deal access state</p>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {readModel.currentState.blocker} The portal does not fill this gap with demo deals or internal prepared-offer drafts.
        </p>
        <div className="mt-4">
          <Link href="/pre-packed-deals" className="inline-flex items-center gap-2 rounded-[10px] bg-zinc-950 px-4 py-2 text-sm font-black text-white">
            Open public deal discovery
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </div>
  );
}

function DocumentsTab({ readModel }: { readModel: CandidatePortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <TaskList
        tasks={readModel.documents.map((document) => ({
          key: document.key,
          label: document.label,
          owner: document.owner,
          status: document.status,
          current: document.current,
          nextAction: `Access: ${document.access}. File bodies, uploads and private previews remain closed.`,
        }))}
      />
      <aside className="rounded-[20px] border border-zinc-200 bg-white p-5">
        <FileCheck2 className="h-5 w-5 text-[#ff0f5a]" />
        <h3 className="mt-4 text-xl font-black">Document boundary</h3>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The Candidate Portal shows document states only. It does not expose private filenames, file bodies, upload controls,
          bank package records or CRAYS internal review comments.
        </p>
      </aside>
    </div>
  );
}

function FinanceTab({ readModel }: { readModel: CandidatePortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <TaskList tasks={readModel.financeStages} />
      <aside className="space-y-4">
        <article className="rounded-[20px] border border-zinc-200 bg-white p-5">
          <Banknote className="h-5 w-5 text-[#ff0f5a]" />
          <h3 className="mt-4 text-xl font-black">Financing gates</h3>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Bank data", readModel.boundaries.bankDataReturned ? "Returned" : "Hidden"],
              ["KYC / AML", "Not started"],
              ["Equity check", "Not started"],
              ["Bank package", "Not created"],
              ["Payment", "Closed"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[12px] bg-zinc-50 px-3 py-2">
                <span className="font-semibold text-zinc-500">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
      </aside>
    </div>
  );
}

function MessagesTab({ readModel }: { readModel: CandidatePortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[20px] border border-zinc-200 bg-white p-6">
        <MessageSquare className="h-5 w-5 text-[#ff0f5a]" />
        <h2 className="mt-4 text-2xl font-black">Deal Team messages</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {readModel.summary.messages} candidate-visible messages are currently available. Shared candidate questions stay separate
          from CRAYS internal notes. External sending is closed until an exact send gate is opened.
        </p>
      </section>
      <aside className="space-y-4">
        {readModel.actions.filter((action) => action.key === "deal-team-message" || action.key === "open-public-deals").map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </aside>
    </div>
  );
}

export function CandidatePortalPage({ readModel, tab }: { readModel: CandidatePortalReadModel; tab?: string }) {
  const activeTab = normalizeTab(tab);
  const metricCards = [
    { label: "Candidate offers", value: readModel.summary.candidateVisibleOffers, detail: "released to account" },
    { label: "Gates ready", value: `${readModel.summary.readyGates}/${readModel.summary.totalGates}`, detail: "candidate path" },
    { label: "Documents", value: readModel.summary.approvedDocumentLinks, detail: "approved links" },
    { label: "Locked sections", value: readModel.summary.regulatedLockedSections, detail: "regulated" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <div className="mx-auto max-w-[1240px] px-4 py-6 lg:px-8">
        <header className="rounded-[28px] bg-zinc-950 p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/portal" className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
              CRAYS Candidate Portal
            </Link>
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase text-white/70">
              {readModel.access.level.replaceAll("_", " ")}
            </span>
          </div>
          <h1 className="mt-8 max-w-3xl text-5xl font-black leading-none tracking-normal max-md:text-4xl">
            Candidate workspace for released deals, documents, finance and messages.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/68">
            The portal is candidate-safe by design: no other candidates, no internal CRAYS review fields, no bank records,
            no uploads, no provider calls and no external sends are exposed.
          </p>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          {metricCards.map((metric) => (
            <article key={metric.label} className="rounded-[20px] border border-zinc-200 bg-white p-5">
              <p className="text-[11px] font-black uppercase text-zinc-400">{metric.label}</p>
              <p className="mt-3 text-3xl font-black">{metric.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{metric.detail}</p>
            </article>
          ))}
        </section>

        <nav className="mt-5 flex flex-wrap gap-2 rounded-[20px] border border-zinc-200 bg-white p-2" aria-label="Candidate portal sections">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={tabHref(item.key)}
              className={`rounded-[14px] px-4 py-2 text-sm font-black transition ${
                activeTab === item.key ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="mt-5">
          {activeTab === "overview" ? <OverviewTab readModel={readModel} /> : null}
          {activeTab === "deals" ? <DealsTab readModel={readModel} /> : null}
          {activeTab === "documents" ? <DocumentsTab readModel={readModel} /> : null}
          {activeTab === "finance" ? <FinanceTab readModel={readModel} /> : null}
          {activeTab === "messages" ? <MessagesTab readModel={readModel} /> : null}
        </section>

        <footer className="mt-6 grid gap-3 rounded-[20px] border border-zinc-200 bg-white p-5 text-sm text-zinc-600 md:grid-cols-3">
          {readModel.sourceNotes.map((note) => (
            <div key={note} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
              <span>{note}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
            <span>Last evaluated from CRAYS BFF read models during server render.</span>
          </div>
          <div className="flex gap-2">
            <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
            <span>Horizontal access prevention is explicit: {readModel.candidateScope.horizontalAccessPrevented ? "on" : "off"}.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
