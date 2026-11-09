import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  resolveClubsTeamMembershipReviewActor,
  validClubsTeamMembershipReviewHost,
} from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  ClubsTeamPersonReviewCommandAuthorityError,
  ClubsTeamPersonReviewCommandConflictError,
  ClubsTeamPersonReviewCommandNotFoundError,
  ClubsTeamPersonReviewCommandValidationError,
  executeClubsTeamPersonReviewCommand,
  reconcileClubsTeamPersonReviewCommand,
} from "@/db/clubs-team-membership-person-review-command-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import {
  CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT,
  type ClubsTeamMembershipPersonReviewAuthority,
  unavailableClubsTeamPersonReview,
} from "@/lib/clubs/team-membership-person-review-command-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import { validClubsTeamIssueOrigin } from "@/lib/clubs/team-launch-route-auth";

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
    type: z.enum(["request_more_information", "approve", "decline"]),
    reviewReference: z.string().regex(/^cclub-review-[a-f0-9]{32}$/),
    personReference: z.string().regex(/^cclub-person-[a-f0-9]{32}$/),
    expectedApplicationVersion: z.number().int().positive(),
    expectedPersonVersion: z.number().int().positive(),
    expectedDecisionVersion: z.number().int().min(0),
  })
  .strict();

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type ClubsTeamPersonReviewCommandRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  validOrigin: typeof validClubsTeamIssueOrigin;
  resolveExactProof: (
    request: NextRequest,
  ) => Promise<ClubsExactB2bSessionResolution>;
  resolveActor: (request: NextRequest) => Promise<TeamActorResolution>;
  executeCommand: typeof executeClubsTeamPersonReviewCommand;
  reconcileCommand: typeof reconcileClubsTeamPersonReviewCommand;
};

const defaults: ClubsTeamPersonReviewCommandRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  validOrigin: validClubsTeamIssueOrigin,
  resolveExactProof: resolveExactB2bSessionProof,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  executeCommand: executeClubsTeamPersonReviewCommand,
  reconcileCommand: reconcileClubsTeamPersonReviewCommand,
};

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

async function resolveAuthority(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewCommandRouteDependencies,
): Promise<
  { authority: ClubsTeamMembershipPersonReviewAuthority } | { response: Response }
> {
  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReview("actor_authority_unavailable"),
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
        unavailableClubsTeamPersonReview("wrong_vertical_session"),
        { status: 403, headers: noStore },
      ),
    };
  }
  if (exactResolution.status !== "ready") {
    return {
      response: Response.json(
        unavailableClubsTeamPersonReview("exact_b2b_session_unavailable"),
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
    error instanceof ClubsTeamPersonReviewCommandValidationError ||
    named(error, "ClubsTeamPersonReviewCommandValidationError")
  ) {
    return Response.json(unavailableClubsTeamPersonReview("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  if (
    error instanceof ClubsTeamPersonReviewCommandAuthorityError ||
    named(error, "ClubsTeamPersonReviewCommandAuthorityError")
  ) {
    return Response.json(unavailableClubsTeamPersonReview("permission_denied"), {
      status: 403,
      headers: noStore,
    });
  }
  if (
    error instanceof ClubsTeamPersonReviewCommandNotFoundError ||
    named(error, "ClubsTeamPersonReviewCommandNotFoundError")
  ) {
    return Response.json(unavailableClubsTeamPersonReview("not_found"), {
      status: 404,
      headers: noStore,
    });
  }
  if (
    error instanceof ClubsTeamPersonReviewCommandConflictError ||
    named(error, "ClubsTeamPersonReviewCommandConflictError")
  ) {
    return Response.json(
      unavailableClubsTeamPersonReview("version_or_state_or_payload_conflict"),
      { status: 409, headers: noStore },
    );
  }
  return Response.json(
    {
      ...unavailableClubsTeamPersonReview("unknown_outcome"),
      reconcileWithGetBeforeRetry: true,
      retryWithSameIdempotencyKey: true,
    },
    { status: 503, headers: { ...noStore, "retry-after": "2" } },
  );
}

export async function handleClubsTeamPersonReviewCommandGet(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewCommandRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsTeamPersonReview("preview_or_b2b_host_required"),
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
      unavailableClubsTeamPersonReview("idempotency_key_required"),
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

export async function handleClubsTeamPersonReviewCommandPost(
  request: NextRequest,
  dependencies: ClubsTeamPersonReviewCommandRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsTeamPersonReview("preview_or_b2b_host_required"),
      { status: 404, headers: noStore },
    );
  }
  if (!dependencies.validOrigin(request)) {
    return Response.json(unavailableClubsTeamPersonReview("origin_denied"), {
      status: 403,
      headers: noStore,
    });
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(unavailableClubsTeamPersonReview("json_required"), {
      status: 415,
      headers: noStore,
    });
  }
  const key = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!key.success || !command.success) {
    return Response.json(unavailableClubsTeamPersonReview("validation_error"), {
      status: 400,
      headers: noStore,
    });
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
  return handleClubsTeamPersonReviewCommandGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsTeamPersonReviewCommandPost(request);
}

export const clubsTeamPersonReviewCommandRouteContract =
  CLUBS_TEAM_MEMBERSHIP_PERSON_REVIEW_COMMAND_CONTRACT;
