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
  ClubsStripeSandboxServiceError,
  readClubsStripeSandboxPayment,
} from "@/lib/member-commerce/clubs-stripe-sandbox-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = clubsMemberNoStore;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member) return member.response;
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    member.accountId,
  );
  if (!tenantSession) {
    return Response.json({ status: "tenant_session_required" }, { status: 401, headers: noStore });
  }
  const { paymentId } = await context.params;
  if (!/^cclubpay_[a-f0-9]{40}$/.test(paymentId)) {
    return Response.json({ status: "not_found" }, { status: 404, headers: noStore });
  }
  try {
    const payment = await readClubsStripeSandboxPayment({
      tenantId: tenantSession.organizationId,
      memberAccountId: member.accountId,
      paymentId,
    });
    return Response.json({
      status: "ready",
      payment: {
        payment_id: payment.payment_id,
        payment_kind: payment.payment_kind,
        subject_reference: payment.subject_reference,
        amount_minor: payment.amount_minor,
        currency: payment.currency,
        payment_state: payment.payment_state,
        stripe_payment_intent_id: null,
        allocation_plan_sha256: payment.allocation_plan_sha256,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      },
    }, { headers: noStore });
  } catch (error) {
    if (error instanceof ClubsStripeSandboxServiceError && error.code === "PAYMENT_NOT_FOUND") {
      return Response.json({ status: "not_found" }, { status: 404, headers: noStore });
    }
    return Response.json({ status: "temporarily_unavailable" }, { status: 503, headers: noStore });
  }
}
