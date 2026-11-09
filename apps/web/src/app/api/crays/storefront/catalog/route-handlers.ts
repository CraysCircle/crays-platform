import type { NextRequest } from "next/server";

import { readSharedCatalog } from
  "@/lib/member-commerce/shared-catalog-read-model";
import type { CommerceVerticalRoot } from
  "@/lib/member-commerce/server-commerce-context-resolver";
import type { KdsDatabase } from "@/store-operations/kds";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verticals = new Set<CommerceVerticalRoot>([
  "coffee", "retail", "gym", "clubs",
]);

function body(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CATALOG_QUERY_INVALID");
  }
  return value as Record<string, unknown>;
}

function cursorSecret(): string {
  return process.env.CRAYS_STOREFRONT_CURSOR_SECRET?.trim() ?? "";
}

function safeError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("AUTHORITY_DENIED") || code.includes("QUERY_INVALID") ||
    code.includes("UNKNOWN_FIELD") || code.includes("CURSOR_INVALID") ||
    code.includes("CURSOR_SCOPE_MISMATCH")) {
    return { status: 400, publicCode: "CATALOG_REQUEST_INVALID" };
  }
  if (code === "CATALOG_ROUTE_NOT_FOUND" ||
    code === "STOREFRONT_ROUTE_CONTEXT_NOT_FOUND") {
    return { status: 404, publicCode: "CATALOG_STORE_NOT_FOUND" };
  }
  return { status: 503, publicCode: "CATALOG_TEMPORARILY_UNAVAILABLE" };
}

type CatalogReader = typeof readSharedCatalog;

export async function handleStorefrontCatalogRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    cursorSecret: string;
    readCatalog?: CatalogReader;
  }>,
) {
  try {
    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      throw new Error("CATALOG_QUERY_INVALID");
    }
    const raw = body(parsed);
    const verticalRoot = raw.verticalRoot;
    if (typeof verticalRoot !== "string" ||
      !verticals.has(verticalRoot as CommerceVerticalRoot)) {
      throw new Error("CATALOG_QUERY_INVALID");
    }
    const { verticalRoot: _verticalRoot, ...browserQuery } = raw;
    const page = await (dependencies.readCatalog ?? readSharedCatalog)(
      dependencies.database,
      {
        verticalRoot: verticalRoot as CommerceVerticalRoot,
        browserQuery,
        cursorSecret: dependencies.cursorSecret,
      },
    );
    return Response.json({ state: page.items.length ? "ready" : "empty", ...page }, {
      status: 200,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const safe = safeError(error);
    return Response.json({
      state: "unavailable",
      code: safe.publicCode,
      recovery: safe.status === 400 ? "correct_query" :
        safe.status === 404 ? "select_store" : "retry_after_backoff",
    }, {
      status: safe.status,
      headers: { "cache-control": "private, no-store" },
    });
  }
}


export async function POST(request: NextRequest) {
  return handleStorefrontCatalogRequest(request, {
    database: getKdsRuntimeDatabase(),
    cursorSecret: cursorSecret(),
  });
}
