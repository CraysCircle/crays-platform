import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsAmbassadorB2bEntitlementAuthorityError,
  ClubsAmbassadorB2bEntitlementConflictError,
  ClubsAmbassadorB2bEntitlementNotFoundError,
  ClubsAmbassadorB2bEntitlementValidationError,
  authorizeClubsAmbassadorScopedResource,
  issueClubsAmbassadorB2bEntitlement,
  readCurrentClubsAmbassadorEntitlement,
} from "@/db/clubs-ambassador-b2b-entitlement-repository";
import {
  validClubsAmbassadorOperationsHost,
  validClubsAmbassadorOperationsOrigin,
} from "@/app/api/crays/clubs/ambassador/operations/route-handlers";
import {
  CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT,
  type ClubsAmbassadorB2bBootstrapResolution,
} from "@/lib/clubs/ambassador-b2b-entitlement-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("issue_entitlement"),
      activationPassReceiptId: z
        .string()
        .regex(/^clubs-ambassador-activation-pass_[0-9a-f-]{36}$/),
    })
    .strict(),
  z
    .object({
      type: z.literal("authorize_scoped_resource"),
      resourceKind: z.enum(
        CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.resourceKinds,
      ),
      opaqueResourceReference: z
        .string()
        .min(8)
        .max(240)
        .regex(/^[A-Za-z0-9:_.-]+$/),
    })
    .strict(),
]);
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

export async function resolveExactClubsAmbassadorB2bBootstrap(
  request: NextRequest,
): Promise<ClubsAmbassadorB2bBootstrapResolution> {
  const proofResolution = await resolveExactB2bSessionProof(request);
  if (proofResolution.status === "b2c_rejected") {
    return { status: "b2c_rejected" };
  }
  if (proofResolution.status !== "ready") {
    return { status: "unavailable" };
  }

  const context = await resolveCraysRouteContext(request, {
    fallbackRole: "guest",
    surface: "privileged-operation",
  });
  const accountId = context.session.account?.id ?? null;
  const authenticatedAt = context.strongAuth.authenticatedAt;
  if (
    context.authoritySource !== "auth0-crays-session" ||
    context.session.status !== "crays_mapped" ||
    accountId === null ||
    context.tenantId === null ||
    context.reviewPersona.requestedRole !== null ||
    context.session.activeRole === null ||
    context.session.activeRole !== context.role ||
    !context.strongAuth.allowed ||
    authenticatedAt === null
  ) {
    return { status: "missing_actor_bootstrap" };
  }

  const tenantSessionId = request.cookies.get(tenantSessionCookieName)?.value;
  if (!tenantSessionId) {
    return { status: "missing_actor_bootstrap" };
  }
  const tenantSession = await resolveTenantSession(tenantSessionId, accountId);
  if (
    !tenantSession ||
    tenantSession.accountId !== accountId ||
    tenantSession.organizationId !== context.tenantId ||
    tenantSession.roleKey !== context.role
  ) {
    return { status: "missing_actor_bootstrap" };
  }

  const proofAuthenticatedAt = Date.parse(proofResolution.proof.authenticatedAt);
  const contextAuthenticatedAt = authenticatedAt.getTime();
  if (
    !Number.isFinite(proofAuthenticatedAt) ||
    !Number.isFinite(contextAuthenticatedAt) ||
    Math.abs(proofAuthenticatedAt - contextAuthenticatedAt) > 5_000
  ) {
    return { status: "unavailable" };
  }

  return {
    status: "ready",
    evidence: {
      proofSchema: "crays.clubs.b2b-entitlement-bootstrap.v1",
      accountId,
      organizationId: tenantSession.organizationId,
      tenantSessionId: tenantSession.sessionId,
      subjectSha256: proofResolution.proof.subjectSha256,
      authenticatedAt: proofResolution.proof.authenticatedAt,
      exactVerifiedCraysProB2bLogin: true,
      b2cRejected: true,
      authoritySource: "exact_crays_pro_b2b_bootstrap",
    },
  };
}

export type ClubsAmbassadorB2bEntitlementRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  validOrigin: typeof validClubsAmbassadorOperationsOrigin;
  resolveBootstrap: typeof resolveExactClubsAmbassadorB2bBootstrap;
  issueEntitlement: typeof issueClubsAmbassadorB2bEntitlement;
  readEntitlement: typeof readCurrentClubsAmbassadorEntitlement;
  authorizeResource: typeof authorizeClubsAmbassadorScopedResource;
};

const defaults: ClubsAmbassadorB2bEntitlementRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  validOrigin: validClubsAmbassadorOperationsOrigin,
  resolveBootstrap: resolveExactClubsAmbassadorB2bBootstrap,
  issueEntitlement: issueClubsAmbassadorB2bEntitlement,
  readEntitlement: readCurrentClubsAmbassadorEntitlement,
  authorizeResource: authorizeClubsAmbassadorScopedResource,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

async function resolveBootstrapFailClosed(
  request: NextRequest,
  dependencies: ClubsAmbassadorB2bEntitlementRouteDependencies,
) {
  try {
    return await dependencies.resolveBootstrap(request);
  } catch {
    return { status: "unavailable" } as const;
  }
}

function blockedBootstrapResponse(
  resolution: Exclude<
    ClubsAmbassadorB2bBootstrapResolution,
    { status: "ready" }
  >,
) {
  if (resolution.status === "b2c_rejected") {
    return Response.json(
      { status: "wrong_vertical_session" },
      { status: 403, headers: noStore },
    );
  }
  return Response.json(
    {
      schema: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.schema,
      version: CLUBS_AMBASSADOR_B2B_ENTITLEMENT_CONTRACT.version,
      status:
        resolution.status === "missing_actor_bootstrap"
          ? "missing_actor_bootstrap"
          : "b2b_bootstrap_unavailable",
      accountOrEntitlementCreated: false,
    },
    { status: 503, headers: noStore },
  );
}

export async function handleClubsAmbassadorB2bEntitlementGet(
  request: NextRequest,
  dependencies: ClubsAmbassadorB2bEntitlementRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }
  const resolution = await resolveBootstrapFailClosed(request, dependencies);
  if (resolution.status !== "ready") {
    return blockedBootstrapResponse(resolution);
  }
  try {
    const result = await dependencies.readEntitlement(resolution.evidence);
    return Response.json(result, { status: 200, headers: noStore });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorB2bEntitlementAuthorityError ||
      errorNamed(error, "ClubsAmbassadorB2bEntitlementAuthorityError")
    ) {
      return Response.json(
        { status: "entitlement_denied" },
        { status: 403, headers: noStore },
      );
    }
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}

export async function handleClubsAmbassadorB2bEntitlementPost(
  request: NextRequest,
  dependencies: ClubsAmbassadorB2bEntitlementRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }
  if (!dependencies.validOrigin(request)) {
    return Response.json(
      { status: "origin_denied" },
      { status: 403, headers: noStore },
    );
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(
      { status: "json_required" },
      { status: 415, headers: noStore },
    );
  }
  const idempotency = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!idempotency.success) {
    return Response.json(
      { status: "idempotency_key_required" },
      { status: 400, headers: noStore },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "invalid_json" },
      { status: 400, headers: noStore },
    );
  }
  const command = commandSchema.safeParse(body);
  if (!command.success) {
    return Response.json(
      { status: "invalid_command" },
      { status: 400, headers: noStore },
    );
  }

  const resolution = await resolveBootstrapFailClosed(request, dependencies);
  if (resolution.status !== "ready") {
    return blockedBootstrapResponse(resolution);
  }

  try {
    if (command.data.type === "issue_entitlement") {
      const result = await dependencies.issueEntitlement(
        resolution.evidence,
        idempotency.data,
        command.data.activationPassReceiptId,
      );
      return Response.json(result, { status: 200, headers: noStore });
    }
    const result = await dependencies.authorizeResource(
      resolution.evidence,
      command.data.resourceKind,
      command.data.opaqueResourceReference,
    );
    return Response.json(result, {
      status: result.httpStatus,
      headers: noStore,
    });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorB2bEntitlementValidationError ||
      errorNamed(error, "ClubsAmbassadorB2bEntitlementValidationError")
    ) {
      return Response.json(
        { status: "invalid_command" },
        { status: 400, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorB2bEntitlementAuthorityError ||
      errorNamed(error, "ClubsAmbassadorB2bEntitlementAuthorityError")
    ) {
      return Response.json(
        { status: "entitlement_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorB2bEntitlementNotFoundError ||
      errorNamed(error, "ClubsAmbassadorB2bEntitlementNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorB2bEntitlementConflictError ||
      errorNamed(error, "ClubsAmbassadorB2bEntitlementConflictError")
    ) {
      return Response.json(
        { status: "conflict" },
        { status: 409, headers: noStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        retrySameIdempotencyKey: true,
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleClubsAmbassadorB2bEntitlementGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsAmbassadorB2bEntitlementPost(request);
}
