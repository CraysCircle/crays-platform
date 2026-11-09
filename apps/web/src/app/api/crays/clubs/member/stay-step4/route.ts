import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsStayStep4RepositoryError,
  readClubsStayStep4PaymentAuthorityStatus,
  resolveCanonicalClubsStayOffer,
} from "@/db/clubs-stay-step4-repository";
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
  CLUBS_STAY_STEP4_CONTRACT,
  CLUBS_STAY_STEP4_PROPERTIES,
  CLUBS_STAY_STEP4_SCHEMA,
  ClubsStayStep4ContractError,
  assertClubsStayStep4BrowserPayload,
  sanitizeClubsStayStep4ReturnTo,
  validateClubsStayStep4IdempotencyKey,
} from "@/lib/member-commerce/clubs-stay-step4-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = clubsMemberNoStore;
const propertyId = z.enum([
  CLUBS_STAY_STEP4_PROPERTIES.golf,
  CLUBS_STAY_STEP4_PROPERTIES.marina,
]);
const identifier = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const offerQuery = z
  .object({
    propertyId,
    stayUnit: z.enum(["night", "week", "month"]),
    arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guestCount: z.coerce.number().int().min(1).max(100),
    requestedCapacity: z.coerce.number().int().min(1).max(100),
    returnTo: z.string().min(1).max(2_048),
  })
  .strict();
const prepareCommand = z
  .object({
    type: z.literal("prepare_payment_authority"),
    propertyId,
    quoteId: identifier,
    holdId: identifier,
    teamGoEvidenceId: identifier,
    payableBasis: z.enum(["TOTAL", "DEPOSIT_DUE"]),
    returnTo: z.string().min(1).max(2_048),
  })
  .strict();

function envelope(status: string, extra: Record<string, unknown> = {}) {
  return {
    schema: CLUBS_STAY_STEP4_SCHEMA,
    version: CLUBS_STAY_STEP4_CONTRACT.version,
    status,
    paymentAuthority: false,
    providerCalled: false,
    providerSuccessClaimed: false,
    productionAuthority: false,
    ...extra,
  };
}

type Step4RouteContext =
  | {
      ok: true;
      accountId: string;
      tenantId: string;
    }
  | {
      ok: false;
      response: Response;
    };

async function resolveContext(request: NextRequest): Promise<Step4RouteContext> {
  const member = await resolveClubsMemberApiAccount(request);
  if ("response" in member && member.response) {
    return { ok: false, response: member.response };
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    member.accountId,
  );
  if (!tenantSession) {
    return {
      ok: false,
      response: Response.json(envelope("tenant_session_required"), {
        status: 401,
        headers: noStore,
      }),
    };
  }
  return {
    ok: true,
    accountId: member.accountId,
    tenantId: tenantSession.organizationId,
  };
}

function repositoryError(error: ClubsStayStep4RepositoryError) {
  if (error.code === "CCLUB_STAY_STEP4_PROPERTY_ACCESS_REQUIRED") {
    return Response.json(envelope("property_access_required"), {
      status: 403,
      headers: noStore,
    });
  }
  if (error.code === "CCLUB_STAY_STEP4_OFFER_AMBIGUOUS") {
    return Response.json(envelope("offer_ambiguous"), {
      status: 409,
      headers: noStore,
    });
  }
  if (error.code === "CCLUB_STAY_STEP4_OFFER_NOT_READY") {
    return Response.json(envelope("offer_not_ready"), {
      status: 503,
      headers: noStore,
    });
  }
  if (error.code === "CCLUB_STAY_STEP4_ACCEPTANCE_MISMATCH") {
    return Response.json(envelope("conflict"), {
      status: 409,
      headers: noStore,
    });
  }
  return Response.json(envelope("canonical_source_not_ready"), {
    status: 422,
    headers: noStore,
  });
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if (!context.ok) return context.response;
  const values = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = offerQuery.safeParse(values);
  if (!parsed.success) {
    return Response.json(envelope("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  try {
    const returnTo = sanitizeClubsStayStep4ReturnTo(
      parsed.data.propertyId,
      parsed.data.returnTo,
    );
    const offer = await resolveCanonicalClubsStayOffer({
      tenantId: context.tenantId,
      accountId: context.accountId,
      propertyId: parsed.data.propertyId,
      stayUnit: parsed.data.stayUnit,
      arrivalDate: parsed.data.arrivalDate,
      departureDate: parsed.data.departureDate,
      guestCount: parsed.data.guestCount,
      requestedCapacity: parsed.data.requestedCapacity,
    });
    return Response.json({ ...offer, returnTo }, { headers: noStore });
  } catch (error) {
    if (error instanceof ClubsStayStep4RepositoryError) {
      return repositoryError(error);
    }
    if (error instanceof ClubsStayStep4ContractError) {
      return Response.json(envelope("validation_error"), {
        status: 400,
        headers: noStore,
      });
    }
    return Response.json(envelope("temporarily_unavailable"), {
      status: 503,
      headers: { ...noStore, "retry-after": "2" },
    });
  }
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if (!context.ok) return context.response;
  const security = validateClubsMemberMutationRequest(request);
  if (!security.allowed) {
    return Response.json(
      envelope("denied", { reason: security.reason }),
      { status: 403, headers: noStore },
    );
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(envelope("json_required"), {
      status: 415,
      headers: noStore,
    });
  }
  const raw = await request.json().catch(() => null);
  try {
    assertClubsStayStep4BrowserPayload(raw);
  } catch {
    return Response.json(envelope("browser_authority_field_forbidden"), {
      status: 400,
      headers: noStore,
    });
  }
  const parsed = prepareCommand.safeParse(raw);
  if (!parsed.success) {
    return Response.json(envelope("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  try {
    validateClubsStayStep4IdempotencyKey(idempotencyKey);
    const returnTo = sanitizeClubsStayStep4ReturnTo(
      parsed.data.propertyId,
      parsed.data.returnTo,
    );
    const result = await readClubsStayStep4PaymentAuthorityStatus({
      tenantId: context.tenantId,
      accountId: context.accountId,
      propertyId: parsed.data.propertyId,
      quoteId: parsed.data.quoteId,
      holdId: parsed.data.holdId,
      teamGoEvidenceId: parsed.data.teamGoEvidenceId,
      payableBasis: parsed.data.payableBasis,
      idempotencyKey,
      returnTo,
    });
    return Response.json(result, {
      status: 503,
      headers: { ...noStore, "retry-after": "2" },
    });
  } catch (error) {
    if (error instanceof ClubsStayStep4RepositoryError) {
      return repositoryError(error);
    }
    if (error instanceof ClubsStayStep4ContractError) {
      return Response.json(envelope("validation_error"), {
        status: 400,
        headers: noStore,
      });
    }
    return Response.json(
      envelope("unknown_outcome", {
        retryWithSameIdempotencyKeyOnly: true,
      }),
      {
        status: 503,
        headers: { ...noStore, "retry-after": "2" },
      },
    );
  }
}
