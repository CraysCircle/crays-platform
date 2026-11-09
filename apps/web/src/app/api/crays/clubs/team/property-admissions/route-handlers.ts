import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsTeamPropertyAdmissionAuthorityError,
  ClubsTeamPropertyAdmissionMembershipRequiredError,
  ClubsTeamPropertyAdmissionNotFoundError,
  ClubsTeamPropertyAdmissionReplayConflictError,
  ClubsTeamPropertyAdmissionScopeNotReadyError,
  ClubsTeamPropertyAdmissionStateConflictError,
  ClubsTeamPropertyAdmissionValidationError,
  executeClubsTeamPropertyAdmission,
} from "@/db/clubs-team-property-admission-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT,
  type ClubsTeamPropertyAdmissionActor,
} from "@/lib/clubs/team-property-admission-contract";
import { validClubsTeamIssueOrigin } from "@/lib/clubs/team-launch-route-auth";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const memberAccountId = z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/);
const propertyId = z.literal("property-clubs-forest-city-marina");
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("grant_access"),
    propertyId,
    memberAccountId,
    expectedGrantVersion: z.literal(0),
    validUntil: z.string().datetime({ offset: true }).nullable(),
    reasonCode: z.literal("membership_and_marina_access_approved"),
  }),
  z.object({
    type: z.literal("revoke_access"),
    propertyId,
    memberAccountId,
    grantId: z.string().regex(/^clubs-property-admission_[0-9a-f-]{36}$/),
    expectedGrantVersion: z.number().int().positive(),
    reasonCode: z.literal("marina_access_revoked"),
  }),
]);

function hostName(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("x-crays-qa-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split(":")[0];
}

export function validClubsTeamPropertyAdmissionHost(request: NextRequest) {
  const host = hostName(request);
  if (host === "www.crays.pro" || host === "crays.pro") return true;
  return (
    process.env.NODE_ENV !== "production" &&
    (host === "127.0.0.1" || host === "localhost" || host === "::1")
  );
}

type ActorResolution =
  { actor: ClubsTeamPropertyAdmissionActor } | { response: Response };

export async function resolveClubsTeamPropertyAdmissionActor(
  request: NextRequest,
): Promise<ActorResolution> {
  const context = await resolveCraysRouteContext(request, {
    fallbackRole: "guest",
    surface: "privileged-operation",
  });
  const accountId = context.session.account?.id ?? null;
  if (
    context.authoritySource !== "auth0-crays-session" ||
    !accountId ||
    context.session.status !== "crays_mapped"
  ) {
    return {
      response: Response.json(
        {
          schema: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.schema,
          version: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.version,
          status: "authentication_required",
        },
        { status: 401, headers: noStore },
      ),
    };
  }
  if (
    context.reviewPersona.requestedRole !== null ||
    context.session.activeRole !== context.role ||
    !CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.allowedRoles.includes(
      context.role as never,
    )
  ) {
    return {
      response: Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      ),
    };
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    accountId,
  ).catch(() => null);
  if (
    !tenantSession ||
    tenantSession.roleKey !== context.role ||
    tenantSession.organizationId !== context.tenantId
  ) {
    return {
      response: Response.json(
        { status: "tenant_session_required" },
        { status: 403, headers: noStore },
      ),
    };
  }
  const authenticatedAt = context.strongAuth.authenticatedAt;
  const ageMs = authenticatedAt
    ? Date.now() - authenticatedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (
    !context.strongAuth.allowed ||
    !authenticatedAt ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.assurance.maximumAgeSeconds * 1_000
  ) {
    return {
      response: Response.json(
        { status: "step_up_required" },
        { status: 403, headers: noStore },
      ),
    };
  }
  return {
    actor: {
      accountId,
      organizationId: context.tenantId,
      role: context.role as ClubsTeamPropertyAdmissionActor["role"],
      assuranceLevel: context.strongAuth.assuranceLevel as "aal2" | "aal3",
      authenticatedAt: authenticatedAt.toISOString(),
      authoritySource: "auth0-crays-session",
    },
  };
}

export type ClubsTeamPropertyAdmissionRouteDependencies = {
  validHost: typeof validClubsTeamPropertyAdmissionHost;
  validOrigin: typeof validClubsTeamIssueOrigin;
  resolveActor: typeof resolveClubsTeamPropertyAdmissionActor;
  executeCommand: typeof executeClubsTeamPropertyAdmission;
};

const defaults: ClubsTeamPropertyAdmissionRouteDependencies = {
  validHost: validClubsTeamPropertyAdmissionHost,
  validOrigin: validClubsTeamIssueOrigin,
  resolveActor: resolveClubsTeamPropertyAdmissionActor,
  executeCommand: executeClubsTeamPropertyAdmission,
};

async function resolveActorFailClosed(
  request: NextRequest,
  deps: ClubsTeamPropertyAdmissionRouteDependencies,
): Promise<ActorResolution> {
  try {
    return await deps.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        {
          schema: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.schema,
          version: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.version,
          status: "configuration_or_provider_unavailable",
        },
        { status: 503, headers: noStore },
      ),
    };
  }
}

function errorNamed(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

export async function handleClubsTeamPropertyAdmissionsPost(
  request: NextRequest,
  deps: ClubsTeamPropertyAdmissionRouteDependencies = defaults,
) {
  if (!deps.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }
  if (!deps.validOrigin(request)) {
    return Response.json(
      { status: "permission_denied", reason: "invalid_origin" },
      { status: 403, headers: noStore },
    );
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  const authority = await resolveActorFailClosed(request, deps);
  if ("response" in authority) return authority.response;
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    !command.success ||
    !idempotencyKeySchema.safeParse(idempotencyKey).success
  ) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }

  try {
    return Response.json(
      await deps.executeCommand(authority.actor, idempotencyKey, command.data),
      { headers: noStore },
    );
  } catch (error) {
    if (
      error instanceof ClubsTeamPropertyAdmissionAuthorityError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamPropertyAdmissionScopeNotReadyError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionScopeNotReadyError")
    ) {
      return Response.json(
        { status: "property_scope_not_ready" },
        { status: 503, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamPropertyAdmissionMembershipRequiredError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionMembershipRequiredError")
    ) {
      return Response.json(
        { status: "membership_required" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamPropertyAdmissionNotFoundError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamPropertyAdmissionReplayConflictError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionReplayConflictError")
    ) {
      return Response.json(
        { status: "conflict", reason: "idempotency_key_reused" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamPropertyAdmissionStateConflictError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionStateConflictError")
    ) {
      return Response.json(
        { status: "state_conflict", reason: "refresh_required" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamPropertyAdmissionValidationError ||
      errorNamed(error, "ClubsTeamPropertyAdmissionValidationError")
    ) {
      return Response.json(
        { status: "validation_error" },
        { status: 400, headers: noStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "retry_with_same_idempotency_key",
        propertyAccess: false,
        availabilityAuthority: false,
        quoteAuthority: false,
        bookingAuthority: false,
        paymentAuthority: false,
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleClubsTeamPropertyAdmissionsPost(request);
}
