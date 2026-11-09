import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getIdentityBundleByAccountId } from "@/db/core-identity-repository";

export const nostrBrowserSessionCookieName = "crays_nostr_session";

type NostrBrowserSessionPayload = {
  version: 1;
  accountId: string;
  pubkeyHex: string;
  challengeId: string;
  eventId: string | null;
  proofMethod: "nip07" | "nip46" | "nip98";
  issuedAt: number;
  expiresAt: number;
};

export type NostrBrowserSessionState =
  | {
      status: "verified";
      cookiePresent: true;
      cookieHttpOnly: true;
      accountMapped: true;
      accessEnabled: true;
      accountId: string;
      pubkeyHex: string;
      challengeId: string;
      eventId: string | null;
      proofMethod: NostrBrowserSessionPayload["proofMethod"];
      expiresAt: string;
      auth0ProviderSessionRequired: true;
      proofAcceptedForStandaloneLogin: false;
      storesPrivateKeyMaterial: false;
      usesLocalStorage: false;
    }
  | {
      status: "missing" | "invalid" | "expired" | "unavailable" | "account_unmapped" | "pubkey_mismatch" | "access_disabled";
      cookiePresent: boolean;
      cookieHttpOnly: true;
      accountMapped: false;
      accessEnabled: false;
      auth0ProviderSessionRequired: true;
      proofAcceptedForStandaloneLogin: false;
      storesPrivateKeyMaterial: false;
      usesLocalStorage: false;
      reason?: string;
    };

type CreateNostrBrowserSessionInput = {
  accountId: string;
  pubkeyHex: string;
  challengeId: string;
  eventId: string | null;
  proofMethod: "nip07" | "nip46" | "nip98";
};

const sessionMaxAgeSeconds = 30 * 60;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function getSessionSecret(env: Record<string, string | undefined> = process.env) {
  return env.CRAYS_BROWSER_SESSION_SECRET || env.AUTH0_SECRET || env.AUTH_SECRET;
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isSessionPayload(value: unknown): value is NostrBrowserSessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<NostrBrowserSessionPayload>;
  return (
    payload.version === 1 &&
    typeof payload.accountId === "string" &&
    typeof payload.pubkeyHex === "string" &&
    /^[0-9a-f]{64}$/.test(payload.pubkeyHex) &&
    typeof payload.challengeId === "string" &&
    (typeof payload.eventId === "string" || payload.eventId === null) &&
    (payload.proofMethod === "nip07" || payload.proofMethod === "nip46" || payload.proofMethod === "nip98") &&
    typeof payload.issuedAt === "number" &&
    typeof payload.expiresAt === "number"
  );
}

export function getNostrBrowserSessionConfigState(env: Record<string, string | undefined> = process.env) {
  return {
    configured: Boolean(getSessionSecret(env)),
    cookieName: nostrBrowserSessionCookieName,
    cookieHttpOnly: true,
    sameSite: "lax" as const,
    maxAgeSeconds: sessionMaxAgeSeconds,
    auth0ProviderSessionRequired: true,
    proofAcceptedForStandaloneLogin: false,
    storesPrivateKeyMaterial: false,
    usesLocalStorage: false,
  };
}

export function createNostrBrowserSessionToken(input: CreateNostrBrowserSessionInput, env: Record<string, string | undefined> = process.env) {
  const secret = getSessionSecret(env);
  if (!secret) return null;

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: NostrBrowserSessionPayload = {
    version: 1,
    accountId: input.accountId,
    pubkeyHex: input.pubkeyHex.toLowerCase(),
    challengeId: input.challengeId,
    eventId: input.eventId,
    proofMethod: input.proofMethod,
    issuedAt,
    expiresAt: issuedAt + sessionMaxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.expiresAt * 1000).toISOString(),
    maxAgeSeconds: sessionMaxAgeSeconds,
  };
}

export function setNostrBrowserSessionCookie(
  response: NextResponse,
  issuedSession: { token: string; maxAgeSeconds: number },
  env: Record<string, string | undefined> = process.env,
) {
  response.cookies.set({
    name: nostrBrowserSessionCookieName,
    value: issuedSession.token,
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: issuedSession.maxAgeSeconds,
  });
}

export function clearNostrBrowserSessionCookie(response: NextResponse, env: Record<string, string | undefined> = process.env) {
  response.cookies.set({
    name: nostrBrowserSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function verifyNostrBrowserSessionToken(token: string | undefined, env: Record<string, string | undefined> = process.env) {
  if (!token) return { status: "missing" as const };

  const secret = getSessionSecret(env);
  if (!secret) return { status: "unavailable" as const, reason: "Browser session signing secret is not configured." };

  const [encodedPayload, signature, ...extra] = token.split(".");
  if (!encodedPayload || !signature || extra.length) return { status: "invalid" as const, reason: "Session token shape is invalid." };

  const expectedSignature = signPayload(encodedPayload, secret);
  if (!signaturesMatch(signature, expectedSignature)) return { status: "invalid" as const, reason: "Session signature is invalid." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return { status: "invalid" as const, reason: "Session payload is invalid." };
  }

  if (!isSessionPayload(parsed)) return { status: "invalid" as const, reason: "Session payload is incomplete." };
  if (parsed.expiresAt <= Math.floor(Date.now() / 1000)) return { status: "expired" as const, payload: parsed };

  return { status: "verified" as const, payload: parsed };
}

export async function resolveNostrBrowserSessionFromRequest(request: NextRequest): Promise<NostrBrowserSessionState> {
  const token = request.cookies.get(nostrBrowserSessionCookieName)?.value;
  const verification = verifyNostrBrowserSessionToken(token);

  if (verification.status !== "verified") {
    return {
      status: verification.status,
      cookiePresent: Boolean(token),
      cookieHttpOnly: true,
      accountMapped: false,
      accessEnabled: false,
      auth0ProviderSessionRequired: true,
      proofAcceptedForStandaloneLogin: false,
      storesPrivateKeyMaterial: false,
      usesLocalStorage: false,
      reason: "reason" in verification ? verification.reason : undefined,
    };
  }

  const bundle = await getIdentityBundleByAccountId(verification.payload.accountId);
  if (!bundle) {
    return {
      status: "account_unmapped",
      cookiePresent: true,
      cookieHttpOnly: true,
      accountMapped: false,
      accessEnabled: false,
      auth0ProviderSessionRequired: true,
      proofAcceptedForStandaloneLogin: false,
      storesPrivateKeyMaterial: false,
      usesLocalStorage: false,
      reason: "The browser session account is no longer mapped.",
    };
  }

  if (bundle.nostrIdentity?.pubkey_hex !== verification.payload.pubkeyHex) {
    return {
      status: "pubkey_mismatch",
      cookiePresent: true,
      cookieHttpOnly: true,
      accountMapped: false,
      accessEnabled: false,
      auth0ProviderSessionRequired: true,
      proofAcceptedForStandaloneLogin: false,
      storesPrivateKeyMaterial: false,
      usesLocalStorage: false,
      reason: "The browser session public key no longer matches the CRAYS account.",
    };
  }

  if (bundle.nostrIdentity?.access_enabled !== true || bundle.nostrIdentity?.signer_status !== "verified") {
    return {
      status: "access_disabled",
      cookiePresent: true,
      cookieHttpOnly: true,
      accountMapped: false,
      accessEnabled: false,
      auth0ProviderSessionRequired: true,
      proofAcceptedForStandaloneLogin: false,
      storesPrivateKeyMaterial: false,
      usesLocalStorage: false,
      reason: "The CRAYS Nostr identity is not verified or enabled.",
    };
  }

  return {
    status: "verified",
    cookiePresent: true,
    cookieHttpOnly: true,
    accountMapped: true,
    accessEnabled: true,
    accountId: verification.payload.accountId,
    pubkeyHex: verification.payload.pubkeyHex,
    challengeId: verification.payload.challengeId,
    eventId: verification.payload.eventId,
    proofMethod: verification.payload.proofMethod,
    expiresAt: new Date(verification.payload.expiresAt * 1000).toISOString(),
    auth0ProviderSessionRequired: true,
    proofAcceptedForStandaloneLogin: false,
    storesPrivateKeyMaterial: false,
    usesLocalStorage: false,
  };
}

export const resolveNostrBrowserProofFromRequest = resolveNostrBrowserSessionFromRequest;
