import "server-only";

import type { NextRequest } from "next/server";

import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { paymentSetupPendingStatus } from "@/lib/member-commerce/clubs-payment-module-contract";
import { readClubsMemberPaymentStatus } from "@/lib/member-commerce/clubs-payment-module-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = {
  ...clubsMemberNoStore,
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "content-type": "application/json",
};

export async function GET(request: NextRequest) {
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member && member.response) {
    return Response.json(
      {
        schema: "crays.clubs.payment-module.v1",
        version: "1.0.0",
        status: "account_session_required",
        paymentKind: "MEMBERSHIP",
        state: "unavailable_until_authenticated",
        amount: null,
        recentActivity: [],
        allowedNextActions: ["authenticate"],
        reconciliationInstruction: "authenticate_before_status_read",
        livemode: false,
        providerCalled: false,
        providerSuccessClaimed: false,
        paymentSuccessClaimed: false,
        bookingConfirmed: false,
        membershipGranted: false,
      },
      { status: member.response.status, headers: noStore },
    );
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    member.accountId,
  ).catch(() => null);
  if (!tenantSession) {
    return Response.json(paymentSetupPendingStatus("MEMBERSHIP"), {
      status: 401,
      headers: noStore,
    });
  }

  try {
    const status = await readClubsMemberPaymentStatus({
      tenantId: tenantSession.organizationId,
      memberAccountId: member.accountId,
      paymentKind: "MEMBERSHIP",
    });
    return Response.json(status, {
      status: status.state === "payment_setup_pending" ? 503 : 200,
      headers: noStore,
    });
  } catch {
    return Response.json(paymentSetupPendingStatus("MEMBERSHIP"), {
      status: 503,
      headers: { ...noStore, "retry-after": "2" },
    });
  }
}
