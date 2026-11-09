import type { PublicDealPackageDTO, PublicDealPackageTier } from "@/lib/public-deal-package";

export type FranchiseAudience = "guest" | "candidate";

export type OfferTier = PublicDealPackageTier;

export type PreparedFranchiseOffer = PublicDealPackageDTO;

export type CandidateGate = {
  key: string;
  label: string;
  state: "available" | "active" | "gated" | "complete";
  copy: string;
};

export const candidateGates: CandidateGate[] = [
  {
    key: "account",
    label: "Account scope",
    state: "complete",
    copy: "Candidate identity is mapped to the selected prepared offer.",
  },
  {
    key: "diligence",
    label: "Deal diligence",
    state: "active",
    copy: "Released offer evidence, financial model and timeline are available before KYC.",
  },
  {
    key: "purchase",
    label: "Purchase intent",
    state: "available",
    copy: "Candidate can request reservation or financing preparation when ready.",
  },
  {
    key: "checks",
    label: "KYC / AML",
    state: "gated",
    copy: "Starts only after purchase, reservation, financing preparation or deeper gated access.",
  },
  {
    key: "bank",
    label: "Bank handoff",
    state: "gated",
    copy: "Only KYC-checked, equity-checked and CRAYS-reviewed packages reach financing partners.",
  },
];

export const guestJourneyHighlights = [
  "Browse prepared franchise offers as public teasers.",
  "Open a Candidate profile before full deal detail is shown.",
  "Review released evidence before KYC starts.",
  "Speak with a Deal Manager once the account scope is active.",
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getOfferById(offers: PublicDealPackageDTO[], id: string | undefined) {
  return offers.find((offer) => offer.id === id || offer.slug === id) ?? offers[0] ?? null;
}

export function getAudienceMetrics(audience: FranchiseAudience, offers: PublicDealPackageDTO[]) {
  const topOffer = offers.reduce<PublicDealPackageDTO | null>((best, offer) => (!best || offer.locationScore > best.locationScore ? offer : best), null);
  const averageBankability = offers.length
    ? Math.round(offers.reduce((total, offer) => total + offer.bankability, 0) / offers.length)
    : 0;

  if (audience === "guest") {
    return [
      { label: "Prepared offers", value: String(offers.length), detail: "public DTOs" },
      { label: "Top score", value: topOffer ? `${topOffer.locationScore}/100` : "0/100", detail: topOffer?.city ?? "not published" },
      { label: "Equity from", value: offers.length ? formatCurrency(Math.min(...offers.map((offer) => offer.equityFrom))) : "Not published", detail: "candidate path" },
    ];
  }

  return [
    { label: "Selected offers", value: String(offers.length), detail: "in review room" },
    { label: "Avg bankability", value: `${averageBankability}/100`, detail: "before handoff" },
    { label: "Next gate", value: "Purchase intent", detail: "before KYC" },
  ];
}
