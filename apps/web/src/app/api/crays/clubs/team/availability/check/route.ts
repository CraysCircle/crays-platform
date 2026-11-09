import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import { checkClubsAvailability } from "@/db/clubs-availability-lock-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const identifier = z.string().min(3).max(180).regex(/^[A-Za-z0-9:_.-]+$/);
const schema = z.object({
  propertyId: identifier,
  unitId: identifier,
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedCapacity: z.number().int().min(1).max(10_000),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_.-]+$/),
});
const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return Response.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (
    !tenantSession
    || !["holiday-manager", "crays-management", "admin"].includes(tenantSession.roleKey)
  ) {
    return Response.json(
      { status: "tenant_session_required" },
      { status: 403, headers: noStore },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error", issues: parsed.error.issues },
      { status: 400, headers: noStore },
    );
  }
  try {
    const correlationId = `clubs-availability-${randomUUID()}`;
    const receipt = await checkClubsAvailability({
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      roleKey: tenantSession.roleKey,
      correlationId,
      ...parsed.data,
    });
    const status =
      receipt.outcome === "denied"
        ? 403
        : receipt.outcome === "invalid"
          ? 400
          : 200;
    return Response.json(
      { status: receipt.outcome, receipt, correlationId },
      { status, headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return Response.json({ status: "conflict" }, { status: 409, headers: noStore });
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "The availability-check outcome is unknown. Retry with the same command key.",
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
