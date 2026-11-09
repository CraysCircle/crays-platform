import type { NextRequest } from "next/server";

import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  executeAuthenticatedStorefrontCart,
  requireStorefrontCustomerCartAuthority,
  type StorefrontCartAuthority,
  type StorefrontCartResult,
} from "@/lib/member-commerce/storefront-cart-bff";
import {
  parseStorefrontBffRequest,
  STOREFRONT_BFF_CONTRACT_VERSION,
} from "@/lib/member-commerce/storefront-bff-contract";
import type { KdsDatabase } from "@/store-operations/kds";
import type { StorefrontBffSafeResponse } from
  "@/lib/member-commerce/storefront-bff-contract";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartExecutor = typeof executeAuthenticatedStorefrontCart;

function objectBody(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("STOREFRONT_REQUEST_INVALID");
  }
  return value as Readonly<Record<string, unknown>>;
}

function safeError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "STOREFRONT_AUTHENTICATION_REQUIRED") {
    return { status: 401, state: "denied", recovery: "none",
      publicCode: "STOREFRONT_SIGN_IN_REQUIRED" } as const;
  }
  if (code.includes("CUSTOMER_RELATIONSHIP")) {
    return { status: 403, state: "denied", recovery: "none",
      publicCode: "STOREFRONT_CUSTOMER_ACCESS_DENIED" } as const;
  }
  if (code === "STOREFRONT_CART_REBUILD_WARNING_REQUIRED") {
    return { status: 409, state: "rebuild_required",
      recovery: "acknowledge_seller_change_to_rebuild_cart",
      publicCode: "STOREFRONT_CART_REBUILD_REQUIRED" } as const;
  }
  if (code.includes("VERSION_OR_SCOPE_CONFLICT") ||
      code.includes("REPLAY_CONFLICT") ||
      code.includes("REPLAY_STATE_INVALID")) {
    return { status: 409, state: "conflict", recovery: "reload_cart",
      publicCode: "STOREFRONT_CART_CONFLICT" } as const;
  }
  if (code.includes("NOT_FOUND") || code.includes("NOT_SELLABLE")) {
    return { status: 404, state: "unknown", recovery: "select_store",
      publicCode: "STOREFRONT_RESOURCE_NOT_FOUND" } as const;
  }
  if (code.includes("CART_EMPTY") ||
      code.includes("LINE_NOT_FOUND") ||
      code.includes("COMPATIBILITY")) {
    return { status: 422, state: "denied", recovery: "reload_cart",
      publicCode: "STOREFRONT_CART_ACTION_DENIED" } as const;
  }
  if (code.includes("STORE_DISPLAY_INVALID") ||
      code.includes("VARIANT_CLASSIFICATION_INVALID") ||
      code.includes("READ_CORRUPT") ||
      code.includes("READ_AMBIGUOUS") ||
      code.includes("ROUTE_CONTEXT_AMBIGUOUS") ||
      code.includes("ROUTE_CONTEXT_SCOPE_MISMATCH") ||
      code.includes("AUTHORITY_CLOCK_INVALID")) {
    return { status: 503, state: "failed", recovery: "retry_after_backoff",
      publicCode: "STOREFRONT_TEMPORARILY_UNAVAILABLE" } as const;
  }
  if (code.includes("INVALID") || code.includes("DENIED") ||
      code.includes("REQUIRED") || code.includes("AMBIGUOUS")) {
    return { status: 400, state: "denied", recovery: "none",
      publicCode: "STOREFRONT_REQUEST_INVALID" } as const;
  }
  return { status: 503, state: "failed", recovery: "retry_after_backoff",
    publicCode: "STOREFRONT_TEMPORARILY_UNAVAILABLE" } as const;
}

function response(result: StorefrontCartResult) {
  const payload = {
    contractVersion: STOREFRONT_BFF_CONTRACT_VERSION,
    state: result.state,
    store: {
      slug: result.storeSlug,
      displayName: result.storeDisplayName,
    },
    ...(result.cartVersion === undefined
      ? {}
      : { cartVersion: result.cartVersion }),
    ...(result.receiptId === undefined ? {} : { receiptId: result.receiptId }),
    recovery: result.recovery ?? "none",
    data: {
      ...(result.cartId === undefined ? {} : { cartId: result.cartId }),
      lines: result.lines,
      ...(result.replayed === undefined ? {} : { replayed: result.replayed }),
      ...(result.commandState === undefined
        ? {}
        : { commandState: result.commandState }),
    },
  } satisfies StorefrontBffSafeResponse;
  return Response.json(payload, {
    status: 200,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function handleAuthenticatedStorefrontCartRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    resolveAuthority: (request: Request) => Promise<StorefrontCartAuthority>;
    executeCart?: CartExecutor;
  }>,
) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      throw new Error("STOREFRONT_REQUEST_INVALID");
    }
    const parsed = parseStorefrontBffRequest(objectBody(json));
    if (parsed.operation === "catalog.read") {
      throw new Error("STOREFRONT_CART_OPERATION_REQUIRED");
    }
    const authority = requireStorefrontCustomerCartAuthority(
      await dependencies.resolveAuthority(request),
    );
    const result = await (
      dependencies.executeCart ?? executeAuthenticatedStorefrontCart
    )(dependencies.database, { request: parsed, authority });
    return response(result);
  } catch (error) {
    const safe = safeError(error);
    const payload = {
      contractVersion: STOREFRONT_BFF_CONTRACT_VERSION,
      state: safe.state,
      store: { slug: "", displayName: "" },
      recovery: safe.recovery,
      data: { code: safe.publicCode },
    } satisfies StorefrontBffSafeResponse;
    return Response.json(payload, {
      status: safe.status,
      headers: { "cache-control": "private, no-store" },
    });
  }
}

export async function POST(request: NextRequest) {
  return handleAuthenticatedStorefrontCartRequest(request, {
    database: getKdsRuntimeDatabase(),
    resolveAuthority: async (candidate) => {
      const context = await resolveCraysRouteContext(candidate, {
        fallbackRole: "guest",
      });
      return {
        authoritySource: context.authoritySource,
        accountId: context.session.account?.id ?? null,
      };
    },
  });
}
