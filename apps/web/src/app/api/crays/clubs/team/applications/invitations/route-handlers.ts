import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  resolveClubsTeamMembershipReviewActor,
  validClubsTeamMembershipReviewHost,
} from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  ClubsOwnerApplicationInvitationAuthorityError,
  ClubsOwnerApplicationInvitationNotFoundError,
  ClubsOwnerApplicationInvitationReplayConflictError,
  ClubsOwnerApplicationInvitationStateConflictError,
  ClubsOwnerApplicationInvitationValidationError,
  executeClubsOwnerApplicationInvitation,
  readClubsOwnerApplicationInvitation,
} from "@/db/clubs-owner-application-invitation-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import {
  type ClubsOwnerApplicationInvitationAuthority,
  unavailableClubsOwnerApplicationInvitation,
} from "@/lib/clubs/owner-application-invitation-contract";
import { validClubsTeamIssueOrigin } from "@/lib/clubs/team-launch-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const applicationReference = z
  .string()
  .regex(/^cclub-owner-application-[a-f0-9]{32}$/);
const expectedVersion = z.number().int().nonnegative();
const idempotencyKey = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start_review"),
    applicationReference,
    expectedVersion,
    reasonCode: z.literal("owner_review_started"),
  }),
  z.object({
    type: z.literal("request_more_information"),
    applicationReference,
    expectedVersion,
    reasonCode: z.literal("owner_more_information_requested"),
  }),
  z.object({
    type: z.literal("approve_for_invitation"),
    applicationReference,
    expectedVersion,
    reasonCode: z.literal("owner_approved_invitation"),
  }),
  z.object({
    type: z.literal("decline"),
    applicationReference,
    expectedVersion,
    reasonCode: z.literal("owner_declined_application"),
  }),
]);

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type ClubsOwnerApplicationInvitationRouteDependencies = {
  validHost: typeof validClubsTeamMembershipReviewHost;
  validOrigin: typeof validClubsTeamIssueOrigin;
  resolveActor: (request: NextRequest) => Promise<TeamActorResolution>;
  resolveExactProof: (
    request: NextRequest,
  ) => Promise<ClubsExactB2bSessionResolution>;
  readApplications: typeof readClubsOwnerApplicationInvitation;
  executeCommand: typeof executeClubsOwnerApplicationInvitation;
};

const defaults: ClubsOwnerApplicationInvitationRouteDependencies = {
  validHost: validClubsTeamMembershipReviewHost,
  validOrigin: validClubsTeamIssueOrigin,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  resolveExactProof: resolveExactB2bSessionProof,
  readApplications: readClubsOwnerApplicationInvitation,
  executeCommand: executeClubsOwnerApplicationInvitation,
};

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

async function resolveAuthority(
  request: NextRequest,
  dependencies: ClubsOwnerApplicationInvitationRouteDependencies,
): Promise<
  | { authority: ClubsOwnerApplicationInvitationAuthority }
  | { response: Response }
> {
  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        unavailableClubsOwnerApplicationInvitation(
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
        unavailableClubsOwnerApplicationInvitation("wrong_vertical_session"),
        { status: 403, headers: noStore },
      ),
    };
  }
  if (exactResolution.status !== "ready") {
    return {
      response: Response.json(
        unavailableClubsOwnerApplicationInvitation(
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
    error instanceof ClubsOwnerApplicationInvitationAuthorityError ||
    named(error, "ClubsOwnerApplicationInvitationAuthorityError")
  ) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("permission_denied"),
      { status: 403, headers: noStore },
    );
  }
  if (
    error instanceof ClubsOwnerApplicationInvitationNotFoundError ||
    named(error, "ClubsOwnerApplicationInvitationNotFoundError")
  ) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("not_found"),
      { status: 404, headers: noStore },
    );
  }
  if (
    error instanceof ClubsOwnerApplicationInvitationReplayConflictError ||
    named(error, "ClubsOwnerApplicationInvitationReplayConflictError")
  ) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("idempotency_key_reused"),
      { status: 409, headers: noStore },
    );
  }
  if (
    error instanceof ClubsOwnerApplicationInvitationStateConflictError ||
    named(error, "ClubsOwnerApplicationInvitationStateConflictError")
  ) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("state_conflict"),
      { status: 409, headers: noStore },
    );
  }
  if (
    error instanceof ClubsOwnerApplicationInvitationValidationError ||
    named(error, "ClubsOwnerApplicationInvitationValidationError")
  ) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  return Response.json(
    unavailableClubsOwnerApplicationInvitation("unknown_outcome"),
    { status: 503, headers: { ...noStore, "retry-after": "2" } },
  );
}

export async function handleClubsOwnerApplicationInvitationGet(
  request: NextRequest,
  dependencies: ClubsOwnerApplicationInvitationRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation(
        "preview_or_b2b_host_required",
      ),
      { status: 404, headers: noStore },
    );
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  const reference = request.nextUrl.searchParams.get("applicationReference");
  const reconcileKey = request.nextUrl.searchParams.get("idempotencyKey");
  if (
    (reference !== null && !applicationReference.safeParse(reference).success) ||
    (reconcileKey !== null && !idempotencyKey.safeParse(reconcileKey).success) ||
    (reference !== null && reconcileKey !== null)
  ) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  try {
    return Response.json(
      await dependencies.readApplications(resolved.authority, {
        applicationReference: reference ?? undefined,
        idempotencyKey: reconcileKey ?? undefined,
      }),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function handleClubsOwnerApplicationInvitationPost(
  request: NextRequest,
  dependencies: ClubsOwnerApplicationInvitationRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation(
        "preview_or_b2b_host_required",
      ),
      { status: 404, headers: noStore },
    );
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;
  if (!dependencies.validOrigin(request)) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("invalid_origin"),
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
      unavailableClubsOwnerApplicationInvitation("json_required"),
      { status: 415, headers: noStore },
    );
  }
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  const command = commandSchema.safeParse(await request.json().catch(() => null));
  if (!idempotencyKey.safeParse(key).success || !command.success) {
    return Response.json(
      unavailableClubsOwnerApplicationInvitation("validation_error"),
      { status: 400, headers: noStore },
    );
  }
  try {
    return Response.json(
      await dependencies.executeCommand(
        resolved.authority,
        key,
        command.data,
      ),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function GET(request: NextRequest) {
  return handleClubsOwnerApplicationInvitationGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsOwnerApplicationInvitationPost(request);
}
