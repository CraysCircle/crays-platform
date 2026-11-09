import "server-only";

import { NextRequest } from "next/server";

import {
  resolveClubsTeamMembershipReviewActor,
  validClubsTeamMembershipReviewHost,
} from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  ClubsTeamDirectReviewReadAuthorityError,
  ClubsTeamDirectReviewReadNotFoundError,
  ClubsTeamDirectReviewReadValidationError,
  readClubsTeamDirectReviewDetail,
  readClubsTeamDirectReviewQueue,
} from "@/db/clubs-team-direct-membership-application-review-read-repository";
import {
  CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT,
  unavailableClubsTeamDirectReviewRead,
} from "@/lib/clubs/team-direct-membership-application-review-read-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

type ActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type ClubsTeamDirectReviewReadRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  resolveActor: (request: NextRequest) => Promise<ActorResolution>;
  readQueue: typeof readClubsTeamDirectReviewQueue;
  readDetail: typeof readClubsTeamDirectReviewDetail;
};

const defaults: ClubsTeamDirectReviewReadRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  readQueue: readClubsTeamDirectReviewQueue,
  readDetail: readClubsTeamDirectReviewDetail,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

export async function handleClubsTeamDirectReviewReadGet(
  request: NextRequest,
  deps: ClubsTeamDirectReviewReadRouteDependencies = defaults,
) {
  if (!deps.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: noStore },
    );
  }

  let authority: ActorResolution;
  try {
    authority = await deps.resolveActor(request);
  } catch {
    return Response.json(unavailableClubsTeamDirectReviewRead(), {
      status: 503,
      headers: noStore,
    });
  }
  if ("response" in authority) return authority.response;

  const references = request.nextUrl.searchParams.getAll("reviewReference");
  if (
    references.length > 1 ||
    (references[0] !== undefined &&
      !/^cclub-review-[a-f0-9]{32}$/.test(references[0]))
  ) {
    return Response.json(
      {
        schema:
          CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.schema,
        version:
          CLUBS_TEAM_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_READ_CONTRACT.version,
        status: "validation_error",
      },
      { status: 400, headers: noStore },
    );
  }

  try {
    const payload = references[0]
      ? await deps.readDetail(authority.actor, references[0])
      : await deps.readQueue(authority.actor);
    return Response.json(payload, { headers: noStore });
  } catch (error) {
    if (
      error instanceof ClubsTeamDirectReviewReadAuthorityError ||
      errorNamed(error, "ClubsTeamDirectReviewReadAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamDirectReviewReadNotFoundError ||
      errorNamed(error, "ClubsTeamDirectReviewReadNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsTeamDirectReviewReadValidationError ||
      errorNamed(error, "ClubsTeamDirectReviewReadValidationError")
    ) {
      return Response.json(
        { status: "validation_error" },
        { status: 400, headers: noStore },
      );
    }
    return Response.json(unavailableClubsTeamDirectReviewRead(), {
      status: 503,
      headers: noStore,
    });
  }
}

export async function GET(request: NextRequest) {
  return handleClubsTeamDirectReviewReadGet(request);
}
