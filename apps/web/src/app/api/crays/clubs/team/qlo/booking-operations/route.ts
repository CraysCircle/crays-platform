import { NextRequest } from "next/server";
import { z } from "zod";
import { readQloBookingOperations } from "@/db/clubs-qlo-booking-operations-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  clubsQloBookingOperationsEnvelope,
  type ClubsQloBookingOperationKind,
} from "@/lib/clubs/qlo-booking-operations-contract";
import {
  resolveClubsTeamActor,
  validClubsTeamHostRequest,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const permittedRoles = ["holiday-manager", "crays-management", "admin"] as const;
const selectorSchema = z.object({
  kind: z.enum([
    "booking_request",
    "booking_lifecycle",
    "booking_change_request",
  ]),
  reference: z.string().min(3).max(360).regex(/^[A-Za-z0-9:_.+-]+$/),
});

function json(
  status: string,
  httpStatus: number,
  extra: Record<string, unknown> = {},
) {
  return Response.json(clubsQloBookingOperationsEnvelope(status, extra), {
    status: httpStatus,
    headers: noStore,
  });
}

function isPermittedRole(
  roleKey: string,
): roleKey is (typeof permittedRoles)[number] {
  return permittedRoles.includes(roleKey as (typeof permittedRoles)[number]);
}

export async function GET(request: NextRequest) {
  if (!validClubsTeamHostRequest(request)) {
    return json("qlo_host_or_vertical_forbidden", 403);
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return json("authentication_required", 401);
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!tenantSession) {
    return json("tenant_session_required", 401);
  }
  if (!isPermittedRole(tenantSession.roleKey)) {
    return json("qlo_booking_operations_role_forbidden", 403);
  }

  const rawKind = request.nextUrl.searchParams.get("kind");
  const rawReference = request.nextUrl.searchParams.get("reference");
  const hasSelector = rawKind !== null || rawReference !== null;
  const parsedSelector = hasSelector
    ? selectorSchema.safeParse({ kind: rawKind, reference: rawReference })
    : null;
  if (parsedSelector && !parsedSelector.success) {
    return json("invalid_operation_selector", 400);
  }

  try {
    const result = await readQloBookingOperations({
      accountId: actor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      roleKey: tenantSession.roleKey,
      assuranceLevel: actor.assuranceLevel,
      selector: parsedSelector?.success
        ? {
            kind: parsedSelector.data.kind as ClubsQloBookingOperationKind,
            reference: parsedSelector.data.reference,
          }
        : null,
    });
    if (result.selectionStatus === "not_found") {
      return json("operation_not_found", 404, {
        reconcileState: "canonical_operation_not_present_in_current_scope",
      });
    }
    if (result.selectionStatus === "ambiguous") {
      return json("operation_reference_ambiguous", 409, {
        reconcileState: "refresh_operator_queue_before_action",
      });
    }

    const actionable = result.operations.some((operation) =>
      operation.nextActions.some((action) => action.ready),
    );
    const status = result.selectionStatus === "exact"
      ? actionable
        ? "operation_actionable"
        : "operation_read_only"
      : result.operations.length === 0
        ? "operator_queue_empty"
        : actionable
          ? "operator_queue_actionable"
          : "operator_queue_read_only";
    return json(status, 200, {
      scope: "qlo_booking_operations",
      operations: result.operations,
      counts: result.counts,
      readiness: {
        assuranceLevel: actor.assuranceLevel,
        omittedUnsafeRecords: result.omittedUnsafeRecords,
        sourceIntegrity:
          result.omittedUnsafeRecords === 0
            ? "canonical_records_safe"
            : "unsafe_canonical_records_omitted",
      },
      reconciliation: {
        endpoint: "/api/crays/clubs/team/qlo/booking-operations",
        conflictStatus: 409,
        unknownOutcomeStatus: 503,
        reconcileBeforeRetry: true,
        blindRetryAllowed: false,
        retryWithSameIdempotencyKeyOnly: true,
      },
    });
  } catch {
    return json("operator_queue_temporarily_unavailable", 503, {
      readiness: {
        actionable: false,
        reason: "canonical_booking_read_failed",
      },
      retryableRead: true,
    });
  }
}
