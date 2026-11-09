import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  executeClubsTeamMembershipReview,
  ClubsTeamMembershipReviewAuthorityError,
  ClubsTeamMembershipReviewNotFoundError,
  ClubsTeamMembershipReviewReplayConflictError,
  ClubsTeamMembershipReviewStateConflictError,
  ClubsTeamMembershipReviewValidationError,
  readClubsTeamMembershipApplications,
} from "@/db/clubs-team-membership-review-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { validClubsTeamIssueOrigin } from "@/lib/clubs/team-launch-route-auth";
import {
  CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT,
  type ClubsTeamMembershipReviewActor,
} from "@/lib/clubs/team-membership-review-contract";
import type { ClubsExactB2bSessionProof } from "@/lib/clubs/ambassador-pre-registration-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

const applicationId = z
  .string()
  .regex(/^clubs-membership-application_[0-9a-f-]{36}$/);
const expectedVersion = z.number().int().positive();
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start_review"),
    applicationId,
    expectedVersion,
    reasonCode: z.literal("review_started"),
  }),
  z.object({
    type: z.literal("approve_application"),
    applicationId,
    expectedVersion,
    reasonCode: z.literal("membership_requirements_satisfied"),
  }),
  z.object({
    type: z.literal("decline_application"),
    applicationId,
    expectedVersion,
    reasonCode: z.literal("membership_requirements_not_satisfied"),
  }),
]);
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

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

export function validClubsTeamMembershipReviewHost(request: NextRequest) {
  const host = hostName(request);
  if (host === "www.crays.pro" || host === "crays.pro") return true;
  return (
    process.env.NODE_ENV !== "production" &&
    (host === "127.0.0.1" || host === "localhost" || host === "::1")
  );
}

type ActorResolution =
  { actor: ClubsTeamMembershipReviewActor } | { response: Response };

export async function resolveClubsTeamMembershipReviewActor(
  request: NextRequest,
  exactB2bProof?: ClubsExactB2bSessionProof,
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
          schema: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.schema,
          version: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.version,
          status: "authentication_required",
        },
        { status: 401, headers: noStore },
      ),
    };
  }
  if (
    context.reviewPersona.requestedRole !== null ||
    context.session.activeRole !== context.role ||
    !CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.allowedRoles.includes(
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
  const exactB2bProviderMfaFlowAttested =
    exactB2bProof?.proofSchema === "crays.clubs.exact-b2b-session-proof.v1" &&
    exactB2bProof.authoritySource === "exact_b2b_session" &&
    exactB2bProof.emailVerified === true &&
    exactB2bProof.b2cRejected === true &&
    Boolean(authenticatedAt) &&
    exactB2bProof.authenticatedAt === authenticatedAt?.toISOString();
  const effectiveAssuranceLevel = context.strongAuth.allowed
    ? context.strongAuth.assuranceLevel
    : exactB2bProviderMfaFlowAttested
      ? "aal2"
      : "aal1";
  const ageMs = authenticatedAt
    ? Date.now() - authenticatedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (
    !CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.assurance.allowed.includes(
      effectiveAssuranceLevel as never,
    ) ||
    !authenticatedAt ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.assurance.maximumAgeSeconds * 1_000
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
      role: context.role as ClubsTeamMembershipReviewActor["role"],
      assuranceLevel: effectiveAssuranceLevel as "aal2" | "aal3",
      authenticatedAt: authenticatedAt.toISOString(),
      authoritySource: "auth0-crays-session",
    },
  };
}

export type ClubsTeamMembershipReviewRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  validOrigin: typeof validClubsTeamIssueOrigin;
  resolveActor: typeof resolveClubsTeamMembershipReviewActor;
  readApplications: typeof readClubsTeamMembershipApplications;
  executeCommand: typeof executeClubsTeamMembershipReview;
};

const defaults: ClubsTeamMembershipReviewRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  validOrigin: validClubsTeamIssueOrigin,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  readApplications: readClubsTeamMembershipApplications,
  executeCommand: executeClubsTeamMembershipReview,
};

async function resolveActorFailClosed(
  request: NextRequest,
  deps: ClubsTeamMembershipReviewRouteDependencies,
): Promise<ActorResolution> {
  try {
    return await deps.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        {
          schema: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.schema,
          version: CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.version,
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

export async function handleClubsTeamMembershipApplicationsGet(
  request: NextRequest,
  deps: ClubsTeamMembershipReviewRouteDependencies = defaults,
) {
  if (!deps.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }
  const authority = await resolveActorFailClosed(request, deps);
  if ("response" in authority) return authority.response;
  try {
    return Response.json(await deps.readApplications(authority.actor), {
      headers: noStore,
    });
  } catch (error) {
    if (
      error instanceof ClubsTeamMembershipReviewAuthorityError ||
      errorNamed(error, "ClubsTeamMembershipReviewAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      );
    }
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}

export async function handleClubsTeamMembershipApplicationsPost(
  request: NextRequest,
  deps: ClubsTeamMembershipReviewRouteDependencies = defaults,
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
      error instanceof ClubsTeamMembershipReviewAuthorityError ||
      errorNamed(error, "ClubsTeamMembershipReviewAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamMembershipReviewNotFoundError ||
      errorNamed(error, "ClubsTeamMembershipReviewNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamMembershipReviewReplayConflictError ||
      errorNamed(error, "ClubsTeamMembershipReviewReplayConflictError")
    ) {
      return Response.json(
        { status: "conflict", reason: "idempotency_key_reused" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamMembershipReviewStateConflictError ||
      errorNamed(error, "ClubsTeamMembershipReviewStateConflictError")
    ) {
      return Response.json(
        { status: "state_conflict", reason: "refresh_required" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamMembershipReviewValidationError ||
      errorNamed(error, "ClubsTeamMembershipReviewValidationError")
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
        membershipAuthority: false,
        marinaPropertyAdmission: false,
        bookingAuthority: false,
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleClubsTeamMembershipApplicationsGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsTeamMembershipApplicationsPost(request);
}
