import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { provisionProviderAccount } from "@/lib/provider-account-provisioning";
import { isSelfServiceProvisioningRole } from "@/lib/provider-account-provisioning";
import { completeAuthenticatedProviderBaseline } from "@/lib/personal-agent-baseline-host";
import { roleByKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderUser = {
  sub?: string;
  name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
};

export async function POST(request: NextRequest) {
  const providerSession = await auth0.getSession(request);
  const providerUser = providerSession?.user as ProviderUser | undefined;

  if (!providerUser?.sub) {
    return NextResponse.redirect(new URL("/auth/provider-account?error=session-required", request.url));
  }

  const form = await request.formData();
  const requestedRole = roleByKey(String(form.get("requestedRole") ?? "franchise-candidate")).key;

  if (!isSelfServiceProvisioningRole(requestedRole)) {
    return NextResponse.redirect(new URL("/auth/provider-account?error=role-review-required", request.url));
  }

  await provisionProviderAccount({
    providerKey: "auth0",
    providerSubject: providerUser.sub,
    displayName: providerUser.name ?? providerUser.nickname,
    contactAddress: providerUser.email,
    contactVerified: Boolean(providerUser.email_verified),
    requestedRole,
    source: "franchise",
  });

  // Same original Request/verified subject; no form-supplied account, person or deployment fields.
  const baseline = await completeAuthenticatedProviderBaseline(request, providerUser.sub);
  const target = new URL(`/auth/provider-account?role=${requestedRole}&provisioned=1`, request.url);
  target.searchParams.set("personalAgentBaseline", baseline.status);
  return NextResponse.redirect(target);
}
