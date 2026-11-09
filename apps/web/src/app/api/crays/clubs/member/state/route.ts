import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsMemberCommandReplayConflictError,
  ClubsMemberCommandValidationError,
  executeClubsMemberCommand,
  readClubsMemberState,
} from "@/db/clubs-member-commerce-repository";
import {
  resolveClubsMemberAccountState,
  type ClubsMemberAccountState,
} from "@/lib/clubs/member-account";
import { buildClubsLoginHref } from "@/lib/clubs/member-auth-contract";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("save_property"),
    propertyId: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[A-Za-z0-9:_-]+$/),
  }),
  z.object({
    type: z.literal("remove_saved_property"),
    propertyId: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[A-Za-z0-9:_-]+$/),
  }),
  z.object({
    type: z.literal("add_cart"),
    propertyId: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[A-Za-z0-9:_-]+$/),
  }),
  z.object({
    type: z.literal("remove_cart"),
    propertyId: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[A-Za-z0-9:_-]+$/),
  }),
]);
const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9:_-]+$/);
const noStore = { "cache-control": "no-store" };

function unavailableResponse(
  resolution: Exclude<ClubsMemberAccountState, { status: "ready" }>,
) {
  const status =
    resolution.status === "signed_out" ||
    resolution.status === "invalid_session_provenance"
      ? 401
      : resolution.status === "identity_binding_required"
        ? 409
        : 503;
  return Response.json(
    {
      status: resolution.status,
      loginHref: buildClubsLoginHref("/en/account"),
      accountMapped: false,
      bookingAuthority: false,
    },
    { status, headers: noStore },
  );
}

export async function GET(request: NextRequest) {
  const resolution = await resolveClubsMemberAccountState(request);
  if (resolution.status !== "ready") return unavailableResponse(resolution);
  const accountId = resolution.bundle.account.account_id;
  if (typeof accountId !== "string") {
    return Response.json(
      {
        status: "invalid_session_provenance",
        accountMapped: false,
        bookingAuthority: false,
      },
      { status: 401, headers: noStore },
    );
  }
  try {
    return Response.json(
      { status: "ready", ...(await readClubsMemberState(accountId)) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  const resolution = await resolveClubsMemberAccountState(request);
  if (resolution.status !== "ready") return unavailableResponse(resolution);
  const accountId = resolution.bundle.account.account_id;
  if (typeof accountId !== "string") {
    return Response.json(
      {
        status: "invalid_session_provenance",
        accountMapped: false,
        bookingAuthority: false,
      },
      { status: 401, headers: noStore },
    );
  }
  const requestSecurity = validateClubsMemberMutationRequest(request);
  if (!requestSecurity.allowed) {
    return Response.json(
      { status: "denied", reason: requestSecurity.reason },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (
    !command.success ||
    !idempotencyKeySchema.safeParse(idempotencyKey).success
  ) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: noStore },
    );
  }
  try {
    const result = await executeClubsMemberCommand(
      accountId,
      idempotencyKey,
      command.data,
    );
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ClubsMemberCommandReplayConflictError) {
      return Response.json(
        {
          status: "conflict",
          reason: "The command key belongs to a different request.",
        },
        { status: 409, headers: noStore },
      );
    }
    if (error instanceof ClubsMemberCommandValidationError) {
      return Response.json(
        {
          status: "invalid",
          reason: "The command prerequisites are not satisfied.",
        },
        { status: 400, headers: noStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "Retry with the same command key to reconcile.",
      },
      { status: 503, headers: { ...noStore, "retry-after": "2" } },
    );
  }
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
