import "server-only";

import type { NextRequest } from "next/server";

import {
  resolveTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import {
  resolveClubsTeamActor,
  validClubsTeamHostRequest,
} from "@/lib/clubs/team-launch-route-auth";
import {
  VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT,
  type VendureClubsSandboxReadinessActor,
  type VendureClubsSandboxReadinessProjection,
} from "@/lib/member-commerce/vendure-clubs-sandbox-adapter-contract";
import { readVendureClubsSandboxReadiness } from "@/lib/member-commerce/vendure-clubs-sandbox-adapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
} as const;

export type VendureClubsSandboxReadinessActorResolution =
  | { actor: VendureClubsSandboxReadinessActor }
  | { response: Response };

export async function resolveVendureClubsSandboxReadinessActor(
  request: NextRequest,
): Promise<VendureClubsSandboxReadinessActorResolution> {
  const teamActor = await resolveClubsTeamActor(request);
  if (!teamActor) {
    return {
      response: Response.json(
        { status: "authentication_required" },
        { status: 401, headers: NO_STORE_HEADERS },
      ),
    };
  }
  const tenantSession = await resolveTenantSession(
    request.cookies.get(tenantSessionCookieName)?.value,
    teamActor.accountId,
  );
  if (!tenantSession) {
    return {
      response: Response.json(
        { status: "tenant_session_required" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  if (
    !VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.allowedRoles.includes(
      tenantSession.roleKey as never,
    )
  ) {
    return {
      response: Response.json(
        { status: "permission_denied" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  if (
    !VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.assurance.allowed.includes(
      teamActor.assuranceLevel as never,
    )
  ) {
    return {
      response: Response.json(
        { status: "step_up_required" },
        { status: 403, headers: NO_STORE_HEADERS },
      ),
    };
  }
  return {
    actor: {
      accountId: teamActor.accountId,
      tenantSessionId: tenantSession.sessionId,
      organizationId: tenantSession.organizationId,
      role: tenantSession.roleKey as VendureClubsSandboxReadinessActor["role"],
      assuranceLevel:
        teamActor.assuranceLevel as VendureClubsSandboxReadinessActor["assuranceLevel"],
    },
  };
}

export type VendureClubsSandboxReadinessRouteDependencies = Readonly<{
  validHost: (request: NextRequest) => boolean;
  resolveActor: (
    request: NextRequest,
  ) => Promise<VendureClubsSandboxReadinessActorResolution>;
  readReadiness: (
    actor: VendureClubsSandboxReadinessActor,
  ) => Promise<VendureClubsSandboxReadinessProjection>;
}>;

const DEFAULT_DEPENDENCIES: VendureClubsSandboxReadinessRouteDependencies = {
  validHost: validClubsTeamHostRequest,
  resolveActor: resolveVendureClubsSandboxReadinessActor,
  readReadiness: async () => readVendureClubsSandboxReadiness(),
};

export async function handleVendureClubsSandboxReadinessGet(
  request: NextRequest,
  dependencies: VendureClubsSandboxReadinessRouteDependencies = DEFAULT_DEPENDENCIES,
): Promise<Response> {
  if (!dependencies.validHost(request)) {
    return Response.json(
      { status: "misdirected" },
      { status: 421, headers: NO_STORE_HEADERS },
    );
  }
  let authority: VendureClubsSandboxReadinessActorResolution;
  try {
    authority = await dependencies.resolveActor(request);
  } catch {
    return Response.json(
      { status: "authentication_unavailable" },
      { status: 503, headers: { ...NO_STORE_HEADERS, "retry-after": "2" } },
    );
  }
  if ("response" in authority) return authority.response;

  try {
    return Response.json(await dependencies.readReadiness(authority.actor), {
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return Response.json(
      { status: "temporarily_unavailable" },
      { status: 503, headers: { ...NO_STORE_HEADERS, "retry-after": "2" } },
    );
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleVendureClubsSandboxReadinessGet(request);
}
