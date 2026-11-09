import {createHash} from "node:crypto";
import {resolveAuth0IdentityBundleV2} from "@/db/core-identity-runtime-rpc";
import {isRegisteredOriginalGoogleRepairRequired,originalGoogleRepairPendingResponse} from "@/lib/clubs/original-google-provisioning-duplicate-guard";
import { NextRequest } from "next/server";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import {
  auth0,
  getAuth0RuntimeConfigStateForRequest,
  getExactOidcServerSessionInput,
} from "@/lib/auth0";
import { createCraysSessionFromIdentityBundle } from "@/lib/auth-session-mapping";
import {
  createAnonymousSession,
  createProviderAuthenticatedSession,
  getAuthEnvironmentState,
} from "@/lib/auth-boundary";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { exactOidcIdentity } from "@/lib/exact-oidc-identity";
import {
  isSelfServiceProvisioningRole,
  provisionProviderAccount,
} from "@/lib/provider-account-provisioning";
import { roleByKey, type RoleKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return Response.json(body, { ...init, headers });
}

type ProviderUser = {
  sub?: string;
  name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
};

function requestedSelfServiceRole(
  bodyRole: unknown,
  fallbackRole: RoleKey,
): RoleKey {
  const raw = typeof bodyRole === "string" ? bodyRole : fallbackRole;
  return roleByKey(raw || fallbackRole).key;
}

async function getProviderUser(request: NextRequest) {
  const providerSession = await auth0.getSession(request);
  return providerSession?.user as ProviderUser | undefined;
}

async function getProviderIdentity(
  request: NextRequest,
  providerUser: ProviderUser,
  application: ReturnType<
    typeof getAuth0RuntimeConfigStateForRequest
  >["application"],
) {
  if (!providerUser.sub) return null;
  if (application !== "clubs") {
    return {
      providerKey: "auth0",
      providerSubject: providerUser.sub,
      clientValidated: true,
      originalRepairSession: null,
    };
  }
  try {
    const session = await getExactOidcServerSessionInput(request);
    if (!session) return null;
    const identity = exactOidcIdentity(
      session.validatedIssuer,
      session.validatedSubject,
    );
    if (identity.subject !== providerUser.sub) return null;
    return {
      providerKey: identity.providerKey,
      providerSubject: identity.subject,
      clientValidated: Boolean(session.serverConfiguredClientId),
      originalRepairSession: isRegisteredOriginalGoogleRepairRequired({validatedIssuer:session.validatedIssuer,validatedSubject:session.validatedSubject,serverConfiguredClientIdSha256:createHash("sha256").update(session.serverConfiguredClientId,"utf8").digest("hex")}) ? session : null,
    };
  } catch {
    return null;
  }
}

async function lookupProviderBundle(identity: NonNullable<Awaited<ReturnType<typeof getProviderIdentity>>>) {
  const original = identity.originalRepairSession;
  return original
    ? resolveAuth0IdentityBundleV2(original.validatedIssuer, original.validatedSubject, original.serverConfiguredClientId)
    : getIdentityBundleByProviderSubject(identity.providerKey, identity.providerSubject);
}

export async function GET(request: NextRequest) {
  const environment = getAuthEnvironmentState();
  const auth0Runtime = getAuth0RuntimeConfigStateForRequest(request);

  let providerUser: ProviderUser | undefined;
  try {
    providerUser = await getProviderUser(request);
  } catch {
    return json(
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
    return json({
      status: "no_provider_session",
      environment,
      auth0Runtime,
      providerAuthenticated: false,
      accountMapped: false,
      provisioningAvailable: false,
      session: createAnonymousSession(),
    });
  }

  const providerIdentity = await getProviderIdentity(
    request,
    providerUser,
    auth0Runtime.application,
  );
  if (!providerIdentity?.clientValidated) {
    return json(
      {
        status: "invalid_session_provenance",
        providerAuthenticated: false,
        accountMapped: false,
        session: createAnonymousSession(),
      },
      { status: 401 },
    );
  }

  let bundle;
  try { bundle = await lookupProviderBundle(providerIdentity); }
  catch { return json({status:"core_unavailable",providerAuthenticated:true,accountMapped:false,provisioningAvailable:false,bookingAuthority:false},{status:503}); }
  if (!bundle && providerIdentity.originalRepairSession) {
    return json(originalGoogleRepairPendingResponse, {status:409});
  }
  const session = bundle
    ? createCraysSessionFromIdentityBundle(bundle)
    : createProviderAuthenticatedSession();

  return json({
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
      identityBinding:
        auth0Runtime.application === "clubs"
          ? "issuer+subject+server-selected-client"
          : "legacy-provider-subject",
    },
    session,
    nextAction: bundle
      ? "Use CRAYS account context."
      : "POST this endpoint to create a reviewed CRAYS account mapping.",
    bookingAuthority: false,
    privateKeysReturned: false,
    secretsReturned: false,
  });
}

export async function POST(request: NextRequest) {
  const auth0Runtime = getAuth0RuntimeConfigStateForRequest(request);
  let providerUser: ProviderUser | undefined;
  try {
    providerUser = await getProviderUser(request);
  } catch {
    return json(
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
    return json(
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

  const providerIdentity = await getProviderIdentity(
    request,
    providerUser,
    auth0Runtime.application,
  );
  if (!providerIdentity?.clientValidated) {
    return json(
      {
        status: "invalid_session_provenance",
        providerAuthenticated: false,
        accountMapped: false,
        session: createAnonymousSession(),
      },
      { status: 401 },
    );
  }

  if (auth0Runtime.application === "clubs") {
    const requestSecurity = validateClubsMemberMutationRequest(request);
    if (!requestSecurity.allowed) {
      return json(
        {
          status: "denied",
          reason: requestSecurity.reason,
          accountMapped: false,
        },
        { status: 403 },
      );
    }
  }

  if (providerIdentity.originalRepairSession) {
    let bundle;
    try { bundle = await lookupProviderBundle(providerIdentity); }
    catch { return json({status:"core_unavailable",providerAuthenticated:true,accountMapped:false,provisioningAvailable:false,bookingAuthority:false},{status:503}); }
    if (!bundle) return json(originalGoogleRepairPendingResponse, {status:409});
    return json({status:"already_mapped",providerAuthenticated:true,accountMapped:true,provisioningAvailable:false,bookingAuthority:false,session:createCraysSessionFromIdentityBundle(bundle),nextAction:"Use CRAYS account context."});
  }

  const context = await resolveCraysRouteContext(request, {
    fallbackRole:
      auth0Runtime.application === "clubs" ? "guest" : "franchise-candidate",
  });
  const body = (await request.json().catch(() => ({}))) as {
    requestedRole?: unknown;
    source?: unknown;
  };
  const requestedRole =
    auth0Runtime.application === "clubs"
      ? "guest"
      : requestedSelfServiceRole(body.requestedRole, context.role);

  if (!isSelfServiceProvisioningRole(requestedRole)) {
    return json(
      {
        status: "role_not_self_service",
        providerAuthenticated: true,
        accountMapped: false,
        requestedRole,
        allowedSelfServiceRoles: [
          "franchise-candidate",
          "gym-member",
          "investor",
          "guest",
        ],
        note: "Privileged CRAYS roles must be assigned through Admin review, not self-service provider login.",
      },
      { status: 400 },
    );
  }

  const result = await provisionProviderAccount({
    providerKey: providerIdentity.providerKey,
    providerSubject: providerIdentity.providerSubject,
    displayName: providerUser.name ?? providerUser.nickname,
    contactAddress: providerUser.email,
    contactVerified: Boolean(providerUser.email_verified),
    requestedRole,
    source:
      auth0Runtime.application === "clubs"
        ? "clubs"
        : body.source === "member-app"
          ? "member-app"
          : body.source === "franchise"
            ? "franchise"
            : "platform",
  });

  return json({
    ...result,
    providerAuthenticated: true,
    provider: {
      type: "auth0",
      subjectPresent: true,
      contactPresent: Boolean(providerUser.email),
      contactVerified: Boolean(providerUser.email_verified),
      identityBinding:
        auth0Runtime.application === "clubs"
          ? "issuer+subject+server-selected-client"
          : "legacy-provider-subject",
    },
    bookingAuthority: false,
    note:
      result.status === "already_mapped"
        ? "The provider session already maps to a CRAYS account."
        : "A reviewed CRAYS account mapping was created. Nostr binding, role review and product access remain gated.",
  });
}
