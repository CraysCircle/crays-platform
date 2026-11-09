import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  KeyRound,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { getPartnerPreloginContract, type PartnerPreloginSurfaceKey } from "@/lib/partner-prelogin-contract";

const surfaceCopy = {
  "bank-partner": {
    eyebrow: "Funding Partner Bank",
    title: "Financing partners get a structured path into CRAYS-ready opportunities.",
    lead: "Review how CRAYS prepares franchise cases, evidence, risk controls and partner access before an authenticated funding workspace is opened.",
    icon: Banknote,
    portalLabel: "Open funding partner portal",
  },
  "real-estate-partner": {
    eyebrow: "Real Estate",
    title: "Property owners get a clear route from fit check to CRAYS review.",
    lead: "Understand the CRAYS tenant concept, property requirements and owner continuation path before private property details enter review.",
    icon: Building2,
    portalLabel: "Open real estate portal",
  },
} satisfies Record<PartnerPreloginSurfaceKey, { eyebrow: string; title: string; lead: string; icon: typeof Banknote; portalLabel: string }>;

const portalLoginHref = "/auth/login?returnTo=%2Fproject";

function RealEstateOwnerFitSection() {
  const ownerCards = [
    {
      label: "Property Fit",
      value: "Space, access and visibility",
      detail: "Owners can understand whether a property matches the CRAYS gym format before private details enter review.",
      icon: Building2,
    },
    {
      label: "Rent Potential",
      value: "Lease range guidance",
      detail: "CRAYS prepares rent sensitivity, catchment strength and expected operating model context for the owner decision.",
      icon: TrendingUp,
    },
    {
      label: "Location Intelligence",
      value: "Demand evidence",
      detail: "Reachability, catchment, demand, competition and conversion-potential signals become reviewed CRAYS evidence.",
      icon: MapPinned,
    },
    {
      label: "Owner Handoff",
      value: "Digital review path",
      detail: "A suitable property can move into CRAYS review with clear next data, document and account-scope steps.",
      icon: Handshake,
    },
  ];

  return (
    <section className="mx-auto max-w-[1180px] px-5 pb-10">
      <div className="rounded-[8px] border border-[#ded9cc] bg-[#fffdf8] p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase text-[#2f7f6a]">Owner property check</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[#171613]">Show owners why their property can become a prepared CRAYS deal.</h2>
            <p className="mt-4 text-sm leading-6 text-[#706c61]">
              The owner path explains tenant fit, rent potential, location evidence and the exact handoff steps needed before CRAYS turns a property into a franchise deal.
            </p>
          </div>
          <a href={portalLoginHref} className="inline-flex items-center gap-2 rounded-[8px] bg-[#171613] px-4 py-2.5 text-sm font-semibold text-white">
            Request reviewed owner access
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ownerCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-[8px] border border-[#ded9cc] bg-white p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#2f7f6a]" />
                  <p className="text-xs font-black uppercase text-[#706c61]">{card.label}</p>
                </div>
                <h3 className="mt-3 text-base font-semibold text-[#171613]">{card.value}</h3>
                <p className="mt-2 text-sm leading-6 text-[#706c61]">{card.detail}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Owner data", "Property basics, lease expectations and decision context."],
            ["CRAYS data", "Tenant concept, fit checklist, rent guidance and opening path."],
            ["Review gate", "Private submission, uploads and provider checks start only after approved account scope."],
          ].map(([label, detail]) => (
            <div key={label} className="flex gap-3 rounded-[8px] border border-[#ded9cc] bg-white p-4">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7f6a]" />
              <div>
                <strong className="text-sm text-[#171613]">{label}</strong>
                <p className="mt-1 text-xs leading-5 text-[#706c61]">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnerWebfrontPage({ surface }: { surface: PartnerPreloginSurfaceKey }) {
  const contract = getPartnerPreloginContract(surface);
  const copy = surfaceCopy[surface];
  const Icon = copy.icon;

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171613]">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-5">
        <Link href="/" className="inline-flex items-center" aria-label="CRAYS home">
          <Image src="/brand/crays-wordmark.svg" alt="CRAYS" width={173} height={43} className="h-9 w-auto" priority />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-[#706c61] md:flex" aria-label="Partner navigation">
          <Link href="/franchise/">Franchise</Link>
          <Link href="/pre-packed-deals">Franchise Guest</Link>
          <Link href="/portal/">Portal</Link>
        </nav>
        <Link
          href="/portal/"
          className="inline-flex items-center gap-2 rounded-[8px] border border-[#ded9cc] bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Portal
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="mx-auto grid max-w-[1180px] gap-6 px-5 pb-10 pt-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:pt-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-[#ded9cc] bg-white px-3 py-2 text-xs font-black uppercase text-[#2f7f6a]">
            <Icon className="h-4 w-4" />
            {copy.eyebrow}
          </div>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-normal max-[720px]:text-4xl">{copy.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#706c61]">{copy.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={portalLoginHref}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#171613] px-5 py-3 text-sm font-semibold text-white"
            >
              {copy.portalLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/portal/"
              className="inline-flex items-center gap-2 rounded-[8px] border border-[#ded9cc] bg-white px-5 py-3 text-sm font-semibold"
            >
              View all portals
            </Link>
          </div>
        </div>

        <aside className="rounded-[8px] border border-[#ded9cc] bg-[#fffdf8] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#2f7f6a]" />
            <div>
              <h2 className="text-lg font-semibold">Access after review</h2>
              <p className="mt-2 text-sm leading-6 text-[#706c61]">
                Private records, documents and workspace actions open only after account mapping, role review and scope grants.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            {contract.allowedPreloginSignals.slice(0, 4).map((item) => (
              <div key={item} className="flex gap-2 rounded-[8px] border border-[#ded9cc] bg-white px-3 py-2 text-sm font-medium">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7f6a]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-3 px-5 pb-10 md:grid-cols-2 xl:grid-cols-3">
        {contract.sections.map((section) => (
          <article key={section.key} className="rounded-[8px] border border-[#ded9cc] bg-[#fffdf8] p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#2f7f6a]" />
              <h2 className="text-base font-semibold">{section.label}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#706c61]">{section.purpose}</p>
          </article>
        ))}
      </section>

      {surface === "real-estate-partner" ? <RealEstateOwnerFitSection /> : null}

      <section className="mx-auto max-w-[1180px] px-5 pb-16">
        <div className="rounded-[8px] border border-[#ded9cc] bg-[#fffdf8] p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[#2f7f6a]" />
            <div>
              <h2 className="text-lg font-semibold">Controlled continuation</h2>
              <p className="mt-2 text-sm leading-6 text-[#706c61]">
                Requests, uploads, provider checks and external messages are not started from this public surface. The next
                step is authenticated portal access and CRAYS review.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {contract.gates.map((gate) => (
              <div key={gate.key} className="rounded-[8px] border border-[#ded9cc] bg-white p-4">
                <p className="text-xs font-black uppercase text-[#706c61]">{gate.startsAfter}</p>
                <h3 className="mt-2 text-sm font-semibold">{gate.label}</h3>
                <p className="mt-2 text-xs leading-5 text-[#706c61]">{gate.guardrail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
