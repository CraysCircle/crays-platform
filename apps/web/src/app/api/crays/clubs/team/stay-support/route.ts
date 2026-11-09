import { NextRequest } from "next/server";
import { readTeamStaySupportQueue } from "@/db/clubs-team-stay-support-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { resolveClubsTeamActor } from "@/lib/clubs/team-launch-route-auth";
import {
  CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT,
  clubsTeamStaySupportEnvelope,
  projectSafeTeamStaySupportRecord,
} from "@/lib/clubs/team-stay-support-operations-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const roles = ["holiday-manager", "crays-management", "admin"];
const publicSupportReference = /^SUP-[A-F0-9]{12}$/;

function json(
  status: string,
  httpStatus: number,
  extra: Record<string, unknown> = {},
) {
  return Response.json(clubsTeamStaySupportEnvelope(status, extra), {
    status: httpStatus,
    headers: noStore,
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
  const reference = request.nextUrl.searchParams.get("reference")?.trim() ?? "";
  if (reference && !publicSupportReference.test(reference)) {
    return json("invalid_public_support_reference", 400);
  }
  try {
    const records = (
      await readTeamStaySupportQueue({
        accountId: authorized.actor.accountId,
        tenantSessionId: authorized.tenantSession.sessionId,
        organizationId: authorized.tenantSession.organizationId,
        roleKey: authorized.tenantSession.roleKey,
        publicSupportReference: reference || null,
      })
    ).map(projectSafeTeamStaySupportRecord);
    if (reference && records.length === 0) {
      return json("not_found", 404, {
        reconcileAt: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.endpoint,
      });
    }
    return json("ready", 200, {
      queue: reference ? undefined : "stay_support",
      records: reference ? undefined : records,
      record: reference ? records[0] : undefined,
      reconcileAt: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.endpoint,
      actionContract: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.actions,
    });
  } catch {
    return json("temporarily_unavailable", 503, {
      reconcileAt: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.endpoint,
    });
  }
}
