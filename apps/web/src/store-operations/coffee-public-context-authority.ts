import "server-only";

import type { KdsDatabase } from "./kds";

export type CoffeePublicStoreDirectoryEntry = Readonly<{
  id: string;
  slug: string;
}>;

export type CoffeePublicCommerceContext = Readonly<{
  status: "ready";
  store: Readonly<{
    id: string;
    slug: string;
    sellerLegalName: string;
  }>;
  channelToken: string;
  encodedContext: string;
  signature: string;
  expiresAt: string;
  commerceAdmission: Readonly<{
    decision: "ADMIT";
    purpose: "public-catalog";
  }>;
  offer: unknown;
}>;

export async function getCoffeePublicStoreDirectory(
  _database: KdsDatabase,
  _now: Date,
): Promise<Readonly<{ stores: readonly CoffeePublicStoreDirectoryEntry[] }>> {
  // The preserved source does not contain an admitted public Coffee authority.
  // An empty directory prevents a caller from selecting or issuing any Store.
  return Object.freeze({ stores: Object.freeze([]) });
}

export async function issueCoffeePublicCommerceContext(
  _database: KdsDatabase,
  _input: Readonly<{
    storeSlug: string;
    purpose: "public-catalog";
    actorReference: string;
    requestId: string;
    channelTokenForBinding: (bindingId: string) => string;
    signingSecret: string;
    now: Date;
  }>,
): Promise<CoffeePublicCommerceContext> {
  throw new Error("COFFEE_PUBLIC_CONTEXT_AUTHORITY_UNAVAILABLE");
}
