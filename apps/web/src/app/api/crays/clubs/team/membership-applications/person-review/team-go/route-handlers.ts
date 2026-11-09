import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  resolveClubsTeamMembershipReviewActor,
  validClubsTeamMembershipReviewHost,
} from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import { validClubsTeamIssueOrigin } from "@/lib/clubs/team-launch-route-auth";
import {
  ClubsTeamPersonReviewTeamGoAuthorityError,
  ClubsTeamPersonReviewTeamGoConflictError,
  ClubsTeamPersonReviewTeamGoNotFoundError,
  ClubsTeamPersonReviewTeamGoValidationError,
  executeClubsTeamPersonReviewTeamGo,
  reconcileClubsTeamPersonReviewTeamGo,
} from "@/db/clubs-team-membership-person-review-team-go-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import {
  CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT,
  type ClubsTeamPersonReviewTeamGoAuthority,
  unavailableClubsTeamPersonReviewTeamGo,
} from "@/lib/clubs/team-membership-person-review-team-go-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const commandSchema = z
  .object({
    type: z.literal("issue_team_go"),
    reviewReference: z.string().regex(/^cclub-review-[a-f0-9]{32}$/),
  })
  .strict();

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type ClubsTeamPersonReviewTeamGoRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  validOrigin: typeof validClubsTeamIssueOrigin;
  resolveActor: (request: NextRequest) => Promise<TeamActorResolution>;
  resolveExactProof: (
    request: NextRequest,
  ) => Promise<ClubsExactB2bSessionResolution>;
  executeCommand: typeof executeClubsTeamPersonReviewTeamGo;
  reconcileCommand: typeof reconcileClubsTeamPersonReviewTeamGo;
};

const defaults: ClubsTeamPersonReviewTeamGoRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  validOrigin: validClubsTeamIssueOrigin,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  resolveExactProof: resolveExactB2bSessionProof,
  executeCommand: executeClubsTeamPersonReviewTeamGo,
  reconcileCommand: reconcileClubsTeamPersonReviewTeamGo,
};

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

async function resolveAuthority(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewTeamGoRouteDependencies,
): Promise<
  { authority: ClubsTeamPersonReviewTeamGoAuthority } | { response: Response }
> {
  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReviewTeamGo("actor_authority_unavailable"),
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
        unavailableClubsTeamPersonReviewTeamGo("wrong_vertical_session"),
        { status: 403, headers: noStore },
      ),
    };
  }
  if (exactResolution.status !== "ready") {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReviewTeamGo(
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
    error instanceof ClubsTeamPersonReviewTeamGoValidationError ||
    named(error, "ClubsTeamPersonReviewTeamGoValidationError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  if (
    error instanceof ClubsTeamPersonReviewTeamGoAuthorityError ||
    named(error, "ClubsTeamPersonReviewTeamGoAuthorityError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("permission_denied"),
      { status: 403, headers: noStore },
    );
  }
  if (
    error instanceof ClubsTeamPersonReviewTeamGoNotFoundError ||
    named(error, "ClubsTeamPersonReviewTeamGoNotFoundError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("not_found"),
      { status: 404, headers: noStore },
    );
  }
  if (
    error instanceof ClubsTeamPersonReviewTeamGoConflictError ||
    named(error, "ClubsTeamPersonReviewTeamGoConflictError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo(
        "version_or_state_or_payload_conflict",
      ),
      { status: 409, headers: noStore },
    );
  }
  return Response.json(
    {
      ...unavailableClubsTeamPersonReviewTeamGo("unknown_outcome"),
      reconcileWithGetBeforeRetry: true,
      retryWithSameIdempotencyKey: true,
    },
    { status: 503, headers: { ...noStore, "retry-after": "2" } },
  );
}

export async function handleClubsTeamPersonReviewTeamGoGet(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewTeamGoRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("preview_or_b2b_host_required"),
      { status: 404, headers: noStore },
    );
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  const key = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!key.success) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("idempotency_key_required"),
      { status: 400, headers: noStore },
    );
  }
  try {
    return Response.json(
      await dependencies.reconcileCommand(resolved.authority, key.data),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function handleClubsTeamPersonReviewTeamGoPost(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewTeamGoRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("preview_or_b2b_host_required"),
      { status: 404, headers: noStore },
    );
  }
  if (!dependencies.validOrigin(request)) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("origin_denied"),
      { status: 403, headers: noStore },
    );
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("json_required"),
      { status: 415, headers: noStore },
    );
  }
  const key = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!key.success || !command.success) {
    return Response.json(
      unavailableClubsTeamPersonReviewTeamGo("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  try {
    return Response.json(
      await dependencies.executeCommand(
        resolved.authority,
        key.data,
        command.data,
      ),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function GET(request: NextRequest) {
  return handleClubsTeamPersonReviewTeamGoGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsTeamPersonReviewTeamGoPost(request);
}

export const clubsTeamPersonReviewTeamGoRouteContract =
  CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_TEAM_GO_CONTRACT;
