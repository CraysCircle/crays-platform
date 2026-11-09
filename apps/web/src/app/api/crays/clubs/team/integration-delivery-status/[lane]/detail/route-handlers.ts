import type { NextRequest } from "next/server";

import {
  resolveClubsOperationsIntegrationDeliveryStatusActor,
  type ClubsOperationsIntegrationDeliveryStatusActorResolution,
} from "@/app/api/crays/clubs/team/integration-delivery-status/route-handlers";
import { validClubsTeamHostRequest } from "@/lib/clubs/team-launch-route-auth";
import type {
  ClubsOperationsIntegrationDeliveryDetailActor,
  ClubsOperationsIntegrationDeliveryDetailLane,
  ClubsOperationsIntegrationDeliveryDetailProjection,
} from "@/lib/member-commerce/clubs-operations-integration-delivery-detail-contract";
import {
  ClubsOperationsIntegrationDeliveryDetailAuthorityError,
  parseClubsOperationsIntegrationDeliveryDetailLane,
  readClubsOperationsIntegrationDeliveryDetail,
} from "@/lib/member-commerce/clubs-operations-integration-delivery-detail-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  vary: "cookie",
  "x-content-type-options": "nosniff",
} as const;

export type ClubsOperationsIntegrationDeliveryDetailRouteContext = Readonly<{
  params: Promise<{ lane: string }>;
}>;

export type ClubsOperationsIntegrationDeliveryDetailRouteDependencies = Readonly<{
  validHost: (request: NextRequest) => boolean;
  resolveActor: (
    request: NextRequest,
  ) => Promise<ClubsOperationsIntegrationDeliveryStatusActorResolution>;
  readDetail: (
    actor: ClubsOperationsIntegrationDeliveryDetailActor,
    lane: ClubsOperationsIntegrationDeliveryDetailLane,
  ) => Promise<ClubsOperationsIntegrationDeliveryDetailProjection>;
}>;

const DEFAULT_DEPENDENCIES: ClubsOperationsIntegrationDeliveryDetailRouteDependencies = {
  validHost: validClubsTeamHostRequest,
  resolveActor: resolveClubsOperationsIntegrationDeliveryStatusActor,
  readDetail: readClubsOperationsIntegrationDeliveryDetail,
};

export async function handleClubsOperationsIntegrationDeliveryDetailGet(
  request: NextRequest,
  context: ClubsOperationsIntegrationDeliveryDetailRouteContext,
  dependencies: ClubsOperationsIntegrationDeliveryDetailRouteDependencies =
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

  let lane: ClubsOperationsIntegrationDeliveryDetailLane | null;
  try {
    lane = parseClubsOperationsIntegrationDeliveryDetailLane(
      (await context.params).lane,
    );
  } catch {
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: { ...NO_STORE_HEADERS, "retry-after": "2" } },
    );
  }
  if (!lane) {
    return Response.json(
      { status: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  try {
    return Response.json(await dependencies.readDetail(authority.actor, lane), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (
      error instanceof ClubsOperationsIntegrationDeliveryDetailAuthorityError ||
      (error instanceof Error &&
        error.name === "ClubsOperationsIntegrationDeliveryDetailAuthorityError")
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

export async function GET(
  request: NextRequest,
  context: ClubsOperationsIntegrationDeliveryDetailRouteContext,
): Promise<Response> {
  return handleClubsOperationsIntegrationDeliveryDetailGet(request, context);
}
