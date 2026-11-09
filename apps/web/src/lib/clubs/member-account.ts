import {readCoreOriginalMemberIdentityAndOwnState} from "@/db/core-original-member-combined-reader";
import type {MemberOwnState} from "@/lib/clubs/member-own-state-contract";
import {createCoreOriginalMemberIdentityRuntimeRpcClient} from "@/db/core-identity-runtime-rpc";
import {getCoreOriginalMemberIdentityRpcPool} from "@/db/core-identity-runtime-pool";
import "server-only";

import type { NextRequest } from "next/server";
import {
  type IdentityBundle,
} from "@/db/core-identity-repository";
import {
  getAuth0RuntimeConfigStateForRequest,
  getExactOidcServerSessionRead,
} from "@/lib/auth0";
import { exactOidcIdentity } from "@/lib/exact-oidc-identity";

export type ClubsMemberAccountResolution = {
  bundle: IdentityBundle;
  mode: "auth0";
};

type ProviderProfile = Readonly<{
  name: string | null;
  email: string | null;
  emailVerified: boolean;
}>;

export type ClubsMemberAccountState =
  | Readonly<{ status: "signed_out" }>
  | Readonly<{ status: "configuration_not_ready" }>
  | Readonly<{ status: "provider_session_unreadable" }>
  | Readonly<{ status: "invalid_session_provenance" }>
  | Readonly<{ status: "identity_binding_required"; provider: ProviderProfile }>
  | Readonly<{ status: "core_unavailable" }>
  | Readonly<{
      status: "ready";
      bundle: IdentityBundle;
      mode: "auth0";
      provider: ProviderProfile | null;
      /** Only an explicit server-side opt-in returns this current request DTO. */
      ownState?: MemberOwnState;
    }>;

function runtimeConfigured(request: NextRequest) {
  const state = getAuth0RuntimeConfigStateForRequest(request);
  return (
    state.application === "clubs" &&
    state.appBaseUrlConfigured &&
    state.baseUrlMatchesRequestOrigin &&
    state.domainConfigured &&
    state.clientIdConfigured &&
    state.clientSecretConfigured &&
    state.secretConfigured
  );
}

export async function resolveClubsMemberAccountState(
  request: NextRequest,
  options: Readonly<{includeOwnState?: boolean}> = {},
): Promise<ClubsMemberAccountState> {
  if (!runtimeConfigured(request)) return { status: "configuration_not_ready" };

  let serverSession: Awaited<ReturnType<typeof getExactOidcServerSessionRead>>;
  try {
    serverSession = await getExactOidcServerSessionRead(request);
  } catch {
    return { status: "provider_session_unreadable" };
  }
  if (!serverSession || serverSession.status === "signed_out") {
    return { status: "signed_out" };
  }
  if (serverSession.status === "invalid_session_provenance") {
    return { status: "invalid_session_provenance" };
  }

  let identity: ReturnType<typeof exactOidcIdentity>;
  try {
    identity = exactOidcIdentity(
      serverSession.validatedIssuer,
      serverSession.validatedSubject,
    );
  } catch {
    return { status: "invalid_session_provenance" };
  }
  if (serverSession.validatedSubject !== identity.subject) {
    return { status: "invalid_session_provenance" };
  }

  let bundle: IdentityBundle | null;
  let ownState: MemberOwnState | undefined;
  try {
    if(options.includeOwnState===true){
      const combined=await readCoreOriginalMemberIdentityAndOwnState({
        issuer:serverSession.validatedIssuer,
        subject:serverSession.validatedSubject,
        serverConfiguredClientId:serverSession.serverConfiguredClientId,
      });
      bundle=combined?.bundle??null;
      ownState=combined?.state;
    }else{
    bundle = await createCoreOriginalMemberIdentityRuntimeRpcClient(
      (sql,values)=>getCoreOriginalMemberIdentityRpcPool().query(sql,values),
    ).resolveAuth0IdentityBundleV2(
      serverSession.validatedIssuer,
      serverSession.validatedSubject,
      serverSession.serverConfiguredClientId,
    );
    }
  } catch {
    return { status: "core_unavailable" };
  }
  const provider: ProviderProfile = serverSession.providerProfile;
  if (!bundle) return { status: "identity_binding_required", provider };
  return { status: "ready", bundle, mode: "auth0", provider, ...(ownState===undefined?{}:{ownState}) };
}

export async function resolveClubsMemberAccount(
  request: NextRequest,
): Promise<ClubsMemberAccountResolution | null> {
  const resolution = await resolveClubsMemberAccountState(request);
  return resolution.status === "ready"
    ? { bundle: resolution.bundle, mode: resolution.mode }
    : null;
}
