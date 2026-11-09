import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  getClubsInventoryReadModel,
  publishAndProjectClubsAvailability,
} from "@/db/clubs-inventory-availability-repository";
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
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableStay = z.number().int().min(1).max(3650).nullable();
const ruleSchema = z.object({
  priority: z.number().int().min(-10_000).max(10_000),
  startsOn: isoDate,
  endsOn: isoDate,
  weekdaysBitmask: z.number().int().min(1).max(127),
  availabilityState: z.enum(["open", "closed"]),
  capacityOverride: z.number().int().min(0).max(10_000).nullable(),
  minimumStayNights: nullableStay,
  maximumStayNights: nullableStay,
  arrivalAllowed: z.boolean(),
  departureAllowed: z.boolean(),
});
const commandSchema = z.object({
  propertyId: identifier,
  unitId: identifier,
  expectedCalendarVersion: z.number().int().min(0),
  defaultCapacity: z.number().int().min(1).max(10_000),
  projectedFrom: isoDate,
  projectedUntil: isoDate,
  changeReason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().min(16).max(200).regex(/^[A-Za-z0-9:_.-]+$/),
  rules: z.array(ruleSchema).min(1).max(100),
});
const noStore = { "cache-control": "no-store" };
const roles = ["holiday-manager", "crays-management", "admin"];

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
    return Response.json(
      { status: "authentication_or_tenant_session_required" },
      { status: 401, headers: noStore },
    );
  }
  const url = new URL(request.url);
  const parsed = z.object({
    propertyId: identifier,
    unitId: identifier,
    from: isoDate,
    until: isoDate,
  }).safeParse({
    propertyId: url.searchParams.get("propertyId"),
    unitId: url.searchParams.get("unitId"),
    from: url.searchParams.get("from"),
    until: url.searchParams.get("until"),
  });
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  try {
    const readModel = await getClubsInventoryReadModel({
      accountId: authorized.actor.accountId,
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      ...parsed.data,
    });
    if (!readModel) {
      return Response.json(
        { status: "denied" },
        { status: 403, headers: noStore },
      );
    }
    return Response.json({ status: readModel.status, readModel }, { headers: noStore });
  } catch {
    return Response.json(
      {
        status: "temporarily_unavailable",
        reason: "Inventory is temporarily unavailable.",
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

export async function POST(request: NextRequest) {
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
  if (authorized.actor.assuranceLevel === "aal1") {
    return Response.json(
      { status: "step_up_required" },
      { status: 403, headers: noStore },
    );
  }
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { status: "validation_error", issues: parsed.error.issues },
      { status: 400, headers: noStore },
    );
  }
  try {
    const correlationId = `clubs-inventory-${randomUUID()}`;
    const receipt = await publishAndProjectClubsAvailability({
      accountId: authorized.actor.accountId,
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      correlationId,
      ...parsed.data,
    });
    const status =
      receipt.outcome === "denied"
        ? 403
        : receipt.outcome === "conflict"
          ? 409
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
        reason: "The Inventory outcome is unknown. Retry with the same command key.",
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
