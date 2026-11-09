import type { Block199AccessInput, Block199Surface } from "@/lib/block199-strong-auth-policy";
import type { RoleNostrBindingStatus } from "@/lib/role-nostr-policy";
import type { RoleKey } from "@/lib/roles";

const auth0MfaAcr = "http://schemas.openid.net/pape/policies/2007/06/multi-factor";
const strongRoles = new Set<RoleKey>([
  "admin",
  "crays-management",
  "finance",
  "bank-partner",
  "holiday-manager",
]);

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function block199AssuranceFromProviderClaims(user: Record<string, unknown> | null | undefined) {
  const methods = strings(user?.amr).map((method) => method.trim().toLowerCase());
  const acr = typeof user?.acr === "string" ? user.acr.trim().toLowerCase() : "";
  // Auth0's web-app step-up contract requires an ID token AMR value of `mfa`.
  // A primary OTP, passkey or WebAuthn method on its own is not treated as MFA:
  // doing so would incorrectly upgrade passwordless/single-factor authentication.
  const assuranceLevel = acr.includes("aal3")
    ? "aal3"
    : methods.includes("mfa") || acr === auth0MfaAcr || acr.includes("aal2")
      ? "aal2"
      : "aal1";
  const authTime = typeof user?.auth_time === "number" && Number.isFinite(user.auth_time)
    ? new Date(user.auth_time * 1000)
    : null;
  return { assuranceLevel, authenticatedAt: authTime } as const;
}

export const BLOCK199_AUTH0_MFA_ACR = auth0MfaAcr;

export function block199RoleRequiresStrongAuthentication(role: RoleKey) {
  return strongRoles.has(role);
}

export function block199RoleBindingVerified(input: {
  bindingStatus: RoleNostrBindingStatus | null | undefined;
  browserProofVerified: boolean;
}) {
  // A system-attested assignment is a server-owned role binding for an
  // isolated, pre-authorized operator scenario. It does not claim that a
  // Nostr identity, key or browser proof exists. A user-bound Nostr assignment
  // still requires the matching browser proof on this request.
  return input.bindingStatus === "system_attested"
    || (input.bindingStatus === "verified" && input.browserProofVerified);
}

export function createBlock199RuntimeInput(input: {
  surface: Block199Surface;
  role: RoleKey;
  providerUser: Record<string, unknown>;
  providerState: Block199AccessInput["providerState"];
  coreState: Block199AccessInput["coreState"];
  rateLimitState: Block199AccessInput["rateLimitState"];
  accountState: Block199AccessInput["accountState"];
  tenantSessionState: Block199AccessInput["tenantSessionState"];
  accountSecurityVersionMatches: boolean;
  providerAccountAligned: boolean;
  nostrBindingVerified: boolean;
  strongAuthenticationRequired?: boolean;
  now?: Date;
}): Block199AccessInput {
  const assurance = block199AssuranceFromProviderClaims(input.providerUser);
  return {
    surface: input.surface,
    providerState: input.providerState,
    coreState: input.coreState,
    rateLimitState: input.rateLimitState,
    accountState: input.accountState,
    tenantSessionState: input.tenantSessionState,
    accountSecurityVersionMatches: input.accountSecurityVersionMatches,
    providerAccountAligned: input.providerAccountAligned,
    nostrBindingVerified: input.nostrBindingVerified,
    assuranceLevel: assurance.assuranceLevel,
    authenticatedAt: assurance.authenticatedAt,
    strongAuthenticationRequired:
      input.strongAuthenticationRequired ?? block199RoleRequiresStrongAuthentication(input.role),
    now: input.now,
  };
}
