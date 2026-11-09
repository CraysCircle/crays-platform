import type { NextRequest } from "next/server";

import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  executeClubsChannelAdmission,
  parseClubsChannelAdmissionRequest,
  type ClubsChannelAdmissionAuthority,
} from "@/lib/member-commerce/clubs-channel-admission-bff";
import { resolveExactCommerceRoleAssignmentId } from
  "@/lib/member-commerce/commerce-context-read-path";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function paymentEnvironment() {
  const value = process.env.CRAYS_CLUBS_PAYMENT_ENVIRONMENT ?? "none";
  if (value === "none" || value === "test" || value === "live") return value;
  throw new Error("CLUBS_CHANNEL_ADMISSION_PAYMENT_ENVIRONMENT_INVALID");
}

function safeError(error: unknown) {
  const errorCode = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code) : "";
  const code = error instanceof Error
    ? `${errorCode}:${error.message}` : errorCode;
  if (code === "CLUBS_CHANNEL_ADMISSION_AUTHENTICATION_REQUIRED") {
    return { status: 401, code: "CLUBS_SIGN_IN_REQUIRED" } as const;
  }
  if (code.includes("CROSS_PARTNER") ||
      code.includes("CART_MAPPING_SCOPE_MISMATCH") ||
      code.includes("CART_MAPPING_BINDING_REQUIRED")) {
    return { status: 409, code: "CLUBS_CART_SCOPE_CONFLICT" } as const;
  }
  if (code.includes("ROLE_DENIED") ||
      code.includes("CURRENCY_DENIED") ||
      code.includes("ZONE_DENIED") ||
      code.includes("TAX_CATEGORY_DENIED") ||
      code.includes("PRODUCT_TYPE_DENIED") ||
      code.includes("PAYMENT_EXPOSURE_DENIED")) {
    return { status: 403, code: "CLUBS_COMMERCE_ADMISSION_DENIED" } as const;
  }
  if (code.includes("NOT_FOUND")) {
    return { status: 404, code: "CLUBS_COMMERCE_SCOPE_NOT_FOUND" } as const;
  }
  if (code.includes("REQUEST_INVALID") ||
      code.includes("AUTHORITY_FIELD_DENIED")) {
    return { status: 400, code: "CLUBS_COMMERCE_REQUEST_INVALID" } as const;
  }
  return { status: 503, code: "CLUBS_COMMERCE_TEMPORARILY_UNAVAILABLE" } as const;
}

export async function handleClubsChannelAdmissionRequest(
  request: Request,
  dependencies: Readonly<{
    database: Parameters<typeof executeClubsChannelAdmission>[0];
    resolveAuthority(request: Request): Promise<ClubsChannelAdmissionAuthority>;
    paymentEnvironment: "none" | "test" | "live";
  }>,
) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new Error("CLUBS_CHANNEL_ADMISSION_REQUEST_INVALID");
    }
    const result = await executeClubsChannelAdmission(dependencies.database, {
      request: parseClubsChannelAdmissionRequest(body),
      authority: await dependencies.resolveAuthority(request),
      paymentEnvironment: dependencies.paymentEnvironment,
    });
    return Response.json(result, {
      status: 200,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const safe = safeError(error);
    return Response.json({ state: "denied", code: safe.code }, {
      status: safe.status,
      headers: { "cache-control": "private, no-store" },
    });
  }
}

export async function POST(request: NextRequest) {
  return handleClubsChannelAdmissionRequest(request, {
    database: getKdsRuntimeDatabase(),
    paymentEnvironment: paymentEnvironment(),
    resolveAuthority: async (candidate) => {
      const context = await resolveCraysRouteContext(candidate, {
        fallbackRole: "guest",
      });
      return {
        authoritySource: context.authoritySource,
        accountId: context.session.account?.id ?? null,
        tenantId: context.tenantId,
        role: context.role,
        roleAssignmentId: resolveExactCommerceRoleAssignmentId(
          context.session.roleAssignments,
          context.role,
          context.tenantId,
        ),
      };
    },
  });
}
