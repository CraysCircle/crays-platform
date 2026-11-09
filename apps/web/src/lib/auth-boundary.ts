import { authEnvironmentContract, type CraysAccount, type RoleAssignment } from "./identity";
import { getNostrAccessContract, type NostrAccessContract } from "./nostr-identity";
import { evaluatePermission, type PermissionCheckInput, type PermissionDecision } from "./permissions";
import { isRoleNostrBindingSatisfied, nostrBindingForRole } from "./role-nostr-policy";
import { defaultRole, roleByKey, type RoleKey } from "./roles";

export type AuthConnectionState = "not_configured" | "contract_ready" | "provider_ready";

export type AuthProviderClaims = {
  subject: string;
  displayName?: string;
  contactAddress?: string;
  contactVerified?: boolean;
  provider?: string;
  organizationRef?: string;
  method?: "passwordless" | "social" | "passkey" | "mfa" | "enterprise" | "nostr" | "unknown";
  nostrPubkeyHex?: string;
  nostrNip05?: string;
};

export type AuthEnvironmentKeyState = {
  key: (typeof authEnvironmentContract)[number];
  configured: boolean;
  secret: boolean;
};

export type AuthEnvironmentState = {
  connectionState: AuthConnectionState;
  baseUrlConfigured: boolean;
  issuerConfigured: boolean;
  clientConfigured: boolean;
  secretConfigured: boolean;
  keys: AuthEnvironmentKeyState[];
};

export type AuthBoundaryAccountSeed = {
  providerSubject: string;
  displayName: string;
  primaryContact?: string;
  contactVerified: boolean;
  organizationRef?: string;
  method: AuthProviderClaims["method"];
  nostrPubkeyHex?: string;
  nostrNip05?: string;
  requiresCraysIssuedNostrIdentity: true;
};

export type CraysAuthSession = {
  status: "anonymous" | "provider_authenticated" | "crays_mapped" | "blocked";
  account?: CraysAccount;
  activeRole?: RoleKey;
  roleAssignments: RoleAssignment[];
  requiredActions: Array<
    "map_account" | "verify_contact" | "assign_role" | "review_membership" | "connect_signer" | "verify_nostr_identity"
  >;
};

export type AuthRouteContract = {
  callbackPath: "/auth/callback";
  sessionEndpoint: "/api/crays/auth/session";
  providerAccountEndpoint: "/api/crays/auth/provider/account";
  contractEndpoint: "/api/crays/auth/contract";
  nostr: NostrAccessContract;
  protectedSurfaces: string[];
  publicSurfaces: string[];
  rules: string[];
};

const protectedSurfaces = [
  "/dashboard",
  "/crm",
  "/project",
  "/erp",
  "/files",
  "/analytics",
  "/loans",
  "/chat",
  "/operations",
  "/hr",
  "/learning",
  "/support",
  "/sites",
  "/sync",
  "/settings",
] as const;

const publicSurfaces = [
  "/",
  "/portal",
  "/franchise",
  "/franchise/deals",
  "/franchise/candidate",
  "/pre-packed-deals",
  "/pre-packed-deals/candidate",
  "/real-estate",
  "/real-estate-partners",
  "/funding-partner-bank",
  "/investments",
] as const;

export function getAuthEnvironmentState(env: Record<string, string | undefined> = process.env): AuthEnvironmentState {
  const keys = authEnvironmentContract.map((key) => ({
    key,
    configured: Boolean(env[key]),
    secret: key.includes("SECRET"),
  }));

  const baseUrlConfigured = Boolean(env.APP_BASE_URL || env.AUTH0_BASE_URL);
  const issuerConfigured = Boolean(env.AUTH0_DOMAIN || env.AUTH0_ISSUER_BASE_URL);
  const clientConfigured = Boolean(env.AUTH0_CLIENT_ID);
  const secretConfigured = Boolean(env.AUTH0_SECRET && env.AUTH0_CLIENT_SECRET);
  const providerReady = baseUrlConfigured && issuerConfigured && clientConfigured && secretConfigured;

  return {
    connectionState: providerReady ? "provider_ready" : "contract_ready",
    baseUrlConfigured,
    issuerConfigured,
    clientConfigured,
    secretConfigured,
    keys,
  };
}

export function getAuthRouteContract(): AuthRouteContract {
  return {
    callbackPath: "/auth/callback",
    sessionEndpoint: "/api/crays/auth/session",
    providerAccountEndpoint: "/api/crays/auth/provider/account",
    contractEndpoint: "/api/crays/auth/contract",
    nostr: getNostrAccessContract(),
    protectedSurfaces: [...protectedSurfaces],
    publicSurfaces: [...publicSurfaces],
    rules: [
      "Provider identity proves the person.",
      "Nostr identity can resolve a NIP-05 handle or public key, then requires signer proof.",
      "Every CRAYS account receives a CRAYS-issued Nostr identity during first account mapping.",
      "CRAYS maps Nostr public keys to accounts, roles, scopes and status.",
      "Every CRAYS role assignment is internally bound to a Nostr public identity.",
      "CRAYS account mapping grants product access.",
      "Roles, scopes and permissions are evaluated inside CRAYS.",
      "Sensitive actions require server-side checks.",
      "No provider secrets are sent to the browser.",
    ],
  };
}

export function mapProviderClaimsToAccountSeed(claims: AuthProviderClaims): AuthBoundaryAccountSeed {
  return {
    providerSubject: claims.subject,
    displayName: claims.displayName ?? "Pending CRAYS Account",
    primaryContact: claims.contactAddress,
    contactVerified: Boolean(claims.contactVerified),
    organizationRef: claims.organizationRef,
    method: claims.method ?? "unknown",
    nostrPubkeyHex: claims.nostrPubkeyHex,
    nostrNip05: claims.nostrNip05,
    requiresCraysIssuedNostrIdentity: true,
  };
}

export function createAnonymousSession(): CraysAuthSession {
  return {
    status: "anonymous",
    roleAssignments: [],
    requiredActions: ["map_account", "assign_role"],
  };
}

export function createProviderAuthenticatedSession(): CraysAuthSession {
  return {
    status: "provider_authenticated",
    roleAssignments: [],
    requiredActions: ["map_account", "assign_role", "connect_signer", "verify_nostr_identity"],
  };
}

export function createDevelopmentSession(roleKey: string | null | undefined): CraysAuthSession {
  const role = roleByKey(roleKey ?? defaultRole);
  const roleAssignment: RoleAssignment = {
    id: "dev-role-assignment",
    accountId: "dev-account",
    role: role.key,
    nostrBinding: {
      required: nostrBindingForRole(role.key).required,
      status: "pending",
    },
    entityType: "portfolio",
    entityId: "crays-dev",
    grantedBy: "development-boundary",
    status: "review",
  };

  return {
    status: "crays_mapped",
    activeRole: role.key,
    roleAssignments: [roleAssignment],
    requiredActions: ["review_membership", "connect_signer", "verify_nostr_identity"],
  };
}

export function evaluateSessionPermission(session: CraysAuthSession, input: Omit<PermissionCheckInput, "role">): PermissionDecision {
  if (session.status !== "crays_mapped" || !session.activeRole) {
    return { allowed: false, reason: "No CRAYS account mapping is active." };
  }

  const activeAssignment = session.roleAssignments.find((assignment) => assignment.role === session.activeRole);
  if (!activeAssignment || activeAssignment.status !== "active") {
    return { allowed: false, reason: "CRAYS account or role review is required before this permission can be used." };
  }

  if (!isRoleNostrBindingSatisfied(activeAssignment?.nostrBinding.status)) {
    return { allowed: false, reason: "Nostr role binding is required before this permission can be used." };
  }

  if (session.requiredActions.length) {
    return { allowed: false, reason: "Required CRAYS account actions must be completed before this permission can be used." };
  }

  return evaluatePermission({
    ...input,
    role: session.activeRole,
  });
}
