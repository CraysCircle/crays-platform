import { NextRequest } from "next/server";
import { getAuth0RuntimeConfigStateForRequest } from "@/lib/auth0";
import { getClubsMemberAuthUiContract } from "@/lib/clubs/member-auth-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const runtimeState = getAuth0RuntimeConfigStateForRequest(request);
  const configured =
    runtimeState.application === "clubs" &&
    runtimeState.appBaseUrlConfigured &&
    runtimeState.baseUrlMatchesRequestOrigin &&
    runtimeState.domainConfigured &&
    runtimeState.clientIdConfigured &&
    runtimeState.clientSecretConfigured &&
    runtimeState.secretConfigured;

  return Response.json(
    {
      ...getClubsMemberAuthUiContract(),
      runtime: {
        application: runtimeState.application,
        configured,
        state: configured ? "provider_ready" : "configuration_not_ready",
      },
      commercialGates: {
        propertyIdentityRooms: "source_not_ready",
        ratesAvailabilityQuote: "source_not_ready",
        saveCartBookingRequest: "deferred_not_passed",
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
