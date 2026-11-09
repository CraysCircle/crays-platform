import { admitNativePersonalRequest } from "./native-personal-messenger";
import { createNativeScopedEmailRegistrationService } from "@/db/native-email-registration.mjs";
import { getNativeCurrentAccountEmailVerification as getCurrentAccountEmailVerification, getNativeCurrentAccountContactRevision as getCurrentAccountContactRevision } from "@/db/account-email-verification";
import { NativeEmailSetupDocument, NativeRegisterEmailDocument, NativeIdentityStatusDocument, type NativeEmailRegistrationInput, type NativeEmailRegistrationProjection, type NativeIdentityStatusProjection } from "@/graphql/native-identity-documents";
import { createNativeAuth0Verifier } from "./native-auth/native-auth0-verifier.mjs";
import { createNativeCoreIdentityBoundary } from "./native-auth/native-core-identity-boundary.mjs";
import type { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { lookupNativeIdentityThroughOriginalCore } from "./native-core-identity-lookup";
import { createCraysSessionFromIdentityBundle } from "./auth-session-mapping";
import { evaluateSessionPermission, type CraysAuthSession } from "./auth-boundary";
import { permissionsForRole } from "./permissions";
import type { CraysRouteContext } from "./dal/server-trust";

// Existing Bootstrap and a separate registered self-identity read; no account creation or domain action.
export const nativeBootstrapHash = "14b052bb389af4c0406d5d458487ade45f30303f951238ee77306f0c25bf499c";
export class NativeCoreRequestError extends Error {
  readonly code: string;
  readonly status: 401 | 403 | 409 | 503;
  constructor(code: string, status: 401 | 403 | 409 | 503 = 401) {
    super(code); this.code = code; this.status = status;
  }
}
const scopePattern = /^[\x21\x23-\x5b\x5d-\x7e]+$/;
type Environment = Record<string, string | undefined>;
type VerifiedNativeProviderBinding = Readonly<{
  providerKey: "auth0"; providerSubject: string; issuer: string; clientId: string;
}>;
type Ports = {
  environment?: Environment;
  lookup?: (providerKey: string, providerSubject: string, binding: VerifiedNativeProviderBinding) => ReturnType<typeof getIdentityBundleByProviderSubject>;
  lookupContactVerification?: typeof getCurrentAccountEmailVerification;
  lookupContactRevision?: typeof getCurrentAccountContactRevision;
  fetch?: typeof globalThis.fetch;
};

/** Server-created resolver. Request/model input can never provide these ports. */
export function createNativeCoreRequestResolver(ports: Ports = {}) {
  const env = ports.environment ?? process.env;
  const admissions = new WeakMap<Request, { authorization: string; operation: "bootstrap" | "identity" | "contact"; variables?: NativeEmailRegistrationInput; emailAuthorization?: string }>();
  let contactService: ReturnType<typeof createNativeScopedEmailRegistrationService> | undefined;
  let contactVerifier: ReturnType<typeof createNativeAuth0Verifier> | undefined;
  let boundary: ReturnType<typeof createNativeCoreIdentityBoundary> | undefined;
  let identityBoundary: ReturnType<typeof createNativeCoreIdentityBoundary> | undefined;
  function configuredBoundary() {
    if (env.CRAYS_NATIVE_AUTH_ENABLED !== "true") throw new NativeCoreRequestError("NATIVE_AUTH_NOT_CONFIGURED", 503);
    if (boundary) return boundary;
    const identityScope = env.CRAYS_NATIVE_AUTH_IDENTITY_SCOPE;
    const bootstrapScope = env.CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE;
    if (!identityScope || !bootstrapScope || identityScope === bootstrapScope ||
        !scopePattern.test(identityScope) || !scopePattern.test(bootstrapScope)) {
      throw new NativeCoreRequestError("NATIVE_AUTH_NOT_CONFIGURED", 503);
    }
    try {
      const verifier = createNativeAuth0Verifier({
        issuer: env.CRAYS_NATIVE_AUTH_ISSUER,
        audience: env.CRAYS_NATIVE_AUTH_AUDIENCE,
        nativeClientIds: (env.CRAYS_NATIVE_AUTH_CLIENT_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean),
      }, { fetch: ports.fetch ?? globalThis.fetch });
      const scopedVerifier = {
        ...verifier,
        async authenticate(request: Request) {
          const principal = await verifier.authenticate(request);
          verifier.requireScopes(request, principal, [bootstrapScope]);
          return principal;
        },
      };
      identityBoundary = createNativeCoreIdentityBoundary({
        verifier,
        getIdentityBundleByProviderSubject: ports.lookup ?? lookupNativeIdentityThroughOriginalCore,
        createCraysSessionFromIdentityBundle,
        evaluateSessionPermission,
        requiredIdentityScope: identityScope,
      });
      boundary = createNativeCoreIdentityBoundary({
        verifier: scopedVerifier,
        getIdentityBundleByProviderSubject: ports.lookup ?? lookupNativeIdentityThroughOriginalCore,
        createCraysSessionFromIdentityBundle,
        evaluateSessionPermission,
        requiredIdentityScope: identityScope,
      });
      return boundary;
    } catch {
      throw new NativeCoreRequestError("NATIVE_AUTH_NOT_CONFIGURED", 503);
    }
  }
  async function admit(request: Request) {
    if (!request.headers.has("authorization")) return;
    configuredBoundary();
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/graphql" || url.search || request.headers.has("cookie")) {
      throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED");
    }
    const reader = request.clone().body?.getReader();
    if (!reader) throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > 32768) { void reader.cancel().catch(() => {}); throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED"); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED"); }
    const query = body?.extensions?.persistedQuery;
    const operation = body?.operationName === "PlatformBootstrap" && query?.sha256Hash === nativeBootstrapHash
      ? "bootstrap" : body?.operationName === "NativeIdentityStatus" &&
        query?.sha256Hash === NativeIdentityStatusDocument.__meta__.hash ? "identity"
        : body?.operationName === "NativeEmailSetup" && query?.sha256Hash === NativeEmailSetupDocument.__meta__.hash ? "identity"
        : body?.operationName === "NativeRegisterEmail" && query?.sha256Hash === NativeRegisterEmailDocument.__meta__.hash ? "contact" : null;
    const validContactInput = body?.variables && !Array.isArray(body.variables) && typeof body.variables === "object" &&
      Object.keys(body.variables).length === 2 && typeof body.variables.idempotencyKey === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(body.variables.idempotencyKey) && typeof body.variables.expectedContactRevision === "string" &&
      /^[1-9][0-9]{0,18}$/.test(body.variables.expectedContactRevision);
    const emailAuthorization = request.headers.get("x-crays-email-authorization");
    if (operation === "contact" ? (!validContactInput || !emailAuthorization || emailAuthorization.length > 16391 ||
        !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(emailAuthorization)) : emailAuthorization !== null) {
      throw new NativeCoreRequestError("NATIVE_OPERATION_NOT_ADMITTED", 403);
    }
    if (!body || Array.isArray(body) || typeof body !== "object" ||
        Object.keys(body).some(key => !["operationName", "extensions", "variables"].includes(key)) ||
        !operation || query?.version !== 1 ||
        Object.keys(body.extensions).some(key => key !== "persistedQuery") ||
        Object.keys(query).some(key => !["version", "sha256Hash"].includes(key)) ||
        (operation !== "contact" && body.variables !== undefined && (!body.variables || Array.isArray(body.variables) ||
          typeof body.variables !== "object" || Object.keys(body.variables).length))) {
      throw new NativeCoreRequestError("NATIVE_OPERATION_NOT_ADMITTED", 403);
    }
    admissions.set(request, { authorization: request.headers.get("authorization")!, operation: operation!,
      ...(operation === "contact" ? { variables: { ...body.variables }, emailAuthorization: emailAuthorization! } : {}) });
  }
  async function resolve(request: Request): Promise<CraysRouteContext> {
    const admission = admissions.get(request);
    if (!admission || admission.operation !== "bootstrap" || admission.authorization !== request.headers.get("authorization")) {
      throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED");
    }
    let session: CraysAuthSession | null;
    let recheckAuthentication: (() => void) | undefined;
    try {
      const observed = await configuredBoundary().resolve(request);
      session = observed.session; recheckAuthentication = observed.assertAuthenticationCurrent;
    }
    catch (error) {
      if (error instanceof NativeCoreRequestError) throw error;
      if (error instanceof Error && error.message === "NATIVE_AUTHENTICATION_REQUIRED") {
        throw new NativeCoreRequestError("NATIVE_AUTHENTICATION_REQUIRED");
      }
      throw new NativeCoreRequestError("NATIVE_CORE_LOOKUP_UNAVAILABLE", 503);
    }
    if (session?.status !== "crays_mapped" || session.account?.status !== "active" ||
        !session.activeRole || !session.account.id || session.requiredActions.length) {
      throw new NativeCoreRequestError("NATIVE_CORE_MAPPING_REQUIRED", 403);
    }
    const emailVerified = await hasVerifiedCurrentCoreContact(session);
    assertAuthenticationCurrent(recheckAuthentication);
    if (!emailVerified) {
      throw new NativeCoreRequestError("NATIVE_EMAIL_VERIFICATION_REQUIRED", 403);
    }
    const role = session.activeRole;
    const assignments = session.roleAssignments.filter(value => value.role === role && value.status === "active" &&
      value.accountId === session.account!.id);
    // No review fallback or client-selected tenant. Personal/global and multi-org
    // contexts need their explicit canonical selection contract before admission.
    if (assignments.length !== 1 || !assignments[0].organizationId) {
      throw new NativeCoreRequestError("NATIVE_CONTEXT_SELECTION_REQUIRED", 403);
    }
    const assignment = assignments[0];
    const identity = session.account.nostrIdentity;
    if (!identity.accessEnabled || identity.signerStatus !== "verified" || !identity.pubkeyHex ||
        !/^[0-9a-f]{64}$/.test(identity.pubkeyHex) || assignment.nostrBinding.pubkeyHex !== identity.pubkeyHex ||
        !["verified", "system_attested"].includes(assignment.nostrBinding.status)) {
      throw new NativeCoreRequestError("NATIVE_CORE_MAPPING_REQUIRED", 403);
    }
    const capabilities = permissionsForRole(role).filter(permission => permission.scopes.some(scope =>
      evaluateSessionPermission(session!, { permission: permission.key, scope }).allowed)).map(permission => permission.key);
    return {
      role, tenantId: assignment.organizationId!, session,
      // Same canonical Auth0/Core authority, distinct transport enforced privately.
      authoritySource: "auth0-crays-session",
      reviewPersona: { requestedRole: null, effectiveRole: role, allowed: false,
        reason: "Canonical native Core identity; no review persona admitted.", auditRequired: true },
      capabilities,
    };
  }
  function isIdentityRequest(request: Request) {
    return ["identity", "contact"].includes(admissions.get(request)?.operation ?? "");
  }
  async function resolveIdentity(request: Request): Promise<NativeIdentityStatusProjection> {
    const admission = admissions.get(request);
    if (!["identity", "contact"].includes(admission?.operation ?? "") || admission!.authorization !== request.headers.get("authorization")) {
      throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED");
    }
    configuredBoundary();
    let session: CraysAuthSession | null;
    let recheckAuthentication: (() => void) | undefined;
    try {
      const observed = await identityBoundary!.resolve(request);
      session = observed.session; recheckAuthentication = observed.assertAuthenticationCurrent;
    }
    catch (error) {
      if (error instanceof Error && error.message === "NATIVE_AUTHENTICATION_REQUIRED") {
        throw new NativeCoreRequestError("NATIVE_AUTHENTICATION_REQUIRED");
      }
      throw new NativeCoreRequestError("NATIVE_CORE_LOOKUP_UNAVAILABLE", 503);
    }
    if (!session?.account) return {
      contactRevision: null, accountMapped: false, accountId: null, accountStatus: "UNMAPPED", emailVerificationRequired: true,
      nostrPublicKeyHex: null, nostrSignerVerified: false, requiredActions: ["map_account", "verify_contact", "connect_signer"],
    };
    const account = session.account, identity = account.nostrIdentity;
    let contactRevision: string | null;
    try {contactRevision=await (ports.lookupContactRevision ?? getCurrentAccountContactRevision)(account.id,account.primaryContact ?? null,account.primaryContactType ?? null);}
    catch {throw new NativeCoreRequestError("NATIVE_CONTACT_REVISION_UNAVAILABLE",503);}
    assertAuthenticationCurrent(recheckAuthentication);
    if(!contactRevision)throw new NativeCoreRequestError("NATIVE_CONTACT_STATE_CHANGED",409);
    const pubkey = typeof identity.pubkeyHex === "string" && /^[0-9a-f]{64}$/.test(identity.pubkeyHex) ? identity.pubkeyHex : null;
    const emailVerified = await hasVerifiedCurrentCoreContact(session);
    assertAuthenticationCurrent(recheckAuthentication);
    const requiredActions = [...session.requiredActions];
    if (!emailVerified) requiredActions.push("verify_contact");
    const assignments = session.roleAssignments.filter(value => value.role === session!.activeRole && value.status === "active" && value.accountId === account.id);
    const actions: string[] = [...new Set(requiredActions)];
    if (assignments.length !== 1 || !assignments[0].organizationId) actions.push("select_context");
    if (account.status !== "active" && !actions.includes("review_membership")) actions.push("review_membership");
    return {
      contactRevision, accountMapped: true, accountId: account.id, accountStatus: account.status.toUpperCase(),
      emailVerificationRequired: !emailVerified, nostrPublicKeyHex: pubkey,
      nostrSignerVerified: Boolean(pubkey && identity.accessEnabled && identity.signerStatus === "verified"),
      requiredActions: actions,
    };
  }
  function isContactRequest(request: Request) { return admissions.get(request)?.operation === "contact"; }
  async function registerEmail(request: Request, input: NativeEmailRegistrationInput): Promise<NativeEmailRegistrationProjection> {
    const admission = admissions.get(request);
    if (admission?.operation !== "contact" || admission.authorization !== request.headers.get("authorization") ||
        admission.emailAuthorization !== request.headers.get("x-crays-email-authorization") ||
        admission.variables?.idempotencyKey !== input.idempotencyKey ||
        admission.variables?.expectedContactRevision !== input.expectedContactRevision) {
      throw new NativeCoreRequestError("NATIVE_REQUEST_NOT_ADMITTED");
    }
    const writeScope = env.CRAYS_NATIVE_AUTH_CONTACT_WRITE_SCOPE;
    if (!writeScope || !scopePattern.test(writeScope) || [env.CRAYS_NATIVE_AUTH_IDENTITY_SCOPE, env.CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE].includes(writeScope)) {
      throw new NativeCoreRequestError("NATIVE_CONTACT_WRITE_NOT_CONFIGURED", 503);
    }
    try {
      const configuration = { issuer: env.CRAYS_NATIVE_AUTH_ISSUER, audience: env.CRAYS_NATIVE_AUTH_AUDIENCE,
        nativeClientIds: (env.CRAYS_NATIVE_AUTH_CLIENT_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean),
        requiredIdentityScope: env.CRAYS_NATIVE_AUTH_IDENTITY_SCOPE, requiredContactWriteScope: writeScope };
      contactVerifier ??= createNativeAuth0Verifier(configuration, { fetch: ports.fetch ?? globalThis.fetch });
      const principal = await contactVerifier.authenticate(request);
      contactVerifier.requireScopes(request, principal, [configuration.requiredIdentityScope!, writeScope]);
      contactVerifier.requireRecentAuthentication(request, principal, 300);
      contactService ??= createNativeScopedEmailRegistrationService(configuration, { fetch: ports.fetch ?? globalThis.fetch });
      const secondary = new Request(request.url, { method: "POST", signal: request.signal,
        headers: { authorization: admission.emailAuthorization! } });
      const proof = await contactService.readEmailProof(secondary);
      return await contactService.register(request, secondary, proof, input);
    } catch (error) {
      if (error instanceof NativeCoreRequestError) throw error;
      const message = error instanceof Error ? error.message : "";
      if (message === "NATIVE_AUTHENTICATION_REQUIRED") throw new NativeCoreRequestError(message);
      const safe = /^NATIVE_EMAIL_(REGISTRATION|PROOF)_/.test(message) ? message : "NATIVE_EMAIL_REGISTRATION_UNAVAILABLE";
      const status = /UNAVAILABLE|OUTCOME_UNKNOWN/.test(safe) ? 503 : /CHANGED|CONFLICT|ALREADY_BOUND/.test(safe) ? 409 : 403;
      throw new NativeCoreRequestError(safe, status);
    }
  }
  async function hasVerifiedCurrentCoreContact(session: CraysAuthSession): Promise<boolean> {
    const account = session.account, email = account?.primaryContact;
    if (!account || account.primaryContactType !== "contact" || typeof email !== "string" ||
        email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return false;
    try {
      const proof = await (ports.lookupContactVerification ?? getCurrentAccountEmailVerification)(
        account.id, env.CRAYS_NATIVE_AUTH_ISSUER!,
      );
      return Boolean(proof && proof.account_id === account.id);
    } catch { throw new NativeCoreRequestError("NATIVE_EMAIL_PROOF_LOOKUP_UNAVAILABLE", 503); }
  }
  function assertAuthenticationCurrent(recheck: (() => void) | undefined) {
    try { if (!recheck) throw new Error(); recheck(); }
    catch { throw new NativeCoreRequestError("NATIVE_AUTHENTICATION_REQUIRED"); }
  }
  return Object.freeze({ admit, resolve, isIdentityRequest, resolveIdentity, isContactRequest, registerEmail });
}
const nativeResolver = createNativeCoreRequestResolver();
export async function admitNativeCoreGraphQLRequest(request: Request) {
  try { if (await admitNativePersonalRequest(request)) return; }
  catch (error) {
    const code = error instanceof Error && /^NATIVE_PERSONAL_[A-Z_]+$/.test(error.message) ? error.message : "NATIVE_PERSONAL_UNAVAILABLE";
    throw new NativeCoreRequestError(code, /NOT_CONFIGURED|UNAVAILABLE/.test(code) ? 503 : 403);
  }
  return nativeResolver.admit(request);
}
export const resolveNativeCoreRouteContext = nativeResolver.resolve;

export const isNativeIdentityGraphQLRequest = nativeResolver.isIdentityRequest;
export const resolveNativeIdentityStatus = nativeResolver.resolveIdentity;


export const isNativeEmailRegistrationGraphQLRequest = nativeResolver.isContactRequest;
export const executeNativeEmailRegistration = nativeResolver.registerEmail;
