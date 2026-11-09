import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsAmbassadorPreRegistrationAuthorityError,
  ClubsAmbassadorPreRegistrationNotFoundError,
  ClubsAmbassadorPreRegistrationReplayConflictError,
  ClubsAmbassadorPreRegistrationStateConflictError,
  ClubsAmbassadorPreRegistrationValidationError,
  executeClubsAmbassadorPreRegistration,
  readClubsAmbassadorPreRegistrations,
} from "@/db/clubs-ambassador-pre-registration-repository";
import {
  resolveClubsAmbassadorOperationsActor,
  validClubsAmbassadorOperationsHost,
  validClubsAmbassadorOperationsOrigin,
} from "@/app/api/crays/clubs/ambassador/operations/route-handlers";
import {
  CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT,
  type ClubsAmbassadorPreRegistrationActor,
} from "@/lib/clubs/ambassador-pre-registration-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const slug = z.enum(
  CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.publicAmbassadorSlugs,
);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const provenanceReceipt = z
  .string()
  .regex(/^owner-provenance_[A-Za-z0-9:_.-]{16,180}$/);
const commandBase = {
  publicAmbassadorSlug: slug,
  expectedVersion: z.number().int().nonnegative(),
  ownerProvenanceReceiptId: provenanceReceipt,
  expectedIssuerSha256: sha256,
  expectedClientIdSha256: sha256,
};
const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("record_pending_contact_not_supplied"),
      ...commandBase,
      publicAmbassadorSlug: z.literal("aiana-lopes-bezerra"),
      reasonCode: z.literal("owner_contact_pending"),
    })
    .strict(),
  z
    .object({
      type: z.literal("pre_register_digest"),
      ...commandBase,
      normalizedEmailSha256: sha256,
      reasonCode: z.literal("owner_digest_pre_registered"),
    })
    .strict(),
]);
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type ActorResolution =
  | { actor: ClubsAmbassadorPreRegistrationActor }
  | { response: Response };

export type ClubsAmbassadorPreRegistrationRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  validOrigin: typeof validClubsAmbassadorOperationsOrigin;
  resolveActor(request: NextRequest): Promise<ActorResolution>;
  readPreRegistrations: typeof readClubsAmbassadorPreRegistrations;
  executeCommand: typeof executeClubsAmbassadorPreRegistration;
};

const defaults: ClubsAmbassadorPreRegistrationRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  validOrigin: validClubsAmbassadorOperationsOrigin,
  resolveActor: resolveClubsAmbassadorOperationsActor,
  readPreRegistrations: readClubsAmbassadorPreRegistrations,
  executeCommand: executeClubsAmbassadorPreRegistration,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

async function resolveActorFailClosed(
  request: NextRequest,
  dependencies: ClubsAmbassadorPreRegistrationRouteDependencies,
) {
  try {
    return await dependencies.resolveActor(request);
  } catch {
    return {
      response: Response.json(
        { status: "identity_authority_unavailable" },
        { status: 503, headers: noStore },
      ),
    } satisfies ActorResolution;
  }
}

export async function handleClubsAmbassadorPreRegistrationGet(
  request: NextRequest,
  dependencies: ClubsAmbassadorPreRegistrationRouteDependencies = defaults,
) {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }
  const resolution = await resolveActorFailClosed(request, dependencies);
  if ("response" in resolution) return resolution.response;
  try {
    const result = await dependencies.readPreRegistrations(resolution.actor);
    return Response.json(result, { status: 200, headers: noStore });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorPreRegistrationAuthorityError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
        { status: 403, headers: noStore },
      );
    }
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}

export async function handleClubsAmbassadorPreRegistrationPost(
  request: NextRequest,
  dependencies: ClubsAmbassadorPreRegistrationRouteDependencies = defaults,
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
  const resolution = await resolveActorFailClosed(request, dependencies);
  if ("response" in resolution) return resolution.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "invalid_json" },
      { status: 400, headers: noStore },
    );
  }
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_command" },
      { status: 400, headers: noStore },
    );
  }

  try {
    const result = await dependencies.executeCommand(
      resolution.actor,
      idempotency.data,
      parsed.data,
    );
    return Response.json(result, { status: 200, headers: noStore });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorPreRegistrationValidationError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationValidationError")
    ) {
      return Response.json(
        { status: "invalid_command" },
        { status: 400, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorPreRegistrationAuthorityError ||
      errorNamed(error, "ClubsAmbassadorPreRegistrationAuthorityError")
    ) {
      return Response.json(
        { status: "permission_denied" },
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
        { status: "conflict" },
        { status: 409, headers: noStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        retrySameIdempotencyKey: true,
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleClubsAmbassadorPreRegistrationGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsAmbassadorPreRegistrationPost(request);
}
