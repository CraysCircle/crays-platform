import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  candidateGates,
  formatCurrency,
  getAudienceMetrics,
  getOfferById,
  guestJourneyHighlights,
  type FranchiseAudience,
  type OfferTier,
  type PreparedFranchiseOffer,
} from "@/lib/franchise-web-platform";
import type { CandidateDealRoomReadinessReadModel } from "@/db/candidate-deal-room-readiness-repository";
import type { CandidateDealRoomPilotReadiness } from "@/lib/pilot-candidate-deal-room-contract";
import type { CandidateEvidenceIntentPilotReadiness } from "@/lib/pilot-candidate-evidence-intent-contract";
import type { BankEvidenceFinancingPilotReadiness } from "@/lib/pilot-bank-evidence-financing-contract";

type CandidateTab = "overview" | "evidence" | "finance" | "timeline" | "messages";

type PortalState = {
  offerId?: string;
  tier?: "All" | OfferTier;
  q?: string;
  tab?: CandidateTab;
  accessRequested?: boolean;
  reservationSent?: boolean;
  messageSent?: boolean;
};

type FranchiseWebPlatformProps = PortalState & {
  audience: FranchiseAudience;
  publicDealPackages: PreparedFranchiseOffer[];
  releasedOfferCount?: number;
  readModelConfigured?: boolean;
  releaseExecutionEnabled?: boolean;
  unreleasedPreparedOffersReturned?: boolean;
  dealRoomReadiness?: CandidateDealRoomReadinessReadModel;
  candidateDealRoomPilotReadiness?: CandidateDealRoomPilotReadiness;
  candidateEvidenceIntentPilotReadiness?: CandidateEvidenceIntentPilotReadiness;
  bankEvidenceFinancingPilotReadiness?: BankEvidenceFinancingPilotReadiness;
};

const navItems = {
  guest: ["Home", "Deals", "Evidence", "Account", "KYC"],
  candidate: ["Deal Room", "Evidence", "Finance", "Timeline", "Messages"],
} satisfies Record<FranchiseAudience, string[]>;

const tierOptions: Array<"All" | OfferTier> = ["All", "Flagship", "City", "Compact"];

const candidateTabs: Array<{ key: CandidateTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "evidence", label: "Evidence" },
  { key: "finance", label: "Finance" },
  { key: "timeline", label: "Timeline" },
  { key: "messages", label: "Messages" },
];

function sanitizeTier(tier: string | undefined): "All" | OfferTier {
  return tierOptions.includes(tier as "All" | OfferTier) ? (tier as "All" | OfferTier) : "All";
}

function sanitizeTab(tab: string | undefined): CandidateTab {
  return candidateTabs.some((item) => item.key === tab) ? (tab as CandidateTab) : "overview";
}

function hrefFor(audience: FranchiseAudience, state: PortalState, overrides: PortalState = {}, hash?: string) {
  const path = audience === "guest" ? "/pre-packed-deals" : "/pre-packed-deals/candidate";
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();

  if (next.offerId) params.set("offer", next.offerId);
  if (next.tier && next.tier !== "All") params.set("tier", next.tier);
  if (next.q) params.set("q", next.q);
  if (audience === "candidate" && next.tab && next.tab !== "overview") params.set("tab", next.tab);
  if (audience === "guest" && next.accessRequested) params.set("access", "requested");
  if (audience === "candidate" && next.reservationSent) params.set("reservation", "requested");
  if (audience === "candidate" && next.messageSent) params.set("message", "sent");

  return `${path}${params.size ? `?${params.toString()}` : ""}${hash ? `#${hash}` : ""}`;
}

function CraysBrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center">
      <Image
        src="/brand/crays-wordmark.svg"
        alt="CRAYS"
        width={173}
        height={43}
        className={`${compact ? "h-7" : "h-9"} w-auto object-contain`}
        priority={!compact}
      />
    </span>
  );
}

function DealStatusPill({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "pink" | "green" | "muted" }) {
  const className =
    tone === "pink"
      ? "bg-[#ffe1ea] text-[#ff0f5a]"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : tone === "muted"
          ? "bg-zinc-100 text-zinc-500"
          : "bg-zinc-950 text-white";

  return <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${className}`}>{children}</span>;
}

function CandidateRoleDashboard({ selectedOffer, state }: { selectedOffer: PreparedFranchiseOffer; state: PortalState }) {
  const cards = [
    {
      label: "Candidate status",
      value: "Scoped",
      detail: "Deal detail, evidence and Deal Manager messages are available before KYC.",
      tone: "green" as const,
    },
    {
      label: "Next action",
      value: state.reservationSent ? "Review queued" : "Reservation review",
      detail: state.reservationSent ? "Deal Manager follow-up is now the active step." : "Request review when this offer is ready for purchase intent.",
      tone: "pink" as const,
    },
    {
      label: "Selected offer",
      value: `${selectedOffer.city} ${selectedOffer.district}`,
      detail: `${selectedOffer.locationScore}/100 location score with ${selectedOffer.documentReadiness}% document readiness.`,
      tone: "dark" as const,
    },
    {
      label: "Regulated checks",
      value: "Not started",
      detail: "KYC / AML and bank handoff start only after reservation, purchase or financing intent.",
      tone: "muted" as const,
    },
  ];

  return (
    <section id="candidate-home" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-[18px] border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-black uppercase text-zinc-400">{card.label}</p>
            <DealStatusPill tone={card.tone}>{card.value}</DealStatusPill>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-600">{card.detail}</p>
        </article>
      ))}
    </section>
  );
}

function PortalSidebar({ audience }: { audience: FranchiseAudience }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[224px] shrink-0 border-r border-zinc-200 bg-[#fbfbfc] px-5 py-6 lg:flex lg:flex-col">
      <Link href="/pre-packed-deals" className="flex items-center" aria-label="CRAYS Pre-Packed Deals">
        <CraysBrandLockup />
      </Link>

      <nav className="mt-9 space-y-2" aria-label="Franchise portal navigation">
        {navItems[audience].map((item, index) => {
          const active = index === 0;
          return (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className={`flex items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-bold transition ${
                active ? "bg-[#ffe1ea] text-[#ff0f5a]" : "text-zinc-500 hover:bg-white hover:text-zinc-950"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[#ff0f5a]" : "bg-zinc-300"}`} />
              {item}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[16px] border border-zinc-200 bg-white p-4">
        <p className="text-[11px] font-black uppercase text-zinc-400">Portal state</p>
        <p className="mt-3 text-2xl font-black text-zinc-950">{audience === "guest" ? "Public" : "Scoped"}</p>
        <p className="mt-2 text-sm leading-5 text-zinc-500">
          {audience === "guest" ? "Full deal detail opens only after account scope." : "Candidate detail is visible before KYC starts."}
        </p>
      </div>
    </aside>
  );
}

function TopHeader({ audience, selectedOffer, state }: { audience: FranchiseAudience; selectedOffer: PreparedFranchiseOffer; state: PortalState }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/86 px-4 py-4 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-[1164px] items-center justify-between gap-4">
        <Link href="/pre-packed-deals" className="flex items-center lg:hidden" aria-label="CRAYS Pre-Packed Deals">
          <CraysBrandLockup compact />
        </Link>

        <div className="hidden min-w-0 lg:block">
          <h1 className="truncate text-2xl font-black tracking-normal text-zinc-950">
            {audience === "guest" ? "Pre-Packed Deal Market" : "Candidate Deal Room"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {audience === "guest" ? "Prepared CRAYS studios with public evidence teasers." : `${selectedOffer.city} ${selectedOffer.district} - released diligence workspace.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-500 md:flex">
            <Search className="h-4 w-4 text-zinc-400" />
            Search offers, cities, evidence
          </div>
          <Link
            href={audience === "guest" ? hrefFor("candidate", { offerId: selectedOffer.id }) : hrefFor("guest", { offerId: selectedOffer.id, accessRequested: state.accessRequested })}
            className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(24,24,27,0.18)] transition hover:-translate-y-0.5"
            style={{ color: "white" }}
          >
            {audience === "guest" ? "Open Candidate Room" : "Back to Deal Market"}
          </Link>
        </div>
      </div>
    </header>
  );
}

function OfferCard({ offer, selected, audience, state }: { offer: PreparedFranchiseOffer; selected: boolean; audience: FranchiseAudience; state: PortalState }) {
  return (
    <Link
      data-testid={`offer-card-${offer.id}`}
      href={hrefFor(audience, state, { offerId: offer.id })}
      className={`block w-full rounded-[16px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(24,24,27,0.08)] ${
        selected ? "border-[#ff0f5a] shadow-[0_18px_46px_rgba(255,15,90,0.12)]" : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-zinc-400">{offer.tier}</p>
          <h3 className="mt-1 text-lg font-black text-zinc-950">{offer.city}</h3>
          <p className="text-sm font-semibold text-zinc-500">{offer.district}</p>
        </div>
        <span className="rounded-full bg-[#ffe1ea] px-3 py-1 text-[11px] font-black uppercase text-[#ff0f5a]">
          {audience === "guest" ? "Teaser" : "Scoped"}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-600">{offer.teaser}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[12px] bg-zinc-50 p-3">
          <p className="text-[10px] font-black uppercase text-zinc-400">Score</p>
          <p className="mt-1 text-lg font-black text-zinc-950">{offer.locationScore}</p>
        </div>
        <div className="rounded-[12px] bg-zinc-50 p-3">
          <p className="text-[10px] font-black uppercase text-zinc-400">Equity</p>
          <p className="mt-1 text-lg font-black text-zinc-950">{formatCurrency(offer.equityFrom).replace("EUR", "")}</p>
        </div>
        <div className="rounded-[12px] bg-zinc-50 p-3">
          <p className="text-[10px] font-black uppercase text-zinc-400">Open</p>
          <p className="mt-1 text-lg font-black text-zinc-950">{offer.openingWindow.replace(" 2027", "")}</p>
        </div>
      </div>
    </Link>
  );
}

function GuestHero({ selectedOffer, state }: { selectedOffer: PreparedFranchiseOffer; state: PortalState }) {
  return (
    <section id="home" className="grid gap-5">
      <article className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white">
        <div className="grid gap-7 p-6 md:p-8">
          <div className="max-w-[760px]">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff0f5a]" />
                <p className="text-sm font-black text-[#ff0f5a]">CRAYS Franchise</p>
              </div>
              <h2 className="mt-5 text-[clamp(2.35rem,3.45vw,3.85rem)] font-black leading-[0.98] tracking-normal text-zinc-950">
                Buy into prepared studio locations with evidence before KYC.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
                Browse public deal teasers, open a Candidate profile for released detail, then start regulated checks only when purchase or financing intent is real.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                data-testid="guest-request-access"
                href={hrefFor("guest", state, { accessRequested: true }, "account")}
                className="rounded-full bg-[#ff0f5a] px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,15,90,0.24)] transition hover:-translate-y-0.5"
                style={{ color: "white" }}
              >
                {state.accessRequested ? "Access Request Sent" : "Request Deal Access"}
              </Link>
              <Link
                href={hrefFor("candidate", { offerId: selectedOffer.id })}
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:border-zinc-950"
              >
                View Candidate Room
              </Link>
            </div>
          </div>

          <div className="relative min-h-[340px] rounded-[20px] bg-zinc-950 p-5 text-white md:p-6">
            <div className="absolute inset-x-5 top-5 flex items-center justify-between">
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-black">Selected teaser</span>
              <Sparkles className="h-5 w-5 text-[#ffccde]" />
            </div>
            <div className="mt-16 grid gap-6 min-[1500px]:grid-cols-[minmax(0,0.72fr)_minmax(300px,1fr)] min-[1500px]:items-end">
              <div>
              <p className="text-sm font-semibold text-white/60">{selectedOffer.country}</p>
                <h3 className="mt-2 text-[clamp(2.2rem,5vw,4.4rem)] font-black leading-none">{selectedOffer.city}</h3>
              <p className="mt-2 text-lg text-white/70">{selectedOffer.district}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
              {selectedOffer.signals.map((signal) => (
                <div key={signal.label} className="rounded-[16px] bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase text-white/50">{signal.label}</p>
                  <p className="mt-2 text-xl font-black">{signal.value}</p>
                </div>
              ))}
              <div className="rounded-[16px] bg-[#ff0f5a] p-4">
                <p className="text-[10px] font-black uppercase text-white/70">Opening</p>
                <p className="mt-2 text-xl font-black">{selectedOffer.openingWindow}</p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <aside id="account" className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-[#ff0f5a]" />
            <h3 className="font-black text-zinc-950">Account gate</h3>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Public visitors see teasers. Full deal detail, documents and Deal Manager communication require Candidate account scope.
          </p>
          <div className="mt-4 space-y-2">
            {guestJourneyHighlights.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-zinc-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
                {item}
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-[22px] border border-zinc-200 bg-[#fff6f9] p-5">
          <p className="text-[11px] font-black uppercase text-[#ff0f5a]">Bank protection</p>
          <p className="mt-3 text-sm leading-6 text-zinc-700">
            Financing partners only receive approved packages after KYC, equity check and CRAYS review.
          </p>
        </article>
      </aside>
    </section>
  );
}

function CandidateHero({ selectedOffer, state }: { selectedOffer: PreparedFranchiseOffer; state: PortalState }) {
  return (
    <section id="deal-room" className="overflow-hidden rounded-[22px] border border-zinc-200 bg-zinc-950 text-white">
      <div className="grid min-h-[440px] min-[1500px]:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
        <div className="flex min-w-0 flex-col justify-between gap-8 p-6 md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DealStatusPill tone="pink">Candidate Room</DealStatusPill>
              <DealStatusPill tone="muted">Detail before KYC</DealStatusPill>
            </div>
            <h2 className="mt-6 max-w-[520px] text-[clamp(2.35rem,3.8vw,3.6rem)] font-black leading-[0.96] tracking-normal">
              Your deal room.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">{selectedOffer.candidateSummary}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/54">{selectedOffer.thesis}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              data-testid="candidate-request-reservation"
              href={hrefFor("candidate", state, { reservationSent: true })}
              className="rounded-full bg-[#ff0f5a] px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,15,90,0.24)] transition hover:-translate-y-0.5"
              style={{ color: "white" }}
            >
              {state.reservationSent ? "Reservation Requested" : "Request Reservation Review"}
            </Link>
            <Link
              href={hrefFor("candidate", state, { tab: "messages" }, "messages")}
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:border-zinc-950"
              style={{ color: "#09090b" }}
            >
              Ask Deal Manager
            </Link>
          </div>

          <div className="grid gap-3 min-[1500px]:grid-cols-3">
            {[
              ["Location", `${selectedOffer.locationScore}/100`],
              ["Bankability", `${selectedOffer.bankability}/100`],
              ["Documents", `${selectedOffer.documentReadiness}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[16px] bg-white/10 p-4">
                <p className="text-[10px] font-black uppercase text-white/45">{label}</p>
                <p className="mt-2 text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden bg-zinc-900 min-[1500px]:min-h-full">
          <Image
            src={selectedOffer.image}
            alt={`${selectedOffer.city} ${selectedOffer.district} studio concept`}
            fill
            className="object-cover"
            priority
            sizes="(min-width: 1280px) 46vw, 100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,24,35,0.08),rgba(5,24,35,0.78))]" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="text-sm font-semibold text-white/72">{selectedOffer.country}</p>
            <h3 className="mt-2 text-[clamp(2.4rem,4.2vw,3.8rem)] font-black leading-none">
              {selectedOffer.city}
              <span className="block text-white/70">{selectedOffer.district}</span>
            </h3>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Target raise", formatCurrency(selectedOffer.targetRaise)],
                ["Modelled ROI", selectedOffer.roi],
                ["Payback", selectedOffer.payback],
                ["Opening", selectedOffer.openingWindow],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] bg-white/12 p-4 backdrop-blur">
                  <p className="text-[10px] font-black uppercase text-white/52">{label}</p>
                  <p className="mt-2 text-lg font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OfferMarket({
  audience,
  selectedOffer,
  state,
  filteredOffers,
}: {
  audience: FranchiseAudience;
  selectedOffer: PreparedFranchiseOffer;
  state: PortalState;
  filteredOffers: PreparedFranchiseOffer[];
}) {
  const action = audience === "guest" ? "/pre-packed-deals" : "/pre-packed-deals/candidate";
  return (
    <section id="deals" className="rounded-[22px] border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase text-zinc-400">Prepared offers</p>
          <h2 className="mt-1 text-2xl font-black text-zinc-950">Deal inventory</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={action} className="flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-500">
            <Search className="h-4 w-4" />
            <input type="hidden" name="offer" value={selectedOffer.id} />
            {state.tier && state.tier !== "All" ? <input type="hidden" name="tier" value={state.tier} /> : null}
            {state.accessRequested ? <input type="hidden" name="access" value="requested" /> : null}
            {state.tab && state.tab !== "overview" ? <input type="hidden" name="tab" value={state.tab} /> : null}
            {state.reservationSent ? <input type="hidden" name="reservation" value="requested" /> : null}
            {state.messageSent ? <input type="hidden" name="message" value="sent" /> : null}
            <input
              name="q"
              defaultValue={state.q ?? ""}
              placeholder="Search city"
              className="w-32 bg-transparent text-zinc-950 outline-none placeholder:text-zinc-400"
            />
          </form>
          <div className="flex h-11 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1">
            <SlidersHorizontal className="ml-2 h-4 w-4 text-zinc-400" />
            {tierOptions.map((tier) => (
              <Link
                key={tier}
                href={hrefFor(audience, state, { tier })}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                  state.tier === tier ? "bg-zinc-950 text-white" : "text-zinc-500 hover:text-zinc-950"
                }`}
                style={state.tier === tier ? { color: "white" } : undefined}
              >
                {tier}
              </Link>
            ))}
          </div>
        </div>
      </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 min-[1500px]:grid-cols-4">
        {filteredOffers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} selected={offer.id === selectedOffer.id} audience={audience} state={state} />
        ))}
      </div>
    </section>
  );
}

function CandidateWorkspace({ selectedOffer, state }: { selectedOffer: PreparedFranchiseOffer; state: PortalState }) {
  const activeTab = sanitizeTab(state.tab);
  const dealControlRows = [
    ["Target raise", formatCurrency(selectedOffer.targetRaise), "Deal Manager", "Review deal"],
    ["Location score", `${selectedOffer.locationScore}/100`, "Expansion", "Open evidence"],
    ["Bankability", `${selectedOffer.bankability}/100`, "Finance", "Review route"],
    ["Approval readiness", `${selectedOffer.approvalReadiness}%`, "Deal Desk", "Prepare review"],
    ["Selected offer", `${selectedOffer.city} ${selectedOffer.district}`, "Candidate", "Ask question"],
  ];
  const financeRows = [
    ["Total investment", formatCurrency(selectedOffer.investment), "Project budget"],
    ["Equity from", formatCurrency(selectedOffer.equityFrom), "Own-equity check before bank handoff"],
    ["Annual revenue", formatCurrency(selectedOffer.annualRevenue), "Base-case planning"],
    ["EBITDA", `${formatCurrency(selectedOffer.ebitdaMonthly)} / mo`, "Operating model"],
    ["Rent share", selectedOffer.rentShare, "Real estate sensitivity"],
  ];
  const openingRows = [
    ["Property package", "Released", "Expansion", "Review location evidence"],
    ["Business plan", "Ready", "Deal Manager", "Review model"],
    ["Candidate reservation", state.reservationSent ? "Requested" : "Open", "Candidate", "Request review"],
    ["KYC / AML", "Gated", "Finance", "Starts after intent"],
    ["Bank handoff", "Gated", "Finance", "After CRAYS review"],
  ];
  return (
    <section className="rounded-[22px] border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 p-5">
        <div>
          <p className="text-[11px] font-black uppercase text-zinc-400">Candidate workspace</p>
          <h2 className="mt-1 text-2xl font-black text-zinc-950">Released deal detail</h2>
        </div>
        <div className="flex flex-wrap rounded-full border border-zinc-200 bg-zinc-50 p-1">
          {candidateTabs.map((tab) => (
            <Link
              key={tab.key}
              data-testid={`candidate-tab-${tab.key}`}
              href={hrefFor("candidate", state, { tab: tab.key })}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                activeTab === tab.key ? "bg-zinc-950 text-white" : "text-zinc-500 hover:text-zinc-950"
              }`}
              style={activeTab === tab.key ? { color: "white" } : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="p-5">
        {activeTab === "overview" ? (
          <div className="grid gap-4">
            <div className="grid gap-4 min-[1500px]:grid-cols-[minmax(0,1fr)_320px]">
              <article className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-[11px] font-black uppercase text-zinc-400">Deal thesis</p>
                <h3 className="mt-3 text-2xl font-black text-zinc-950">{selectedOffer.city} candidate case</h3>
                <p className="mt-4 text-sm leading-6 text-zinc-600">{selectedOffer.thesis}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    ["Profile", selectedOffer.profile],
                    ["Audience", selectedOffer.audience],
                    ["Concept", selectedOffer.concept],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[14px] bg-white p-4">
                      <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                      <p className="mt-2 text-sm leading-5 text-zinc-700">{value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[16px] border border-zinc-200 bg-white p-5">
                <p className="text-[11px] font-black uppercase text-zinc-400">Candidate scope</p>
                <p className="mt-3 text-3xl font-black text-zinc-950">Before KYC</p>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  You can review released detail, ask questions and request reservation review before regulated checks start.
                </p>
              </article>
            </div>

            <article className="overflow-hidden rounded-[16px] border border-zinc-200 bg-white">
              <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[11px] font-black uppercase text-zinc-400 max-[820px]:hidden">
                <span>Control</span>
                <span>Value</span>
                <span>Owner</span>
                <span>Action</span>
              </div>
              {dealControlRows.map(([control, value, owner, action]) => (
                <div key={control} className="grid gap-2 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] md:items-center">
                  <strong className="text-zinc-950">{control}</strong>
                  <span className="font-semibold text-zinc-700">{value}</span>
                  <span className="text-zinc-500">{owner}</span>
                  <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{action}</span>
                </div>
              ))}
            </article>
          </div>
        ) : null}

        {activeTab === "evidence" ? (
          <div className="grid gap-4">
            <div className="relative min-h-[260px] overflow-hidden rounded-[16px] bg-zinc-950">
              <Image src={selectedOffer.image} alt={`${selectedOffer.city} evidence preview`} fill className="object-cover opacity-82" sizes="(min-width: 1280px) 760px, 100vw" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,24,35,0.82),rgba(5,24,35,0.18))]" />
              <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-6 text-white">
                <p className="text-[11px] font-black uppercase text-white/52">Released evidence</p>
                <h3 className="mt-3 text-3xl font-black leading-tight">Location, demand and opening proof.</h3>
                <p className="mt-4 text-sm leading-6 text-white/68">{selectedOffer.profile}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
            {selectedOffer.evidence.map((item) => (
              <article key={item.label} className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase text-zinc-400">{item.label}</p>
                    <p className="mt-3 text-2xl font-black text-zinc-950">{item.value}</p>
                  </div>
                  <FileText className="h-5 w-5 text-[#ff0f5a]" />
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-600">{item.detail}</p>
              </article>
            ))}
            </div>
          </div>
        ) : null}

        {activeTab === "finance" ? (
          <div className="grid gap-4 min-[1500px]:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] font-black uppercase text-zinc-400">Finance path</p>
              <h3 className="mt-3 text-2xl font-black text-zinc-950">Candidate can inspect model before checks.</h3>
              <p className="mt-4 text-sm leading-6 text-zinc-600">
                The bank package remains locked until purchase intent, KYC / AML, equity check, source-of-funds review and CRAYS deal readiness review are complete.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {financeRows.slice(0, 3).map(([label, value, detail]) => (
                  <div key={label} className="rounded-[14px] bg-white p-4">
                    <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                    <p className="mt-2 text-xl font-black">{value}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {financeRows.slice(3).map(([label, value, detail]) => (
                  <div key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 text-sm">
                    <span className="font-black text-zinc-950">{label}</span>
                    <span className="font-semibold text-zinc-700">{value}</span>
                    <span className="text-zinc-500">{detail}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-[16px] border border-[#ffd1df] bg-[#fff6f9] p-4">
              <CircleDollarSign className="h-6 w-6 text-[#ff0f5a]" />
              <h3 className="mt-4 text-lg font-black text-zinc-950">Bank handoff locked</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Financing partners see only approved packages after required candidate and deal checks.
              </p>
            </article>
          </div>
        ) : null}

        {activeTab === "timeline" ? (
          <div className="grid gap-4 min-[1500px]:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {selectedOffer.timeline.map((item) => (
                <div key={item.label} className="grid gap-3 rounded-[16px] border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1fr_160px_120px_100px] md:items-center">
                <strong className="text-sm text-zinc-950">{item.label}</strong>
                <span className="text-sm text-zinc-500">{item.owner}</span>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">{item.state}</span>
                <span className="text-sm font-semibold text-zinc-500">{item.due}</span>
              </div>
              ))}
            </div>
            <article className="rounded-[16px] border border-zinc-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase text-zinc-400">Opening handoff</p>
              <div className="mt-4 space-y-3">
                {openingRows.map(([step, status, owner, action]) => (
                  <div key={step} className="rounded-[14px] bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm text-zinc-950">{step}</strong>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-zinc-500">{status}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{owner} - {action}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {activeTab === "messages" ? (
          <div id="messages" className="grid gap-4 min-[1500px]:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] font-black uppercase text-zinc-400">Deal Manager thread</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[14px] bg-white p-4">
                  <p className="text-sm font-black text-zinc-950">Deal Manager</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    The released evidence pack is ready. KYC is not required for this diligence stage.
                  </p>
                </div>
                {state.messageSent ? (
                  <div className="rounded-[14px] bg-[#ffe1ea] p-4">
                    <p className="text-sm font-black text-zinc-950">Candidate</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">Question sent for Deal Manager review.</p>
                  </div>
                ) : null}
              </div>
            </article>
            <article className="rounded-[16px] border border-zinc-200 bg-white p-4">
              <MessageCircle className="h-6 w-6 text-[#ff0f5a]" />
              <h3 className="mt-4 text-lg font-black text-zinc-950">Ask a scoped question</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">Shared candidate questions stay separate from CRAYS internal notes.</p>
              <Link
                data-testid="candidate-send-question"
                href={hrefFor("candidate", state, { tab: "messages", messageSent: true }, "messages")}
                className="mt-5 block w-full rounded-full bg-zinc-950 px-4 py-3 text-center text-sm font-black text-white"
                style={{ color: "white" }}
              >
                {state.messageSent ? "Question Sent" : "Send Question"}
              </Link>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GateRail({ audience, selectedOffer, state, offers }: { audience: FranchiseAudience; selectedOffer: PreparedFranchiseOffer; state: PortalState; offers: PreparedFranchiseOffer[] }) {
  const metrics = getAudienceMetrics(audience, offers);
  return (
    <aside className="space-y-4">
      <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
        <p className="text-[11px] font-black uppercase text-zinc-400">Signals</p>
        <div className="mt-4 space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-4 rounded-[14px] bg-zinc-50 p-3">
              <div>
                <p className="text-xs font-black uppercase text-zinc-400">{metric.label}</p>
                <p className="mt-1 text-sm text-zinc-500">{metric.detail}</p>
              </div>
              <strong className="text-lg text-zinc-950">{metric.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
        <p className="text-[11px] font-black uppercase text-zinc-400">Gate state</p>
        <div className="mt-4 space-y-3">
          {candidateGates.map((gate) => {
            const visibleState = audience === "guest" && gate.key !== "account" ? "gated" : gate.state;
            return (
              <div key={gate.key} className="flex gap-3 rounded-[14px] bg-zinc-50 p-3">
                {visibleState === "complete" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : visibleState === "gated" ? (
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                ) : (
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0f5a]" />
                )}
                <div>
                  <p className="text-sm font-black text-zinc-950">{gate.label}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{gate.copy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-[22px] border border-zinc-200 bg-zinc-950 p-5 text-white">
        <p className="text-[11px] font-black uppercase text-white/50">Selected offer</p>
        <h3 className="mt-3 text-2xl font-black">{selectedOffer.city}</h3>
        <p className="mt-2 text-sm text-white/60">{selectedOffer.catchment}</p>
        <div className="mt-5 flex items-center justify-between rounded-[14px] bg-white/10 p-3">
          <span className="text-sm text-white/60">Access</span>
          <strong className="text-sm">{audience === "candidate" || state.accessRequested ? "Scoped path" : "Public teaser"}</strong>
        </div>
      </article>
    </aside>
  );
}

function ReleasedOffersEmptyState({
  audience,
  readModelConfigured,
  releaseExecutionEnabled,
  unreleasedPreparedOffersReturned,
  dealRoomReadiness,
  candidateDealRoomPilotReadiness,
  candidateEvidenceIntentPilotReadiness,
  bankEvidenceFinancingPilotReadiness,
}: {
  audience: FranchiseAudience;
  readModelConfigured: boolean;
  releaseExecutionEnabled: boolean;
  unreleasedPreparedOffersReturned: boolean;
  dealRoomReadiness?: CandidateDealRoomReadinessReadModel;
  candidateDealRoomPilotReadiness?: CandidateDealRoomPilotReadiness;
  candidateEvidenceIntentPilotReadiness?: CandidateEvidenceIntentPilotReadiness;
  bankEvidenceFinancingPilotReadiness?: BankEvidenceFinancingPilotReadiness;
}) {
  const title = audience === "guest" ? "Pre-Packed Deal Market" : "Candidate Deal Room";
  const dealRoomSections = dealRoomReadiness?.sections.slice(0, 5) ?? [];

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-[1440px] gap-6 px-0 lg:px-4">
        <PortalSidebar audience={audience} />
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/86 px-4 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-[1164px] items-center justify-between gap-4">
              <Link href="/pre-packed-deals" className="flex items-center lg:hidden" aria-label="CRAYS Pre-Packed Deals">
                <CraysBrandLockup compact />
              </Link>
              <div className="hidden min-w-0 lg:block">
                <h1 className="truncate text-2xl font-black tracking-normal text-zinc-950">{title}</h1>
                <p className="mt-1 text-sm text-zinc-500">Released prepared offers from CRAYS Core.</p>
              </div>
              <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white">Read model</span>
            </div>
          </header>

          <div className="mx-auto grid max-w-[1164px] gap-5 px-4 py-5 lg:px-8 xl:grid-cols-[minmax(0,780px)_300px]">
            <section className="min-w-0 overflow-hidden rounded-[22px] border border-zinc-200 bg-white">
              <div className="grid gap-7 p-6 md:p-8">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff0f5a]" />
                    <p className="text-sm font-black text-[#ff0f5a]">Released offer feed</p>
                  </div>
                  <h2 className="mt-5 text-[clamp(2.2rem,3.35vw,3.7rem)] font-black leading-[0.98] tracking-normal text-zinc-950">
                    No released offers yet.
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
                    Prepared offers appear here only after CRAYS release approval. Internal review records, candidate-private data, bank data and draft documents stay hidden.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ["Visible records", "0", "Released offers"],
                    ["Release execution", releaseExecutionEnabled ? "On" : "Off", "Approval required"],
                    ["Unreleased records", unreleasedPreparedOffersReturned ? "Returned" : "Hidden", "Internal boundary"],
                  ].map(([label, value, detail]) => (
                    <article key={label} className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-5">
                      <p className="text-[11px] font-black uppercase text-zinc-400">{label}</p>
                      <p className="mt-3 text-3xl font-black text-zinc-950">{value}</p>
                      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
                <p className="text-[11px] font-black uppercase text-zinc-400">Release boundary</p>
                <div className="mt-4 space-y-3">
                  {[
                    ["Database", readModelConfigured ? "Configured" : "Not configured"],
                    ["Guest access", "Public teaser only"],
                    ["Candidate access", "Account scope required"],
                    ["Uploads", "Disabled"],
                    ["Provider calls", "Disabled"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-[14px] bg-zinc-50 p-3 text-sm">
                      <span className="font-semibold text-zinc-500">{label}</span>
                      <strong className="text-zinc-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </article>
              {audience === "candidate" && dealRoomReadiness ? (
                <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] font-black uppercase text-zinc-400">Deal room readiness</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      ["Sections", String(dealRoomReadiness.summary.sections)],
                      ["Released", String(dealRoomReadiness.summary.releasedOffers)],
                      ["Messages", String(dealRoomReadiness.summary.messages)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[14px] bg-zinc-50 p-3">
                        <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                        <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    {dealRoomSections.map((section) => (
                      <div key={section.key} className="rounded-[14px] bg-zinc-50 p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-black text-zinc-950">{section.label}</span>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-zinc-500">
                            {section.current}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {audience === "candidate" && candidateDealRoomPilotReadiness ? (
                <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] font-black uppercase text-zinc-400">Pilot Deal Room</p>
                  <h3 className="mt-3 text-lg font-black text-zinc-950">Release-gated shell</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      ["Visible", String(candidateDealRoomPilotReadiness.summary.candidateVisiblePackages)],
                      ["Sections", String(candidateDealRoomPilotReadiness.summary.sections)],
                      ["Release required", String(candidateDealRoomPilotReadiness.summary.releaseRequiredSections)],
                      ["Regulated locked", String(candidateDealRoomPilotReadiness.summary.regulatedLockedSections)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[14px] bg-zinc-50 p-3">
                        <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                        <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {candidateDealRoomPilotReadiness.gates.slice(1, 5).map((gate) => (
                      <div key={gate.key} className="flex items-center justify-between gap-3 rounded-[14px] bg-zinc-50 p-3 text-sm">
                        <span className="font-semibold text-zinc-500">{gate.label}</span>
                        <strong className="text-zinc-950">{gate.state.replaceAll("_", " ")}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {audience === "candidate" && candidateEvidenceIntentPilotReadiness ? (
                <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] font-black uppercase text-zinc-400">Evidence and Intent</p>
                  <h3 className="mt-3 text-lg font-black text-zinc-950">Guarded actions</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      ["Actions", String(candidateEvidenceIntentPilotReadiness.summary.actionModels)],
                      ["Intent", String(candidateEvidenceIntentPilotReadiness.summary.intentRecords)],
                      ["Evidence", String(candidateEvidenceIntentPilotReadiness.summary.evidencePackages)],
                      ["Ready gates", `${candidateEvidenceIntentPilotReadiness.summary.readyGates}/${candidateEvidenceIntentPilotReadiness.summary.readinessGates}`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[14px] bg-zinc-50 p-3">
                        <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                        <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {candidateEvidenceIntentPilotReadiness.actionModels.map((action) => (
                      <div key={action.key} className="rounded-[14px] bg-zinc-50 p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-zinc-950">{action.label}</span>
                          <strong className="shrink-0 text-xs uppercase text-zinc-500">{action.status.replaceAll("_", " ")}</strong>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{action.current}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
              {audience === "candidate" && bankEvidenceFinancingPilotReadiness ? (
                <article className="rounded-[22px] border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] font-black uppercase text-zinc-400">Financing readiness</p>
                  <h3 className="mt-3 text-lg font-black text-zinc-950">Bank package locked</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      ["Packages", String(bankEvidenceFinancingPilotReadiness.summary.bankPackages)],
                      ["Work items", String(bankEvidenceFinancingPilotReadiness.summary.workItems)],
                      ["Intents", String(bankEvidenceFinancingPilotReadiness.summary.candidateIntents)],
                      ["Ready gates", `${bankEvidenceFinancingPilotReadiness.summary.readyGates}/${bankEvidenceFinancingPilotReadiness.summary.readinessGates}`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[14px] bg-zinc-50 p-3">
                        <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                        <p className="mt-2 text-xl font-black text-zinc-950">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {bankEvidenceFinancingPilotReadiness.stages.slice(0, 4).map((stage) => (
                      <div key={stage.key} className="rounded-[14px] bg-zinc-50 p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-zinc-950">{stage.label}</span>
                          <strong className="shrink-0 text-xs uppercase text-zinc-500">{stage.status.replaceAll("_", " ")}</strong>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{stage.current}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export function FranchiseWebPlatform(props: FranchiseWebPlatformProps) {
  if (props.releasedOfferCount === 0) {
    return (
      <ReleasedOffersEmptyState
        audience={props.audience}
        readModelConfigured={Boolean(props.readModelConfigured)}
        releaseExecutionEnabled={Boolean(props.releaseExecutionEnabled)}
        unreleasedPreparedOffersReturned={Boolean(props.unreleasedPreparedOffersReturned)}
        dealRoomReadiness={props.dealRoomReadiness}
        candidateDealRoomPilotReadiness={props.candidateDealRoomPilotReadiness}
        candidateEvidenceIntentPilotReadiness={props.candidateEvidenceIntentPilotReadiness}
        bankEvidenceFinancingPilotReadiness={props.bankEvidenceFinancingPilotReadiness}
      />
    );
  }

  const state: PortalState = {
    offerId: props.offerId,
    tier: sanitizeTier(props.tier),
    q: props.q?.trim() || undefined,
    tab: sanitizeTab(props.tab),
    accessRequested: Boolean(props.accessRequested),
    reservationSent: Boolean(props.reservationSent),
    messageSent: Boolean(props.messageSent),
  };
  const selectedOffer = getOfferById(props.publicDealPackages, state.offerId);

  if (!selectedOffer) {
    return (
      <ReleasedOffersEmptyState
        audience={props.audience}
        readModelConfigured={Boolean(props.readModelConfigured)}
        releaseExecutionEnabled={Boolean(props.releaseExecutionEnabled)}
        unreleasedPreparedOffersReturned={Boolean(props.unreleasedPreparedOffersReturned)}
        dealRoomReadiness={props.dealRoomReadiness}
        candidateDealRoomPilotReadiness={props.candidateDealRoomPilotReadiness}
        candidateEvidenceIntentPilotReadiness={props.candidateEvidenceIntentPilotReadiness}
        bankEvidenceFinancingPilotReadiness={props.bankEvidenceFinancingPilotReadiness}
      />
    );
  }

  const normalized = (state.q ?? "").toLowerCase();
  const filteredOffers = props.publicDealPackages.filter((offer) => {
    const matchesTier = state.tier === "All" || offer.tier === state.tier;
    const matchesQuery = !normalized || [offer.city, offer.country, offer.district, offer.tier].some((value) => value.toLowerCase().includes(normalized));
    return matchesTier && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-[1440px] gap-6 px-0 lg:px-4">
        <PortalSidebar audience={props.audience} />
        <main className="min-w-0 flex-1">
          <TopHeader audience={props.audience} selectedOffer={selectedOffer} state={state} />
          <div className="mx-auto grid max-w-[1164px] gap-5 px-4 py-5 lg:px-8 xl:grid-cols-[minmax(0,780px)_300px]">
            <div className="min-w-0 space-y-5">
              {props.audience === "guest" ? <GuestHero selectedOffer={selectedOffer} state={state} /> : <CandidateHero selectedOffer={selectedOffer} state={state} />}

              {props.audience === "candidate" ? <CandidateRoleDashboard selectedOffer={selectedOffer} state={state} /> : null}

              <section className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: MapPinned, label: "Location evidence", value: selectedOffer.locationScore, detail: "score" },
                  { icon: UsersRound, label: "Member target", value: selectedOffer.projectedMembers.toLocaleString("en"), detail: "base case" },
                  { icon: CalendarDays, label: "Opening window", value: selectedOffer.openingWindow, detail: "planned" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.label} className="rounded-[18px] border border-zinc-200 bg-white p-5">
                      <Icon className="h-5 w-5 text-[#ff0f5a]" />
                      <p className="mt-4 text-[11px] font-black uppercase text-zinc-400">{item.label}</p>
                      <p className="mt-2 text-3xl font-black text-zinc-950">{item.value}</p>
                      <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                    </article>
                  );
                })}
              </section>

              <OfferMarket audience={props.audience} selectedOffer={selectedOffer} state={state} filteredOffers={filteredOffers} />

              {props.audience === "candidate" ? (
                <CandidateWorkspace selectedOffer={selectedOffer} state={state} />
              ) : (
                <section id="evidence" className="grid gap-4 md:grid-cols-2">
                  {selectedOffer.evidence.slice(0, 4).map((item) => (
                    <article key={item.label} className="rounded-[18px] border border-zinc-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase text-zinc-400">{item.label}</p>
                          <p className="mt-3 text-2xl font-black text-zinc-950">{item.value}</p>
                        </div>
                        <ShieldCheck className="h-5 w-5 text-[#ff0f5a]" />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-zinc-600">
                        {item.label === "Financial planning" ? "Detailed model opens after Candidate account scope. Bank handoff remains locked until checks." : item.detail}
                      </p>
                    </article>
                  ))}
                </section>
              )}
            </div>

            <GateRail audience={props.audience} selectedOffer={selectedOffer} state={state} offers={props.publicDealPackages} />
          </div>
        </main>
      </div>
    </div>
  );
}
