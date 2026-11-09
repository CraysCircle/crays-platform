import { NextRequest, NextResponse } from "next/server";
import { inspectNostrSignedEventShape, type NostrSignedEventShape } from "@/lib/nostr-identity";
import { verifyNostrSchnorrEvent } from "@/lib/nostr-signature";
import { mapVerifiedNostrProofToCraysSession } from "@/lib/auth-session-mapping";
import { auth0 } from "@/lib/auth0";
import {
  consumeNostrChallengeRecord,
  getIdentityBundleByProviderSubject,
  getPendingNostrChallengeRecord,
} from "@/db/core-identity-repository";
import {
  createNostrBrowserSessionToken,
  getNostrBrowserSessionConfigState,
  setNostrBrowserSessionCookie,
} from "@/lib/nostr-browser-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function recordString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

async function getMappedAuth0AccountState(request: NextRequest) {
  let providerSession;
  try {
    providerSession = await auth0.getSession(request);
  } catch {
    return { status: "unreadable" as const, accountMatched: false };
  }

  const providerSubject = providerSession?.user?.sub;
  if (!providerSubject) return { status: "missing" as const, accountMatched: false };

  const bundle = await getIdentityBundleByProviderSubject("auth0", providerSubject);
  const accountId = bundle ? recordString(bundle.account, "account_id") : null;
  if (!accountId) return { status: "unmapped" as const, accountMatched: false };

  return { status: "mapped" as const, accountId, accountMatched: false };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    event?: unknown;
  };
  const verifyUrl = new URL("/api/crays/auth/nostr/verify", request.nextUrl.origin).toString();
  const event = (body.event ?? {}) as NostrSignedEventShape;
  const inspection = inspectNostrSignedEventShape(event, verifyUrl);
  const challengeId = Array.isArray(event.tags) ? event.tags.find((tag) => tag[0] === "challenge")?.[1] : undefined;

  if (inspection.status !== "proof_shape_valid") {
    return Response.json(
      {
        status: "blocked",
        inspection,
        persistedChallengeFound: false,
        persistedChallengeConsumed: false,
        accountMapped: false,
        note: "The signed event shape must match the CRAYS Nostr access contract before signature verification.",
      },
      { status: 400 },
    );
  }

  if (!challengeId) {
    return Response.json(
      {
        status: "blocked",
        inspection,
        persistedChallengeFound: false,
        persistedChallengeConsumed: false,
        accountMapped: false,
        note: "Signed event challenge tag is missing.",
      },
      { status: 400 },
    );
  }

  const eventPubkey = typeof event.pubkey === "string" ? event.pubkey : null;
  if (!eventPubkey) {
    return Response.json(
      {
        status: "blocked",
        inspection,
        persistedChallengeFound: false,
        persistedChallengeConsumed: false,
        accountMapped: false,
        note: "Signed event public key is missing.",
      },
      { status: 400 },
    );
  }

  const persistedChallenge = challengeId ? await getPendingNostrChallengeRecord(challengeId) : null;

  if (!persistedChallenge) {
    return Response.json(
      {
        status: "blocked",
        inspection,
        persistedChallengeFound: false,
        persistedChallengeConsumed: false,
        accountMapped: false,
        note: "Challenge was not found, has expired or was already consumed.",
      },
      { status: 404 },
    );
  }

  const persistedIssues: string[] = [];
  const persistedChallengeValue = recordString(persistedChallenge, "challenge");
  const persistedUrl = recordString(persistedChallenge, "absolute_url");
  const persistedMethod = recordString(persistedChallenge, "method");
  const persistedPubkey = recordString(persistedChallenge, "pubkey_hex");

  if (persistedChallengeValue !== challengeId) persistedIssues.push("Persisted challenge value does not match the event challenge tag.");
  if (persistedUrl !== verifyUrl) persistedIssues.push("Persisted challenge URL does not match the verification endpoint.");
  if (persistedMethod !== "POST") persistedIssues.push("Persisted challenge method does not match.");
  if (persistedPubkey && persistedPubkey !== eventPubkey) persistedIssues.push("Persisted challenge public key does not match the signed event.");

  if (persistedIssues.length) {
    return Response.json(
      {
        status: "blocked",
        inspection,
        persistedChallengeFound: true,
        persistedChallengeConsumed: false,
        accountMapped: false,
        issues: persistedIssues,
        note: "Persisted challenge constraints did not match the signed event.",
      },
      { status: 409 },
    );
  }

  const signature = verifyNostrSchnorrEvent(event);

  if (signature.status !== "verified") {
    return Response.json(
      {
        status: "blocked",
        inspection,
        signature,
        persistedChallengeFound: true,
        persistedChallengeConsumed: false,
        accountMapped: false,
        note: "Schnorr signature verification failed.",
      },
      { status: 401 },
    );
  }

  const consumedChallenge = await consumeNostrChallengeRecord(challengeId, eventPubkey);

  if (!consumedChallenge) {
    return Response.json(
      {
        status: "blocked",
        inspection,
        signature,
        persistedChallengeFound: true,
        persistedChallengeConsumed: false,
        accountMapped: false,
        note: "Challenge could not be consumed. It may have been replayed, expired or bound to another public key.",
      },
      { status: 409 },
    );
  }

  const accountMapping = await mapVerifiedNostrProofToCraysSession({
    pubkeyHex: eventPubkey,
    challengeId,
    eventId: signature.eventId,
    proofMethod: "nip98",
  });

  const browserSessionConfig = getNostrBrowserSessionConfigState();
  const mappedAccountId = accountMapping.session.account?.id;
  const auth0AccountState = await getMappedAuth0AccountState(request);
  const auth0Alignment = { status: auth0AccountState.status, accountMatched: false };
  let issuedBrowserSession: ReturnType<typeof createNostrBrowserSessionToken> = null;
  let browserSession: Record<string, unknown> = {
    ...browserSessionConfig,
    persisted: false,
    auth0Alignment,
    reason: "auth0_provider_session_required",
  };

  if (!accountMapping.accessEnabled || !mappedAccountId) {
    browserSession = {
      ...browserSession,
      reason: "crays_nostr_identity_not_enabled",
    };
  } else if (auth0AccountState.status === "mapped" && auth0AccountState.accountId === mappedAccountId) {
    issuedBrowserSession = createNostrBrowserSessionToken({
      accountId: mappedAccountId,
      pubkeyHex: eventPubkey,
      challengeId,
      eventId: signature.eventId,
      proofMethod: "nip98",
    });
    browserSession = issuedBrowserSession
      ? {
          ...browserSessionConfig,
          persisted: true,
          expiresAt: issuedBrowserSession.expiresAt,
          auth0Alignment: {
            status: "mapped",
            accountMatched: true,
          },
        }
      : {
          ...browserSession,
          reason: "browser_session_secret_not_configured",
        };
  } else {
    browserSession = {
      ...browserSession,
      reason: auth0AccountState.status === "mapped" ? "auth0_account_mismatch" : "auth0_provider_session_required",
    };
  }

  const response = NextResponse.json({
    status: "verified",
    inspection: {
      ...inspection,
      signatureVerified: true,
      nextRequired: accountMapping.accountMapped ? "Use mapped CRAYS account context for scoped product access." : "Map this public key to a CRAYS account before product access.",
    },
    signature,
    persistedChallengeFound: Boolean(persistedChallenge),
    persistedChallengeConsumed: true,
    accountMapped: accountMapping.accountMapped,
    accountKnown: accountMapping.accountKnown,
    accessEnabled: accountMapping.accessEnabled,
    session: accountMapping.session,
    browserSession,
    auditId: accountMapping.auditId,
    requiredActions: accountMapping.requiredActions,
    note: accountMapping.accountMapped
      ? "Nostr signer proof is verified, the persisted challenge was consumed once and a CRAYS account context was mapped. Browser proof persistence requires the active Auth0 provider session to match the same CRAYS account."
      : "Nostr signer proof is verified and consumed, but product access remains blocked until CRAYS account mapping is complete.",
  });

  if (issuedBrowserSession) setNostrBrowserSessionCookie(response, issuedBrowserSession);
  return response;
}
