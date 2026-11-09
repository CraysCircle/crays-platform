import "server-only";

import type { NextRequest } from "next/server";

import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { auth0 } from "@/lib/auth0";
import { block199AssuranceFromProviderClaims } from "@/lib/block199-runtime-auth";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { resolveExactCommerceRoleAssignmentId } from "@/lib/member-commerce/commerce-context-read-path";
import { readClubsAmbassadorSettlementStatus } from "@/lib/member-commerce/clubs-payment-module-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "content-type": "application/json",
};

function setupPending(statusCode: 401 | 403 | 503) {
  const authenticationRequired = statusCode === 401;
  return Response.json(
    {
      schema: "crays.clubs.payment-module.v1",
      version: "1.0.0",
      status: authenticationRequired ? "authentication_required" : "ready",
      state: authenticationRequired
        ? "unavailable_until_authenticated"
        : "setup_pending",
      readinessState: null,
      totals: [],
      activity: [],
      allowedNextActions: authenticationRequired
        ? ["authenticate"]
        : ["complete_payment_setup", "refresh_status"],
      reconciliationInstruction: authenticationRequired
        ? "authenticate_before_status_read"
        : "setup_required_before_payment",
      ownAttributableActivityOnly: true,
      foreignAmbassadorAccess: false,
      providerCalled: false,
      providerSuccessClaimed: false,
      livemode: false,
    },
    { status: statusCode, headers: noStore },
  );
}

export async function GET(request: NextRequest) {
  const [providerSession, context] = await Promise.all([
    auth0.getSession(request).catch(() => null),
    resolveCraysRouteContext(request, { fallbackRole: "guest" }).catch(() => null),
  ]);
  const providerClaims = providerSession?.user;
  const subject = typeof providerClaims?.sub === "string" ? providerClaims.sub : "";
  if (!subject || !context || !providerClaims) {
    return setupPending(401);
  }

  const identity = await getIdentityBundleByProviderSubject("auth0", subject).catch(
    () => null,
  );
  const accountId =
    typeof identity?.account.account_id === "string"
      ? identity.account.account_id
      : null;
  const assurance = block199AssuranceFromProviderClaims(
    providerClaims as Record<string, unknown>,
  );
  const roleAssignmentId = resolveExactCommerceRoleAssignmentId(
    context.session.roleAssignments,
    context.role,
    context.tenantId,
  );
  if (
    !accountId ||
    context.authoritySource !== "auth0-crays-session" ||
    context.session.account?.id !== accountId ||
    !roleAssignmentId ||
    (assurance.assuranceLevel !== "aal2" && assurance.assuranceLevel !== "aal3")
  ) {
    return setupPending(403);
  }

  try {
    const status = await readClubsAmbassadorSettlementStatus({
      tenantId: context.tenantId,
      canonicalAccountId: accountId,
      roleAssignmentId,
    });
    return Response.json(status, {
      status: status.state === "setup_pending" ? 503 : 200,
      headers: noStore,
    });
  } catch {
    return setupPending(503);
  }
}
