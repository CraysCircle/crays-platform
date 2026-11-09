import { NextRequest, NextResponse } from "next/server";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import {
  issueTenantSession,
  resolveUniqueActiveTenantRoleBinding,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { auth0 } from "@/lib/auth0";
import { block199AssuranceFromProviderClaims } from "@/lib/block199-runtime-auth";
import { createBlock199StepUpPath } from "@/lib/block199-step-up";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  const provider = await auth0.getSession(request).catch(() => null);
  const subject = typeof provider?.user?.sub === "string" ? provider.user.sub : "";
  if (!subject) {
    return NextResponse.json(
      { status: "authentication_required", next: "/auth/login?returnTo=%2Fauth%2Fclubs-tenant-session" },
      { status: 401, headers: noStore },
    );
  }

  const identity = await getIdentityBundleByProviderSubject("auth0", subject).catch(() => null);
  const accountId = identity?.account.account_id;
  if (typeof accountId !== "string") {
    return NextResponse.json(
      { status: "mapped_provider_session_required" },
      { status: 403, headers: noStore },
    );
  }

  const assurance = block199AssuranceFromProviderClaims(provider?.user as Record<string, unknown>);
  if (assurance.assuranceLevel === "aal1") {
    return NextResponse.json(
      {
        status: "step_up_required",
        next: createBlock199StepUpPath("/auth/clubs-tenant-session"),
      },
      { status: 403, headers: noStore },
    );
  }

  const binding = await resolveUniqueActiveTenantRoleBinding({
    accountId,
    roleKey: "holiday-manager",
  });
  if (!binding) {
    return NextResponse.json(
      { status: "unique_holiday_manager_binding_required" },
      { status: 403, headers: noStore },
    );
  }

  try {
    const session = await issueTenantSession(binding);
    const response = NextResponse.json(
      {
        status: "active",
        session: {
          sessionId: session.sessionId,
          roleKey: session.roleKey,
          expiresAt: session.expiresAt,
        },
      },
      { headers: noStore },
    );
    response.cookies.set(tenantSessionCookieName, session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch {
    return NextResponse.json(
      { status: "tenant_session_denied" },
      { status: 403, headers: noStore },
    );
  }
}
