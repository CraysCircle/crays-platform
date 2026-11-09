import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import { resolveClubsTeamMembershipReviewActor } from "@/app/api/crays/clubs/team/membership-applications/route-handlers";
import {
  BookingPartyTeamGoAuthorityError,
  BookingPartyTeamGoValidationError,
} from "@/db/clubs-booking-party-team-go-evidence-repository";
import type { ClubsExactB2bSessionResolution } from "@/lib/clubs/ambassador-pre-registration-contract";
import {
  BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT,
  bookingPartyTeamGoDeniedAuthorities,
  type BookingPartyTeamGoAuthority,
} from "@/lib/clubs/booking-party-team-go-evidence-contract";
import {
  BookingPartyTeamGoPreviewProofNotFoundError,
  BookingPartyTeamGoPreviewProofReplayConflictError,
  BookingPartyTeamGoPreviewProofUnknownOutcomeError,
  BookingPartyTeamGoPreviewProofValidationError,
  probeBookingPartyTeamGoRealSessionAuthority,
  reconcileBookingPartyTeamGoRealSessionPreviewProof,
  runBookingPartyTeamGoRealSessionPreviewProof,
} from "@/lib/clubs/booking-party-team-go-real-session-preview-proof-server";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const bodySchema = z
  .object({
    mode: z.literal("rollback_only_golf_repository_proof"),
    requestRevision: z.number().int().positive().max(2_147_483_647),
  })
  .strict();
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(160)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type TeamActorResolution = Awaited<
  ReturnType<typeof resolveClubsTeamMembershipReviewActor>
>;

function unavailable(status: string) {
  return {
    schema: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.schema,
    version: BOOKING_PARTY_TEAM_GO_EVIDENCE_CONTRACT.version,
    status,
    rollbackProofPassed: false,
    durableGolfWorkflowAuthorized: false,
    t3SandboxUnlocked: false,
    marinaMembershipReady: false,
    marinaAdmissionReady: false,
    sandboxE2ePassed: false,
    productionPassed: false,
    authorities: bookingPartyTeamGoDeniedAuthorities(),
  };
}

function named(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

function loopbackName(value: string) {
  return value === "127.0.0.1" || value === "localhost" || value === "::1";
}

function strictLocalPreviewRequest(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const directHost = request.headers.get("host");
  if (!directHost || directHost.includes(",")) return false;
  let directHostname: string;
  try {
    directHostname = new URL(`http://${directHost}`).hostname;
  } catch {
    return false;
  }
  return loopbackName(directHostname) && loopbackName(request.nextUrl.hostname);
}

function strictLocalSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return loopbackName(parsed.hostname) && parsed.origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

async function resolveRealAuthority(
  request: NextRequest,
): Promise<{ authority: BookingPartyTeamGoAuthority } | { response: Response }> {
  let exactResolution: ClubsExactB2bSessionResolution;
  try {
    exactResolution = await resolveExactB2bSessionProof(request);
  } catch {
    exactResolution = { status: "unavailable" };
  }
  if (exactResolution.status === "b2c_rejected") {
    return {
      response: Response.json(unavailable("wrong_vertical_session"), {
        status: 403,
        headers: noStore,
      }),
    };
  }
  if (exactResolution.status !== "ready") {
    return {
      response: Response.json(unavailable("exact_b2b_session_unavailable"), {
        status: 503,
        headers: noStore,
      }),
    };
  }

  let actorResolution: TeamActorResolution;
  try {
    actorResolution = await resolveClubsTeamMembershipReviewActor(
      request,
      exactResolution.proof,
    );
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
      proof: exactResolution.proof,
    },
  };
}

function mapProofError(error: unknown) {
  if (
    error instanceof BookingPartyTeamGoPreviewProofValidationError ||
    error instanceof BookingPartyTeamGoValidationError ||
    named(error, "BookingPartyTeamGoPreviewProofValidationError") ||
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
    error instanceof BookingPartyTeamGoPreviewProofNotFoundError ||
    named(error, "BookingPartyTeamGoPreviewProofNotFoundError")
  ) {
    return Response.json(unavailable("not_found"), {
      status: 404,
      headers: noStore,
    });
  }
  if (
    error instanceof BookingPartyTeamGoPreviewProofReplayConflictError ||
    named(error, "BookingPartyTeamGoPreviewProofReplayConflictError")
  ) {
    return Response.json(unavailable("idempotency_payload_conflict"), {
      status: 409,
      headers: noStore,
    });
  }
  if (
    error instanceof BookingPartyTeamGoPreviewProofUnknownOutcomeError ||
    named(error, "BookingPartyTeamGoPreviewProofUnknownOutcomeError")
  ) {
    return Response.json(
      {
        ...unavailable("unknown_outcome"),
        retrySameIdempotencyKey: true,
        reconcileWithAuthenticatedGet: true,
      },
      { status: 503, headers: noStore },
    );
  }
  return Response.json(
    {
      ...unavailable("unknown_outcome"),
      retrySameIdempotencyKey: true,
      reconcileWithAuthenticatedGet: true,
    },
    { status: 503, headers: noStore },
  );
}

export async function GET(request: NextRequest) {
  if (!strictLocalPreviewRequest(request)) {
    return Response.json(unavailable("local_preview_only"), {
      status: 404,
      headers: noStore,
    });
  }
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "authority_readiness" && mode !== "reconcile") {
    return Response.json(unavailable("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  const resolved = await resolveRealAuthority(request);
  if ("response" in resolved) return resolved.response;
  try {
    if (mode === "authority_readiness") {
      if (request.nextUrl.searchParams.size !== 1) {
        return Response.json(unavailable("validation_error"), {
          status: 400,
          headers: noStore,
        });
      }
      const proof = await probeBookingPartyTeamGoRealSessionAuthority(
        resolved.authority,
      );
      return Response.json(
        {
          ...proof,
          durableGolfWorkflowAuthorized: false,
          t3SandboxUnlocked: false,
          sandboxE2ePassed: false,
          productionPassed: false,
        },
        { headers: noStore },
      );
    }
    const parsedKey = idempotencyKeySchema.safeParse(
      request.nextUrl.searchParams.get("idempotencyKey"),
    );
    if (!parsedKey.success || request.nextUrl.searchParams.size !== 2) {
      return Response.json(unavailable("validation_error"), {
        status: 400,
        headers: noStore,
      });
    }
    return Response.json(
      await reconcileBookingPartyTeamGoRealSessionPreviewProof(
        resolved.authority,
        parsedKey.data,
      ),
      { headers: noStore },
    );
  } catch (error) {
    return mapProofError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!strictLocalPreviewRequest(request)) {
    return Response.json(unavailable("local_preview_only"), {
      status: 404,
      headers: noStore,
    });
  }
  if (!strictLocalSameOrigin(request)) {
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
  const parsedKey = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!parsedKey.success) {
    return Response.json(unavailable("idempotency_key_required"), {
      status: 400,
      headers: noStore,
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(unavailable("invalid_json"), {
      status: 400,
      headers: noStore,
    });
  }
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(unavailable("validation_error"), {
      status: 400,
      headers: noStore,
    });
  }
  const resolved = await resolveRealAuthority(request);
  if ("response" in resolved) return resolved.response;
  try {
    return Response.json(
      await runBookingPartyTeamGoRealSessionPreviewProof(
        resolved.authority,
        parsedKey.data,
        parsedBody.data.requestRevision,
      ),
      { headers: noStore },
    );
  } catch (error) {
    return mapProofError(error);
  }
}
