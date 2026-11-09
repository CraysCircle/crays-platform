import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ClubsMemberMembershipReplayConflictError,
  ClubsMemberMembershipStateConflictError,
  ClubsMemberMembershipValidationError,
  executeClubsMemberMembershipCommand,
  readClubsMemberMembership,
} from "@/db/clubs-member-membership-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("submit_application"),
    interestPropertyId: z
      .literal("property-clubs-forest-city-marina")
      .nullable()
      .default(null),
  }),
  z.object({ type: z.literal("withdraw_application") }),
]);

const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type AccountResolution = Awaited<
  ReturnType<typeof resolveClubsMemberApiAccount>
>;

export type ClubsMemberMembershipRouteDependencies = {
  resolveAccount: (request: NextRequest) => Promise<AccountResolution>;
  readMembership: typeof readClubsMemberMembership;
  executeCommand: typeof executeClubsMemberMembershipCommand;
  validateMutation: typeof validateClubsMemberMutationRequest;
};

const defaults: ClubsMemberMembershipRouteDependencies = {
  resolveAccount: resolveClubsMemberApiAccount,
  readMembership: readClubsMemberMembership,
  executeCommand: executeClubsMemberMembershipCommand,
  validateMutation: validateClubsMemberMutationRequest,
};

function errorNamed(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

export async function handleClubsMemberMembershipGet(
  request: NextRequest,
  deps: ClubsMemberMembershipRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;
  try {
    return Response.json(await deps.readMembership(member.accountId), {
      headers: clubsMemberNoStore,
    });
  } catch {
    return Response.json(
      {
        status: "temporarily_unavailable",
        membershipAuthority: false,
        marinaPropertyAdmission: false,
        bookingAuthority: false,
      },
      { status: 503, headers: clubsMemberNoStore },
    );
  }
}

export async function handleClubsMemberMembershipPost(
  request: NextRequest,
  deps: ClubsMemberMembershipRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;

  const security = deps.validateMutation(request);
  if (!security.allowed) {
    return Response.json(
      { status: "denied", reason: security.reason },
      { status: 403, headers: clubsMemberNoStore },
    );
  }

  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    !command.success ||
    !idempotencyKeySchema.safeParse(idempotencyKey).success
  ) {
    return Response.json(
      { status: "validation_error" },
      { status: 400, headers: clubsMemberNoStore },
    );
  }

  try {
    const result = await deps.executeCommand(
      member.accountId,
      idempotencyKey,
      command.data,
    );
    return Response.json(result, { headers: clubsMemberNoStore });
  } catch (error) {
    if (
      error instanceof ClubsMemberMembershipReplayConflictError ||
      errorNamed(error, "ClubsMemberMembershipReplayConflictError")
    ) {
      return Response.json(
        {
          status: "conflict",
          reason: "The command key belongs to a different request.",
        },
        { status: 409, headers: clubsMemberNoStore },
      );
    }
    if (
      error instanceof ClubsMemberMembershipStateConflictError ||
      errorNamed(error, "ClubsMemberMembershipStateConflictError")
    ) {
      return Response.json(
        {
          status: "state_conflict",
          reason: "The membership application state changed. Refresh safely.",
          membershipAuthority: false,
          marinaPropertyAdmission: false,
          bookingAuthority: false,
        },
        { status: 409, headers: clubsMemberNoStore },
      );
    }
    if (
      error instanceof ClubsMemberMembershipValidationError ||
      errorNamed(error, "ClubsMemberMembershipValidationError")
    ) {
      return Response.json(
        {
          status: "validation_error",
          membershipAuthority: false,
          marinaPropertyAdmission: false,
          bookingAuthority: false,
        },
        { status: 400, headers: clubsMemberNoStore },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "Retry with the same command key to reconcile.",
        membershipAuthority: false,
        marinaPropertyAdmission: false,
        bookingAuthority: false,
      },
      {
        status: 503,
        headers: { ...clubsMemberNoStore, "retry-after": "2" },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleClubsMemberMembershipGet(request);
}

export async function POST(request: NextRequest) {
  return handleClubsMemberMembershipPost(request);
}
