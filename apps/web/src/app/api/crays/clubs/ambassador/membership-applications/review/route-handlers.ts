import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import { resolveExactClubsAmbassadorB2bBootstrap } from "@/app/api/crays/clubs/ambassador/b2b-entitlement/route-handlers";
import {
  validClubsAmbassadorOperationsHost,
  validClubsAmbassadorOperationsOrigin,
} from "@/app/api/crays/clubs/ambassador/operations/route-handlers";
import {
  ClubsAmbassadorReviewCommandAuthorityError,
  ClubsAmbassadorReviewCommandConflictError,
  ClubsAmbassadorReviewCommandCrossAmbassadorError,
  ClubsAmbassadorReviewCommandNotFoundError,
  ClubsAmbassadorReviewCommandValidationError,
  executeClubsAmbassadorReviewCommand,
  readClubsAmbassadorReviewCommandReconciliation,
} from "@/db/clubs-ambassador-direct-membership-application-review-command-repository";
import {
  CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT,
  unavailableClubsAmbassadorReviewCommand,
} from "@/lib/clubs/ambassador-direct-membership-application-review-command-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };
const idempotencyKey = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);
const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start_ambassador_review"),
    reviewReference: z.string().regex(/^cclub-review-[a-f0-9]{32}$/),
    expectedVersion: z.number().int().positive(),
    reasonCode: z.literal("ambassador_review_started"),
  }),
  z.object({
    type: z.literal("request_more_information"),
    reviewReference: z.string().regex(/^cclub-review-[a-f0-9]{32}$/),
    expectedVersion: z.number().int().positive(),
    reasonCode: z.literal("more_information_requested"),
  }),
  z.object({
    type: z.literal("recommend_for_team_review"),
    reviewReference: z.string().regex(/^cclub-review-[a-f0-9]{32}$/),
    expectedVersion: z.number().int().positive(),
    reasonCode: z.literal("recommended_to_crays_team"),
  }),
  z.object({
    type: z.literal("do_not_recommend"),
    reviewReference: z.string().regex(/^cclub-review-[a-f0-9]{32}$/),
    expectedVersion: z.number().int().positive(),
    reasonCode: z.literal("not_recommended_to_crays_team"),
  }),
]);

type BootstrapResolution = Awaited<
  ReturnType<typeof resolveExactClubsAmbassadorB2bBootstrap>
>;

export type ClubsAmbassadorReviewCommandRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  validOrigin: typeof validClubsAmbassadorOperationsOrigin;
  resolveBootstrap: (request: NextRequest) => Promise<BootstrapResolution>;
  executeCommand: typeof executeClubsAmbassadorReviewCommand;
  readReconciliation: typeof readClubsAmbassadorReviewCommandReconciliation;
};

const defaults: ClubsAmbassadorReviewCommandRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  validOrigin: validClubsAmbassadorOperationsOrigin,
  resolveBootstrap: resolveExactClubsAmbassadorB2bBootstrap,
  executeCommand: executeClubsAmbassadorReviewCommand,
  readReconciliation: readClubsAmbassadorReviewCommandReconciliation,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

async function resolveBootstrap(
  request: NextRequest,
  deps: ClubsAmbassadorReviewCommandRouteDependencies,
) {
  try {
    return await deps.resolveBootstrap(request);
  } catch {
    return { status: "unavailable" } as const;
  }
}

function blockedBootstrap(resolution: BootstrapResolution) {
  if (resolution.status === "b2c_rejected") {
    return Response.json(
      { status: "wrong_vertical_session" },
      { status: 403, headers: noStore },
    );
  }
  return Response.json(unavailableClubsAmbassadorReviewCommand(), {
    status: 503,
    headers: noStore,
  });
}

function repositoryError(error: unknown) {
  if (
    error instanceof ClubsAmbassadorReviewCommandCrossAmbassadorError ||
    errorNamed(error, "ClubsAmbassadorReviewCommandCrossAmbassadorError")
  ) {
    return Response.json(
      { status: "cross_ambassador_denied" },
      { status: 403, headers: noStore },
    );
  }
  if (
    error instanceof ClubsAmbassadorReviewCommandNotFoundError ||
    errorNamed(error, "ClubsAmbassadorReviewCommandNotFoundError")
  ) {
    return Response.json(
      { status: "not_found" },
      { status: 404, headers: noStore },
    );
  }
  if (
    error instanceof ClubsAmbassadorReviewCommandAuthorityError ||
    errorNamed(error, "ClubsAmbassadorReviewCommandAuthorityError")
  ) {
    return Response.json(
      { status: "entitlement_denied" },
      { status: 403, headers: noStore },
    );
  }
  if (
    error instanceof ClubsAmbassadorReviewCommandConflictError ||
    errorNamed(error, "ClubsAmbassadorReviewCommandConflictError")
  ) {
    return Response.json(
      { status: "conflict", reason: "refresh_or_payload_drift" },
      { status: 409, headers: noStore },
    );
  }
  if (
    error instanceof ClubsAmbassadorReviewCommandValidationError ||
    errorNamed(error, "ClubsAmbassadorReviewCommandValidationError")
  ) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  return Response.json(
    {
      schema:
        CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.schema,
      version:
        CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_REVIEW_COMMAND_CONTRACT.version,
      status: "unknown_outcome",
      reconcileWithGetBeforeRetry: true,
      retryWithSameIdempotencyKey: true,
      reviewerAuthorityGranted: false,
      teamGoGranted: false,
      membershipCreated: false,
      paymentAuthorityGranted: false,
      commissionAuthorityGranted: false,
    },
    { status: 503, headers: { ...noStore, "retry-after": "2" } },
  );
}

export async function handleClubsAmbassadorReviewCommandGet(
  request: NextRequest,
  deps: ClubsAmbassadorReviewCommandRouteDependencies = defaults,
) {
  if (!deps.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }
  const key = idempotencyKey.safeParse(
    request.headers.get("idempotency-key"),
  );
  if (!key.success) {
    return Response.json(
      { status: "idempotency_key_required" },
      { status: 400, headers: noStore },
    );
  }
  const bootstrap = await resolveBootstrap(request, deps);
  if (bootstrap.status !== "ready") return blockedBootstrap(bootstrap);
  try {
    return Response.json(
      await deps.readReconciliation(bootstrap.evidence, key.data),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function handleClubsAmbassadorReviewCommandPost(
  request: NextRequest,
  deps: ClubsAmbassadorReviewCommandRouteDependencies = defaults,
) {
  if (!deps.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }
  if (!deps.validOrigin(request)) {
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
  const key = idempotencyKey.safeParse(
    request.headers.get("idempotency-key"),
  );
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!key.success || !command.success) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  const bootstrap = await resolveBootstrap(request, deps);
  if (bootstrap.status !== "ready") return blockedBootstrap(bootstrap);
  try {
    return Response.json(
      await deps.executeCommand(bootstrap.evidence, key.data, command.data),
      { headers: noStore },
    );
  } catch (error) {
    return repositoryError(error);
  }
}

export async function GET(request: NextRequest) {
  return handleClubsAmbassadorReviewCommandGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsAmbassadorReviewCommandPost(request);
}
