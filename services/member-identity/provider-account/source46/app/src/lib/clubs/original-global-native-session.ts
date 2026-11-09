import "server-only";
import type {NextRequest} from "next/server";
import {getAuth0RuntimeConfigStateForRequest,getExactOidcServerSessionRead} from "@/lib/auth0";
import {exactOidcIdentity} from "@/lib/exact-oidc-identity";
import {createCoreIdentityRuntimeRpcClient} from "@/db/core-identity-runtime-rpc";
import {readCoreOriginalMemberIdentityAndOwnState} from "@/db/core-original-member-combined-reader";
const originalEnvelope = require("./original-global-native-session.cjs");
const originalProjection = require("./original-native-session-projections.cjs");

/** Original representation only: both original realms use one actual SDK read. */
export async function readOriginalGlobalNativeSession(request: NextRequest) {
  const runtime = getAuth0RuntimeConfigStateForRequest(request);
  if (!(runtime.application === "clubs" && runtime.appBaseUrlConfigured &&
      runtime.baseUrlMatchesRequestOrigin && runtime.domainConfigured &&
      runtime.clientIdConfigured && runtime.clientSecretConfigured && runtime.secretConfigured)) {
    return {status:503,body:{status:"configuration_not_ready"}};
  }
  let session: Awaited<ReturnType<typeof getExactOidcServerSessionRead>>;
  try { session = await getExactOidcServerSessionRead(request); }
  catch { return {status:503,body:{status:"provider_session_unreadable",providerAuthenticated:false,accountMapped:false}}; }
  if (!session || session.status === "signed_out") {
    return originalProjection.memberSession({status:200,body:{status:"no_provider_session"}});
  }
  if (session.status !== "ready") {
    return {status:401,body:{status:"invalid_session_provenance",providerAuthenticated:false,accountMapped:false}};
  }
  try {
    const exact = exactOidcIdentity(session.validatedIssuer,session.validatedSubject);
    if (exact.subject !== session.validatedSubject) throw Error("INVALID_SESSION_PROVENANCE");
  } catch {
    return {status:401,body:{status:"invalid_session_provenance",providerAuthenticated:false,accountMapped:false}};
  }
  const sdkIdentity = Object.freeze({issuer:session.validatedIssuer,subject:session.validatedSubject,
    serverConfiguredClientId:session.serverConfiguredClientId});
  // Original projections consume only genuine SDK profile data; no caller identity enters here.
  const user = {email:session.providerProfile.email,email_verified:session.providerProfile.emailVerified};
  try {
    const mainBundle = await createCoreIdentityRuntimeRpcClient().resolveAuth0IdentityBundleV2(
      sdkIdentity.issuer,sdkIdentity.subject,sdkIdentity.serverConfiguredClientId);
    const globalResult = originalProjection.dto(mainBundle,user,sdkIdentity.serverConfiguredClientId);
    return await originalEnvelope.resolve({sdkIdentity,user,globalResult,
      readNative:readCoreOriginalMemberIdentityAndOwnState,
      projectGlobalSession:originalProjection.memberSession});
  } catch {
    return {status:503,body:{status:"core_unavailable",providerAuthenticated:true,
      accountMapped:false,provisioningAvailable:false,bookingAuthority:false}};
  }
}
