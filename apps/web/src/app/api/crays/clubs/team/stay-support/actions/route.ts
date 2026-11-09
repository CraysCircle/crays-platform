import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  TeamStaySupportCommandAuthorityError,
  TeamStaySupportCommandConflictError,
  TeamStaySupportCommandNotFoundError,
  TeamStaySupportCommandValidationError,
  executeTeamStaySupportCommand,
  reconcileTeamStaySupportCommand,
} from "@/db/clubs-team-stay-support-command-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT,
  type TeamStaySupportCommandAuthority,
  unavailableTeamStaySupportCommand,
} from "@/lib/clubs/team-stay-support-command-contract";
import {
  resolveClubsTeamActor,
  validClubsTeamIssueOrigin,
  validClubsTeamHostRequest,
} from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const roles = ["holiday-manager", "crays-management", "admin"] as const;
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const commandSchema = z
  .object({
    type: z.enum(["acknowledge", "mark_in_progress", "resolve", "close"]),
    publicSupportReference: z.string().regex(/^SUP-[A-F0-9]{12}$/),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

type AuthorizedTeamRequest = {
  actor: NonNullable<Awaited<ReturnType<typeof resolveClubsTeamActor>>>;
  tenantSession: NonNullable<Awaited<ReturnType<typeof resolveTenantSession>>>;
};

async function authorizeTeamRequest(
  request: NextRequest,
): Promise<{ authorized: AuthorizedTeamRequest } | { response: Response }> {
  if (!validClubsTeamHostRequest(request)) {
    return {
      response: Response.json(
        unavailableTeamStaySupportCommand("wrong_vertical_session"),
        { status: 403, headers: noStore },
      ),
    };
  }
  const actor = await resolveClubsTeamActor(request);
  if (!actor) {
    return {
      response: Response.json(
        unavailableTeamStaySupportCommand(
          "authentication_or_tenant_session_required",
        ),
        { status: 401, headers: noStore },
      ),
    };
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    actor.accountId,
  );
  if (!tenantSession) {
    return {
      response: Response.json(
        unavailableTeamStaySupportCommand(
          "authentication_or_tenant_session_required",
        ),
        { status: 401, headers: noStore },
      ),
    };
  }
  if (!roles.some((role) => role === tenantSession.roleKey)) {
    return {
      response: Response.json(
        unavailableTeamStaySupportCommand("permission_denied"),
        { status: 403, headers: noStore },
      ),
    };
  }
  if (actor.assuranceLevel === "aal1") {
    return {
      response: Response.json(
        unavailableTeamStaySupportCommand("step_up_required"),
        { status: 403, headers: noStore },
      ),
    };
  }
  return { authorized: { actor, tenantSession } };
}

function commandAuthority(authorized: AuthorizedTeamRequest) {
  return {
    accountId: authorized.actor.accountId,
    tenantSessionId: authorized.tenantSession.sessionId,
    organizationId: authorized.tenantSession.organizationId,
    roleKey:
      authorized.tenantSession
        .roleKey as TeamStaySupportCommandAuthority["roleKey"],
    assuranceLevel:
      authorized.actor
        .assuranceLevel as TeamStaySupportCommandAuthority["assuranceLevel"],
  } satisfies TeamStaySupportCommandAuthority;
}

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

function repositoryError(error: unknown) {
  if (
    error instanceof TeamStaySupportCommandValidationError ||
    named(error, "TeamStaySupportCommandValidationError")
  ) {
    return Response.json(unavailableTeamStaySupportCommand("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  if (
    error instanceof TeamStaySupportCommandAuthorityError ||
    named(error, "TeamStaySupportCommandAuthorityError")
  ) {
    return Response.json(unavailableTeamStaySupportCommand("permission_denied"), {
      status: 403,
      headers: noStore,
    });
  }
  if (
    error instanceof TeamStaySupportCommandNotFoundError ||
    named(error, "TeamStaySupportCommandNotFoundError")
  ) {
    return Response.json(unavailableTeamStaySupportCommand("not_found"), {
      status: 404,
      headers: noStore,
    });
  }
  if (
    error instanceof TeamStaySupportCommandConflictError ||
    named(error, "TeamStaySupportCommandConflictError")
  ) {
    return Response.json(
      unavailableTeamStaySupportCommand("version_or_state_or_payload_conflict"),
      { status: 409, headers: noStore },
    );
  }
  return Response.json(
    {
      ...unavailableTeamStaySupportCommand("unknown_outcome"),
      reconcileAt: CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.endpoint,
      queueReconcileAt:
        CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.reconciliationEndpoint,
      reconcileWithGetBeforeRetry: true,
      retryWithSameIdempotencyKeyOnly: true,
    },
    { status: 503, headers: { ...noStore, "retry-after": "2" } },
  );
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeTeamRequest(request);
  if ("response" in authorization) return authorization.response;
  const key = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!key.success) {
    return Response.json(
      unavailableTeamStaySupportCommand("idempotency_key_required"),
      { status: 400, headers: noStore },
    );
  }
  const authority = commandAuthority(authorization.authorized);
  try {
    return Response.json(
      await reconcileTeamStaySupportCommand(authority, key.data),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeTeamRequest(request);
  if ("response" in authorization) return authorization.response;
  if (!validClubsTeamIssueOrigin(request)) {
    return Response.json(unavailableTeamStaySupportCommand("origin_denied"), {
      status: 403,
      headers: noStore,
    });
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(unavailableTeamStaySupportCommand("json_required"), {
      status: 415,
      headers: noStore,
    });
  }
  const key = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!key.success || !command.success) {
    return Response.json(unavailableTeamStaySupportCommand("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  const authority = commandAuthority(authorization.authorized);
  try {
    return Response.json(
      await executeTeamStaySupportCommand(authority, key.data, command.data),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}
