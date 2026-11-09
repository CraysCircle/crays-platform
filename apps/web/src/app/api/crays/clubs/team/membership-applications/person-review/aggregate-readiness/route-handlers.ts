import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  resolveClubsTeamMembershipReviewActor,
  validClubsTeamMembershipReviewHost,
} from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  ClubsTeamPersonReviewAggregateReadAuthorityError,
  ClubsTeamPersonReviewAggregateReadNotFoundError,
  ClubsTeamPersonReviewAggregateReadValidationError,
  readClubsTeamPersonReviewAggregateReadiness,
} from "@/db/clubs-team-membership-person-review-aggregate-readiness-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import {
  type ClubsTeamPersonReviewAggregateAuthority,
  unavailableClubsTeamPersonReviewAggregate,
} from "@/lib/clubs/team-membership-person-review-aggregate-readiness-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const reviewReferenceSchema = z
  .string()
  .regex(/^cclub-review-[a-f0-9]{32}$/);

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type ClubsTeamPersonReviewAggregateReadRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  resolveExactProof: (
    request: NextRequest,
  ) => Promise<ClubsExactB2bSessionResolution>;
  resolveActor: (request: NextRequest) => Promise<TeamActorResolution>;
  readReadiness: typeof readClubsTeamPersonReviewAggregateReadiness;
};

const defaults: ClubsTeamPersonReviewAggregateReadRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  resolveExactProof: resolveExactB2bSessionProof,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  readReadiness: readClubsTeamPersonReviewAggregateReadiness,
};

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

async function resolveAuthority(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewAggregateReadRouteDependencies,
): Promise<
  { authority: ClubsTeamPersonReviewAggregateAuthority } | { response: Response }
> {
  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReviewAggregate(
          "actor_authority_unavailable",
        ),
        { status: 503, headers: noStore },
      ),
    };
  }
  if ("response" in actorResolution) return actorResolution;

  let exactResolution: ClubsExactB2bSessionResolution;
  try {
    exactResolution = await dependencies.resolveExactProof(request);
  } catch {
    exactResolution = { status: "unavailable" };
  }
  if (exactResolution.status === "b2c_rejected") {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReviewAggregate("wrong_vertical_session"),
        { status: 403, headers: noStore },
      ),
    };
  }
  if (exactResolution.status !== "ready") {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReviewAggregate(
          "exact_b2b_session_unavailable",
        ),
        { status: 503, headers: noStore },
      ),
    };
  }

  return {
    authority: {
      actor: actorResolution.actor,
      proof: exactResolution.proof,
    },
  };
}

function repositoryError(error: unknown) {
  if (
    error instanceof ClubsTeamPersonReviewAggregateReadValidationError ||
    named(error, "ClubsTeamPersonReviewAggregateReadValidationError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewAggregate("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  if (
    error instanceof ClubsTeamPersonReviewAggregateReadAuthorityError ||
    named(error, "ClubsTeamPersonReviewAggregateReadAuthorityError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewAggregate("permission_denied"),
      { status: 403, headers: noStore },
    );
  }
  if (
    error instanceof ClubsTeamPersonReviewAggregateReadNotFoundError ||
    named(error, "ClubsTeamPersonReviewAggregateReadNotFoundError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewAggregate("not_found"),
      { status: 404, headers: noStore },
    );
  }
  return Response.json(
    unavailableClubsTeamPersonReviewAggregate("temporarily_unavailable"),
    { status: 503, headers: noStore },
  );
}

export async function handleClubsTeamPersonReviewAggregateReadGet(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewAggregateReadRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsTeamPersonReviewAggregate(
        "preview_or_b2b_host_required",
      ),
      { status: 404, headers: noStore },
    );
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  const reference = reviewReferenceSchema.safeParse(
    request.nextUrl.searchParams.get("reviewReference"),
  );
  if (!reference.success) {
    return Response.json(
      unavailableClubsTeamPersonReviewAggregate("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  try {
    return Response.json(
      await dependencies.readReadiness(
        resolved.authority,
        reference.data,
      ),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function GET(request: NextRequest) {
  return handleClubsTeamPersonReviewAggregateReadGet(request);
}
