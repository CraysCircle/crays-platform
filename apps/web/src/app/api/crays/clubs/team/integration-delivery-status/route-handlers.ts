import { NextRequest } from "next/server";

import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamHostRequest,
} from "@/lib/clubs/team-launch-route-auth";
import {
  CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT,
  type ClubsOperationsIntegrationDeliveryStatusActor,
  type ClubsOperationsIntegrationDeliveryStatusProjection,
} from "@/lib/member-commerce/clubs-operations-integration-delivery-status-contract";
import {
  ClubsOperationsIntegrationDeliveryStatusAuthorityError,
  readClubsOperationsIntegrationDeliveryStatus,
} from "@/lib/member-commerce/clubs-operations-integration-delivery-status-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  vary: "cookie",
  "x-content-type-options": "nosniff",
} as const;

export type ClubsOperationsIntegrationDeliveryStatusActorResolution =
  | { actor: ClubsOperationsIntegrationDeliveryStatusActor }
  | { response: Response };

export async function resolveClubsOperationsIntegrationDeliveryStatusActor(
  request: NextRequest,
): Promise<ClubsOperationsIntegrationDeliveryStatusActorResolution> {
  const teamActor = await resolveClubsTeamActor(request);
  if (!teamActor) {
    return {
      response: Response.json(
        { status: "authentication_required" },
        { status: 401, headers: NO_STORE_HEADERS },
      ),
    };
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    teamActor.accountId,
  );
  if (!tenantSession) {
    return {
      response: Response.json(
        { status: "tenant_session_required" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  if (
    !CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.allowedRoles.includes(
      tenantSession.roleKey as never,
    )
  ) {
    return {
      response: Response.json(
        { status: "permission_denied" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  if (
    !CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.assurance.allowed.includes(
      teamActor.assuranceLevel as never,
    )
  ) {
    return {
      response: Response.json(
        { status: "step_up_required" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  return {
    actor: {
      accountId: teamActor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      role:
        tenantSession.roleKey as ClubsOperationsIntegrationDeliveryStatusActor["role"],
      assuranceLevel:
        teamActor.assuranceLevel as ClubsOperationsIntegrationDeliveryStatusActor["assuranceLevel"],
    },
  };
}

export type ClubsOperationsIntegrationDeliveryStatusRouteDependencies = Readonly<{
  validHost: (request: NextRequest) => boolean;
  resolveActor: (
    request: NextRequest,
  ) => Promise<ClubsOperationsIntegrationDeliveryStatusActorResolution>;
  readStatus: (
    actor: ClubsOperationsIntegrationDeliveryStatusActor,
  ) => Promise<ClubsOperationsIntegrationDeliveryStatusProjection>;
}>;

const DEFAULT_DEPENDENCIES: ClubsOperationsIntegrationDeliveryStatusRouteDependencies = {
  validHost: validClubsTeamHostRequest,
  resolveActor: resolveClubsOperationsIntegrationDeliveryStatusActor,
  readStatus: readClubsOperationsIntegrationDeliveryStatus,
};

export async function handleClubsOperationsIntegrationDeliveryStatusGet(
  request: NextRequest,
  dependencies: ClubsOperationsIntegrationDeliveryStatusRouteDependencies =
    DEFAULT_DEPENDENCIES,
): Promise<Response> {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: NO_STORE_HEADERS },
    );
  }

  let authority: ClubsOperationsIntegrationDeliveryStatusActorResolution;
  try {
    authority = await dependencies.resolveActor(request);
  } catch {
    return Response.json(
      { status: "authentication_unavailable" },
      { status: 503, headers: { ...NO_STORE_HEADERS, "retry-after": "2" } },
    );
  }
  if ("response" in authority) return authority.response;

  try {
    return Response.json(await dependencies.readStatus(authority.actor), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (
      error instanceof ClubsOperationsIntegrationDeliveryStatusAuthorityError ||
      (error instanceof Error &&
        error.name === "ClubsOperationsIntegrationDeliveryStatusAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: { ...NO_STORE_HEADERS, "retry-after": "2" } },
    );
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleClubsOperationsIntegrationDeliveryStatusGet(request);
}
