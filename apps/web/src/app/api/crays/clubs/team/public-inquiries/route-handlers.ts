import "server-only";

import { NextRequest } from "next/server";

import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT,
  type ClubsOperationsPublicInquiryQueueActor,
  type ClubsOperationsPublicInquiryQueueProjection,
} from "@/lib/member-commerce/clubs-operations-public-inquiry-queue-contract";
import {
  ClubsOperationsPublicInquiryQueueAuthorityError,
  readClubsOperationsPublicInquiryQueue,
} from "@/lib/member-commerce/clubs-operations-public-inquiry-queue-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamHostRequest,
} from "@/lib/clubs/team-launch-route-auth";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
} as const;

type ActorResolution =
  | { actor: ClubsOperationsPublicInquiryQueueActor }
  | { response: Response };

export async function resolveClubsOperationsPublicInquiryQueueActor(
  request: NextRequest,
): Promise<ActorResolution> {
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
    !CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.allowedRoles.includes(
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
  let effectiveAssuranceLevel = teamActor.assuranceLevel;
  if (
    !CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.assurance.allowed.includes(
      effectiveAssuranceLevel as never,
    ) &&
    teamActor.mode === "auth0"
  ) {
    const exactB2bProof = await resolveExactB2bSessionProof(request).catch(
      () => null,
    );
    if (exactB2bProof?.status === "b2c_rejected") {
      return {
        response: Response.json(
          { status: "wrong_vertical_session" },
          { status: 403, headers: NO_STORE_HEADERS },
        ),
      };
    }
    if (
      exactB2bProof?.status !== "ready" ||
      teamActor.authenticatedAt === null ||
      exactB2bProof.proof.authenticatedAt !== teamActor.authenticatedAt
    ) {
      return {
        response: Response.json(
          { status: "exact_b2b_session_unavailable" },
          { status: 503, headers: NO_STORE_HEADERS },
        ),
      };
    }
    effectiveAssuranceLevel = "aal2";
  }
  if (
    !CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.assurance.allowed.includes(
      effectiveAssuranceLevel as never,
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
      role: tenantSession.roleKey as ClubsOperationsPublicInquiryQueueActor["role"],
      assuranceLevel:
        effectiveAssuranceLevel as ClubsOperationsPublicInquiryQueueActor["assuranceLevel"],
    },
  };
}

export type ClubsOperationsPublicInquiryQueueRouteDependencies = Readonly<{
  validHost: (request: NextRequest) => boolean;
  resolveActor: (request: NextRequest) => Promise<ActorResolution>;
  readQueue: (
    actor: ClubsOperationsPublicInquiryQueueActor,
  ) => Promise<ClubsOperationsPublicInquiryQueueProjection>;
}>;

const DEFAULT_DEPENDENCIES: ClubsOperationsPublicInquiryQueueRouteDependencies = {
  validHost: validClubsTeamHostRequest,
  resolveActor: resolveClubsOperationsPublicInquiryQueueActor,
  readQueue: readClubsOperationsPublicInquiryQueue,
};

export async function handleClubsOperationsPublicInquiryQueueGet(
  request: NextRequest,
  dependencies: ClubsOperationsPublicInquiryQueueRouteDependencies =
    DEFAULT_DEPENDENCIES,
): Promise<Response> {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: NO_STORE_HEADERS },
    );
  }
  let authority: ActorResolution;
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
    return Response.json(await dependencies.readQueue(authority.actor), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (
      error instanceof ClubsOperationsPublicInquiryQueueAuthorityError ||
      (error instanceof Error &&
        error.name === "ClubsOperationsPublicInquiryQueueAuthorityError")
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
  return handleClubsOperationsPublicInquiryQueueGet(request);
}
