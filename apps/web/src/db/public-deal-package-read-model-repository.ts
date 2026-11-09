import {
  PUBLIC_DEAL_PACKAGE_DTO_VERSION,
  assertPublicDealPackageAllowlist,
  summarizePublicDealPackages,
  type PublicDealPackageDTO,
  type PublicDealPackageReadModel,
} from "@/lib/public-deal-package";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

type PublicDealPackageAudience = PublicDealPackageReadModel["audience"];

type PublicDealPackageRow = {
  offer_id: string;
  candidate_release_state: string;
  public_teaser_enabled: boolean;
  metadata: Record<string, unknown>;
  updated_at: Date;
};

function emptyPublicDealPackageReadModel(audience: PublicDealPackageAudience, configured: boolean): PublicDealPackageReadModel {
  return {
    status: configured ? "ready" : "not_configured",
    configured,
    audience,
    packages: [],
    summary: summarizePublicDealPackages([]),
    releaseBoundary: {
      publicReleaseEnabled: false,
      publishCommandEnabled: false,
      updateCommandEnabled: false,
      unpublishCommandEnabled: false,
      allowedReleaseStates: ["public_teaser", "candidate_detail", "reserved"],
      staticFallbackUsed: false,
      unreleasedPreparedOffersReturned: false,
      internalFieldsReturned: false,
    },
    cache: {
      strategy: "server",
      revalidation: "tagged-public-deal-packages",
      tags: ["public-deal-packages"],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPublicDealPackage(value: unknown): value is PublicDealPackageDTO {
  if (!isRecord(value)) return false;
  if (value.version !== PUBLIC_DEAL_PACKAGE_DTO_VERSION) return false;

  const stringFields = [
    "id",
    "slug",
    "city",
    "country",
    "district",
    "tier",
    "status",
    "availabilityStatus",
    "image",
    "roi",
    "payback",
    "openingWindow",
    "rentShare",
    "catchment",
    "teaser",
    "candidateSummary",
    "thesis",
    "profile",
    "audience",
    "concept",
    "publishedAt",
    "updatedAt",
  ];
  const numberFields = [
    "investment",
    "equityFrom",
    "targetRaise",
    "annualRevenue",
    "ebitdaMonthly",
    "projectedMembers",
    "locationScore",
    "bankability",
    "documentReadiness",
    "approvalReadiness",
  ];

  if (!stringFields.every((field) => typeof value[field] === "string" && String(value[field]).trim().length > 0)) return false;
  if (!numberFields.every((field) => typeof value[field] === "number" && Number.isFinite(value[field]))) return false;
  if (!["Flagship", "City", "Compact"].includes(String(value.tier))) return false;
  if (!["Public teaser", "Candidate detail", "Review ready"].includes(String(value.status))) return false;
  if (!["public_teaser", "candidate_detail", "reserved"].includes(String(value.availabilityStatus))) return false;
  if (!Array.isArray(value.signals) || !Array.isArray(value.evidence) || !Array.isArray(value.timeline) || !Array.isArray(value.documents)) return false;

  return assertPublicDealPackageAllowlist(value as PublicDealPackageDTO);
}

function packageFromRow(row: PublicDealPackageRow, audience: PublicDealPackageAudience) {
  const source = isRecord(row.metadata) ? row.metadata.publicDealPackage : null;
  if (!isPublicDealPackage(source)) return null;
  if (audience === "guest" && source.availabilityStatus !== "public_teaser") return null;
  if (source.availabilityStatus === "reserved" && row.candidate_release_state !== "reserved") return null;
  return {
    ...source,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getPublicDealPackageReadModel(audience: PublicDealPackageAudience): Promise<PublicDealPackageReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyPublicDealPackageReadModel(audience, false);

  const result = await getCorePgPool().query<PublicDealPackageRow>(
    `
      select
        prepared_offers.offer_id,
        prepared_offers.candidate_release_state,
        prepared_offers.public_teaser_enabled,
        prepared_offers.metadata,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      where prepared_offers.owner_role = 'deal-manager'
        and prepared_offers.status in ('review', 'released', 'reserved')
        and prepared_offers.candidate_release_state in ('teaser', 'detail_released', 'reserved')
        and (
          $1 <> 'guest'
          or prepared_offers.public_teaser_enabled = true
        )
      order by prepared_offers.updated_at desc
      limit 100
    `,
    [audience],
  );

  const packages = result.rows
    .map((row) => packageFromRow(row, audience))
    .filter((row): row is PublicDealPackageDTO => Boolean(row));

  return {
    ...emptyPublicDealPackageReadModel(audience, true),
    packages,
    summary: summarizePublicDealPackages(packages),
  };
}
