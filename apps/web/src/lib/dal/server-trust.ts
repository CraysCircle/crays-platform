import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { resolveTenantSession, tenantSessionCookieName } from
  "@/db/identity-tenant-lifecycle-repository";
import { auth0 } from "@/lib/auth0";
import { createCraysSessionFromIdentityBundle } from "@/lib/auth-session-mapping";
import { createAnonymousSession, type CraysAuthSession } from "@/lib/auth-boundary";
import type { Block199Surface } from "@/lib/block199-strong-auth-policy";
import { block199AssuranceFromProviderClaims } from "@/lib/block199-runtime-auth";
import { permissionsForRole } from "@/lib/permissions";
import { portalBridgeIssuedCookieName, portalBridgeIssuedMarker, portalBridgeRoleCookieName } from "@/lib/portal-access-bridge";
import { defaultRole, roleByKey, type RoleKey } from "@/lib/roles";
import { selectWorkspaceAuthorityPrecedence } from
  "@/lib/workspace/workspace-authority-precedence";
import type { NextRequest } from "next/server";

export type CraysAuthoritySource =
  | "auth0-crays-session"
  | "clubs-tenant-session"
  | "portal-bridge-cookie"
  | "server-authorized-review-persona"
  | "anonymous-fail-closed";

export type CraysReviewPersonaAudit = {
  requestedRole: RoleKey | null;
  effectiveRole: RoleKey;
  allowed: boolean;
  reason: string;
  auditRequired: true;
};

export type CraysRouteContext = {
  role: RoleKey;
  tenantId: string;
  session: CraysAuthSession;
  authoritySource: CraysAuthoritySource;
  reviewPersona: CraysReviewPersonaAudit;
  capabilities: string[];
  strongAuth: {
    allowed: boolean;
    assuranceLevel: "aal1" | "aal2" | "aal3";
    surface: Block199Surface | null;
    authenticatedAt: Date | null;
  };
};

export type ResolveCraysRouteRoleOptions = {
  fallbackRole?: RoleKey;
  surface?: Block199Surface;
};

function reviewPersonasEnabled(env: Record<string, string | undefined> = process.env) {
  if (env.CRAYS_ALLOW_REVIEW_PERSONAS === "true") return true;
  if (env.CRAYS_ALLOW_REVIEW_PERSONAS === "false") return false;
  return env.NODE_ENV !== "production";
}

function readRequestedRole(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  return role ? roleByKey(role).key : null;
}

function readCookieValue(request: Request, name: string) {
  const nextRequestCookie = (
    request as Request & {
      cookies?: {
        get: (cookieName: string) => { value?: string } | undefined;
      };
    }
  ).cookies?.get(name)?.value;
  if (nextRequestCookie) return nextRequestCookie;

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const match = cookies.find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function readPortalBridgeRole(request: Request): RoleKey | null {
  const issued = readCookieValue(request, portalBridgeIssuedCookieName);
  const role = readCookieValue(request, portalBridgeRoleCookieName);
  if (issued !== portalBridgeIssuedMarker || !role) return null;
  return roleByKey(role).key;
}

function tenantIdFromSession(session: CraysAuthSession) {
  const assignment = session.roleAssignments.find((item) => item.role === session.activeRole) ?? session.roleAssignments[0];
  return assignment?.organizationId ?? assignment?.entityId ?? session.account?.memberships[0]?.organizationId ?? "crays-review";
}

async function resolveMappedSession(request: Request): Promise<{
  session: CraysAuthSession;
  providerUser: Record<string, unknown>;
} | null> {
  let providerSession;

  try {
    providerSession = await auth0.getSession(request as NextRequest);
  } catch {
    return null;
  }

  const providerUser = providerSession?.user;
  const providerSubject = providerUser?.sub;
  if (!providerSubject) return null;

  try {
    const bundle = await getIdentityBundleByProviderSubject("auth0", providerSubject);
    return bundle ? {
      session: createCraysSessionFromIdentityBundle(bundle),
      providerUser: providerUser as Record<string, unknown>,
    } : null;
  } catch {
    return null;
  }
}

function strongAuthContext(
  providerUser: Record<string, unknown> | null,
  surface: Block199Surface | undefined,
): CraysRouteContext["strongAuth"] {
  const assurance = block199AssuranceFromProviderClaims(providerUser);
  return {
    allowed: assurance.assuranceLevel === "aal2" || assurance.assuranceLevel === "aal3",
    assuranceLevel: assurance.assuranceLevel,
    surface: surface ?? null,
    authenticatedAt: assurance.authenticatedAt,
  };
}

function createReviewAudit(
  requestedRole: RoleKey | null,
  effectiveRole: RoleKey,
  allowed: boolean,
  reason: string,
): CraysReviewPersonaAudit {
  return {
    requestedRole,
    effectiveRole,
    allowed,
    reason,
    auditRequired: true,
  };
}

export async function resolveCraysRouteContext(
  request: Request,
  options: ResolveCraysRouteRoleOptions = {},
): Promise<CraysRouteContext> {
  const requestedRole = readRequestedRole(request);
  const portalBridgeRole = readPortalBridgeRole(request);
  const mapped = await resolveMappedSession(request);
  const session = mapped?.session;
  const mappedReady = Boolean(
    mapped && session?.status === "crays_mapped" && session.activeRole,
  );
  const accountId = mappedReady ? session?.account?.id ?? null : null;
  const validatedClubsTenantSession = accountId
    ? await resolveTenantSession(
        readCookieValue(request, tenantSessionCookieName), accountId,
      ).catch(() => null)
    : null;
  const clubsTenantSession =
    validatedClubsTenantSession?.roleKey === "holiday-manager"
      ? {
          roleKey: "holiday-manager" as const,
          organizationId: validatedClubsTenantSession.organizationId,
        }
      : null;
  const precedence = selectWorkspaceAuthorityPrecedence({
    mappedRole: mappedReady ? session?.activeRole ?? null : null,
    mappedTenantId: mappedReady && session ? tenantIdFromSession(session) : null,
    validatedClubsTenantSession: clubsTenantSession,
    portalBridgeRole,
  });

  if (
    precedence.source === "clubs-tenant-session" &&
    mapped && session && clubsTenantSession
  ) {
    return {
      role: "holiday-manager",
      tenantId: clubsTenantSession.organizationId,
      session,
      authoritySource: "clubs-tenant-session",
      reviewPersona: createReviewAudit(
        requestedRole,
        "holiday-manager",
        false,
        requestedRole
          ? "Validated Clubs Tenant Session selected Holiday Manager; requested review persona was ignored."
          : "Validated Clubs Tenant Session selected Holiday Manager.",
      ),
      capabilities: permissionsForRole("holiday-manager").map(
        (permission) => permission.key,
      ),
      strongAuth: strongAuthContext(mapped.providerUser, options.surface),
    };
  }

  if (
    precedence.source === "auth0-crays-session" &&
    mapped && session?.status === "crays_mapped" && session.activeRole
  ) {
    const activeRole = session.activeRole;
    const canReviewPersona = ["admin", "crays-management", "reviewer"].includes(activeRole);
    const effectiveRole = requestedRole && canReviewPersona ? requestedRole : activeRole;

    return {
      role: effectiveRole,
      tenantId: tenantIdFromSession(session),
      session,
      authoritySource: "auth0-crays-session",
      reviewPersona: createReviewAudit(
        requestedRole,
        effectiveRole,
        Boolean(requestedRole && canReviewPersona),
        requestedRole
          ? canReviewPersona
            ? "Review persona was authorized by the mapped CRAYS session role."
            : "Requested review persona was ignored because the mapped CRAYS session cannot delegate role views."
          : "No review persona requested.",
      ),
      capabilities: permissionsForRole(effectiveRole).map((permission) => permission.key),
      strongAuth: strongAuthContext(mapped.providerUser, options.surface),
    };
  }

  if (precedence.source === "portal-bridge-cookie" && portalBridgeRole) {
    const bridgeSession = createAnonymousSession();

    return {
      role: portalBridgeRole,
      tenantId: "crays-portal-bridge",
      session: bridgeSession,
      authoritySource: "portal-bridge-cookie",
      reviewPersona: createReviewAudit(
        requestedRole,
        portalBridgeRole,
        true,
        requestedRole
          ? "Temporary portal bridge cookie selected the effective review role; request role input was ignored."
          : "Temporary portal bridge cookie selected the effective review role.",
      ),
      capabilities: permissionsForRole(portalBridgeRole).map((permission) => permission.key),
      strongAuth: strongAuthContext(null, options.surface),
    };
  }

  if (reviewPersonasEnabled()) {
    const effectiveRole = requestedRole ?? options.fallbackRole ?? defaultRole;
    const reviewSession = createAnonymousSession();

    return {
      role: effectiveRole,
      tenantId: "crays-local-review",
      session: reviewSession,
      authoritySource: "server-authorized-review-persona",
      reviewPersona: createReviewAudit(
        requestedRole,
        effectiveRole,
        true,
        "Local review persona is server-authorized for non-production review mode and must not be treated as production authorization.",
      ),
      capabilities: permissionsForRole(effectiveRole).map((permission) => permission.key),
      strongAuth: strongAuthContext(null, options.surface),
    };
  }

  const fallbackRole = options.fallbackRole ?? "guest";
  const anonymousSession = createAnonymousSession();

  return {
    role: fallbackRole,
    tenantId: "anonymous",
    session: anonymousSession,
    authoritySource: "anonymous-fail-closed",
    reviewPersona: createReviewAudit(
      requestedRole,
      fallbackRole,
      false,
      "No mapped CRAYS session is active and review personas are disabled; request role input was ignored.",
    ),
    capabilities: [],
    strongAuth: strongAuthContext(null, options.surface),
  };
}

export async function resolveCraysRouteRole(
  request: Request,
  options: ResolveCraysRouteRoleOptions = {},
) {
  const context = await resolveCraysRouteContext(request, options);
  return {
    role: context.role,
    context,
  };
}
