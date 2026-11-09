import type { AuthMethodType } from "./identity";
import type { RoleKey } from "./roles";

export type AccountIdentityStageKey =
  | "provider-subject"
  | "crays-account"
  | "crays-id"
  | "nostr-identity"
  | "role-binding"
  | "scope-review"
  | "audit-ready";

export type AccountIdentityStage = {
  key: AccountIdentityStageKey;
  label: string;
  status: "contract_ready" | "blocked_until_persistence" | "blocked_until_provider" | "manual_review";
  owner: "Platform Admin" | "Security" | "Operations";
  description: string;
};

export type AccessMethodContract = {
  key: AuthMethodType | "enterprise";
  label: string;
  source: "provider" | "crays";
  purpose: string;
  status: "contract_ready" | "blocked_until_provider" | "blocked_until_policy";
  mapsToCraysAccount: true;
  requiresNostrIdentity: true;
};

export type KeyHandoffStateContract = {
  state: "not_created" | "one_time_pending" | "confirmed" | "not_applicable";
  label: string;
  userVisible: boolean;
  privateKeyMaterialStored: false;
  nextAction: string;
};

export type RoleBindingContract = {
  role: RoleKey;
  label: string;
  bindingRequired: true;
  defaultState: "pending" | "verified" | "system_attested";
  visibility: "admin" | "role-owner" | "security";
};

export type AccountIdentitySettingsContract = {
  status: "contract_ready";
  liveAccountsReturned: false;
  liveSecretsReturned: false;
  livePrivateKeysReturned: false;
  stages: AccountIdentityStage[];
  accessMethods: AccessMethodContract[];
  keyHandoffStates: KeyHandoffStateContract[];
  roleBindings: RoleBindingContract[];
  guardrails: string[];
};

export const accountIdentityStages: AccountIdentityStage[] = [
  {
    key: "provider-subject",
    label: "Provider subject",
    status: "blocked_until_provider",
    owner: "Platform Admin",
    description: "External access method is normalized into one stable provider subject.",
  },
  {
    key: "crays-account",
    label: "CRAYS account",
    status: "blocked_until_persistence",
    owner: "Platform Admin",
    description: "Provider subject maps to a CRAYS-owned account, status and default role.",
  },
  {
    key: "crays-id",
    label: "CRAYS ID",
    status: "contract_ready",
    owner: "Security",
    description: "Each account receives a readable NIP-05 handle such as username@crays.net.",
  },
  {
    key: "nostr-identity",
    label: "Nostr identity",
    status: "contract_ready",
    owner: "Security",
    description: "Each account receives a CRAYS-issued public identity and signer state.",
  },
  {
    key: "role-binding",
    label: "Role binding",
    status: "contract_ready",
    owner: "Security",
    description: "Every role assignment is bound to the account public identity.",
  },
  {
    key: "scope-review",
    label: "Scope review",
    status: "manual_review",
    owner: "Operations",
    description: "Organization, studio, deal, project and member scopes are reviewed before access.",
  },
  {
    key: "audit-ready",
    label: "Audit ready",
    status: "contract_ready",
    owner: "Security",
    description: "Identity, role and key-state decisions create audit events before live use.",
  },
];

export const accessMethodContracts: AccessMethodContract[] = [
  {
    key: "contact",
    label: "Contact link",
    source: "provider",
    purpose: "Simple first access for candidates, partners and members.",
    status: "blocked_until_provider",
    mapsToCraysAccount: true,
    requiresNostrIdentity: true,
  },
  {
    key: "social",
    label: "Social provider",
    source: "provider",
    purpose: "Consumer-friendly first access through approved identity providers.",
    status: "blocked_until_provider",
    mapsToCraysAccount: true,
    requiresNostrIdentity: true,
  },
  {
    key: "enterprise",
    label: "Enterprise SSO",
    source: "provider",
    purpose: "Federated access for banks, landlords, suppliers and CRAYS teams.",
    status: "blocked_until_provider",
    mapsToCraysAccount: true,
    requiresNostrIdentity: true,
  },
  {
    key: "passkey",
    label: "Passkey",
    source: "provider",
    purpose: "Phishing-resistant access for high-risk roles.",
    status: "blocked_until_provider",
    mapsToCraysAccount: true,
    requiresNostrIdentity: true,
  },
  {
    key: "mfa",
    label: "MFA",
    source: "provider",
    purpose: "Additional proof for sensitive finance, admin and document actions.",
    status: "blocked_until_policy",
    mapsToCraysAccount: true,
    requiresNostrIdentity: true,
  },
  {
    key: "nostr",
    label: "Nostr signer",
    source: "crays",
    purpose: "Portable CRAYS identity proof through a signed challenge.",
    status: "contract_ready",
    mapsToCraysAccount: true,
    requiresNostrIdentity: true,
  },
];

export const keyHandoffStates: KeyHandoffStateContract[] = [
  {
    state: "not_created",
    label: "Not created",
    userVisible: false,
    privateKeyMaterialStored: false,
    nextAction: "Create CRAYS-issued identity after account mapping.",
  },
  {
    state: "one_time_pending",
    label: "One-time pending",
    userVisible: true,
    privateKeyMaterialStored: false,
    nextAction: "Show the private key one time, require backup confirmation and remove it from the response path.",
  },
  {
    state: "confirmed",
    label: "Confirmed",
    userVisible: true,
    privateKeyMaterialStored: false,
    nextAction: "Keep public identity, signer state and audit record only.",
  },
  {
    state: "not_applicable",
    label: "Not applicable",
    userVisible: false,
    privateKeyMaterialStored: false,
    nextAction: "Use linked external signer proof without CRAYS-generated private key material.",
  },
];

export const roleBindingContracts: RoleBindingContract[] = [
  { role: "crays-management", label: "Management", bindingRequired: true, defaultState: "pending", visibility: "security" },
  { role: "admin", label: "Admin", bindingRequired: true, defaultState: "pending", visibility: "security" },
  { role: "deal-manager", label: "Deal Manager", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "expansion-manager", label: "Expansion Manager", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "finance", label: "Finance", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "hr", label: "HR", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "franchise-candidate", label: "Franchise Candidate", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "franchise-partner", label: "Franchise Partner", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "studio-manager", label: "Studio Manager", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "bank-partner", label: "Bank Partner", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "investor", label: "Investor", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "landlord", label: "Landlord", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "vendor", label: "Vendor", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "reviewer", label: "Reviewer", bindingRequired: true, defaultState: "pending", visibility: "security" },
  { role: "gym-member", label: "Gym Member", bindingRequired: true, defaultState: "pending", visibility: "role-owner" },
  { role: "guest", label: "Guest", bindingRequired: true, defaultState: "pending", visibility: "admin" },
];

export const accountIdentityGuardrails = [
  "Provider identity proves the person; CRAYS grants product access.",
  "Every mapped account receives a CRAYS ID and CRAYS-issued Nostr identity.",
  "Every active role assignment requires public identity binding.",
  "Private keys are shown only once during handoff and are never stored as plaintext.",
  "No live account data, secrets or private keys are returned by the settings contract.",
  "Role, organization, studio, deal, project, member and document scopes are checked server-side.",
];

export function getAccountIdentitySettingsContract(): AccountIdentitySettingsContract {
  return {
    status: "contract_ready",
    liveAccountsReturned: false,
    liveSecretsReturned: false,
    livePrivateKeysReturned: false,
    stages: accountIdentityStages,
    accessMethods: accessMethodContracts,
    keyHandoffStates,
    roleBindings: roleBindingContracts,
    guardrails: accountIdentityGuardrails,
  };
}
