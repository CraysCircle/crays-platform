import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { issueClubsTeamLaunchCode } from "@/db/clubs-team-launch-exchange-repository";
import {
  hashClubsTeamBrowserVerifier,
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  propertyId: z.string().min(3).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  browserVerifier: z.string().min(43).max(128).regex(/^[A-Za-z0-9_-]+$/),
  returnPath: z.string().max(200).optional(),
  correlationId: z.string().min(8).max(160).regex(/^[A-Za-z0-9:_-]+$/).optional(),
});

const noStore = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json(
      { status: "forbidden", reason: "invalid_origin" },
      { status: 403, headers: noStore },
    );
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return Response.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }
  if (actor.assuranceLevel === "aal1") {
    return Response.json(
      { status: "step_up_required" },
      { status: 403, headers: noStore },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!tenantSession || tenantSession.roleKey !== "holiday-manager") {
    return Response.json(
      { status: "tenant_session_required" },
      { status: 403, headers: noStore },
    );
  }

  try {
    const result = await issueClubsTeamLaunchCode({
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      propertyId: parsed.data.propertyId,
      browserBindingHash: hashClubsTeamBrowserVerifier(
        parsed.data.browserVerifier,
      ),
      assuranceLevel: actor.assuranceLevel,
      returnPath: parsed.data.returnPath,
      correlationId:
        parsed.data.correlationId ?? `clubs-team-${randomUUID()}`,
    });
    const destination = new URL(result.destination);
    destination.hash = new URLSearchParams({
      verifier: parsed.data.browserVerifier,
    }).toString();
    return Response.json(
      {
        status: "issued",
        destination: destination.toString(),
        expiresAt: result.expiresAt,
      },
      { headers: noStore },
    );
  } catch {
    return Response.json(
      {
        status: "forbidden",
        reason: "Clubs Team launch could not be issued for the active authority context.",
      },
      { status: 403, headers: noStore },
    );
  }
}
