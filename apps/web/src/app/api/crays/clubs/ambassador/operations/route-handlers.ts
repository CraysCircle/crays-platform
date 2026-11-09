import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsAmbassadorOperationsAuthorityError,
  ClubsAmbassadorOperationsNotFoundError,
  ClubsAmbassadorOperationsReplayConflictError,
  ClubsAmbassadorOperationsStateConflictError,
  ClubsAmbassadorOperationsValidationError,
  executeClubsAmbassadorOperations,
  readClubsAmbassadorOperations,
} from "@/db/clubs-ambassador-operations-repository";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  CLUBS_AMBASSADOR_OPERATIONS_CONTRACT,
  type ClubsAmbassadorOperationsActor,
} from "@/lib/clubs/ambassador-operations-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const profileId = z
  .string()
  .regex(/^ambassador_profile_[a-z0-9_-]{3,100}$/);
const reviewerBindingId = z
  .string()
  .regex(/^clubs-direct-membership-reviewer-binding_[0-9a-f-]{36}$/)
  .nullable();
const applicationId = z
  .string()
  .regex(/^clubs-booking-membership-application_[0-9a-f-]{36}$/);
const registryDetails = {
  displayName: z.string().trim().min(2).max(120),
  regionLabel: z.string().trim().min(2).max(120),
  operationalRoles: z
    .array(z.enum(CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.operationalRoles))
    .min(1)
    .max(4)
    .refine((roles) => new Set(roles).size === roles.length),
  reviewerBindingId,
};
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_ambassador"),
    ambassadorProfileId: profileId.optional(),
    ...registryDetails,
    reasonCode: z.literal("registry_created"),
  }),
  z.object({
    type: z.literal("edit_ambassador"),
    ambassadorProfileId: profileId,
    expectedVersion: z.number().int().positive(),
    ...registryDetails,
    reasonCode: z.literal("registry_details_updated"),
  }),
  z.object({
    type: z.literal("deactivate_ambassador"),
    ambassadorProfileId: profileId,
    expectedVersion: z.number().int().positive(),
    reasonCode: z.literal("operations_access_deactivated"),
  }),
  z.object({
    type: z.literal("assign_application"),
    applicationId,
    ambassadorProfileId: profileId,
    expectedAssignmentVersion: z.number().int().nonnegative(),
    reasonCode: z.enum(["operations_assignment", "operations_reassignment"]),
  }),
  z.object({
    type: z.literal("unassign_application"),
    applicationId,
    expectedAssignmentVersion: z.number().int().positive(),
    reasonCode: z.literal("operations_unassignment"),
  }),
]);
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

function isLoopback(request: NextRequest) {
  try {
    const hostname = new URL(request.url).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function validClubsAmbassadorOperationsHost(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split(":")[0];
  return (
    isLoopback(request) &&
    (host === "127.0.0.1" || host === "localhost" || host === "::1")
  );
}

export function validClubsAmbassadorOperationsOrigin(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const origin = request.headers.get("origin");
  if (!origin) return isLoopback(request);
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

type ActorResolution =
  | { actor: ClubsAmbassadorOperationsActor }
  | { response: Response };

export async function resolveClubsAmbassadorOperationsActor(
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
          schema: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.schema,
          version: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.version,
          status: "authentication_required",
        },
        { status: 401, headers: noStore },
      ),
    };
  }
  if (
    context.reviewPersona.requestedRole !== null ||
    context.session.activeRole !== context.role ||
    !CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.allowedActorRoles.includes(
      context.role as ClubsAmbassadorOperationsActor["role"],
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
  let effectiveAssuranceLevel = context.strongAuth.assuranceLevel;
  if (!context.strongAuth.allowed) {
    const exactB2bProof = await resolveExactB2bSessionProof(request).catch(
      () => null,
    );
    if (exactB2bProof?.status === "b2c_rejected") {
      return {
        response: Response.json(
          { status: "wrong_vertical_session" },
          { status: 403, headers: noStore },
        ),
      };
    }
    const exactB2bProviderMfaFlowAttested =
      exactB2bProof?.status === "ready" &&
      exactB2bProof.proof.proofSchema ===
        "crays.clubs.exact-b2b-session-proof.v1" &&
      exactB2bProof.proof.authoritySource === "exact_b2b_session" &&
      exactB2bProof.proof.emailVerified === true &&
      exactB2bProof.proof.b2cRejected === true &&
      Boolean(authenticatedAt) &&
      exactB2bProof.proof.authenticatedAt === authenticatedAt?.toISOString();
    if (!exactB2bProviderMfaFlowAttested) {
      return {
        response: Response.json(
          { status: "exact_b2b_session_unavailable" },
          { status: 503, headers: noStore },
        ),
      };
    }
    effectiveAssuranceLevel = "aal2";
  }
  const ageMs = authenticatedAt
    ? Date.now() - authenticatedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (
    !CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.assurance.allowed.includes(
      effectiveAssuranceLevel as never,
    ) ||
    !authenticatedAt ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.assurance.maximumAgeSeconds * 1_000
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
      role: context.role as ClubsAmbassadorOperationsActor["role"],
      assuranceLevel: effectiveAssuranceLevel as "aal2" | "aal3",
      authenticatedAt: authenticatedAt.toISOString(),
      authoritySource: "auth0-crays-session",
    },
  };
}

export type ClubsAmbassadorOperationsRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  validOrigin: typeof validClubsAmbassadorOperationsOrigin;
  resolveActor: typeof resolveClubsAmbassadorOperationsActor;
  readOperations: typeof readClubsAmbassadorOperations;
  executeCommand: typeof executeClubsAmbassadorOperations;
};

const defaults: ClubsAmbassadorOperationsRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  validOrigin: validClubsAmbassadorOperationsOrigin,
  resolveActor: resolveClubsAmbassadorOperationsActor,
  readOperations: readClubsAmbassadorOperations,
  executeCommand: executeClubsAmbassadorOperations,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

async function resolveActorFailClosed(
  request: NextRequest,
  dependencies: ClubsAmbassadorOperationsRouteDependencies,
) {
  try {
    return await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        { status: "configuration_or_provider_unavailable" },
        { status: 503, headers: noStore },
      ),
    };
  }
}

export async function handleClubsAmbassadorOperationsGet(
  request: NextRequest,
  dependencies: ClubsAmbassadorOperationsRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }
  const authority = await resolveActorFailClosed(request, dependencies);
  if ("response" in authority) return authority.response;
  try {
    return Response.json(await dependencies.readOperations(authority.actor), {
      headers: noStore,
    });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorOperationsAuthorityError ||
      errorNamed(error, "ClubsAmbassadorOperationsAuthorityError")
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

export async function handleClubsAmbassadorOperationsPost(
  request: NextRequest,
  dependencies: ClubsAmbassadorOperationsRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }
  if (!dependencies.validOrigin(request)) {
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
  const authority = await resolveActorFailClosed(request, dependencies);
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
      await dependencies.executeCommand(
        authority.actor,
        idempotencyKey,
        command.data,
      ),
      { headers: noStore },
    );
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorOperationsAuthorityError ||
      errorNamed(error, "ClubsAmbassadorOperationsAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorOperationsNotFoundError ||
      errorNamed(error, "ClubsAmbassadorOperationsNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorOperationsReplayConflictError ||
      errorNamed(error, "ClubsAmbassadorOperationsReplayConflictError")
    ) {
      return Response.json(
        { status: "conflict", reason: "idempotency_key_reused" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorOperationsStateConflictError ||
      errorNamed(error, "ClubsAmbassadorOperationsStateConflictError")
    ) {
      return Response.json(
        { status: "state_conflict", reason: "refresh_required" },
        { status: 409, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorOperationsValidationError ||
      errorNamed(error, "ClubsAmbassadorOperationsValidationError")
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
        reviewAuthorityDerived: false,
        teamGoAuthorityDerived: false,
        membershipAuthorityDerived: false,
        admissionAuthorityDerived: false,
        paymentAuthorityDerived: false,
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleClubsAmbassadorOperationsGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsAmbassadorOperationsPost(request);
}
