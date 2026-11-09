export const SHARED_CATALOG_CONTRACT_VERSION = "ncrv2-124.v1" as const;

export type CatalogServerContext = Readonly<{
  verticalRoot: "coffee" | "retail" | "gym" | "clubs";
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  currency: string;
  storeDisplayName: string;
  sellerDisplayName: string;
  sellerLegalName: string;
  storeSnapshotVersion: string;
  storeSnapshotSha256: string;
}>;

export type CatalogSourceRow = Readonly<{
  catalogDefinitionVersionId: string;
  sellableAssignmentId: string;
  sellableAssignmentVersion: number;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  productVariantReference: string;
  name: string;
  description: string;
  collectionSlugs: readonly string[];
  facets: Readonly<Record<string, readonly string[]>>;
  currency: string;
  priceMinor: number;
  priceBookVersion: string;
  taxCategory: string;
  taxMappingVersion: string;
  availability:
    | "available"
    | "low"
    | "unavailable"
    | "unknown";
  availabilityObservedAt: string;
  stockProjectionVersion: string;
}>;

export type CatalogBrowserQuery = Readonly<{
  storeSlug: string;
  search?: string;
  collection?: string;
  facets?: Readonly<Record<string, readonly string[]>>;
  cursor?: string;
  take: number;
}>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURSOR = /^[A-Za-z0-9_.-]{16,512}$/;

export function parseCatalogBrowserQuery(
  raw: Readonly<Record<string, unknown>>,
): CatalogBrowserQuery {
  const forbidden = [
    "partnerTenantId", "operatorLegalEntityId", "vendureSellerId",
    "vendureChannelId", "vendureChannelToken", "currencyOverride",
    "taxOverride", "priceOverride", "stockLocationId",
  ];
  if (forbidden.some((key) => key in raw)) {
    throw new Error("CATALOG_BROWSER_AUTHORITY_DENIED");
  }
  const allowed = new Set([
    "storeSlug", "search", "collection", "facets", "cursor", "take",
  ]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    throw new Error("CATALOG_QUERY_UNKNOWN_FIELD");
  }
  if (
    typeof raw.storeSlug !== "string" ||
    !SLUG.test(raw.storeSlug) ||
    !Number.isSafeInteger(raw.take) ||
    Number(raw.take) < 1 ||
    Number(raw.take) > 50
  ) throw new Error("CATALOG_QUERY_INVALID");
  if (
    raw.cursor !== undefined &&
    (typeof raw.cursor !== "string" || !CURSOR.test(raw.cursor))
  ) throw new Error("CATALOG_CURSOR_INVALID");
  if (
    raw.search !== undefined &&
    (typeof raw.search !== "string" || raw.search.trim().length < 1 ||
      raw.search.trim().length > 120)
  ) throw new Error("CATALOG_QUERY_INVALID");
  if (
    raw.collection !== undefined &&
    (typeof raw.collection !== "string" || !SLUG.test(raw.collection))
  ) throw new Error("CATALOG_QUERY_INVALID");
  let facets: Record<string, readonly string[]> | undefined;
  if (raw.facets !== undefined) {
    if (!raw.facets || typeof raw.facets !== "object" ||
      Array.isArray(raw.facets)) throw new Error("CATALOG_QUERY_INVALID");
    const entries = Object.entries(raw.facets as Record<string, unknown>);
    if (entries.length < 1 || entries.length > 12) {
      throw new Error("CATALOG_QUERY_INVALID");
    }
    facets = Object.fromEntries(entries.map(([key, values]) => {
      if (!SLUG.test(key) || !Array.isArray(values) || values.length < 1 ||
        values.length > 20 || values.some((value) =>
          typeof value !== "string" || !SLUG.test(value))) {
        throw new Error("CATALOG_QUERY_INVALID");
      }
      return [key, [...new Set(values as string[])].sort()];
    }));
  }
  return {
    storeSlug: raw.storeSlug,
    take: Number(raw.take),
    ...(raw.search === undefined ? {} : { search: raw.search.trim() }),
    ...(raw.collection === undefined ? {} : { collection: raw.collection }),
    ...(facets === undefined ? {} : { facets }),
    ...(raw.cursor === undefined ? {} : { cursor: raw.cursor }),
  } as CatalogBrowserQuery;
}

function sameScope(
  context: CatalogServerContext,
  row: CatalogSourceRow,
): boolean {
  return row.partnerTenantId === context.partnerTenantId &&
    row.operatorLegalEntityId === context.operatorLegalEntityId &&
    row.storeId === context.storeId &&
    row.vendureSellerId === context.vendureSellerId &&
    row.vendureChannelId === context.vendureChannelId;
}

export function createCatalogPage(
  context: CatalogServerContext,
  rows: readonly CatalogSourceRow[],
  nextCursor: string | null,
) {
  for (const row of rows) {
    if (!sameScope(context, row)) {
      throw new Error("CATALOG_CROSS_OPERATOR_ROW_DENIED");
    }
    if (
      row.currency !== context.currency ||
      !/^[A-Z]{3}$/.test(row.currency) ||
      !Number.isSafeInteger(row.priceMinor) ||
      row.priceMinor < 0 ||
      row.sellableAssignmentVersion < 1 ||
      !row.priceBookVersion ||
      !row.taxCategory ||
      !row.taxMappingVersion ||
      !row.stockProjectionVersion ||
      Number.isNaN(new Date(row.availabilityObservedAt).getTime())
    ) throw new Error("CATALOG_SELLABLE_STATE_INCOMPLETE");
  }
  if (nextCursor !== null && !CURSOR.test(nextCursor)) {
    throw new Error("CATALOG_CURSOR_INVALID");
  }
  if (!context.storeDisplayName.trim() ||
      !context.sellerDisplayName.trim() ||
      !context.sellerLegalName.trim() ||
      !/^store:\d+:assignment:\d+:binding:\d+:route:\d+$/.test(
        context.storeSnapshotVersion,
      ) ||
      !/^[0-9a-f]{64}$/.test(context.storeSnapshotSha256)) {
    throw new Error("CATALOG_STORE_DISCLOSURE_INCOMPLETE");
  }
  return {
    contractVersion: SHARED_CATALOG_CONTRACT_VERSION,
    storeId: context.storeId,
    currency: context.currency,
    store: {
      displayName: context.storeDisplayName,
      snapshotVersion: context.storeSnapshotVersion,
      snapshotSha256: context.storeSnapshotSha256,
    },
    seller: {
      displayName: context.sellerDisplayName,
      legalName: context.sellerLegalName,
    },
    items: rows.map((row) => ({
      catalogDefinitionVersionId: row.catalogDefinitionVersionId,
      sellableAssignmentVersion: row.sellableAssignmentVersion,
      productVariantReference: row.productVariantReference,
      name: row.name,
      description: row.description,
      collectionSlugs: row.collectionSlugs,
      facets: row.facets,
      priceMinor: row.priceMinor,
      priceBookVersion: row.priceBookVersion,
      taxCategory: row.taxCategory,
      taxMappingVersion: row.taxMappingVersion,
      availability: row.availability,
      availabilityObservedAt: row.availabilityObservedAt,
      stockProjectionVersion: row.stockProjectionVersion,
    })),
    nextCursor,
  };
}
