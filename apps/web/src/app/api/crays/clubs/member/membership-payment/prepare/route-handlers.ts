import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";

import {
  ClubsMembershipPaymentAdapterReplayConflictError,
  ClubsMembershipPaymentAdapterStateConflictError,
  ClubsMembershipPaymentAdapterValidationError,
} from "@/lib/member-commerce/clubs-membership-payment-adapter-contract";
import { prepareClubsMemberMembershipPayment } from "@/lib/member-commerce/clubs-membership-payment-adapter-service";
import { resolveClubsMemberApiAccount } from "@/lib/clubs/member-api-state";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = Object.freeze({
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
});
const MAX_BODY_BYTES = 4_096;
const commandSchema = z
  .object({ type: z.literal("prepare_membership_payment") })
  .strict();
const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type AccountResolution = Awaited<
  ReturnType<typeof resolveClubsMemberApiAccount>
>;

export type ClubsMembershipPaymentPrepareRouteDependencies = {
  resolveAccount: (request: NextRequest) => Promise<AccountResolution>;
  validateMutation: typeof validateClubsMemberMutationRequest;
  preparePayment: typeof prepareClubsMemberMembershipPayment;
};

const defaults: ClubsMembershipPaymentPrepareRouteDependencies = {
  resolveAccount: resolveClubsMemberApiAccount,
  validateMutation: validateClubsMemberMutationRequest,
  preparePayment: prepareClubsMemberMembershipPayment,
};

function errorNamed(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

export async function handleClubsMembershipPaymentPreparePost(
  request: NextRequest,
  deps: ClubsMembershipPaymentPrepareRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;

  const security = deps.validateMutation(request);
  if (!security.allowed) {
    return Response.json(
      {
        status: "denied",
        reason: security.reason,
        paymentKind: "MEMBERSHIP",
        livemode: false,
        providerCalled: false,
        providerSuccessClaimed: false,
        paymentSuccessClaimed: false,
        membershipGranted: false,
      },
      { status: 403, headers: responseHeaders },
    );
  }

  const advertisedLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_BODY_BYTES) {
    return Response.json(
      {
        status: "validation_error",
        paymentKind: "MEMBERSHIP",
        livemode: false,
        providerCalled: false,
        paymentSuccessClaimed: false,
      },
      { status: 413, headers: responseHeaders },
    );
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return Response.json(
      {
        status: "validation_error",
        paymentKind: "MEMBERSHIP",
        livemode: false,
        providerCalled: false,
        paymentSuccessClaimed: false,
      },
      { status: 413, headers: responseHeaders },
    );
  }
  let parsedBody: unknown = null;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = null;
  }
  const command = commandSchema.safeParse(parsedBody);
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!command.success || !idempotencyKeySchema.safeParse(idempotencyKey).success) {
    return Response.json(
      {
        status: "validation_error",
        paymentKind: "MEMBERSHIP",
        livemode: false,
        providerCalled: false,
        providerSuccessClaimed: false,
        paymentSuccessClaimed: false,
        membershipGranted: false,
      },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const result = await deps.preparePayment({
      memberAccountId: member.accountId,
      idempotencyKey,
    });
    return Response.json(result, {
      status: result.status === "structurally_ready" ? 200 : 503,
      headers:
        result.status === "structurally_ready"
          ? responseHeaders
          : { ...responseHeaders, "retry-after": "5" },
    });
  } catch (error) {
    if (
      error instanceof ClubsMembershipPaymentAdapterValidationError ||
      errorNamed(error, "ClubsMembershipPaymentAdapterValidationError")
    ) {
      return Response.json(
        {
          status: "validation_error",
          paymentKind: "MEMBERSHIP",
          livemode: false,
          providerCalled: false,
          paymentSuccessClaimed: false,
          membershipGranted: false,
        },
        { status: 400, headers: responseHeaders },
      );
    }
    if (
      error instanceof ClubsMembershipPaymentAdapterReplayConflictError ||
      error instanceof ClubsMembershipPaymentAdapterStateConflictError ||
      errorNamed(error, "ClubsMembershipPaymentAdapterReplayConflictError") ||
      errorNamed(error, "ClubsMembershipPaymentAdapterStateConflictError")
    ) {
      return Response.json(
        {
          status: "conflict",
          reason: "Refresh before retrying with a new command key.",
          paymentKind: "MEMBERSHIP",
          livemode: false,
          providerCalled: false,
          providerSuccessClaimed: false,
          paymentSuccessClaimed: false,
          membershipGranted: false,
        },
        { status: 409, headers: responseHeaders },
      );
    }
    return Response.json(
      {
        status: "unknown_outcome",
        reason: "Retry with the same command key to reconcile.",
        paymentKind: "MEMBERSHIP",
        livemode: false,
        providerCalled: false,
        providerSuccessClaimed: false,
        paymentSuccessClaimed: false,
        membershipGranted: false,
      },
      {
        status: 503,
        headers: { ...responseHeaders, "retry-after": "2" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleClubsMembershipPaymentPreparePost(request);
}
