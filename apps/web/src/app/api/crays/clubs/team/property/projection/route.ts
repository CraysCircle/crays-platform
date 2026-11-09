import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  ClubsPublicProjectionReplayConflictError,
  ClubsPublicProjectionScopeError,
  generateClubsPublicProjection,
} from "@/db/clubs-public-projection-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  propertyId: z.string().min(3).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_-]+$/),
});
const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return Response.json({ status: "authentication_required" }, { status: 401, headers: noStore });
  }
  if (actor.assuranceLevel === "aal1") {
    return Response.json({ status: "step_up_required" }, { status: 403, headers: noStore });
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (
    !tenantSession
    || !["holiday-manager", "crays-management", "admin"].includes(tenantSession.roleKey)
  ) {
    return Response.json({ status: "tenant_session_required" }, { status: 403, headers: noStore });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ status: "validation_error" }, { status: 400, headers: noStore });
  }
  try {
    const receipt = await generateClubsPublicProjection({
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      roleKey: tenantSession.roleKey,
      propertyId: parsed.data.propertyId,
      correlationId: parsed.data.idempotencyKey,
    });
    return Response.json(
      { status: receipt.status, receipt, correlationId: `clubs-projection-${randomUUID()}` },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof ClubsPublicProjectionReplayConflictError) {
      return Response.json(
        { status: "conflict", reason: "The command key belongs to a different projection request." },
        { status: 409, headers: noStore },
      );
    }
    if (error instanceof ClubsPublicProjectionScopeError) {
      return Response.json({ status: "denied" }, { status: 403, headers: noStore });
    }
    return Response.json(
      { status: "unknown_outcome", reason: "The public-projection outcome is unknown. Retry with the same command key." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
