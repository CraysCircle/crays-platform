import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  DirectMembershipApplicationReplayConflictError,
  DirectMembershipApplicationReviewerUnavailableError,
  DirectMembershipApplicationStateConflictError,
  DirectMembershipApplicationValidationError,
  DirectMembershipApplicationVerifiedEmailUnavailableError,
  executeDirectMembershipApplicationCommand,
  readDirectMembershipApplication,
} from "@/db/clubs-direct-membership-application-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const optionalHttpsUrl = z
  .string()
  .max(500)
  .url()
  .refine((value) => new URL(value).protocol === "https:")
  .nullable();

const applicantSchema = z.object({
  applicantType: z.enum(["individual", "family", "team"]),
  fullName: z.string().trim().min(2).max(120),
  basedIn: z.string().trim().min(2).max(120),
  interest: z.string().trim().min(2).max(160),
  preferredArrivalWindow: z.string().trim().min(2).max(120),
  preferredParticipationLength: z.string().trim().min(2).max(120),
  linkedinUrl: optionalHttpsUrl,
  socialUrl: optionalHttpsUrl,
  profileUrl: optionalHttpsUrl,
  motivation: z.string().trim().min(20).max(2000),
  contribution: z.string().trim().min(20).max(2000),
  consent: z.literal(true),
});

const commandSchema = z.object({
  type: z.literal("submit_application"),
  applicant: applicantSchema,
});

const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type AccountResolution = Awaited<
  ReturnType<typeof resolveClubsMemberApiAccount>
>;

export type DirectMembershipApplicationMemberRouteDependencies = {
  resolveAccount: (request: NextRequest) => Promise<AccountResolution>;
  readApplication: typeof readDirectMembershipApplication;
  executeCommand: typeof executeDirectMembershipApplicationCommand;
  validateMutation: typeof validateClubsMemberMutationRequest;
};

const defaults: DirectMembershipApplicationMemberRouteDependencies = {
  resolveAccount: resolveClubsMemberApiAccount,
  readApplication: readDirectMembershipApplication,
  executeCommand: executeDirectMembershipApplicationCommand,
  validateMutation: validateClubsMemberMutationRequest,
};

function named(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

function boundary(status: string) {
  return {
    status,
    applicationPersisted: false,
    membershipAuthority: false,
    propertyAdmission: false,
    availabilityAuthority: false,
    quoteAuthority: false,
    bookingAuthority: false,
    paymentAuthority: false,
    revenueEntitlement: false,
  };
}

export async function handleDirectMembershipApplicationMemberGet(
  request: NextRequest,
  deps: DirectMembershipApplicationMemberRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;
  try {
    return Response.json(await deps.readApplication(member.accountId), {
      headers: clubsMemberNoStore,
    });
  } catch {
    return Response.json(boundary("temporarily_unavailable"), {
      status: 503,
      headers: clubsMemberNoStore,
    });
  }
}

export async function handleDirectMembershipApplicationMemberPost(
  request: NextRequest,
  deps: DirectMembershipApplicationMemberRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;

  const security = deps.validateMutation(request);
  if (!security.allowed)
    return Response.json(
      { ...boundary("denied"), reason: security.reason },
      { status: 403, headers: clubsMemberNoStore },
    );

  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    !command.success ||
    !idempotencyKeySchema.safeParse(idempotencyKey).success
  )
    return Response.json(boundary("validation_error"), {
      status: 400,
      headers: clubsMemberNoStore,
    });

  try {
    return Response.json(
      await deps.executeCommand(
        member.accountId,
        idempotencyKey,
        command.data,
      ),
      { headers: clubsMemberNoStore },
    );
  } catch (error) {
    if (
      error instanceof DirectMembershipApplicationReplayConflictError ||
      named(error, "DirectMembershipApplicationReplayConflictError")
    )
      return Response.json(boundary("replay_conflict"), {
        status: 409,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof DirectMembershipApplicationStateConflictError ||
      named(error, "DirectMembershipApplicationStateConflictError")
    )
      return Response.json(boundary("state_conflict"), {
        status: 409,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof
        DirectMembershipApplicationVerifiedEmailUnavailableError ||
      named(
        error,
        "DirectMembershipApplicationVerifiedEmailUnavailableError",
      )
    )
      return Response.json(boundary("account_contact_not_ready"), {
        status: 409,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof DirectMembershipApplicationValidationError ||
      named(error, "DirectMembershipApplicationValidationError")
    )
      return Response.json(boundary("validation_error"), {
        status: 400,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof DirectMembershipApplicationReviewerUnavailableError ||
      named(error, "DirectMembershipApplicationReviewerUnavailableError")
    )
      return Response.json(boundary("temporarily_unavailable"), {
        status: 503,
        headers: clubsMemberNoStore,
      });
    return Response.json(
      {
        ...boundary("unknown_outcome"),
        reason: "Retry with the same command key to reconcile.",
      },
      {
        status: 503,
        headers: { ...clubsMemberNoStore, "retry-after": "2" },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleDirectMembershipApplicationMemberGet(request);
}

export async function POST(request: NextRequest) {
  return handleDirectMembershipApplicationMemberPost(request);
}
