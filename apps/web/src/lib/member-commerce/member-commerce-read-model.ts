import "server-only";

import type { MemberCommerceReadModelSource } from "./member-commerce-read-model-contract";
import { createVendureCommerceAdapter } from "./vendure-http-adapter";

export async function loadMemberCommerceReadModelSource(): Promise<MemberCommerceReadModelSource> {
  if (process.env.CRAYS_MEMBER_PROVIDER_READ_MODELS_ENABLED !== "true") {
    return {
      mode: "versioned-fixture-fallback",
      provider: "vendure",
      release: "3.6.3",
      productsObserved: 0,
      ordersObserved: 0,
      reasonCode: "PROVIDER_READ_MODELS_NOT_ACTIVATED",
      checkedAt: new Date().toISOString(),
    };
  }
  const adapter = createVendureCommerceAdapter();
  try {
    const [products, orders] = await Promise.all([
      adapter.listProducts(24),
      adapter.listOrders(20),
    ]);
    if (!products.length && !process.env.CRAYS_COMMERCE_PROVIDER_BASE_URL) {
      return {
        mode: "versioned-fixture-fallback",
        provider: "vendure",
        release: "3.6.3",
        productsObserved: 0,
        ordersObserved: 0,
        reasonCode: "PROVIDER_NOT_CONFIGURED",
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      mode: "vendure-projection",
      provider: "vendure",
      release: "3.6.3",
      productsObserved: products.length,
      ordersObserved: orders.length,
      reasonCode: "COMMERCE_READ_MODEL_READY",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      mode: "versioned-fixture-fallback",
      provider: "vendure",
      release: "3.6.3",
      productsObserved: 0,
      ordersObserved: 0,
      reasonCode: "COMMERCE_READ_MODEL_FALLBACK",
      checkedAt: new Date().toISOString(),
    };
  }
}
