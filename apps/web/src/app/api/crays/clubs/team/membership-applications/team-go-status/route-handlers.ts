import "server-only";

import { NextRequest } from "next/server";

import {
  resolveClubsTeamMembershipReviewActor,
  validClubsTeamMembershipReviewHost,
} from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  ClubsTeamMembershipTeamGoOperationsAuthorityError,
  ClubsTeamMembershipTeamGoOperationsValidationError,
  readClubsTeamMembershipTeamGoOperations,
} from "@/db/clubs-team-membership-team-go-operations-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import {
  type ClubsTeamMembershipTeamGoOperationsAuthority,
  unavailableClubsTeamMembershipTeamGoOperations,
} from "@/lib/clubs/team-membership-team-go-operations-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type ClubsTeamMembershipTeamGoOperationsRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  resolveActor: (request: NextRequest) => Promise<TeamActorResolution>;
  resolveExactProof: (
    request: NextRequest,
  ) => Promise<ClubsExactB2bSessionResolution>;
  readOperations: typeof readClubsTeamMembershipTeamGoOperations;
};

const defaults: ClubsTeamMembershipTeamGoOperationsRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  resolveExactProof: resolveExactB2bSessionProof,
  readOperations: readClubsTeamMembershipTeamGoOperations,
};

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

async function resolveAuthority(
  request: NextRequest,
  dependencies: ClubsTeamMembershipTeamGoOperationsRouteDependencies,
): Promise<
  | { authority: ClubsTeamMembershipTeamGoOperationsAuthority }
  | { response: Response }
> {
  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        unavailableClubsTeamMembershipTeamGoOperations(
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
        unavailableClubsTeamMembershipTeamGoOperations(
          "wrong_vertical_session",
        ),
        { status: 403, headers: noStore },
      ),
    };
  }
  if (exactResolution.status !== "ready") {
    return {
      response: Response.json(
        unavailableClubsTeamMembershipTeamGoOperations(
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
    error instanceof ClubsTeamMembershipTeamGoOperationsAuthorityError ||
    named(error, "ClubsTeamMembershipTeamGoOperationsAuthorityError")
  ) {
    return Response.json(
      unavailableClubsTeamMembershipTeamGoOperations("permission_denied"),
      { status: 403, headers: noStore },
    );
  }
  if (
    error instanceof ClubsTeamMembershipTeamGoOperationsValidationError ||
    named(error, "ClubsTeamMembershipTeamGoOperationsValidationError")
  ) {
    return Response.json(
      unavailableClubsTeamMembershipTeamGoOperations(
        "reconciliation_required",
      ),
      { status: 503, headers: noStore },
    );
  }
  return Response.json(
    unavailableClubsTeamMembershipTeamGoOperations("temporarily_unavailable"),
    { status: 503, headers: noStore },
  );
}

export async function handleClubsTeamMembershipTeamGoOperationsGet(
  request: NextRequest,
  dependencies: ClubsTeamMembershipTeamGoOperationsRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsTeamMembershipTeamGoOperations(
        "preview_or_b2b_host_required",
      ),
      { status: 404, headers: noStore },
    );
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  try {
    return Response.json(
      await dependencies.readOperations(resolved.authority),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function GET(request: NextRequest) {
  return handleClubsTeamMembershipTeamGoOperationsGet(request);
}
