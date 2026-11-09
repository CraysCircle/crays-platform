import {createCoreOriginalMemberIdentityRuntimeRpcClient} from "@/db/core-identity-runtime-rpc";
import {getCoreOriginalMemberIdentityRpcPool} from "@/db/core-identity-runtime-pool";
import {getAuth0RuntimeConfigStateForRequest} from "@/lib/auth0";
import "server-only";
import type { NextRequest } from "next/server";
import type { IdentityBundle } from "@/db/core-identity-repository";
import { createCoreIdentityRuntimeRpcClient } from "@/db/core-identity-runtime-rpc";
import { getExactOidcServerSessionRead, type ExactOidcServerSessionRead } from "@/lib/auth0";

type ReadySession = Extract<ExactOidcServerSessionRead, { status: "ready" }>;
export type ExactSessionIdentityRead =
  | Readonly<{ status: "signed_out" | "invalid_session_provenance" | "unavailable"; providerAuthenticated: false; bundle: null }>
  | Readonly<{ status: "core_unavailable"; providerAuthenticated: true; bundle: null }>
  | Readonly<{ status: "mapped" | "unmapped"; providerAuthenticated: true; bundle: IdentityBundle | null; providerProfile: ReadySession["providerProfile"] }>;
export type ExactSessionIdentityDependencies = Readonly<{
  readSession(request: NextRequest): Promise<ExactOidcServerSessionRead | null>;
  readBundle(issuer: string, subject: string, clientId: string): Promise<IdentityBundle | null>;
}>;
const dependencies: ExactSessionIdentityDependencies = {
  readSession: getExactOidcServerSessionRead,
  readBundle: (issuer, subject, clientId) => createCoreIdentityRuntimeRpcClient().resolveAuth0IdentityBundleV2(issuer, subject, clientId),
};
// One SDK read; host and configured client are checked by the existing reader.
// The exact issuer RPC owns admission. Contact fields never determine identity.
export async function readExactSessionIdentity(request: NextRequest, ports = dependencies): Promise<ExactSessionIdentityRead> {
  let provider: ExactOidcServerSessionRead | null;
  try { provider = await ports.readSession(request); }
  catch { return { status: "unavailable", providerAuthenticated: false, bundle: null }; }
  if (!provider) return { status: "unavailable", providerAuthenticated: false, bundle: null };
  if (provider.status !== "ready") return { status: provider.status, providerAuthenticated: false, bundle: null };
  try {
    const originalProductionClubs=ports===dependencies&&process.env.VERCEL_ENV==="production"&&getAuth0RuntimeConfigStateForRequest(request).application==="clubs";
    if(originalProductionClubs&&(process.env.VERCEL!=="1"||process.env.VERCEL_PROJECT_ID!=="prj_NGR48JMHR98KDvTcVDFXaiDmPR7N"))throw Error("ORIGINAL_MEMBER_SERVER_CONTEXT_MISMATCH");
    const bundle = originalProductionClubs
      ? await createCoreOriginalMemberIdentityRuntimeRpcClient((sql,values)=>getCoreOriginalMemberIdentityRpcPool().query(sql,values)).resolveAuth0IdentityBundleV2(provider.validatedIssuer,provider.validatedSubject,provider.serverConfiguredClientId)
      : await ports.readBundle(provider.validatedIssuer, provider.validatedSubject, provider.serverConfiguredClientId);
    return { status: bundle ? "mapped" : "unmapped", providerAuthenticated: true, bundle, providerProfile: provider.providerProfile };
  } catch {
    return { status: "core_unavailable", providerAuthenticated: true, bundle: null };
  }
}
