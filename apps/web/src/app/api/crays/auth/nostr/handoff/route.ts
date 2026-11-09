import { NextRequest } from "next/server";
import { getIdentityBundleByProviderSubject, prepareNostrIdentityHandoff, type IdentityBundle } from "@/db/core-identity-repository";
import { readExactSessionIdentity } from "@/lib/dal/exact-session-identity-read";
import { auth0 } from "@/lib/auth0";
import { createCraysSessionFromIdentityBundle } from "@/lib/auth-session-mapping";
import { createProviderAuthenticatedSession } from "@/lib/auth-boundary";
import { isPublicKeyHex } from "@/lib/nostr-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderUser = {
  sub?: string;
};

type HandoffBody = {
  pubkeyHex?: unknown;
  npub?: unknown;
};

const blockedPrivateMaterialFields = ["privatekey", "nsec", "secret", "seed", "mnemonic", "credential", "token", "password"];

function stringValue(row: Record<string, unknown> | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === "string" ? value : undefined;
}

function publicNostrState(bundle: IdentityBundle | null) {
  const accountId = stringValue(bundle?.account, "account_id");
  const identity = bundle?.nostrIdentity;

  return {
    accountId,
    npub: stringValue(identity, "npub"),
    pubkeyHex: stringValue(identity, "pubkey_hex"),
    nip05: stringValue(identity, "nip05"),
    nip05Status: stringValue(identity, "nip05_status") ?? "not_claimed",
    issuanceStatus: stringValue(identity, "issuance_status") ?? "required",
    privateKeyHandoff: stringValue(identity, "private_key_handoff") ?? "not_created",
    signerStatus: stringValue(identity, "signer_status") ?? "not_connected",
    accessEnabled: identity?.access_enabled === true,
  };
}

function containsBlockedPrivateMaterial(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => containsBlockedPrivateMaterial(item));
  }

  return Object.entries(value as Record<string, unknown>).some(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (blockedPrivateMaterialFields.some((blockedField) => normalizedKey.includes(blockedField))) return true;
    return containsBlockedPrivateMaterial(nestedValue);
  });
}

async function getMappedProviderBundle(request: NextRequest) {
  let providerSession;
  try {
    providerSession = await auth0.getSession(request);
  } catch {
    return {
      providerSessionReadable: false,
      providerAuthenticated: false,
      bundle: null,
    };
  }

  const providerUser = providerSession?.user as ProviderUser | undefined;

  if (!providerUser?.sub) {
    return {
      providerSessionReadable: true,
      providerAuthenticated: false,
      bundle: null,
    };
  }

  return {
    providerSessionReadable: true,
    providerAuthenticated: true,
    bundle: await getIdentityBundleByProviderSubject("auth0", providerUser.sub),
  };
}

export async function GET(request: NextRequest) {
  const exact = await readExactSessionIdentity(request);
  if (exact.status === "core_unavailable" || exact.status === "invalid_session_provenance" || exact.status === "unavailable") {
    return Response.json({ status: exact.status, providerAuthenticated: exact.providerAuthenticated,
      accountMapped: false, privateKeysReturned: false, secretsReturned: false }, { status: 503 });
  }
  const mapped = { providerSessionReadable: true, providerAuthenticated: exact.providerAuthenticated, bundle: exact.bundle };

  if (!mapped.providerSessionReadable) {
    return Response.json(
      {
        status: "provider_session_unreadable",
        providerAuthenticated: false,
        accountMapped: false,
        privateKeysReturned: false,
        secretsReturned: false,
        note: "Auth0 session could not be read for this request.",
      },
      { status: 503 },
    );
  }

  if (!mapped.providerAuthenticated) {
    return Response.json(
      {
        status: "provider_session_required",
        providerAuthenticated: false,
        accountMapped: false,
        privateKeysReturned: false,
        secretsReturned: false,
        note: "A provider session is required before CRAYS can prepare Nostr handoff.",
      },
      { status: 401 },
    );
  }

  if (!mapped.bundle) {
    return Response.json(
      {
        status: "account_mapping_required",
        providerAuthenticated: true,
        accountMapped: false,
        session: createProviderAuthenticatedSession(),
        privateKeysReturned: false,
        secretsReturned: false,
        nextAction: "Create the reviewed CRAYS account mapping before Nostr handoff.",
      },
      { status: 409 },
    );
  }

  const session = createCraysSessionFromIdentityBundle(mapped.bundle);

  return Response.json({
    status: "handoff_state",
    providerAuthenticated: true,
    accountMapped: true,
    session,
    nostrIdentity: publicNostrState(mapped.bundle),
    privateKeysReturned: false,
    secretsReturned: false,
    nextAction: session.requiredActions.includes("verify_nostr_identity")
      ? "Submit a signer-held public key, then verify it with a signed Nostr challenge."
      : "Nostr identity is already verified for the mapped CRAYS account.",
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as HandoffBody;

  if (containsBlockedPrivateMaterial(body)) {
    return Response.json(
      {
        status: "blocked",
        reason: "Private key material, tokens, credentials and secrets must never be sent to CRAYS handoff endpoints.",
        privateKeysReturned: false,
        secretsReturned: false,
      },
      { status: 400 },
    );
  }

  const pubkeyHex = typeof body.pubkeyHex === "string" ? body.pubkeyHex.toLowerCase() : null;
  const npub = typeof body.npub === "string" && body.npub.startsWith("npub1") ? body.npub : null;

  if (!isPublicKeyHex(pubkeyHex)) {
    return Response.json(
      {
        status: "invalid",
        reason: "Provide a lowercase hex Nostr public key. Do not send private key material.",
        privateKeysReturned: false,
        secretsReturned: false,
      },
      { status: 400 },
    );
  }

  const mapped = await getMappedProviderBundle(request);

  if (!mapped.providerSessionReadable) {
    return Response.json(
      {
        status: "provider_session_unreadable",
        providerAuthenticated: false,
        accountMapped: false,
        privateKeysReturned: false,
        secretsReturned: false,
        note: "Auth0 session could not be read for this request.",
      },
      { status: 503 },
    );
  }

  if (!mapped.providerAuthenticated) {
    return Response.json(
      {
        status: "provider_session_required",
        providerAuthenticated: false,
        accountMapped: false,
        privateKeysReturned: false,
        secretsReturned: false,
        note: "A provider session is required before CRAYS can prepare Nostr handoff.",
      },
      { status: 401 },
    );
  }

  if (!mapped.bundle) {
    return Response.json(
      {
        status: "account_mapping_required",
        providerAuthenticated: true,
        accountMapped: false,
        privateKeysReturned: false,
        secretsReturned: false,
        nextAction: "Create the reviewed CRAYS account mapping before Nostr handoff.",
      },
      { status: 409 },
    );
  }

  const accountId = stringValue(mapped.bundle.account, "account_id");
  if (!accountId) {
    return Response.json(
      {
        status: "blocked",
        reason: "Mapped CRAYS account is missing its account id.",
        privateKeysReturned: false,
        secretsReturned: false,
      },
      { status: 409 },
    );
  }

  let handoff;
  try {
    handoff = await prepareNostrIdentityHandoff({
      accountId,
      pubkeyHex,
      npub,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      deliveryChannel: "client_generated_once",
    });
  } catch {
    return Response.json(
      {
        status: "blocked",
        reason: "Nostr handoff could not be prepared for this account and public key.",
        privateKeysReturned: false,
        secretsReturned: false,
      },
      { status: 409 },
    );
  }

  const session = handoff.bundle ? createCraysSessionFromIdentityBundle(handoff.bundle) : createProviderAuthenticatedSession();

  return Response.json({
    status: "handoff_pending",
    providerAuthenticated: true,
    accountMapped: true,
    handoff: {
      handoffId: handoff.handoffId,
      expiresAt: handoff.expiresAt,
      deliveryChannel: "client_generated_once",
      privateKeyMaterialStored: false,
    },
    nostrIdentity: publicNostrState(handoff.bundle),
    session,
    nextAction: "Create a Nostr signer challenge for this public key and verify signer control. Product access remains gated until CRAYS review.",
    challengeEndpoint: "/api/crays/auth/nostr/challenge",
    verifyEndpoint: "/api/crays/auth/nostr/verify",
    privateKeysReturned: false,
    secretsReturned: false,
  });
}
