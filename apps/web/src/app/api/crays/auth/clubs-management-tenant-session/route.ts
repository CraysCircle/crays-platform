import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  issueTenantSession,
  resolveUniqueActiveTenantRoleBinding,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { resolveExactB2bSessionProof } from "@/lib/clubs/exact-b2b-session-proof-server";
import { CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT } from "@/lib/clubs/team-membership-review-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = "crays.clubs.management-tenant-session-bootstrap.v1";
const previewOrigin = "http://localhost:43172";
const previewHost = "localhost:43172";
const routePath = "/api/crays/auth/clubs-management-tenant-session";
const noStore = { "cache-control": "no-store" };
const forbiddenAuthorityHeaders = [
  "authorization",
  "proxy-authorization",
  "forwarded",
  "x-auth-request-user",
  "x-crays-account-id",
  "x-crays-actor-id",
  "x-crays-organization-id",
  "x-crays-qa-host",
  "x-crays-review-role",
  "x-crays-role",
  "x-crays-tenant-id",
  "x-crays-clubs-team-host",
  "x-crays-clubs-team-local-preview",
  "x-original-host",
] as const;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json({ schema, ...body }, { status, headers: noStore });
}

function deploymentBlocked() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_URL) ||
    Boolean(process.env.VERCEL_DEPLOYMENT_ID)
  );
}

function exactLocalPreviewRequest(request: NextRequest) {
  if (deploymentBlocked()) return false;
  const directHost = request.headers.get("host")?.trim().toLowerCase();
  if (directHost !== previewHost || directHost.includes(",")) return false;
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  if (
    url.protocol !== "http:" ||
    url.pathname !== routePath ||
    url.search !== "" ||
    url.hash !== "" ||
    request.nextUrl.pathname !== routePath ||
    request.nextUrl.search !== ""
  ) {
    return false;
  }
  if (request.headers.get("origin") !== previewOrigin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (
    forwardedHost !== null &&
    forwardedHost.trim().toLowerCase() !== previewHost
  ) {
    return false;
  }
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto !== null && forwardedProto.trim().toLowerCase() !== "http") {
    return false;
  }
  return !forbiddenAuthorityHeaders.some((header) => request.headers.has(header));
}

export async function POST(request: NextRequest) {
  if (!exactLocalPreviewRequest(request)) {
    return json(421, { status: "misdirected_or_untrusted_preview_request" });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return json(400, { status: "empty_request_body_required" });
  }
  if (body.length !== 0) {
    return json(400, { status: "empty_request_body_required" });
  }

  let exactProof: Awaited<ReturnType<typeof resolveExactB2bSessionProof>>;
  try {
    exactProof = await resolveExactB2bSessionProof(request);
  } catch {
    return json(503, { status: "exact_b2b_session_unavailable" });
  }
  if (exactProof.status === "b2c_rejected") {
    return json(403, { status: "wrong_vertical_session" });
  }
  if (exactProof.status !== "ready") {
    return json(503, { status: "exact_b2b_session_unavailable" });
  }
  if (
    exactProof.proof.proofSchema !== "crays.clubs.exact-b2b-session-proof.v1" ||
    exactProof.proof.authoritySource !== "exact_b2b_session" ||
    exactProof.proof.emailVerified !== true ||
    exactProof.proof.b2cRejected !== true
  ) {
    return json(503, { status: "exact_b2b_session_unavailable" });
  }

  let context: Awaited<ReturnType<typeof resolveCraysRouteContext>>;
  try {
    context = await resolveCraysRouteContext(request, {
      fallbackRole: "guest",
      surface: "privileged-operation",
    });
  } catch {
    return json(503, { status: "core_identity_unavailable" });
  }

  const accountId = context.session.account?.id ?? null;
  if (
    context.authoritySource !== "auth0-crays-session" ||
    context.session.status !== "crays_mapped" ||
    !accountId
  ) {
    return json(403, { status: "mapped_b2b_core_account_required" });
  }
  if (
    context.reviewPersona.requestedRole !== null ||
    context.session.activeRole !== context.role ||
    !CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.allowedRoles.includes(
      context.role as never,
    )
  ) {
    return json(403, { status: "management_role_required" });
  }

  const authenticatedAt = context.strongAuth.authenticatedAt;
  const exactB2bProviderMfaFlowAttested =
    exactProof.proof.authoritySource === "exact_b2b_session" &&
    Boolean(authenticatedAt) &&
    exactProof.proof.authenticatedAt === authenticatedAt?.toISOString();
  const effectiveAssuranceLevel = context.strongAuth.allowed
    ? context.strongAuth.assuranceLevel
    : exactB2bProviderMfaFlowAttested
      ? "aal2"
      : "aal1";
  const authenticationAgeMs = authenticatedAt
    ? Date.now() - authenticatedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (
    !CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.assurance.allowed.includes(
      effectiveAssuranceLevel as never,
    ) ||
    !authenticatedAt ||
    authenticationAgeMs < -5_000 ||
    authenticationAgeMs >
      CLUBS_TEAM_MEMBERSHIP_REVIEW_CONTRACT.assurance.maximumAgeSeconds * 1_000
  ) {
    return json(403, { status: "fresh_aal2_or_aal3_required" });
  }
  if (exactProof.proof.authenticatedAt !== authenticatedAt.toISOString()) {
    return json(403, { status: "session_proof_context_mismatch" });
  }

  let binding: Awaited<ReturnType<typeof resolveUniqueActiveTenantRoleBinding>>;
  try {
    binding = await resolveUniqueActiveTenantRoleBinding({
      accountId,
      roleKey: context.role,
    });
  } catch {
    return json(503, { status: "tenant_binding_unavailable" });
  }
  if (
    !binding ||
    binding.accountId !== accountId ||
    binding.organizationId !== context.tenantId ||
    binding.roleKey !== context.role
  ) {
    return json(403, { status: "unique_active_management_binding_required" });
  }

  let session: Awaited<ReturnType<typeof issueTenantSession>>;
  try {
    session = await issueTenantSession(binding);
  } catch {
    return json(503, { status: "tenant_session_unknown_outcome" });
  }

  const response = json(200, {
    status: "active",
    expiresAt: session.expiresAt,
  });
  response.cookies.set(tenantSessionCookieName, session.sessionToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}
