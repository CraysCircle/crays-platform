import "server-only";

import type { NextRequest } from "next/server";

import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { readClubsFinancePaymentOverview } from "@/lib/member-commerce/clubs-payment-module-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "content-type": "application/json",
};
const allowedRoles = new Set(["admin", "crays-management", "finance"]);

export async function GET(request: NextRequest) {
  const context = await resolveCraysRouteContext(request, {
    fallbackRole: "guest",
    surface: "privileged-operation",
  }).catch(() => null);
  const accountId = context?.session.account?.id ?? null;
  if (
    !context ||
    context.authoritySource !== "auth0-crays-session" ||
    context.session.status !== "crays_mapped" ||
    !accountId
  ) {
    return Response.json(
      {
        status: "authentication_required",
        state: "unavailable_until_authenticated",
        allowedNextActions: ["authenticate"],
        reconciliationInstruction: "authenticate_before_status_read",
        livemode: false,
        providerSuccessClaimed: false,
        productionAuthority: false,
      },
      { status: 401, headers: noStore },
    );
  }
  if (
    context.reviewPersona.requestedRole !== null ||
    context.session.activeRole !== context.role ||
    !allowedRoles.has(context.role)
  ) {
    return Response.json(
      {
        status: "permission_denied",
        state: "permission_required",
        allowedNextActions: ["none"],
        reconciliationInstruction: "support_review_required",
        livemode: false,
        providerSuccessClaimed: false,
        productionAuthority: false,
      },
      { status: 403, headers: noStore },
    );
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    accountId,
  ).catch(() => null);
  const authenticatedAt = context.strongAuth.authenticatedAt;
  const strongAuthAgeMs = authenticatedAt
    ? Date.now() - authenticatedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (
    !tenantSession ||
    tenantSession.organizationId !== context.tenantId ||
    tenantSession.roleKey !== context.role ||
    !context.strongAuth.allowed ||
    !authenticatedAt ||
    strongAuthAgeMs < -5_000 ||
    strongAuthAgeMs > 300_000
  ) {
    return Response.json(
      { status: "step_up_required", livemode: false },
      { status: 403, headers: noStore },
    );
  }

  try {
    const overview = await readClubsFinancePaymentOverview(context.tenantId);
    return Response.json(overview, { headers: noStore });
  } catch {
    return Response.json(
      {
        schema: "crays.clubs.payment-module.v1",
        version: "1.0.0",
        status: "temporarily_unavailable",
        scope: "CLUBS_ONLY",
        paymentSummaries: [],
        transferStates: [],
        refundStates: [],
        reconciliationStates: [],
        webhookReceipts: 0,
        allowedNextActions: ["refresh_status"],
        reconciliationInstruction: "support_review_required",
        livemode: false,
        providerSuccessClaimed: false,
        productionAuthority: false,
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
