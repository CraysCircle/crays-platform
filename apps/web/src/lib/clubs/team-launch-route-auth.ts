import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  getIdentityBundleByAccountId,
  getIdentityBundleByProviderSubject,
} from "@/db/core-identity-repository";
import { auth0 } from "@/lib/auth0";
import {
  BLOCK199_MICROSOFT_OIDC_ISSUER,
  block199FederatedMicrosoftAssurance,
} from "@/lib/block199-federated-auth";
import { block199AssuranceFromProviderClaims } from "@/lib/block199-runtime-auth";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import type { HolidayManagerAssurance } from "@/lib/clubs/holiday-manager-access";
import { validClubsTeamProductionIssueOrigin } from "@/lib/clubs/team-issue-origin-policy";

export type ClubsTeamActor = {
  accountId: string;
  assuranceLevel: HolidayManagerAssurance;
  authenticatedAt: string | null;
  mode: "auth0" | "local-preview";
};

export const clubsTeamSessionCookieName = "crays_clubs_team_session";

function isLoopback(request: NextRequest) {
  try {
    const hostname = new URL(request.url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function providerAuthenticatedAt(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    return null;
  }
  const authenticatedAt = new Date(value * 1_000);
  return Number.isFinite(authenticatedAt.getTime())
    ? authenticatedAt.toISOString()
    : null;
}

export async function resolveClubsTeamActor(
  request: NextRequest,
): Promise<ClubsTeamActor | null> {
  const provider = await auth0.getSession(request).catch(() => null);
  const subject =
    typeof provider?.user?.sub === "string" ? provider.user.sub.trim() : "";
  if (subject) {
    const bundle = await getIdentityBundleByProviderSubject(
      "auth0",
      subject,
    ).catch(() => null);
    const accountId = bundle?.account.account_id;
    if (typeof accountId !== "string") return null;
    const providerUser = provider?.user as Record<string, unknown>;
    const providerAssurance = block199AssuranceFromProviderClaims(providerUser);
    const providerAuthenticatedAtValue = providerAuthenticatedAt(
      provider?.user?.auth_time,
    );
    const federatedMicrosoftAssurance =
      block199FederatedMicrosoftAssurance({
        tokenClaims: providerUser,
        expectedIssuer: BLOCK199_MICROSOFT_OIDC_ISSUER,
      });
    const federatedAuthenticatedAtValue = providerAuthenticatedAt(
      federatedMicrosoftAssurance?.authenticatedAtSeconds,
    );
    const exactProof =
      providerAssurance.assuranceLevel === "aal1" &&
      federatedMicrosoftAssurance === null
      ? await resolveExactB2bSessionProof(request).catch(() => null)
      : null;
    const exactB2bProviderMfaFlowAttested =
      exactProof?.status === "ready" &&
      exactProof.proof.proofSchema === "crays.clubs.exact-b2b-session-proof.v1" &&
      exactProof.proof.authoritySource === "exact_b2b_session" &&
      exactProof.proof.emailVerified === true &&
      exactProof.proof.b2cRejected === true &&
      exactProof.proof.subjectSha256 ===
        createHash("sha256").update(subject).digest("hex") &&
      (providerAuthenticatedAtValue === null ||
        exactProof.proof.authenticatedAt === providerAuthenticatedAtValue);
    const authenticatedAt = federatedMicrosoftAssurance
      ? federatedAuthenticatedAtValue
      : exactB2bProviderMfaFlowAttested
        ? exactProof.proof.authenticatedAt
        : providerAuthenticatedAtValue;
    return {
      accountId,
      assuranceLevel:
        federatedMicrosoftAssurance || exactB2bProviderMfaFlowAttested
        ? "aal2"
        : providerAssurance.assuranceLevel,
      authenticatedAt,
      mode: "auth0",
    };
  }

  if (
    process.env.NODE_ENV === "production"
    || process.env.CRAYS_CLUBS_TEAM_LOCAL_PREVIEW !== "true"
    || request.headers.get("x-crays-clubs-team-local-preview") !== "holiday-manager"
    || !isLoopback(request)
  ) {
    return null;
  }
  const accountId =
    process.env.CRAYS_CLUBS_TEAM_LOCAL_PREVIEW_ACCOUNT_ID?.trim() ?? "";
  if (!accountId) return null;
  const bundle = await getIdentityBundleByAccountId(accountId).catch(() => null);
  if (!bundle) return null;
  const configuredAssurance =
    process.env.CRAYS_CLUBS_TEAM_LOCAL_PREVIEW_ASSURANCE?.trim();
  return {
    accountId,
    assuranceLevel:
      configuredAssurance === "aal1" || configuredAssurance === "aal3"
        ? configuredAssurance
        : "aal2",
    authenticatedAt: null,
    mode: "local-preview",
  };
}

export function hashClubsTeamBrowserVerifier(value: string) {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(value)) {
    throw new Error("A high-entropy browser verifier is required.");
  }
  return createHash("sha256").update(value).digest("hex");
}

export function validClubsTeamIssueOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV === "production") {
    return validClubsTeamProductionIssueOrigin(origin, process.env);
  }
  if (!origin) return isLoopback(request);
  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
      && parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

export function authorizeClubsTeamConsumer(request: NextRequest) {
  const expected = process.env.CRAYS_CLUBS_TEAM_CONSUMER_TOKEN?.trim() ?? "";
  const presented =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    ?? "";
  if (expected.length < 32 || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

export function validClubsTeamHostRequest(request: NextRequest) {
  const qaHost =
    process.env.NODE_ENV === "production"
      ? null
      : request.headers.get("x-crays-qa-host");
  const host = (qaHost ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();
  if (
    request.headers.get("x-crays-clubs-team-host") === "team.craysclub.com"
    && authorizeClubsTeamConsumer(request)
  ) {
    return true;
  }
  return process.env.NODE_ENV === "production"
    ? host === "team.craysclub.com"
    : host === "team.craysclub.com" || isLoopback(request);
}
