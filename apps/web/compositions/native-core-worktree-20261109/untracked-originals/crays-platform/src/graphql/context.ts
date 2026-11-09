import { isNativePersonalRequest, executeNativePersonalRequest } from "@/lib/native-personal-messenger";
import type { NativePersonalInput } from "./native-personal-messenger-documents";
import { executeNativeEmailRegistration, isNativeEmailRegistrationGraphQLRequest, isNativeIdentityGraphQLRequest, resolveNativeIdentityStatus } from "@/lib/native-core-auth";
import type { NativeEmailRegistrationInput, NativeEmailRegistrationProjection, NativeIdentityStatusProjection } from "./native-identity-documents";
import { createProviderAuthenticatedSession } from "@/lib/auth-boundary";
import { NativeCoreRequestError } from "@/lib/native-core-auth";
import { resolveCraysRouteContext, type CraysRouteContext } from "@/lib/dal/server-trust";
import type { CraysGraphQLRuntimeConfig } from "./runtime-config";
import {
  createGymReadLoaders,
  PostgresGymReadRepository,
  type GymReadRepositoryPort,
} from "./reads/gym-read-model";
import { CachedGymReadRepository, checkGraphQLRateLimit } from "./performance/redis-layer";
import { GraphQLError } from "graphql";
import { getInternalGraphQLRateDimensions } from "./performance/request-metadata";
import { resolveOcaWorkloadAuthority, type OcaWorkloadAuthority } from "@/db/oca-workload-authority-service";

export type CraysGraphQLContext = {
  nativePersonal?: (field: string, input: NativePersonalInput) => ReturnType<typeof executeNativePersonalRequest>;
  nativeIdentityStatus?: NativeIdentityStatusProjection;
  nativeRegisterEmail?: (input: NativeEmailRegistrationInput) => Promise<NativeEmailRegistrationProjection>;
  request: Request;
  route: CraysRouteContext;
  runtime: CraysGraphQLRuntimeConfig;
  requestId: string;
  readPort: GymReadRepositoryPort;
  readLoaders: ReturnType<typeof createGymReadLoaders>;
  workloadAuthority: OcaWorkloadAuthority;
};

export type CraysGraphQLNextContext = {
  params: Promise<Record<string, string>>;
};

function normalizedRequestId(value: string | null) {
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : crypto.randomUUID();
}

export async function createCraysGraphQLContext(
  request: Request,
  runtime: CraysGraphQLRuntimeConfig,
): Promise<CraysGraphQLContext> {
  if (isNativePersonalRequest(request)) {
    // Own-person operation policy runs inside the actual command transaction.
    // No business role, tenant, Gym access or agent workload is fabricated.
    const rate = await checkGraphQLRateLimit({ ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local", tenantId: "", role: "guest", accountId: null, operation: getInternalGraphQLRateDimensions(request).operation, target: "native-personal-chuck" });
    if (!rate.allowed) throw new GraphQLError("RATE_LIMITED", { extensions: { code: "RATE_LIMITED" } });
    const route: CraysRouteContext = { role: "guest", tenantId: "", session: createProviderAuthenticatedSession(), authoritySource: "auth0-crays-session", capabilities: [], reviewPersona: { requestedRole: null, effectiveRole: "guest", allowed: false, reason: "Own personal Chuck operation only", auditRequired: true } };
    const readPort: GymReadRepositoryPort = { scope: { tenantId: "", role: "guest", accountId: null }, list: async () => { throw new GraphQLError("FORBIDDEN"); }, queryCount: () => 0 };
    return { request, route, runtime, nativePersonal: (field,input) => executeNativePersonalRequest(request,field,input), requestId: normalizedRequestId(request.headers.get("x-request-id")), readPort, readLoaders: createGymReadLoaders(readPort), workloadAuthority: { status: "not_present", reasonCode: "NATIVE_PERSONAL_ONLY" } };
  }
  if (isNativeIdentityGraphQLRequest(request)) {
    let projection: NativeIdentityStatusProjection;
    try { projection = await resolveNativeIdentityStatus(request); }
    catch (error) {
      if (!(error instanceof NativeCoreRequestError)) throw error;
      throw new GraphQLError(error.code, { extensions: { code: error.code, http: { status: error.status } } });
    }
    const rate = await checkGraphQLRateLimit({ ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local",
      tenantId: "", role: "guest", accountId: projection.accountId, operation: getInternalGraphQLRateDimensions(request).operation, target: "native-self-identity" });
    if (!rate.allowed) throw new GraphQLError("GraphQL request rate limit exceeded.", { extensions: { code: "RATE_LIMITED" } });
    // Compatibility metadata only: no organization, active role, domain access
    // or agent workload is assigned to a provider-only identity request.
    const route: CraysRouteContext = { role: "guest", tenantId: "", session: createProviderAuthenticatedSession(),
      authoritySource: "auth0-crays-session", capabilities: [],
      reviewPersona: { requestedRole: null, effectiveRole: "guest", allowed: false, reason: "Native self identity only", auditRequired: true } };
    const readPort: GymReadRepositoryPort = { scope: { tenantId: "", role: "guest", accountId: null },
      list: async () => { throw new GraphQLError("NATIVE_SELF_IDENTITY_ONLY", { extensions: { code: "FORBIDDEN" } }); }, queryCount: () => 0 };
    return { request, route, runtime, nativeIdentityStatus: projection,
      ...(isNativeEmailRegistrationGraphQLRequest(request) ? { nativeRegisterEmail: (input: NativeEmailRegistrationInput) => executeNativeEmailRegistration(request, input) } : {}),
      requestId: normalizedRequestId(request.headers.get("x-request-id")), readPort, readLoaders: createGymReadLoaders(readPort),
      workloadAuthority: { status: "not_present", reasonCode: "NATIVE_SELF_IDENTITY_ONLY" } };
  }
  let route: CraysRouteContext;
  try { route = await resolveCraysRouteContext(request, { fallbackRole: "guest" }); }
  catch (error) {
    if (!(error instanceof NativeCoreRequestError)) throw error;
    throw new GraphQLError(error.code, { extensions: { code: error.code, http: { status: error.status } } });
  }
  const readPort = new PostgresGymReadRepository({
    tenantId: route.tenantId,
    role: route.role,
    accountId: route.session.account?.id ?? null,
  });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const rateDimensions = getInternalGraphQLRateDimensions(request);
  const rate = await checkGraphQLRateLimit({ ip, deviceId: request.headers.get("x-crays-device-id"), tenantId: route.tenantId, role: route.role, accountId: route.session.account?.id ?? null, operation: rateDimensions.operation, target: rateDimensions.target });
  const workloadAuthority = await resolveOcaWorkloadAuthority(request, rateDimensions.operation);
  if (!rate.allowed) throw new GraphQLError("GraphQL request rate limit exceeded.", { extensions: { code: "RATE_LIMITED", retryAfterMs: rate.retryAfterMs } });
  const cachedReadPort = new CachedGymReadRepository(readPort);
  return {
    request,
    route,
    runtime,
    requestId: normalizedRequestId(request.headers.get("x-request-id")),
    readPort: cachedReadPort,
    readLoaders: createGymReadLoaders(cachedReadPort),
    workloadAuthority,
  };
}
