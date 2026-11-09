import "server-only";

import type { NextRequest } from "next/server";
import {
  ClubsMemberPropertyEligibilityNotFoundError,
  ClubsMemberPropertyEligibilityValidationError,
  readClubsMemberPropertyEligibility,
} from "@/db/clubs-member-property-eligibility-repository";
import {
  clubsMemberNoStore,
  clubsMemberUnavailableResponse,
} from "@/lib/clubs/member-api-state";
import { resolveClubsMemberAccountState } from "@/lib/clubs/member-account";
import { CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT } from "@/lib/clubs/member-property-eligibility-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { propertyId: string };

export type ClubsMemberPropertyEligibilityRouteDependencies = {
  resolveAccountState: typeof resolveClubsMemberAccountState;
  readEligibility: typeof readClubsMemberPropertyEligibility;
};

const defaults: ClubsMemberPropertyEligibilityRouteDependencies = {
  resolveAccountState: resolveClubsMemberAccountState,
  readEligibility: readClubsMemberPropertyEligibility,
};

function errorNamed(error: unknown, expected: string) {
  return (
    error instanceof Error &&
    (error.name === expected || error.constructor.name === expected)
  );
}

async function clubsMemberEligibilityUnavailableResponse(
  resolution: Exclude<
    Awaited<ReturnType<typeof resolveClubsMemberAccountState>>,
    { status: "ready" }
  >,
) {
  const response = clubsMemberUnavailableResponse(
    resolution,
    "/en/hospitality/marina-hotel",
  );
  const payload = (await response.json()) as Record<string, unknown>;
  return Response.json(
    {
      ...payload,
      schema: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.schema,
      version: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.version,
      availabilityAuthority: false,
      bookingAuthority: false,
    },
    { status: response.status, headers: clubsMemberNoStore },
  );
}

export async function handleClubsMemberPropertyEligibilityGet(
  request: NextRequest,
  params: Params,
  deps: ClubsMemberPropertyEligibilityRouteDependencies = defaults,
) {
  const propertyId = params.propertyId;
  if (
    propertyId !== "property-clubs-forest-city-golf" &&
    propertyId !== "property-clubs-forest-city-marina"
  ) {
    return Response.json(
      {
        schema: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.schema,
        version: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.version,
        status: "not_found",
      },
      { status: 404, headers: clubsMemberNoStore },
    );
  }

  let accountId: string | null = null;
  if (propertyId === "property-clubs-forest-city-marina") {
    let resolution: Awaited<ReturnType<typeof resolveClubsMemberAccountState>>;
    try {
      resolution = await deps.resolveAccountState(request);
    } catch {
      return Response.json(
        {
          schema: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.schema,
          version: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.version,
          status: "configuration_or_provider_unavailable",
          availabilityAuthority: false,
          bookingAuthority: false,
        },
        { status: 503, headers: clubsMemberNoStore },
      );
    }
    if (resolution.status !== "ready") {
      return clubsMemberEligibilityUnavailableResponse(resolution);
    }
    const resolvedAccountId = resolution.bundle.account.account_id;
    if (typeof resolvedAccountId !== "string") {
      return Response.json(
        {
          schema: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.schema,
          version: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.version,
          status: "invalid_session_provenance",
          availabilityAuthority: false,
          bookingAuthority: false,
        },
        { status: 401, headers: clubsMemberNoStore },
      );
    }
    accountId = resolvedAccountId;
  }

  try {
    const payload = await deps.readEligibility(propertyId, accountId);
    return Response.json(payload, {
      status: payload.status === "property_scope_not_ready" ? 503 : 200,
      headers: clubsMemberNoStore,
    });
  } catch (error) {
    if (
      error instanceof ClubsMemberPropertyEligibilityNotFoundError ||
      errorNamed(error, "ClubsMemberPropertyEligibilityNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: clubsMemberNoStore },
      );
    }
    if (
      error instanceof ClubsMemberPropertyEligibilityValidationError ||
      errorNamed(error, "ClubsMemberPropertyEligibilityValidationError")
    ) {
      return Response.json(
        { status: "validation_error" },
        { status: 400, headers: clubsMemberNoStore },
      );
    }
    return Response.json(
      {
        schema: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.schema,
        version: CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT.version,
        status: "temporarily_unavailable",
        availabilityAuthority: false,
        bookingAuthority: false,
      },
      { status: 503, headers: clubsMemberNoStore },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  return handleClubsMemberPropertyEligibilityGet(request, await context.params);
}
