import { NextRequest } from "next/server";
import { z } from "zod";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";
import {
  ClubsStripeSandboxServiceError,
  prepareAndCreateClubsStripeSandboxPayment,
} from "@/lib/member-commerce/clubs-stripe-sandbox-service";
import { clubsStripePaymentSetupPending } from "@/lib/member-commerce/clubs-stripe-trusted-stay-adapter-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const opaque = z.string().min(3).max(255).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]+$/);
const staySourceSchema = z.object({
  propertyId: z.enum([
    "property-clubs-forest-city-golf",
    "property-clubs-forest-city-marina",
  ]),
  quoteId: opaque,
  holdId: opaque,
  teamGoEvidenceId: opaque,
  payableBasis: z.enum(["TOTAL", "DEPOSIT_DUE"]),
}).strict();
const schema = z.object({
  paymentKind: z.enum(["MEMBERSHIP", "STAY"]),
  subjectReference: z.string().min(3).max(127).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]+$/),
  staySource: staySourceSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.paymentKind === "STAY" && !value.staySource) {
    context.addIssue({ code: "custom", message: "STAY requires canonical source identifiers." });
  }
  if (
    value.paymentKind === "STAY" &&
    value.staySource &&
    value.subjectReference !== value.staySource.holdId
  ) {
    context.addIssue({ code: "custom", message: "STAY subject must equal the canonical hold." });
  }
  if (value.paymentKind === "MEMBERSHIP" && value.staySource) {
    context.addIssue({ code: "custom", message: "Membership and STAY authority must remain separate." });
  }
});
const idempotencyKeySchema = z.string().min(16).max(200).regex(/^[A-Za-z0-9:_.-]+$/);
const noStore = clubsMemberNoStore;
const methodNotAllowedHeaders = {
  ...noStore,
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  allow: "POST",
};
const methodNotAllowedBody = Object.freeze({
  status: "method_not_allowed" as const,
  allowedMethods: ["POST"] as const,
});

export async function GET() {
  return Response.json(methodNotAllowedBody, {
    status: 405,
    headers: methodNotAllowedHeaders,
  });
}

export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

export async function POST(request: NextRequest) {
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member) return member.response;
  const security = validateClubsMemberMutationRequest(request);
  if (!security.allowed) {
    return Response.json({ status: "denied", reason: security.reason }, { status: 403, headers: noStore });
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    member.accountId,
  );
  if (!tenantSession) {
    return Response.json({ status: "tenant_session_required" }, { status: 401, headers: noStore });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!parsed.success || !idempotencyKeySchema.safeParse(idempotencyKey).success) {
    return Response.json({ status: "validation_error" }, { status: 400, headers: noStore });
  }
  try {
    const payment = await prepareAndCreateClubsStripeSandboxPayment({
      tenantId: tenantSession.organizationId,
      memberAccountId: member.accountId,
      paymentKind: parsed.data.paymentKind,
      subjectReference: parsed.data.subjectReference,
      idempotencyKey,
      staySource: parsed.data.staySource,
    });
    return Response.json({ status: "ready", payment }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ClubsStripeSandboxServiceError) {
      if (error.code === "PAYMENT_SETUP_PENDING") {
        const pending = error.setupPending ?? clubsStripePaymentSetupPending(
          parsed.data.paymentKind,
          parsed.data.paymentKind === "STAY"
            ? "TRUSTED_STAY_ADAPTER_RECEIPT_MISSING"
            : "MEMBERSHIP_CATALOG_BINDING_MISSING",
        );
        return Response.json(pending, {
          status: 503,
          headers: { ...noStore, "retry-after": "2" },
        });
      }
      const status = error.code === "PAYMENT_AUTHORITY_CONFLICT" ? 409
        : error.code === "PAYMENT_AUTHORITY_NOT_READY" ? 422 : 503;
      return Response.json({ status: error.code.toLowerCase() }, { status, headers: noStore });
    }
    return Response.json(
      { status: "unknown_outcome", reason: "Retry with the same idempotency key." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
