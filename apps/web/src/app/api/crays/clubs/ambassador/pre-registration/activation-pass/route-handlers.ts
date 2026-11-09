import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsAmbassadorPreRegistrationAuthorityError,
  ClubsAmbassadorPreRegistrationNotFoundError,
  ClubsAmbassadorPreRegistrationReplayConflictError,
  ClubsAmbassadorPreRegistrationStateConflictError,
  ClubsAmbassadorPreRegistrationValidationError,
  executeClubsAmbassadorActivationPass,
} from "@/db/clubs-ambassador-pre-registration-repository";
import {
  validClubsAmbassadorOperationsHost,
  validClubsAmbassadorOperationsOrigin,
} from "@/app/api/crays/clubs/ambassador/operations/route-handlers";
import {
  CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT,
  type ClubsExactB2bSessionResolution,
} from "@/lib/clubs/ambassador-pre-registration-contract";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const bodySchema = z
  .object({
    preRegistrationContext: z
      .string()
      .regex(/^clubs-ambassador-prereg_[0-9a-f-]{36}$/),
  })
  .strict();
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

export async function resolveExactT2B2bSessionProof(
  request: NextRequest,
): Promise<ClubsExactB2bSessionResolution> {
  return resolveExactB2bSessionProof(request);
}

export type ClubsAmbassadorActivationPassRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  validOrigin: typeof validClubsAmbassadorOperationsOrigin;
  resolveExactB2bSessionProof: typeof resolveExactT2B2bSessionProof;
  executeActivationPass: typeof executeClubsAmbassadorActivationPass;
};

const defaults: ClubsAmbassadorActivationPassRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  validOrigin: validClubsAmbassadorOperationsOrigin,
  resolveExactB2bSessionProof: resolveExactT2B2bSessionProof,
  executeActivationPass: executeClubsAmbassadorActivationPass,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

export async function handleClubsAmbassadorActivationPassPost(
  request: NextRequest,
  dependencies: ClubsAmbassadorActivationPassRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }
  if (!dependencies.validOrigin(request)) {
    return Response.json(
      { status: "origin_denied" },
      { status: 403, headers: noStore },
    );
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json(
      { status: "json_required" },
      { status: 415, headers: noStore },
    );
  }
  const idempotency = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!idempotency.success) {
    return Response.json(
      { status: "idempotency_key_required" },
      { status: 400, headers: noStore },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "invalid_json" },
      { status: 400, headers: noStore },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_context" },
      { status: 400, headers: noStore },
    );
  }

  let resolution: ClubsExactB2bSessionResolution;
  try {
    resolution = await dependencies.resolveExactB2bSessionProof(request);
  } catch {
    resolution = { status: "unavailable" };
  }
  if (resolution.status === "b2c_rejected") {
    return Response.json(
      { status: "wrong_vertical_session" },
      { status: 403, headers: noStore },
    );
  }
  if (resolution.status !== "ready") {
    return Response.json(
      {
        schema: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.schema,
        version: CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.version,
        status: "t2_exact_b2b_adapter_unavailable",
        accountActive: false,
        fullAccessActive: false,
        scopedAccessActive: false,
      },
      { status: 503, headers: noStore },
    );
  }

  try {
    const result = await dependencies.executeActivationPass(
      idempotency.data,
      parsed.data.preRegistrationContext,
      resolution.proof,
    );
    return Response.json(result, { status: 200, headers: noStore });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorPreRegistrationValidationError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationValidationError")
    ) {
      return Response.json(
        { status: "invalid_context" },
        { status: 400, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorPreRegistrationAuthorityError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationAuthorityError")
    ) {
      return Response.json(
        { status: "exact_b2b_binding_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorPreRegistrationNotFoundError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorPreRegistrationReplayConflictError ||
      error instanceof ClubsAmbassadorPreRegistrationStateConflictError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationReplayConflictError") ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationStateConflictError")
    ) {
      return Response.json(
        { status: "conflict", accountActive: false },
        { status: 409, headers: noStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        retrySameIdempotencyKey: true,
        accountActive: false,
        fullAccessActive: false,
        scopedAccessActive: false,
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleClubsAmbassadorActivationPassPost(request);
}
