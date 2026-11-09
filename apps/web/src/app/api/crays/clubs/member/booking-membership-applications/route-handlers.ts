import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingHandoffStayError } from "@/lib/clubs/booking-handoff-stay-validation";

import {
  BookingMembershipReplayConflictError,
  BookingMembershipResumeNotFoundError,
  BookingMembershipReviewerUnavailableError,
  BookingMembershipStateConflictError,
  BookingMembershipTokenConfigurationError,
  BookingMembershipValidationError,
  executeBookingMembershipCommand,
  readBookingMembershipApplication,
} from "@/db/clubs-booking-membership-application-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const optionalHttpsUrl = z
  .string()
  .max(500)
  .url()
  .refine((value) => new URL(value).protocol === "https:")
  .nullable();

const intentSchema = z
  .object({
    propertyId: z.enum([
      "property-clubs-forest-city-golf",
      "property-clubs-forest-city-marina",
    ]),
    dateMode: z.enum(["exact", "flexible"]),
    checkIn: date,
    checkOut: date,
    flexibleMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .nullable(),
    flexibleStay: z.enum(["weekend", "week", "month"]).nullable(),
    stayUnit: z.enum(["night", "week", "month"]),
    nights: z.number().int().min(1).max(366).nullable(),
    guests: z.number().int().min(1).max(20),
    children: z.number().int().min(0).max(20),
    pets: z.number().int().min(0).max(10),
    requestedServices: z
      .array(
        z
          .string()
          .min(1)
          .max(120)
          .regex(/^[A-Za-z0-9:_.-]+$/),
      )
      .max(20)
      .default([]),
    returnTo: z.string().min(1).max(2048),
  })
  .superRefine((value, context) => {
    const error = bookingHandoffStayError(value);
    if (error) context.addIssue({ code: "custom", message: error });
  });

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

const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create_handoff"), intent: intentSchema }),
  z.object({
    type: z.literal("submit_primary_application"),
    resumeToken: z.string().regex(/^cbm1_[A-Za-z0-9_-]{43}$/),
    expectedVersion: z.number().int().positive(),
    applicant: applicantSchema,
  }),
]);

const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type AccountResolution = Awaited<
  ReturnType<typeof resolveClubsMemberApiAccount>
>;

export type BookingMembershipRouteDependencies = {
  resolveAccount: (request: NextRequest) => Promise<AccountResolution>;
  readApplication: typeof readBookingMembershipApplication;
  executeCommand: typeof executeBookingMembershipCommand;
  validateMutation: typeof validateClubsMemberMutationRequest;
};

const defaults: BookingMembershipRouteDependencies = {
  resolveAccount: resolveClubsMemberApiAccount,
  readApplication: readBookingMembershipApplication,
  executeCommand: executeBookingMembershipCommand,
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
    membershipAuthority: false,
    propertyAdmission: false,
    availabilityAuthority: false,
    quoteAuthority: false,
    bookingAuthority: false,
    membershipPaymentPreparation: false,
    stayPaymentPreparation: false,
  };
}

export async function handleBookingMembershipGet(
  request: NextRequest,
  deps: BookingMembershipRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;
  const resumeToken = request.nextUrl.searchParams.get("resume") ?? "";
  if (!/^cbm1_[A-Za-z0-9_-]{43}$/.test(resumeToken))
    return Response.json(boundary("validation_error"), {
      status: 400,
      headers: clubsMemberNoStore,
    });
  try {
    return Response.json(
      await deps.readApplication(member.accountId, resumeToken),
      { headers: clubsMemberNoStore },
    );
  } catch (error) {
    if (
      error instanceof BookingMembershipResumeNotFoundError ||
      named(error, "BookingMembershipResumeNotFoundError")
    )
      return Response.json(boundary("not_found_or_expired"), {
        status: 404,
        headers: clubsMemberNoStore,
      });
    return Response.json(boundary("temporarily_unavailable"), {
      status: 503,
      headers: clubsMemberNoStore,
    });
  }
}

export async function handleBookingMembershipPost(
  request: NextRequest,
  deps: BookingMembershipRouteDependencies = defaults,
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
    const result = await deps.executeCommand(
      member.accountId,
      idempotencyKey,
      command.data,
    );
    return Response.json(result, { headers: clubsMemberNoStore });
  } catch (error) {
    if (
      error instanceof BookingMembershipResumeNotFoundError ||
      named(error, "BookingMembershipResumeNotFoundError")
    )
      return Response.json(boundary("not_found_or_expired"), {
        status: 404,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof BookingMembershipReplayConflictError ||
      named(error, "BookingMembershipReplayConflictError") ||
      error instanceof BookingMembershipStateConflictError ||
      named(error, "BookingMembershipStateConflictError")
    )
      return Response.json(boundary("state_conflict"), {
        status: 409,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof BookingMembershipValidationError ||
      named(error, "BookingMembershipValidationError")
    )
      return Response.json(boundary("validation_error"), {
        status: 400,
        headers: clubsMemberNoStore,
      });
    if (
      error instanceof BookingMembershipReviewerUnavailableError ||
      named(error, "BookingMembershipReviewerUnavailableError") ||
      error instanceof BookingMembershipTokenConfigurationError ||
      named(error, "BookingMembershipTokenConfigurationError")
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
  return handleBookingMembershipGet(request);
}

export async function POST(request: NextRequest) {
  return handleBookingMembershipPost(request);
}
