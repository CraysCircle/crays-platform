import { NextRequest } from "next/server";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { auth0, getAuth0RuntimeConfigState } from "@/lib/auth0";
import { createCraysSessionFromIdentityBundle } from "@/lib/auth-session-mapping";
import { createAnonymousSession, createProviderAuthenticatedSession, getAuthEnvironmentState } from "@/lib/auth-boundary";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { isSelfServiceProvisioningRole, provisionProviderAccount } from "@/lib/provider-account-provisioning";
import { completeAuthenticatedProviderBaseline } from "@/lib/personal-agent-baseline-host";
import { roleByKey, type RoleKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderUser = {
  sub?: string;
  name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
};

function requestedSelfServiceRole(bodyRole: unknown, fallbackRole: RoleKey): RoleKey {
  const raw = typeof bodyRole === "string" ? bodyRole : fallbackRole;
  return roleByKey(raw || fallbackRole).key;
}

async function getProviderUser(request: NextRequest) {
  const providerSession = await auth0.getSession(request);
  return providerSession?.user as ProviderUser | undefined;
}

export async function GET(request: NextRequest) {
  const environment = getAuthEnvironmentState();
  const auth0Runtime = getAuth0RuntimeConfigState();

  let providerUser: ProviderUser | undefined;
  try {
    providerUser = await getProviderUser(request);
  } catch {
    return Response.json(
      {
        status: "provider_session_unreadable",
        environment,
        auth0Runtime,
        providerAuthenticated: false,
        accountMapped: false,
        session: createAnonymousSession(),
      },
      { status: 503 },
    );
  }

  if (!providerUser?.sub) {
    return Response.json({
      status: "no_provider_session",
      environment,
      auth0Runtime,
      providerAuthenticated: false,
      accountMapped: false,
      provisioningAvailable: false,
      session: createAnonymousSession(),
    });
  }

  const bundle = await getIdentityBundleByProviderSubject("auth0", providerUser.sub);
  const session = bundle ? createCraysSessionFromIdentityBundle(bundle) : createProviderAuthenticatedSession();

  return Response.json({
    status: bundle ? "mapped" : "provider_authenticated_unmapped",
    environment,
    auth0Runtime,
    providerAuthenticated: true,
    accountMapped: Boolean(bundle),
    provisioningAvailable: !bundle,
    provider: {
      type: "auth0",
      subjectPresent: true,
      contactPresent: Boolean(providerUser.email),
      contactVerified: Boolean(providerUser.email_verified),
    },
    session,
    nextAction: bundle ? "Use CRAYS account context." : "POST this endpoint to create a reviewed CRAYS account mapping.",
    privateKeysReturned: false,
    secretsReturned: false,
  });
}

export async function POST(request: NextRequest) {
  let providerUser: ProviderUser | undefined;
  try {
    providerUser = await getProviderUser(request);
  } catch {
    return Response.json(
      {
        status: "provider_session_unreadable",
        providerAuthenticated: false,
        accountMapped: false,
        session: createAnonymousSession(),
      },
      { status: 503 },
    );
  }

  if (!providerUser?.sub) {
    return Response.json(
      {
        status: "provider_session_required",
        providerAuthenticated: false,
        accountMapped: false,
        session: createAnonymousSession(),
        note: "A provider session is required before CRAYS can create an account mapping.",
      },
      { status: 401 },
    );
  }

  const context = await resolveCraysRouteContext(request, { fallbackRole: "franchise-candidate" });
  const body = (await request.json().catch(() => ({}))) as { requestedRole?: unknown; source?: unknown };
  const requestedRole = requestedSelfServiceRole(body.requestedRole, context.role);

  if (!isSelfServiceProvisioningRole(requestedRole)) {
    return Response.json(
      {
        status: "role_not_self_service",
        providerAuthenticated: true,
        accountMapped: false,
        requestedRole,
        allowedSelfServiceRoles: ["franchise-candidate", "gym-member", "investor"],
        note: "Privileged CRAYS roles must be assigned through Admin review, not self-service provider login.",
      },
      { status: 400 },
    );
  }

  const result = await provisionProviderAccount({
    providerKey: "auth0",
    providerSubject: providerUser.sub,
    displayName: providerUser.name ?? providerUser.nickname,
    contactAddress: providerUser.email,
    contactVerified: Boolean(providerUser.email_verified),
    requestedRole,
    source: body.source === "member-app" ? "member-app" : body.source === "franchise" ? "franchise" : "platform",
  });

  const personalAgentBaseline = await completeAuthenticatedProviderBaseline(request, providerUser.sub);

  return Response.json({
    ...result,
    personalAgentBaseline,
    providerAuthenticated: true,
    provider: {
      type: "auth0",
      subjectPresent: true,
      contactPresent: Boolean(providerUser.email),
      contactVerified: Boolean(providerUser.email_verified),
    },
    note:
      result.status === "already_mapped"
        ? "The provider session already maps to a CRAYS account."
        : "A reviewed CRAYS account mapping was created. Nostr binding, role review and product access remain gated.",
  });
}
