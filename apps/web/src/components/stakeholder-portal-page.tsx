import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type {
  StakeholderPortalAction,
  StakeholderPortalItem,
  StakeholderPortalReadModel,
  StakeholderPortalStatus,
  StakeholderPortalTab,
} from "@/db/stakeholder-portal-read-model-repository";

const tabs: Array<{ key: StakeholderPortalTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "work", label: "Work" },
  { key: "documents", label: "Documents" },
  { key: "finance", label: "Finance" },
  { key: "messages", label: "Messages" },
];

const statusClass: Record<StakeholderPortalStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-sky-200 bg-sky-50 text-sky-900",
  blocked: "border-amber-200 bg-amber-50 text-amber-950",
  gated: "border-violet-200 bg-violet-50 text-violet-900",
  locked: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

function normalizeTab(tab: string | undefined): StakeholderPortalTab {
  return tabs.some((item) => item.key === tab) ? (tab as StakeholderPortalTab) : "overview";
}

function tabHref(readModel: StakeholderPortalReadModel, tab: StakeholderPortalTab) {
  return tab === "overview" ? readModel.basePath : `${readModel.basePath}?tab=${tab}`;
}

function StatusBadge({ status }: { status: StakeholderPortalStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass[status]}`}>
      {status}
    </span>
  );
}

function ActionCard({ action }: { action: StakeholderPortalAction }) {
  const body = (
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
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-zinc-400" />
        <span className="text-[11px] font-black uppercase text-zinc-400">{action.status}</span>
      </div>
      {body}
    </div>
  );
}

function ItemList({ items }: { items: StakeholderPortalItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
        <p className="text-sm font-black text-zinc-950">No scoped items are visible.</p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">This is a relationship-scope gate, not an empty placeholder.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200 rounded-[20px] border border-zinc-200 bg-white">
      {items.map((item) => (
        <article key={item.key} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_150px_120px] md:items-center">
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-950">{item.label}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{item.current}</p>
            <p className="mt-2 text-xs font-semibold text-zinc-500">{item.nextAction}</p>
            {item.gate ? <p className="mt-2 text-[11px] font-black uppercase text-zinc-400">Gate: {item.gate}</p> : null}
          </div>
          <span className="text-sm font-semibold text-zinc-500">{item.owner}</span>
          <div className="flex justify-start md:justify-end">
            <StatusBadge status={item.status} />
          </div>
        </article>
      ))}
    </div>
  );
}

function OverviewTab({ readModel }: { readModel: StakeholderPortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5">
        <article className="rounded-[24px] border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#ff0f5a]" />
            <p className="text-sm font-black uppercase text-[#ff0f5a]">Relationship scope</p>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-normal">{readModel.relationship.title}</h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">{readModel.relationship.journey}</p>
          <p className="mt-3 text-sm font-black text-zinc-950">
            Current scope: {readModel.relationship.partyName} / {readModel.relationship.companyName}
          </p>
        </article>
        <ItemList items={readModel.tasks.slice(0, 8)} />
      </section>
      <aside className="space-y-4">
        {readModel.actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </aside>
    </div>
  );
}

function WorkTab({ readModel }: { readModel: StakeholderPortalReadModel }) {
  return (
    <div className="grid gap-5">
      <ItemList items={readModel.tasks} />
      <section className="grid gap-3 lg:grid-cols-2">
        {readModel.records.map((record) => (
          <article key={record.key} className="rounded-[18px] border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase text-zinc-400">{record.family}</p>
                <h3 className="mt-2 text-base font-black text-zinc-950">{record.label}</h3>
              </div>
              <StatusBadge status={record.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{record.context}</p>
            <div className="mt-4 rounded-[12px] bg-zinc-50 px-3 py-2 text-sm">
              <span className="font-semibold text-zinc-500">{record.owner}</span>
              <span className="mx-2 text-zinc-300">/</span>
              <strong>{record.value}</strong>
            </div>
            <p className="mt-3 text-xs font-semibold text-zinc-500">{record.nextAction}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function DocumentsTab({ readModel }: { readModel: StakeholderPortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <ItemList items={readModel.documents} />
      <aside className="rounded-[20px] border border-zinc-200 bg-white p-5">
        <FileCheck2 className="h-5 w-5 text-[#ff0f5a]" />
        <h3 className="mt-4 text-xl font-black">Document boundary</h3>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          This portal shows document states and gates only. File bodies, uploads, private previews and unapproved source mappings
          stay server-side and closed.
        </p>
      </aside>
    </div>
  );
}

function FinanceTab({ readModel }: { readModel: StakeholderPortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <ItemList items={readModel.finance} />
      <aside className="rounded-[20px] border border-zinc-200 bg-white p-5">
        <Banknote className="h-5 w-5 text-[#ff0f5a]" />
        <h3 className="mt-4 text-xl font-black">Finance and bank gates</h3>
        <div className="mt-4 space-y-2 text-sm">
          {[
            ["Bank send", readModel.boundaries.bankSendEnabled ? "open" : "closed"],
            ["Payment", readModel.boundaries.paymentInitiationEnabled ? "open" : "closed"],
            ["Finance posting", readModel.boundaries.financePostingEnabled ? "open" : "closed"],
            ["Lease signing", readModel.boundaries.leaseSigningEnabled ? "open" : "closed"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-[12px] bg-zinc-50 px-3 py-2">
              <span className="font-semibold text-zinc-500">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function MessagesTab({ readModel }: { readModel: StakeholderPortalReadModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[20px] border border-zinc-200 bg-white p-6">
        <MessageSquare className="h-5 w-5 text-[#ff0f5a]" />
        <h2 className="mt-4 text-2xl font-black">Messages and releases</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          External stakeholder sending is closed. The portal can show reviewed states and internal next actions, but it cannot
          send partner, bank or owner messages until an exact send gate is opened.
        </p>
      </section>
      <aside className="space-y-4">
        <ItemList items={readModel.messages} />
      </aside>
    </div>
  );
}

export function StakeholderPortalPage({ readModel, tab }: { readModel: StakeholderPortalReadModel; tab?: string }) {
  const activeTab = normalizeTab(tab);

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <div className="mx-auto max-w-[1240px] px-4 py-6 lg:px-8">
        <header className="rounded-[28px] bg-zinc-950 p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/portal" className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
              CRAYS {readModel.eyebrow}
            </Link>
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase text-white/70">
              {readModel.access.level.replaceAll("_", " ")}
            </span>
          </div>
          <h1 className="mt-8 max-w-3xl text-5xl font-black leading-none tracking-normal max-md:text-4xl">{readModel.label}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/68">
            Relationship-scoped workspace for {readModel.relationship.partyType.toLowerCase()} work, documents, finance gates and
            messages. No sends, payments, uploads, releases, lease signing or source-system writes are opened here.
          </p>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          {readModel.metrics.map((metric) => (
            <article key={metric.key} className="rounded-[20px] border border-zinc-200 bg-white p-5">
              <p className="text-[11px] font-black uppercase text-zinc-400">{metric.label}</p>
              <p className="mt-3 text-3xl font-black">{metric.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{metric.detail}</p>
            </article>
          ))}
        </section>

        <nav className="mt-5 flex flex-wrap gap-2 rounded-[20px] border border-zinc-200 bg-white p-2" aria-label={`${readModel.label} sections`}>
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={tabHref(readModel, item.key)}
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
          {activeTab === "work" ? <WorkTab readModel={readModel} /> : null}
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
            <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
            <span>Tenant and relationship scope: {readModel.access.relationshipScoped && readModel.access.tenantScoped ? "on" : "blocked"}.</span>
          </div>
          <div className="flex gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
            <span>{readModel.relationship.siteName} / {readModel.relationship.address}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
