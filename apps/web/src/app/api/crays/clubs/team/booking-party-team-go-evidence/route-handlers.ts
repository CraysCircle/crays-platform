import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  validClubsAmbassadorOperationsHost,
  validClubsAmbassadorOperationsOrigin,
} from "@/app/api/crays/clubs/ambassador/operations/route-handlers";
import { resolveClubsTeamMembershipReviewActor } from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  BookingPartyTeamGoAuthorityError,
  BookingPartyTeamGoGuardianPolicyError,
  BookingPartyTeamGoNotFoundError,
  BookingPartyTeamGoReplayConflictError,
  BookingPartyTeamGoStateConflictError,
  BookingPartyTeamGoValidationError,
  executeBookingPartyTeamGo,
  readBookingPartyTeamGoStatus,
  reconcileBookingPartyTeamGoCommand,
} from "@/db/clubs-booking-party-team-go-evidence-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import {
  BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT,
  bookingPartyTeamGoDeniedAuthorities,
  type BookingPartyTeamGoAuthority,
} from "@/lib/clubs/booking-party-team-go-evidence-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const handoffIdSchema = z
  .string()
  .regex(/^clubs-booking-membership-handoff_[0-9a-f-]{36}$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("record_person_decision"),
      handoffId: handoffIdSchema,
      partyMemberId: z
        .string()
        .regex(/^clubs-booking-membership-party_[0-9a-f-]{36}$/),
      applicationId: z
        .string()
        .regex(/^clubs-direct-membership-application_[0-9a-f-]{36}$/),
      expectedPartyVersion: z.number().int().positive(),
      expectedApplicationVersion: z.number().int().positive(),
      expectedDecisionVersion: z.number().int().min(0),
      outcome: z.enum([
        "approved_for_membership_payment",
        "declined",
        "more_information_required",
      ]),
      reasonCode: z.enum([
        "membership_requirements_satisfied",
        "membership_requirements_not_satisfied",
        "more_information_required",
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("issue_aggregate_go"),
      handoffId: handoffIdSchema,
      expectedHandoffVersion: z.number().int().positive(),
      expectedPartySnapshotSha256: sha256Schema,
      expectedDecisionSnapshotSha256: sha256Schema,
    })
    .strict(),
]);

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

export type BookingPartyTeamGoRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  validOrigin: typeof validClubsAmbassadorOperationsOrigin;
  resolveExactProof: (
    request: NextRequest,
  ) => Promise<ClubsExactB2bSessionResolution>;
  resolveActor: (request: NextRequest) => Promise<TeamActorResolution>;
  executeCommand: typeof executeBookingPartyTeamGo;
  readStatus: typeof readBookingPartyTeamGoStatus;
  reconcileCommand: typeof reconcileBookingPartyTeamGoCommand;
};

const defaults: BookingPartyTeamGoRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  validOrigin: validClubsAmbassadorOperationsOrigin,
  resolveExactProof: resolveExactB2bSessionProof,
  resolveActor: resolveClubsTeamMembershipReviewActor,
  executeCommand: executeBookingPartyTeamGo,
  readStatus: readBookingPartyTeamGoStatus,
  reconcileCommand: reconcileBookingPartyTeamGoCommand,
};

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

function unavailable(status: string) {
  return {
    schema: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
    version: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.version,
    status,
    aggregateGoIssued: false,
    golfSandboxEvidenceReady: false,
    marinaMembershipReady: false,
    marinaAdmissionReady: false,
    authorities: bookingPartyTeamGoDeniedAuthorities(),
  };
}

async function resolveAuthority(
  request: NextRequest,
  dependencies: BookingPartyTeamGoRouteDependencies,
): Promise<{ authority: BookingPartyTeamGoAuthority } | { response: Response }> {
  let resolution: ClubsExactB2bSessionResolution;
  try {
    resolution = await dependencies.resolveExactProof(request);
  } catch {
    resolution = { status: "unavailable" };
  }
  if (resolution.status === "b2c_rejected") {
    return {
      response: Response.json(unavailable("wrong_vertical_session"), {
        status: 403,
        headers: noStore,
      }),
    };
  }
  if (resolution.status !== "ready") {
    return {
      response: Response.json(unavailable("exact_b2b_session_unavailable"), {
        status: 503,
        headers: noStore,
      }),
    };
  }

  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(unavailable("actor_authority_unavailable"), {
        status: 503,
        headers: noStore,
      }),
    };
  }
  if ("response" in actorResolution) return actorResolution;
  return {
    authority: {
      actor: actorResolution.actor,
      proof: resolution.proof,
    },
  };
}

function mapReadError(error: unknown) {
  if (
    error instanceof BookingPartyTeamGoValidationError ||
    named(error, "BookingPartyTeamGoValidationError")
  ) {
    return Response.json(unavailable("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  if (
    error instanceof BookingPartyTeamGoAuthorityError ||
    named(error, "BookingPartyTeamGoAuthorityError")
  ) {
    return Response.json(unavailable("permission_denied"), {
      status: 403,
      headers: noStore,
    });
  }
  if (
    error instanceof BookingPartyTeamGoNotFoundError ||
    named(error, "BookingPartyTeamGoNotFoundError")
  ) {
    return Response.json(unavailable("not_found"), {
      status: 404,
      headers: noStore,
    });
  }
  return Response.json(unavailable("temporarily_unavailable"), {
    status: 503,
    headers: noStore,
  });
}

export async function handleBookingPartyTeamGoGet(
  request: NextRequest,
  dependencies: BookingPartyTeamGoRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(unavailable("preview_or_b2b_host_required"), {
      status: 404,
      headers: noStore,
    });
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;

  const idempotencyKey = request.nextUrl.searchParams.get("idempotencyKey");
  const handoffId = request.nextUrl.searchParams.get("handoffId");
  try {
    if (idempotencyKey !== null && handoffId === null) {
      const parsed = idempotencyKeySchema.safeParse(idempotencyKey);
      if (!parsed.success) {
        return Response.json(unavailable("validation_error"), {
          status: 400,
          headers: noStore,
        });
      }
      return Response.json(
        await dependencies.reconcileCommand(resolved.authority, parsed.data),
        { headers: noStore },
      );
    }
    const parsed = handoffIdSchema.safeParse(handoffId);
    if (!parsed.success || idempotencyKey !== null) {
      return Response.json(unavailable("validation_error"), {
        status: 400,
        headers: noStore,
      });
    }
    return Response.json(
      await dependencies.readStatus(resolved.authority, parsed.data),
      { headers: noStore },
    );
  } catch (error) {
    return mapReadError(error);
  }
}

export async function handleBookingPartyTeamGoPost(
  request: NextRequest,
  dependencies: BookingPartyTeamGoRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(unavailable("preview_or_b2b_host_required"), {
      status: 404,
      headers: noStore,
    });
  }
  if (!dependencies.validOrigin(request)) {
    return Response.json(unavailable("origin_denied"), {
      status: 403,
      headers: noStore,
    });
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(unavailable("json_required"), {
      status: 415,
      headers: noStore,
    });
  }
  const idempotencyKey = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!idempotencyKey.success) {
    return Response.json(unavailable("idempotency_key_required"), {
      status: 400,
      headers: noStore,
    });
  }
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!command.success) {
    return Response.json(unavailable("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  const resolved = await resolveAuthority(request, dependencies);
  if ("response" in resolved) return resolved.response;

  try {
    return Response.json(
      await dependencies.executeCommand(
        resolved.authority,
        idempotencyKey.data,
        command.data,
      ),
      { headers: noStore },
    );
  } catch (error) {
    if (
      error instanceof BookingPartyTeamGoValidationError ||
      named(error, "BookingPartyTeamGoValidationError")
    ) {
      return Response.json(unavailable("validation_error"), {
        status: 400,
        headers: noStore,
      });
    }
    if (
      error instanceof BookingPartyTeamGoAuthorityError ||
      named(error, "BookingPartyTeamGoAuthorityError")
    ) {
      return Response.json(unavailable("permission_denied"), {
        status: 403,
        headers: noStore,
      });
    }
    if (
      error instanceof BookingPartyTeamGoNotFoundError ||
      named(error, "BookingPartyTeamGoNotFoundError")
    ) {
      return Response.json(unavailable("not_found"), {
        status: 404,
        headers: noStore,
      });
    }
    if (
      error instanceof BookingPartyTeamGoReplayConflictError ||
      error instanceof BookingPartyTeamGoStateConflictError ||
      named(error, "BookingPartyTeamGoReplayConflictError") ||
      named(error, "BookingPartyTeamGoStateConflictError")
    ) {
      return Response.json(unavailable("conflict"), {
        status: 409,
        headers: noStore,
      });
    }
    if (
      error instanceof BookingPartyTeamGoGuardianPolicyError ||
      named(error, "BookingPartyTeamGoGuardianPolicyError")
    ) {
      return Response.json(unavailable("guardian_policy_not_ready"), {
        status: 503,
        headers: noStore,
      });
    }
    const reconcileHref = `${BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.endpoint}?${new URLSearchParams(
      { idempotencyKey: idempotencyKey.data },
    ).toString()}`;
    return Response.json(
      {
        ...unavailable("unknown_outcome"),
        retrySameIdempotencyKey: true,
        reconcileByGet: reconcileHref,
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleBookingPartyTeamGoGet(request);
}

export async function POST(request: NextRequest) {
  return handleBookingPartyTeamGoPost(request);
}
