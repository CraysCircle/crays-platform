import {
  createCatalogPage,
  type CatalogServerContext,
  type CatalogSourceRow,
} from "./shared-catalog-contract";

export const GYM_RETAIL_CATALOG_ADAPTER_VERSION = "ncrv2-127.v1" as const;
export const GYM_RETAIL_CLASSES = [
  "nutrition",
  "equipment",
  "apparel",
] as const;

export type GymRetailCatalogRow = CatalogSourceRow & Readonly<{
  gymRetailClass: (typeof GYM_RETAIL_CLASSES)[number] | "membership";
  canonicalProductType: "physical" | "membership";
  membershipEntitlementRef?: string;
}>;

export function assertGymRetailClassification(input: Readonly<{
  canonicalProductType: string;
  gymRetailClass: string;
  membershipEntitlementRef?: string;
}>) {
  if (
    input.canonicalProductType === "membership" ||
    input.gymRetailClass === "membership" ||
    input.membershipEntitlementRef
  ) throw new Error("GYM_MEMBERSHIP_OUTSIDE_VENDURE");
  if (input.canonicalProductType !== "physical") {
    throw new Error("GYM_RETAIL_CANONICAL_PRODUCT_TYPE_NOT_APPROVED");
  }
  if (!GYM_RETAIL_CLASSES.includes(
    input.gymRetailClass as (typeof GYM_RETAIL_CLASSES)[number],
  )) throw new Error("GYM_RETAIL_CLASS_NOT_APPROVED");
  return input;
}

export function createGymRetailCatalogPage(
  context: CatalogServerContext,
  rows: readonly GymRetailCatalogRow[],
  nextCursor: string | null,
) {
  if (context.verticalRoot !== "gym") {
    throw new Error("GYM_RETAIL_VERTICAL_CONTEXT_REQUIRED");
  }
  for (const row of rows) {
    assertGymRetailClassification(row);
  }

  const page = createCatalogPage(context, rows, nextCursor);
  return {
    ...page,
    adapterVersion: GYM_RETAIL_CATALOG_ADAPTER_VERSION,
    items: page.items.map((item, index) => ({
      ...item,
      gymRetailClass: rows[index].gymRetailClass,
      canonicalProductType: rows[index].canonicalProductType,
    })),
  };
}
