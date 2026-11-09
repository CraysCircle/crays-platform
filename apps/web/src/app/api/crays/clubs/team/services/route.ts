import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  executeClubsServiceCommand,
  readTeamServiceOfferings,
  readTeamServiceQueue,
} from "@/db/clubs-services-entitlements-repository";
import {
  executeTeamServiceRequestCommand,
  readTeamServiceRequestQueue,
  resolveTeamServiceRequestCommandTarget,
} from "@/db/clubs-team-service-request-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamHostRequest,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";
import {
  CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT,
  clubsTeamServiceRequestEnvelope,
  projectSafeTeamServiceRequest,
  teamServiceRequestReconcileUrl,
} from "@/lib/clubs/team-service-request-operations-contract";
import { parseShiftWorkItemFocus } from "@/lib/clubs/shift-work-item-focus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const identifier = z.string().min(3).max(180).regex(/^[A-Za-z0-9:_.-]+$/);
const version = z.number().int().min(1);
const reason = z.string().trim().min(3).max(500);
const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_offering"), propertyId: identifier,
    serviceCode: z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/),
    serviceType: z.enum(["add_on", "hospitality_service", "access_pass"]),
    displayName: z.string().trim().min(2).max(120),
    fulfillmentMode: z.enum(["scheduled", "on_request", "entitlement"]),
    chargeMode: z.enum(["included", "commerce"]),
    commerceProductReference: identifier.optional(),
    commerceVariantReference: identifier.optional(),
  }),
  z.object({
    type: z.literal("transition_offering"), offeringId: identifier,
    expectedVersion: version,
    lifecycle: z.enum(["published", "suspended", "archived"]), reason,
  }),
  z.object({ type: z.enum(["confirm_service", "fulfil_service"]), selectionId: identifier, expectedVersion: version, reason }),
  z.object({
    type: z.literal("issue_entitlement"), bookingId: identifier,
    selectionId: identifier.optional(), accountId: identifier.optional(),
    guestId: identifier.optional(), validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
  }),
  z.object({
    type: z.enum(["activate_entitlement", "suspend_entitlement", "revoke_entitlement", "consume_entitlement"]),
    entitlementId: identifier, expectedVersion: version, reason,
  }),
]);
const noStore = { "cache-control": "no-store" };
const roles = ["holiday-manager", "crays-management", "admin"];
const publicServiceReference = /^SVC-[A-F0-9]{12}$/;
const safeServiceActionSchema = z
  .object({
    type: z.enum(["confirm_service", "fulfil_service"]),
    publicServiceReference: z.string().regex(publicServiceReference),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
const strongIdempotencyKey = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type AuthorizedServiceRequestRead = {
  actor: NonNullable<Awaited<ReturnType<typeof resolveClubsTeamActor>>>;
  tenantSession: NonNullable<Awaited<ReturnType<typeof resolveTenantSession>>>;
};

function serviceRequestJson(
  status: string,
  httpStatus: number,
  extra: Record<string, unknown> = {},
) {
  return Response.json(clubsTeamServiceRequestEnvelope(status, extra), {
    status: httpStatus,
    headers: noStore,
  });
}

async function authorizeServiceRequestRead(
  request: NextRequest,
): Promise<
  { authorized: AuthorizedServiceRequestRead } | { response: Response }
> {
  if (!validClubsTeamHostRequest(request)) {
    return { response: serviceRequestJson("wrong_vertical_session", 403) };
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return {
      response: serviceRequestJson(
        "authentication_or_tenant_session_required",
        401,
      ),
    };
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!tenantSession) {
    return {
      response: serviceRequestJson(
        "authentication_or_tenant_session_required",
        401,
      ),
    };
  }
  if (!roles.includes(tenantSession.roleKey)) {
    return { response: serviceRequestJson("permission_denied", 403) };
  }
  if (actor.assuranceLevel === "aal1") {
    return { response: serviceRequestJson("step_up_required", 403) };
  }
  return { authorized: { actor, tenantSession } };
}

async function readServiceRequestProjection(request: NextRequest) {
  const authorization = await authorizeServiceRequestRead(request);
  if ("response" in authorization) return authorization.response;
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  if (reference && !publicServiceReference.test(reference)) {
    return serviceRequestJson("invalid_public_service_reference", 400);
  }
  try {
    const records = (
      await readTeamServiceRequestQueue({
        accountId: authorization.authorized.actor.accountId,
        tenantSessionId: authorization.authorized.tenantSession.sessionId,
        organizationId: authorization.authorized.tenantSession.organizationId,
        roleKey: authorization.authorized.tenantSession.roleKey,
        publicServiceReference: reference || null,
      })
    ).map(projectSafeTeamServiceRequest);
    if (reference && records.length === 0) {
      return serviceRequestJson("not_found", 404, {
        reconcileAt:
          CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.reconcileAt,
      });
    }
    return serviceRequestJson("ready", 200, {
      queue: reference ? undefined : "member_service_requests",
      records: reference ? undefined : records,
      record: reference ? records[0] : undefined,
      reconcileAt:
        CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.reconcileAt,
    });
  } catch {
    return serviceRequestJson("temporarily_unavailable", 503, {
      reconcileAt:
        CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.reconcileAt,
    });
  }
}

async function executeServiceRequestAction(request: NextRequest) {
  const authorization = await authorizeServiceRequestRead(request);
  if ("response" in authorization) return authorization.response;
  if (!validClubsTeamIssueOrigin(request)) {
    return serviceRequestJson("origin_denied", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return serviceRequestJson("json_required", 415);
  }
  const key = strongIdempotencyKey.safeParse(
    request.headers.get("idempotency-key"),
  );
  const command = safeServiceActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!key.success || !command.success) {
    return serviceRequestJson("validation_error", 400);
  }
  const reconcileAt = teamServiceRequestReconcileUrl(
    command.data.publicServiceReference,
  );
  let target: Awaited<ReturnType<typeof resolveTeamServiceRequestCommandTarget>>;
  try {
    target = await resolveTeamServiceRequestCommandTarget({
      accountId: authorization.authorized.actor.accountId,
      tenantSessionId: authorization.authorized.tenantSession.sessionId,
      organizationId: authorization.authorized.tenantSession.organizationId,
      roleKey: authorization.authorized.tenantSession.roleKey,
      publicServiceReference: command.data.publicServiceReference,
    });
  } catch {
    return serviceRequestJson("temporarily_unavailable", 503, {
      reconcileAt,
      reconcileWithGetBeforeRetry: true,
      retryWithSameIdempotencyKeyOnly: true,
    });
  }
  if (!target) {
    return serviceRequestJson("not_found", 404, { reconcileAt });
  }
  try {
    const persistedResponse = await executeTeamServiceRequestCommand({
      accountId: authorization.authorized.actor.accountId,
      roleKey: authorization.authorized.tenantSession.roleKey as
        | "holiday-manager"
        | "crays-management"
        | "admin",
      tenantSessionId: authorization.authorized.tenantSession.sessionId,
      organizationId: authorization.authorized.tenantSession.organizationId,
      propertyId: target.propertyId,
      selectionId: target.selectionId,
      action: command.data.type,
      expectedVersion: command.data.expectedVersion,
      idempotencyKey: key.data,
      correlationId: `clubs-safe-service-operation-${randomUUID()}`,
      publicServiceReference: command.data.publicServiceReference,
    });
    const httpStatus =
      persistedResponse.status === "denied"
        ? 403
        : persistedResponse.status === "version_or_state_conflict"
          ? 409
          : persistedResponse.status === "invalid"
            ? 400
            : 200;
    return Response.json(persistedResponse, {
      status: httpStatus,
      headers: noStore,
    });
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return serviceRequestJson("idempotency_payload_conflict", 409, {
        reconcileAt,
      });
    }
    return serviceRequestJson("unknown_outcome", 503, {
      reconcileAt,
      reconcileWithGetBeforeRetry: true,
      retryWithSameIdempotencyKeyOnly: true,
    });
  }
}

async function authorize(request: NextRequest) {
  const actor = await resolveClubsTeamActor(request);
  if (!actor) return null;
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!tenantSession || !roles.includes(tenantSession.roleKey)) return null;
  return { actor, tenantSession };
}

export async function GET(request: NextRequest) {
  if (
    request.nextUrl.searchParams.get(
      CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.query,
    ) === CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.value
  ) {
    return readServiceRequestProjection(request);
  }
  const authorized = await authorize(request);
  if (!authorized) {
    return Response.json(
      { status: "authentication_or_tenant_session_required" },
      { status: 401, headers: noStore },
    );
  }
  const rawFocus = request.nextUrl.searchParams.get("focus");
  const focus = parseShiftWorkItemFocus(rawFocus);
  if (rawFocus && (!focus || !["service", "entitlement"].includes(focus.kind))) {
    return Response.json({ status: "invalid_shift_focus" }, { status: 400, headers: noStore });
  }
  try {
    return Response.json(
      {
        status: "ready",
        offerings: await readTeamServiceOfferings({
          accountId: authorized.actor.accountId,
          tenantSessionId: authorized.tenantSession.sessionId,
          organizationId: authorized.tenantSession.organizationId,
          roleKey: authorized.tenantSession.roleKey,
        }),
        records: await readTeamServiceQueue({
          accountId: authorized.actor.accountId,
          tenantSessionId: authorized.tenantSession.sessionId,
          organizationId: authorized.tenantSession.organizationId,
          roleKey: authorized.tenantSession.roleKey,
          focus: focus ? { kind: focus.kind as "service" | "entitlement", recordId: focus.recordId, version: focus.version } : null,
        }),
      },
      { headers: noStore },
    );
  } catch {
    return Response.json({ status: "temporarily_unavailable" }, { status: 503, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (
    request.nextUrl.searchParams.get(
      CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.query,
    ) === CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.value
  ) {
    return executeServiceRequestAction(request);
  }
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const authorized = await authorize(request);
  if (!authorized) {
    return Response.json(
      { status: "authentication_or_tenant_session_required" },
      { status: 401, headers: noStore },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error", issues: parsed.error.issues },
      { status: 400, headers: noStore },
    );
  }
  if (authorized.actor.assuranceLevel === "aal1") {
    return Response.json({ status: "step_up_required" }, { status: 403, headers: noStore });
  }
  try {
    const correlationId = `clubs-service-operation-${randomUUID()}`;
    const receipt = await executeClubsServiceCommand({
      accountId: authorized.actor.accountId,
      actorType: authorized.tenantSession.roleKey as "holiday-manager" | "crays-management" | "admin",
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      idempotencyKey: request.headers.get("idempotency-key")?.trim() ?? "",
      correlationId, command: parsed.data,
    });
    const status = receipt.outcome === "denied" ? 403
      : receipt.outcome === "conflict" ? 409
        : receipt.outcome === "invalid" ? 400 : 200;
    return Response.json(
      { status: receipt.outcome, receipt, correlationId },
      { status, headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return Response.json({ status: "conflict" }, { status: 409, headers: noStore });
    }
    return Response.json(
      { status: "unknown_outcome", reason: "The Service-operation outcome is unknown. Retry with the same command key." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
