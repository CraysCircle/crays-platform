import type { NextRequest } from "next/server";
import {
  resolveClubsMemberAccountState,
  type ClubsMemberAccountState,
} from "@/lib/clubs/member-account";
import { buildClubsLoginHref } from "@/lib/clubs/member-auth-contract";

const noStore = { "cache-control": "no-store" };

export function clubsMemberUnavailableResponse(
  resolution: Exclude<ClubsMemberAccountState, { status: "ready" }>,
  returnTo = "/en/account",
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
      loginHref: buildClubsLoginHref(returnTo),
      accountMapped: false,
      bookingAuthority: false,
    },
    { status, headers: noStore },
  );
}

export const clubsMemberNoStore = noStore;

export async function resolveClubsMemberApiAccount(request: NextRequest) {
  const resolution = await resolveClubsMemberAccountState(request);
  if (resolution.status !== "ready") {
    return { response: clubsMemberUnavailableResponse(resolution) } as const;
  }
  const accountId = resolution.bundle.account.account_id;
  if (typeof accountId !== "string") {
    return {
      response: Response.json(
        {
          status: "invalid_session_provenance",
          accountMapped: false,
          bookingAuthority: false,
        },
        { status: 401, headers: noStore },
      ),
    } as const;
  }
  return { accountId } as const;
}
