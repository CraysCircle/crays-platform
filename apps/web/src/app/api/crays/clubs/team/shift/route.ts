import { NextRequest } from "next/server";
import { readHolidayManagerShiftQueue } from "@/db/clubs-holiday-manager-shift-repository";
import { resolveTenantSession, tenantSessionCookieName } from "@/db/identity-tenant-lifecycle-repository";
import { resolveClubsTeamActor } from "@/lib/clubs/team-launch-route-auth";
import { decodeHolidayManagerShiftCursor, normalizeHolidayManagerShiftPageSize } from "@/lib/clubs/holiday-manager-shift-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  const actor = await resolveClubsTeamActor(request);
  if (!actor) return Response.json({ status: "authentication_required" }, { status: 401, headers: noStore });
  const session = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!session || session.roleKey !== "holiday-manager") {
    return Response.json({ status: "holiday_manager_tenant_session_required" }, { status: 403, headers: noStore });
  }
  const cursor = request.nextUrl.searchParams.get("cursor");
  if (cursor && !decodeHolidayManagerShiftCursor(cursor)) {
    return Response.json({ status: "invalid_shift_cursor" }, { status: 400, headers: noStore });
  }
  try {
    const queue = await readHolidayManagerShiftQueue({
      accountId: actor.accountId,
      tenantSessionId: session.sessionId,
      organizationId: session.organizationId,
      cursor,
      pageSize: normalizeHolidayManagerShiftPageSize(request.nextUrl.searchParams.get("limit")),
    });
    if (queue.authorityState === "denied") {
      return Response.json({ status: "shift_scope_denied" }, { status: 403, headers: noStore });
    }
    return Response.json({ status: "ready", ...queue }, { headers: noStore });
  } catch (error) {
    if (error instanceof Error && error.message === "holiday_manager_shift_snapshot_expired_or_invalid") {
      return Response.json({ status: "shift_snapshot_expired", recovery: "reload_first_page" }, { status: 410, headers: noStore });
    }
    if (error instanceof Error && error.message === "holiday_manager_shift_cursor_page_size_mismatch") {
      return Response.json({ status: "invalid_shift_cursor" }, { status: 400, headers: noStore });
    }
    return Response.json({ status: "temporarily_unavailable" }, { status: 503, headers: noStore });
  }
}
