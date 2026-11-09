import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueTenantSession, revokeTenantSession, tenantSessionCookieName } from "@/db/identity-tenant-lifecycle-repository";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { auth0 } from "@/lib/auth0";
import { block199AssuranceFromProviderClaims, block199RoleRequiresStrongAuthentication } from "@/lib/block199-runtime-auth";
import { createBlock199StepUpPath } from "@/lib/block199-step-up";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  organizationId: z.string().min(3).max(160),
  roleKey: z.enum(["crays-management", "admin", "deal-manager", "expansion-manager", "finance", "hr", "franchise-candidate", "franchise-partner", "studio-manager", "bank-partner", "investor", "landlord", "vendor", "reviewer", "gym-member", "guest"]),
});

async function mappedAccount(request: NextRequest) {
  const provider = await auth0.getSession(request).catch(() => null);
  if (!provider?.user?.sub) return null;
  const bundle = await getIdentityBundleByProviderSubject("auth0", provider.user.sub);
  return typeof bundle?.account.account_id === "string"
    ? { accountId: bundle.account.account_id, providerUser: provider.user as Record<string, unknown> }
    : null;
}

export async function POST(request: NextRequest) {
  const mapped = await mappedAccount(request);
  if (!mapped) return NextResponse.json({ status: "mapped_provider_session_required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ status: "validation_error" }, { status: 400 });
  const assurance = block199AssuranceFromProviderClaims(mapped.providerUser);
  if (block199RoleRequiresStrongAuthentication(parsed.data.roleKey) && assurance.assuranceLevel === "aal1") {
    return NextResponse.json({ status: "step_up_required", next: createBlock199StepUpPath("/auth/provider-account") }, { status: 403 });
  }
  try {
    const result = await issueTenantSession({ accountId: mapped.accountId, organizationId: parsed.data.organizationId, roleKey: parsed.data.roleKey });
    const response = NextResponse.json({ status: "active", session: { sessionId: result.sessionId, organizationId: result.organizationId, roleKey: result.roleKey, expiresAt: result.expiresAt } });
    response.cookies.set(tenantSessionCookieName, result.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(result.expiresAt) });
    return response;
  } catch (error) {
    return NextResponse.json({ status: "forbidden", error: error instanceof Error ? error.message : "Tenant session could not be issued." }, { status: 403 });
  }
}

export async function DELETE(request: NextRequest) {
  const mapped = await mappedAccount(request);
  const sessionToken = request.cookies.get(tenantSessionCookieName)?.value;
  if (sessionToken) await revokeTenantSession(sessionToken, mapped?.accountId ?? null);
  const response = NextResponse.json({ status: "revoked" });
  response.cookies.set(tenantSessionCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(0) });
  return response;
}
