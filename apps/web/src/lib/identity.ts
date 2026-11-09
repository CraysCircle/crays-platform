import type { RoleKey } from "./roles";
import type { RoleNostrBindingStatus } from "./role-nostr-policy";

export type AuthMethodType = "contact" | "social" | "passkey" | "mfa" | "signer" | "nostr";

export type AuthIdentity = {
  id: string;
  accountId: string;
  type: AuthMethodType;
  provider: string;
  verified: boolean;
  lastUsedAt?: string;
};

export type NostrIdentity = {
  accountId: string;
  npub?: string;
  pubkeyHex?: string;
  nip05?: string;
  nip05Status: "not_claimed" | "claimed" | "resolved" | "mismatch" | "verified";
  issuer: "crays" | "external";
  issuanceStatus: "required" | "queued" | "issued" | "handoff_pending" | "active" | "revoked";
  privateKeyHandoff: "not_created" | "one_time_pending" | "confirmed" | "not_applicable";
  accessEnabled: boolean;
  proofMethod?: "nip07" | "nip46" | "nip98" | "server_generated_once";
  signerStatus: "not_connected" | "pending" | "connected" | "verified";
  linkedAt?: string;
  lastSignedEventAt?: string;
};

export type OrganizationMembership = {
  accountId: string;
  organizationId: string;
  role: RoleKey;
  status: "invited" | "active" | "review" | "suspended";
  scopes: string[];
};

export type RoleAssignment = {
  id: string;
  accountId: string;
  role: RoleKey;
  nostrBinding: {
    required: true;
    status: RoleNostrBindingStatus;
    pubkeyHex?: string;
    nip05?: string;
    verifiedAt?: string;
  };
  organizationId?: string;
  entityType?: "portfolio" | "studio" | "deal" | "project" | "bank-package" | "member" | "document";
  entityId?: string;
  grantedBy: string;
  status: "active" | "review" | "revoked";
};

export type CraysAccount = {
  id: string;
  displayName: string;
  primaryContact?: string;
  primaryContactType?: "contact" | "nip05" | "npub";
  status: "active" | "review" | "blocked";
  craysId: string;
  defaultRole: RoleKey;
  authIdentities: AuthIdentity[];
  nostrIdentity: NostrIdentity;
  memberships: OrganizationMembership[];
  roleAssignments: RoleAssignment[];
};

export const authEnvironmentContract = [
  "AUTH0_SECRET",
  "APP_BASE_URL",
  "AUTH0_DOMAIN",
  "AUTH0_BASE_URL",
  "AUTH0_ISSUER_BASE_URL",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_AUDIENCE",
] as const;

export const identityGuardrails = [
  "Authentication provider proves identity; CRAYS grants access.",
  "NIP-05 identifies a public key, but signer proof is required before access is mapped.",
  "The public key is the stable CRAYS identity reference across systems.",
  "Every CRAYS account receives a CRAYS-issued Nostr identity during first account mapping.",
  "Every role assignment must be bound to a Nostr public identity internally.",
  "Roles and document scopes are evaluated inside CRAYS.",
  "Private keys are never stored, logged or displayed after handoff.",
  "Sensitive actions require server-side authorization, not shell visibility alone.",
];
