import { NextRequest } from "next/server";

import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import {
  CLUBS_STRIPE_SANDBOX_READINESS_VERSION,
  readClubsStripeSandboxReadiness,
} from "@/lib/member-commerce/clubs-stripe-sandbox-readiness-v1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = {
  ...clubsMemberNoStore,
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
};

function failClosedReadiness(
  missingSetup: "ACCOUNT_SESSION_BINDING" | "READINESS_UNAVAILABLE",
  accountBound: boolean,
) {
  return Object.freeze({
    version: CLUBS_STRIPE_SANDBOX_READINESS_VERSION,
    state: "payment_setup_pending" as const,
    livemode: false as const,
    accountBound,
    readOnly: true as const,
    sourceOnlyReadiness: true as const,
    providerWriteAuthorized: false as const,
    providerCallPermittedByThisRead: false as const,
    providerCalled: false as const,
    providerSuccessClaimed: false as const,
    paymentSuccessClaimed: false as const,
    secretsExposed: false as const,
    piiExposed: false as const,
    missingSetup: Object.freeze([missingSetup]),
    requiredExternalGate: "EXPLICIT_PROVIDER_WRITE_GO" as const,
    checkedAt: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member) return member.response;
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    member.accountId,
  );
  if (!tenantSession) {
    return Response.json(
      failClosedReadiness("ACCOUNT_SESSION_BINDING", false),
      { status: 401, headers: noStore },
    );
  }

  try {
    const readiness = await readClubsStripeSandboxReadiness({
      tenantId: tenantSession.organizationId,
      memberAccountId: member.accountId,
    });
    return Response.json(readiness, { headers: noStore });
  } catch {
    return Response.json(
      failClosedReadiness("READINESS_UNAVAILABLE", true),
      { status: 503, headers: { ...noStore, "retry-after": "5" } },
    );
  }
}
