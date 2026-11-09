import "server-only";

/** Core identity is immutable. An existing personally owned SDK agent may have
 * a different name; that name is a transport destination, never a Core person
 * or an authority inferred from a user's email/name/telephone. No route is
 * exposed as a native input and no SDK default/normalization fallback is used. */
export type PersonalAgentRoute = Readonly<{
  agentId: string;
  sdkAgentId?: string;
  sdkSessionKey: string;
  runtimeBindingSHA256: string;
}>;
export type PersonalAgentRouteGuard = Readonly<{
  coreAgentId: string;
  sdkAgentId: string;
  runtimeBindingSHA256: string;
}>;
const fail = (code: string) => new Error("NATIVE_PERSONAL_AGENT_ROUTE_" + code);

export function personalSdkAgentId(route: PersonalAgentRoute): string {
  if (!route || typeof route.agentId !== "string") throw fail("INVALID_TARGET");
  const sdk = route.sdkAgentId === undefined ? route.agentId : route.sdkAgentId;
  // Original SDK4 accepts canonical filesystem-safe agent IDs up to64 chars.
  // Unlike its permissive normalizer, reject malformed input without repair.
  if (!/^personal-[a-f0-9]{48}$/.test(route.agentId) || typeof sdk !== "string" ||
      !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(sdk) ||
      ["main", "default", "global", "business"].includes(sdk) ||
      typeof route.runtimeBindingSHA256 !== "string" || !/^[a-f0-9]{64}$/.test(route.runtimeBindingSHA256) ||
      typeof route.sdkSessionKey !== "string" || !route.sdkSessionKey.startsWith(`agent:${sdk}:`)) throw fail("INVALID_TARGET");
  const tail = route.sdkSessionKey.slice(`agent:${sdk}:`.length);
  // Match SDK4's ownership-head parser; never repair/strip opaque tail bytes.
  if (!tail || tail.startsWith(":") || Buffer.byteLength(route.sdkSessionKey) > 512 ||
      /[\x00-\x20\x7f]/.test(route.sdkSessionKey)) throw fail("INVALID_TARGET");
  return sdk;
}

/** The owning host's CURRENT admission resolver must supply this exact tuple
 * for a distinct existing agent, before connection and on every IO/event check.
 * A digest, matching name or this callback interface does NOT issue admission.
 * This remains separate from Core's existing person/assignment/receipt checks. */
export function assertPersonalAgentRoute(route: PersonalAgentRoute, guard?: PersonalAgentRouteGuard): void {
  const sdk = personalSdkAgentId(route);
  if ((!guard && sdk !== route.agentId) || (guard &&
      (guard.coreAgentId !== route.agentId || guard.sdkAgentId !== sdk ||
       guard.runtimeBindingSHA256 !== route.runtimeBindingSHA256))) throw fail("CURRENT_MAPPING_REQUIRED");
}
