import { NextRequest } from "next/server";
import { readExactSessionIdentity } from "@/lib/dal/exact-session-identity-read";
import { getAuth0RuntimeConfigState } from "@/lib/auth0";
import { createCraysSessionFromIdentityBundle } from "@/lib/auth-session-mapping";
import { createAnonymousSession, createDevelopmentSession, createProviderAuthenticatedSession, getAuthEnvironmentState } from "@/lib/auth-boundary";
import { requireServerPermission } from "@/lib/auth-guard";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  getNostrBrowserSessionConfigState,
  nostrBrowserSessionCookieName,
  resolveNostrBrowserProofFromRequest,
  type NostrBrowserSessionState,
} from "@/lib/nostr-browser-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readNostrBrowserProof(request: NextRequest): Promise<NostrBrowserSessionState> {
  try {
    return await resolveNostrBrowserProofFromRequest(request);
  } catch {
    return {
      status: "unavailable",
      cookiePresent: Boolean(request.cookies.get(nostrBrowserSessionCookieName)?.value),
      cookieHttpOnly: true,
      accountMapped: false,
      accessEnabled: false,
      auth0ProviderSessionRequired: true,
      proofAcceptedForStandaloneLogin: false,
      storesPrivateKeyMaterial: false,
      usesLocalStorage: false,
      reason: "Nostr browser proof could not be read.",
    };
  }
}

function withAuth0Alignment(proof: NostrBrowserSessionState, accountId?: string) {
  const accountMatched = proof.status === "verified" && Boolean(accountId) && proof.accountId === accountId;

  return {
    ...proof,
    auth0Aligned: accountMatched,
    accountMatched,
    acceptedForCurrentSession: accountMatched,
    proofAcceptedForStandaloneLogin: false,
    reason:
      proof.status === "verified" && accountId && !accountMatched
        ? "Nostr browser proof belongs to a different CRAYS account than the active Auth0 session."
        : "reason" in proof
          ? proof.reason
          : undefined,
  };
}

export async function GET(request: NextRequest) {
  const developmentMode = request.nextUrl.searchParams.get("mode") === "development";
  const environment = getAuthEnvironmentState();
  const auth0Runtime = getAuth0RuntimeConfigState();
  const nostrBrowserSessionConfig = getNostrBrowserSessionConfigState();
  const nostrBrowserProof = await readNostrBrowserProof(request);

  if (developmentMode) {
    const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
    const session = createDevelopmentSession(context.role);
    const sampleDecision = requireServerPermission(session, "permissions:admin", "global");

    return Response.json({
      session,
      environment,
      auth0Runtime,
      sampleDecision,
      liveProviderConnected: false,
      providerAuthenticated: false,
      accountMapped: session.status === "crays_mapped",
      nostrBrowserSessionConfig,
      nostrBrowserSession: withAuth0Alignment(nostrBrowserProof, session.account?.id),
      note: "Development mode returns a synthetic CRAYS session for permission-contract testing only.",
    });
  }

  const mapped = await readExactSessionIdentity(request);
  if (mapped.status === "unavailable" || mapped.status === "core_unavailable" || mapped.status === "invalid_session_provenance") {
    return Response.json({
      status: mapped.status,
      session: mapped.providerAuthenticated ? createProviderAuthenticatedSession() : createAnonymousSession(),
      providerAuthenticated: mapped.providerAuthenticated,
      accountMapped: false,
      environment, auth0Runtime, nostrBrowserSessionConfig,
      nostrBrowserSession: withAuth0Alignment(nostrBrowserProof),
      note: "The current session identity could not be resolved. No account permissions were granted.",
    }, { status: 503 });
  }
  const bundle = mapped.bundle;
  const session = bundle ? createCraysSessionFromIdentityBundle(bundle)
    : mapped.providerAuthenticated ? createProviderAuthenticatedSession() : createAnonymousSession();
  const sampleDecision = requireServerPermission(session, "permissions:admin", "global");
  const mappedAccountId = session.account?.id;

  return Response.json({
    session,
    environment,
    auth0Runtime,
    sampleDecision,
    liveProviderConnected: environment.connectionState === "provider_ready",
    providerAuthenticated: mapped.providerAuthenticated,
    accountMapped: Boolean(bundle),
    provider: {
      type: "auth0",
      subjectPresent: mapped.providerAuthenticated,
      contactPresent: "providerProfile" in mapped && Boolean(mapped.providerProfile.email),
      contactVerified: "providerProfile" in mapped && mapped.providerProfile.emailVerified,
    },
    nostrBrowserSessionConfig,
    nostrBrowserSession: withAuth0Alignment(nostrBrowserProof, mappedAccountId),
    note: bundle
      ? "Auth0 provider session maps to a CRAYS account context. Nostr browser proof is only accepted when it matches the same CRAYS account."
      : "Auth0 provider session is valid, but CRAYS account, role and Nostr binding are not mapped yet.",
    nextAction: bundle ? "Use CRAYS account context." : mapped.providerAuthenticated ? "Review the exact provider account mapping." : "Sign in.",
  }, { status: mapped.status === "unmapped" ? 409 : 200 });
}
