import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  PublicAmbassadorReferralAttributionAuthorityError,
  PublicAmbassadorReferralAttributionConflictError,
  PublicAmbassadorReferralAttributionCrossAmbassadorError,
  PublicAmbassadorReferralAttributionInactiveError,
  PublicAmbassadorReferralAttributionNotFoundError,
  PublicAmbassadorReferralAttributionValidationError,
  persistPublicAmbassadorReferralAttribution,
} from "@/db/clubs-public-ambassador-referral-attribution-repository";
import {
  CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT,
} from "@/lib/clubs/public-ambassador-referral-attribution-contract";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import {
  validateClubsMemberMutationRequest,
} from "@/lib/clubs/member-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const commandSchema = z
  .object({
    type: z.literal("persist_referral_attribution"),
    ambassadorSlug: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    opaqueReferralContext: z
      .string()
      .min(43)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/),
    safeReturnTo: z.string().min(1).max(512),
    sourceApplicationId: z
      .string()
      .regex(/^clubs-direct-membership-application_[0-9a-f-]{36}$/),
  })
  .strict();

const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9:_.-]+$/);

type AccountResolution = Awaited<
  ReturnType<typeof resolveClubsMemberApiAccount>
>;

export type PublicAmbassadorReferralAttributionRouteDependencies = {
  resolveAccount: (request: NextRequest) => Promise<AccountResolution>;
  validateMutation: typeof validateClubsMemberMutationRequest;
  persistAttribution: typeof persistPublicAmbassadorReferralAttribution;
};

const defaults: PublicAmbassadorReferralAttributionRouteDependencies = {
  resolveAccount: resolveClubsMemberApiAccount,
  validateMutation: validateClubsMemberMutationRequest,
  persistAttribution: persistPublicAmbassadorReferralAttribution,
};

function named(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

function boundary(status: string) {
  return {
    schema: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.schema,
    version: CLUBS_PUBLIC_AMBASSADOR_REFERRAL_ATTRIBUTION_CONTRACT.version,
    status,
    serverPass: false,
    attributionReceipt: null,
    applicationCreated: false,
    membershipCreated: false,
    bookingCreated: false,
    paymentAuthorityGranted: false,
    beneficiaryControlPlaneGranted: false,
    payoutControlPlaneGranted: false,
    foreignIdentifiersExposed: false,
  };
}

export async function handlePublicAmbassadorReferralAttributionPost(
  request: NextRequest,
  dependencies: PublicAmbassadorReferralAttributionRouteDependencies =
    defaults,
) {
  const member = await dependencies.resolveAccount(request);
  if ("response" in member) return member.response;

  const security = dependencies.validateMutation(request);
  if (!security.allowed) {
    return Response.json(
      { ...boundary("denied"), reason: security.reason },
      { status: 403, headers: clubsMemberNoStore },
    );
  }

  const command = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  const idempotencyKey =
    request.headers.get("idempotency-key")?.trim() ?? "";
  if (
    !command.success ||
    !idempotencyKeySchema.safeParse(idempotencyKey).success
  ) {
    return Response.json(boundary("validation_error"), {
      status: 400,
      headers: clubsMemberNoStore,
    });
  }

  try {
    const result = await dependencies.persistAttribution(
      member.accountId,
      idempotencyKey,
      {
        ambassadorSlug: command.data.ambassadorSlug,
        opaqueReferralContext: command.data.opaqueReferralContext,
        safeReturnTo: command.data.safeReturnTo,
        sourceApplicationId: command.data.sourceApplicationId,
      },
    );
    return Response.json(
      { ...result, serverPass: true },
      { status: 200, headers: clubsMemberNoStore },
    );
  } catch (error) {
    if (
      error instanceof PublicAmbassadorReferralAttributionValidationError ||
      named(error, "PublicAmbassadorReferralAttributionValidationError")
    ) {
      return Response.json(boundary("validation_error"), {
        status: 400,
        headers: clubsMemberNoStore,
      });
    }
    if (
      error instanceof PublicAmbassadorReferralAttributionCrossAmbassadorError ||
      named(
        error,
        "PublicAmbassadorReferralAttributionCrossAmbassadorError",
      ) ||
      error instanceof PublicAmbassadorReferralAttributionAuthorityError ||
      named(error, "PublicAmbassadorReferralAttributionAuthorityError")
    ) {
      return Response.json(boundary("cross_ambassador_denied"), {
        status: 403,
        headers: clubsMemberNoStore,
      });
    }
    if (
      error instanceof PublicAmbassadorReferralAttributionNotFoundError ||
      named(error, "PublicAmbassadorReferralAttributionNotFoundError")
    ) {
      return Response.json(boundary("not_found"), {
        status: 404,
        headers: clubsMemberNoStore,
      });
    }
    if (
      error instanceof PublicAmbassadorReferralAttributionInactiveError ||
      named(error, "PublicAmbassadorReferralAttributionInactiveError")
    ) {
      return Response.json(boundary("ambassador_inactive"), {
        status: 409,
        headers: clubsMemberNoStore,
      });
    }
    if (
      error instanceof PublicAmbassadorReferralAttributionConflictError ||
      named(error, "PublicAmbassadorReferralAttributionConflictError")
    ) {
      return Response.json(boundary("payload_drift_conflict"), {
        status: 409,
        headers: clubsMemberNoStore,
      });
    }
    return Response.json(
      {
        ...boundary("unknown_outcome"),
        retrySameIdempotencyKey: true,
      },
      {
        status: 503,
        headers: { ...clubsMemberNoStore, "retry-after": "2" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  return handlePublicAmbassadorReferralAttributionPost(request);
}
