import { STOREFRONT_BROWSER_FORBIDDEN_KEYS } from "./storefront-bff-contract";

export type StorefrontPublicCatalogItem = Readonly<{
  productVariantReference: string;
  name: string;
  description: string;
  priceMinor: number;
  availability: "available" | "low" | "unavailable" | "unknown";
  availabilityObservedAt: string;
}>;

export type StorefrontPublicCatalog = Readonly<{
  state: "ready" | "empty";
  contractVersion: string;
  currency: string;
  store: Readonly<{
    displayName: string;
    snapshotVersion: string;
    snapshotSha256: string;
  }>;
  seller: Readonly<{ displayName: string; legalName: string }>;
  items: readonly StorefrontPublicCatalogItem[];
}>;

const SHA256 = /^[0-9a-f]{64}$/;
const CURRENCY = /^[A-Z]{3}$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const AVAILABILITY = new Set([
  "available", "low", "unavailable", "unknown",
]);
const forbidden = new Set<string>(STOREFRONT_BROWSER_FORBIDDEN_KEYS);

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function boundedText(
  value: unknown,
  minimum: number,
  maximum: number,
  code: string,
): string {
  if (typeof value !== "string" ||
      value.trim().length < minimum ||
      value.length > maximum ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error(code);
  }
  return value;
}

function assertNoProviderAuthority(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoProviderAuthority(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) {
      throw new Error("STOREFRONT_PUBLIC_CATALOG_AUTHORITY_LEAK");
    }
    assertNoProviderAuthority(child);
  }
}

function observedAt(value: unknown): string {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_OBSERVED_AT_INVALID");
  }
  return value;
}

function item(value: unknown): StorefrontPublicCatalogItem {
  const raw = record(value, "STOREFRONT_PUBLIC_CATALOG_ITEM_INVALID");
  if (typeof raw.productVariantReference !== "string" ||
      !REFERENCE.test(raw.productVariantReference)) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_VARIANT_INVALID");
  }
  if (!Number.isSafeInteger(raw.priceMinor) ||
      Number(raw.priceMinor) < 0 ||
      Number(raw.priceMinor) > 100_000_000_000) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_PRICE_INVALID");
  }
  if (typeof raw.availability !== "string" ||
      !AVAILABILITY.has(raw.availability)) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_AVAILABILITY_INVALID");
  }
  return Object.freeze({
    productVariantReference: raw.productVariantReference,
    name: boundedText(raw.name, 1, 200,
      "STOREFRONT_PUBLIC_CATALOG_NAME_INVALID"),
    description: boundedText(raw.description, 0, 2_000,
      "STOREFRONT_PUBLIC_CATALOG_DESCRIPTION_INVALID"),
    priceMinor: raw.priceMinor as number,
    availability: raw.availability as StorefrontPublicCatalogItem["availability"],
    availabilityObservedAt: observedAt(raw.availabilityObservedAt),
  });
}

export function parseStorefrontPublicCatalog(
  value: unknown,
): StorefrontPublicCatalog {
  assertNoProviderAuthority(value);
  const raw = record(value, "STOREFRONT_PUBLIC_CATALOG_INVALID");
  if (raw.state !== "ready" && raw.state !== "empty") {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_STATE_INVALID");
  }
  const contractVersion = boundedText(raw.contractVersion, 1, 80,
    "STOREFRONT_PUBLIC_CATALOG_VERSION_INVALID");
  if (typeof raw.currency !== "string" || !CURRENCY.test(raw.currency)) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_CURRENCY_INVALID");
  }
  const store = record(raw.store, "STOREFRONT_PUBLIC_CATALOG_STORE_INVALID");
  const seller = record(raw.seller, "STOREFRONT_PUBLIC_CATALOG_SELLER_INVALID");
  if (typeof store.snapshotSha256 !== "string" ||
      !SHA256.test(store.snapshotSha256)) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_SNAPSHOT_INVALID");
  }
  if (!Array.isArray(raw.items) || raw.items.length > 100) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_ITEMS_INVALID");
  }
  const items = Object.freeze(raw.items.map(item));
  const references = new Set(items.map(
    (entry) => entry.productVariantReference,
  ));
  if (references.size !== items.length ||
      (raw.state === "ready") !== (items.length > 0)) {
    throw new Error("STOREFRONT_PUBLIC_CATALOG_STATE_ITEMS_MISMATCH");
  }
  return Object.freeze({
    state: raw.state,
    contractVersion,
    currency: raw.currency,
    store: Object.freeze({
      displayName: boundedText(store.displayName, 1, 200,
        "STOREFRONT_PUBLIC_CATALOG_STORE_NAME_INVALID"),
      snapshotVersion: boundedText(store.snapshotVersion, 1, 240,
        "STOREFRONT_PUBLIC_CATALOG_SNAPSHOT_VERSION_INVALID"),
      snapshotSha256: store.snapshotSha256,
    }),
    seller: Object.freeze({
      displayName: boundedText(seller.displayName, 1, 200,
        "STOREFRONT_PUBLIC_CATALOG_SELLER_NAME_INVALID"),
      legalName: boundedText(seller.legalName, 1, 240,
        "STOREFRONT_PUBLIC_CATALOG_SELLER_LEGAL_NAME_INVALID"),
    }),
    items,
  });
}
