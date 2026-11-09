import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  executeBookingRequestCommand,
  readTeamBookingRequestQueue,
} from "@/db/clubs-booking-request-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";
import { parseShiftWorkItemFocus } from "@/lib/clubs/shift-work-item-focus";
import {
  CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT,
  clubsTeamBookingOperationsEnvelope,
  isStrongTeamBookingOperationsIdempotencyKey,
  projectSafeTeamBookingRequest,
} from "@/lib/clubs/team-booking-operations-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const identifier = z.string().min(3).max(180).regex(/^[A-Za-z0-9:_.-]+$/);
const schema = z.object({
  type: z.enum(["begin_review", "accept", "reject"]),
  requestId: identifier,
  expectedVersion: z.number().int().min(1),
  reason: z.string().trim().min(3).max(500),
});
const noStore = { "cache-control": "no-store" };
const roles = ["holiday-manager", "crays-management", "admin"];

function json(
  status: string,
  httpStatus: number,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = noStore,
) {
  return Response.json(clubsTeamBookingOperationsEnvelope(status, extra), {
    status: httpStatus,
    headers,
  });
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
  const authorized = await authorize(request);
  if (!authorized) {
    return json("authentication_or_tenant_session_required", 401);
  }
  const rawFocus = request.nextUrl.searchParams.get("focus");
  const focus = parseShiftWorkItemFocus(rawFocus);
  if (rawFocus && focus?.kind !== "request") {
    return json("invalid_shift_focus", 400);
  }
  try {
    const requests = await readTeamBookingRequestQueue({
          accountId: authorized.actor.accountId,
          tenantSessionId: authorized.tenantSession.sessionId,
          organizationId: authorized.tenantSession.organizationId,
          roleKey: authorized.tenantSession.roleKey,
          focus: focus ? { requestId: focus.recordId, version: focus.version } : null,
        });
    return json("ready", 200, {
      queue: "pending_requests",
      requests: requests.map(projectSafeTeamBookingRequest),
      reconciliation: {
        pendingRequests: CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.pendingRequests,
        acceptedLifecycle: CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.lifecycle,
      },
    });
  } catch {
    return json("temporarily_unavailable", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return json("forbidden", 403);
  }
  const authorized = await authorize(request);
  if (!authorized) {
    return json("authentication_or_tenant_session_required", 401);
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return json("json_required", 415);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!parsed.success || !isStrongTeamBookingOperationsIdempotencyKey(idempotencyKey)) {
    return json("validation_error", 400, {
      issues: parsed.success ? [] : parsed.error.issues,
    });
  }
  if (
    ["accept", "reject"].includes(parsed.data.type)
    && authorized.actor.assuranceLevel === "aal1"
  ) {
    return json("step_up_required", 403);
  }
  try {
    const correlationId = `clubs-booking-review-${randomUUID()}`;
    const receipt = await executeBookingRequestCommand({
      accountId: authorized.actor.accountId,
      actorType: authorized.tenantSession.roleKey as
        | "holiday-manager"
        | "crays-management"
        | "admin",
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      idempotencyKey,
      correlationId,
      command: parsed.data,
    });
    const status =
      receipt.outcome === "denied"
        ? 403
        : receipt.outcome === "conflict"
          ? 409
          : receipt.outcome === "invalid"
            ? 400
            : 200;
    return json(receipt.outcome, status, {
      receipt,
      correlationId,
      reconcileAt: CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.pendingRequests,
    });
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return json("conflict", 409);
    }
    return json(
      "unknown_outcome",
      503,
      {
        reason: "The Booking Request review outcome is unknown. Reconcile before retrying with the same command key.",
        reconcileAt: CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.pendingRequests,
        retryWithSameIdempotencyKeyOnly: true,
      },
      { ...noStore, "retry-after": "2" },
    );
  }
}
