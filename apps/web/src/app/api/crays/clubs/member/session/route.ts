import { NextRequest } from "next/server";
import { resolveClubsMemberAccountState } from "@/lib/clubs/member-account";
import {
  buildClubsLoginHref,
  buildClubsLogoutHref,
  buildClubsSignupHref,
} from "@/lib/clubs/member-auth-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const returnTo =
    request.nextUrl.searchParams.get("returnTo") ?? "/en/account";
  let resolution = await resolveClubsMemberAccountState(request, {includeOwnState: true});
  // Optional member data must not make the existing identity login unavailable.
  // This error-only fallback independently repeats every SDK/Core identity gate;
  // it never invents an own-state DTO or grants commercial authority.
  if (resolution.status === "core_unavailable" || resolution.status === "identity_binding_required") {
    resolution = await resolveClubsMemberAccountState(request);
  }
  if (resolution.status !== "ready") {
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
        authenticated: resolution.status === "identity_binding_required",
        accountMapped: false,
        loginHref: buildClubsLoginHref(returnTo),
        signupHref: buildClubsSignupHref(returnTo),
        provisioningHref:
          resolution.status === "identity_binding_required"
            ? "/api/crays/auth/provider/account"
            : null,
        bookingAuthority: false,
      },
      { status, headers: { "cache-control": "private, no-store", Vary: "Cookie" } },
    );
  }

  const account = resolution.bundle.account;
  const providerUser = resolution.provider;
  return Response.json(
    {
      status: "ready",
      authenticated: true,
      accountMapped: true,
      sessionMode: resolution.mode,
      account: {
        id: typeof account.account_id === "string" ? account.account_id : null,
        displayName:
          typeof account.display_name === "string"
            ? account.display_name
            : providerUser?.name
              ? providerUser.name
              : null,
        name:
          typeof account.display_name === "string"
            ? account.display_name
            : (providerUser?.name ?? null),
        email:
          typeof account.primary_contact === "string"
            ? account.primary_contact
            : (providerUser?.email ?? null),
        emailVerified: Boolean(providerUser?.emailVerified),
        backendSynced: true,
        provider: "auth0",
      },
      ...(resolution.ownState ? {ownState: resolution.ownState} : {}),
      bookingAuthority: false,
      logoutHref: buildClubsLogoutHref("/en"),
    },
    { headers: { "cache-control": "private, no-store", Vary: "Cookie" } },
  );
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
