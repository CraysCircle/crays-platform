import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  executeLegacyCapacityAdmission,
  hasLegacyCapacityReconciliationAuthority,
  readLegacyCapacityAdmissionCandidates,
  readLegacyCapacityRecoveryQueue,
} from "@/db/clubs-legacy-capacity-reconciliation-repository";
import { resolveTenantSession, tenantSessionCookieName } from "@/db/identity-tenant-lifecycle-repository";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import { resolveClubsTeamActor, validClubsTeamIssueOrigin } from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const identifier = z.string().min(3).max(180).regex(/^[A-Za-z0-9:_.-]+$/);
const commandSchema = z.object({
  type: z.literal("admit_legacy_capacity_component"),
  bookingId: identifier,
  expectedBookingVersion: z.number().int().min(1),
});

async function authorize(request: NextRequest) {
  const actor = await resolveClubsTeamActor(request);
  if (!actor) return null;
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!tenantSession || tenantSession.roleKey !== "holiday-manager") return null;
  return { actor, tenantSession };
}

export async function GET(request: NextRequest) {
  const authorized = await authorize(request);
  if (!authorized) {
    return Response.json({ status: "holiday_manager_tenant_session_required" }, { status: 403, headers: noStore });
  }
  try {
    const scope = {
      accountId: authorized.actor.accountId,
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
    };
    if (!(await hasLegacyCapacityReconciliationAuthority(scope))) {
      return Response.json({ status: "capacity_reconciliation_authority_required" }, { status: 403, headers: noStore });
    }
    const [candidates, recoveryCases] = await Promise.all([
      readLegacyCapacityAdmissionCandidates(scope),
      readLegacyCapacityRecoveryQueue(scope),
    ]);
    return Response.json({ status: "ready", candidates, recoveryCases }, { headers: noStore });
  } catch {
    return Response.json({ status: "temporarily_unavailable" }, { status: 503, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: noStore });
  }
  const authorized = await authorize(request);
  if (!authorized) {
    return Response.json({ status: "holiday_manager_tenant_session_required" }, { status: 403, headers: noStore });
  }
  if (authorized.actor.assuranceLevel === "aal1") {
    return Response.json({ status: "step_up_required" }, { status: 403, headers: noStore });
  }
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!parsed.success || !/^[A-Za-z0-9:_.-]{8,220}$/.test(idempotencyKey)) {
    return Response.json(
      { status: "validation_error", issues: parsed.success ? ["idempotency_key_required"] : parsed.error.issues },
      { status: 400, headers: noStore },
    );
  }
  const correlationId = `clubs-capacity-legacy-admission-${randomUUID()}`;
  try {
    const receipt = await executeLegacyCapacityAdmission({
      accountId: authorized.actor.accountId,
      tenantSessionId: authorized.tenantSession.sessionId,
      organizationId: authorized.tenantSession.organizationId,
      roleKey: authorized.tenantSession.roleKey,
      bookingId: parsed.data.bookingId,
      expectedBookingVersion: parsed.data.expectedBookingVersion,
      idempotencyKey,
      correlationId,
    });
    const status = receipt.outcome === "denied" ? 403 : receipt.outcome === "conflict" ? 409 : 200;
    return Response.json({ status: receipt.outcome, receipt, correlationId: receipt.correlationId }, { status, headers: noStore });
  } catch (error) {
    if (error instanceof ClubsIdempotencyReplayConflictError) {
      return Response.json({ status: "conflict" }, { status: 409, headers: noStore });
    }
    return Response.json(
      { status: "unknown_outcome", reason: "Retry with the same command key before taking another action." },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}
