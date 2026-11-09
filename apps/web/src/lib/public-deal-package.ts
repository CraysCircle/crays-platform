export const PUBLIC_DEAL_PACKAGE_DTO_VERSION = "public-deal-package/v1" as const;

export type PublicDealPackageTier = "Flagship" | "City" | "Compact";

export type PublicDealPackageTone = "green" | "amber" | "rose" | "blue" | "ink";

export type PublicDealPackageDTO = {
  version: typeof PUBLIC_DEAL_PACKAGE_DTO_VERSION;
  id: string;
  slug: string;
  city: string;
  country: string;
  district: string;
  tier: PublicDealPackageTier;
  status: "Public teaser" | "Candidate detail" | "Review ready";
  availabilityStatus: "public_teaser" | "candidate_detail" | "reserved";
  image: string;
  investment: number;
  equityFrom: number;
  targetRaise: number;
  roi: string;
  annualRevenue: number;
  ebitdaMonthly: number;
  payback: string;
  projectedMembers: number;
  locationScore: number;
  bankability: number;
  documentReadiness: number;
  approvalReadiness: number;
  openingWindow: string;
  rentShare: string;
  catchment: string;
  teaser: string;
  candidateSummary: string;
  thesis: string;
  profile: string;
  audience: string;
  concept: string;
  signals: Array<{
    label: string;
    value: string;
    tone: PublicDealPackageTone;
  }>;
  evidence: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  timeline: Array<{
    label: string;
    owner: string;
    state: "Released" | "Open" | "Gated" | "Ready";
    due: string;
  }>;
  documents: Array<{
    title: string;
    type: string;
    status: "Released" | "Ready" | "Gated" | "Review";
    owner: string;
  }>;
  publishedAt: string;
  updatedAt: string;
};

export type PublicDealPackageReadModel = {
  status: "ready" | "not_configured";
  configured: boolean;
  audience: "guest" | "candidate";
  packages: PublicDealPackageDTO[];
  summary: {
    total: number;
    publicTeasers: number;
    candidateDetails: number;
    reserved: number;
  };
  releaseBoundary: {
    publicReleaseEnabled: false;
    publishCommandEnabled: false;
    updateCommandEnabled: false;
    unpublishCommandEnabled: false;
    allowedReleaseStates: Array<PublicDealPackageDTO["availabilityStatus"]>;
    staticFallbackUsed: false;
    unreleasedPreparedOffersReturned: false;
    internalFieldsReturned: false;
  };
  cache: {
    strategy: "server";
    revalidation: "tagged-public-deal-packages";
    tags: string[];
  };
};

export const PUBLIC_DEAL_PACKAGE_ALLOWED_FIELDS = [
  "version",
  "id",
  "slug",
  "city",
  "country",
  "district",
  "tier",
  "status",
  "availabilityStatus",
  "image",
  "investment",
  "equityFrom",
  "targetRaise",
  "roi",
  "annualRevenue",
  "ebitdaMonthly",
  "payback",
  "projectedMembers",
  "locationScore",
  "bankability",
  "documentReadiness",
  "approvalReadiness",
  "openingWindow",
  "rentShare",
  "catchment",
  "teaser",
  "candidateSummary",
  "thesis",
  "profile",
  "audience",
  "concept",
  "signals",
  "evidence",
  "timeline",
  "documents",
  "publishedAt",
  "updatedAt",
] as const satisfies readonly (keyof PublicDealPackageDTO)[];

export const PUBLIC_DEAL_PACKAGE_FORBIDDEN_FIELD_PATTERNS = [
  "preparedOfferId",
  "offerId",
  "propertyCaseId",
  "propertyId",
  "dealId",
  "ownerRole",
  "ownerAccountId",
  "assignedAccountId",
  "candidateAccountId",
  "franchisePartnerAccountId",
  "dealManagerAccountId",
  "organizationId",
  "metricsSnapshot",
  "metadata",
  "visibilityScope",
  "reviewSummary",
  "sourceSystem",
  "externalRecordId",
  "bankPackageId",
  "kyc",
  "aml",
  "internal",
  "private",
] as const;

export function summarizePublicDealPackages(packages: PublicDealPackageDTO[]): PublicDealPackageReadModel["summary"] {
  return packages.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.availabilityStatus === "public_teaser") summary.publicTeasers += 1;
      if (item.availabilityStatus === "candidate_detail") summary.candidateDetails += 1;
      if (item.availabilityStatus === "reserved") summary.reserved += 1;
      return summary;
    },
    { total: 0, publicTeasers: 0, candidateDetails: 0, reserved: 0 },
  );
}

export function assertPublicDealPackageAllowlist(packageDto: PublicDealPackageDTO) {
  const allowed = new Set<string>(PUBLIC_DEAL_PACKAGE_ALLOWED_FIELDS);
  const keys = Object.keys(packageDto);
  return keys.every((key) => allowed.has(key));
}
