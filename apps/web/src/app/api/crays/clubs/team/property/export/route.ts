import { NextRequest } from "next/server";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  ClubsPropertyExportReplayConflictError,
  exportAuthorizedClubsPropertyCsv,
} from "@/db/clubs-property-bulk-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403 });
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) return Response.json({ status: "authentication_required" }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    idempotencyKey.length < 16
    || idempotencyKey.length > 200
    || !/^[A-Za-z0-9:_-]+$/.test(idempotencyKey)
  ) {
    return Response.json(
      { status: "validation_error", reason: "A valid idempotency key is required." },
      { status: 400, headers: { "cache-control": "no-store" } },
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
    return Response.json({ status: "tenant_session_required" }, { status: 403 });
  }
  try {
    const exported = await exportAuthorizedClubsPropertyCsv({
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      roleKey: tenantSession.roleKey,
      idempotencyKey,
    });
    return new Response(exported.csv, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": 'attachment; filename="crays-clubs-property-export.csv"',
        "content-type": "text/csv; charset=utf-8",
        "x-crays-batch-id": exported.batchId,
        "x-crays-content-sha256": exported.contentSha256,
        "x-crays-row-count": String(exported.rowCount),
        "x-crays-command-outcome": exported.outcome,
      },
    });
  } catch (error) {
    if (error instanceof ClubsPropertyExportReplayConflictError) {
      return Response.json(
        {
          status: "conflict",
          reason: "The export command is bound to another authority scope or data snapshot. Reload before starting a new export.",
        },
        { status: 409, headers: { "cache-control": "no-store" } },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "The export outcome is unknown. Retry with the same command key.",
      },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "2" } },
    );
  }
}
