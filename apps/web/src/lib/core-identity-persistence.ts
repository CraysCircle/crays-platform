import { getCoreDatabaseRuntimeState, type CoreDatabaseRuntimeState } from "../db/client";

export type CoreIdentityConnectionState = "contract_ready" | "configured";

export type CoreIdentityTableKey =
  | "accounts"
  | "auth-identities"
  | "nostr-identities"
  | "nip05-handles"
  | "organizations"
  | "memberships"
  | "role-assignments"
  | "nostr-challenges"
  | "key-handoffs"
  | "audit-events";

export type CoreIdentityTable = {
  key: CoreIdentityTableKey;
  tableName: string;
  label: string;
  purpose: string;
  owner: "Identity" | "Security" | "Operations";
  accessPattern: "account_lookup" | "role_scope" | "proof_flow" | "audit_stream";
  rlsRequired: true;
  auditLevel: "standard" | "sensitive" | "append_only";
};

export type CoreIdentityIndex = {
  tableName: string;
  name: string;
  columns: string[];
  purpose: string;
  partialWhere?: string;
};

export type CoreIdentityRlsRule = {
  tableName: string;
  policyIntent: string;
  enforcement: "deny_until_context" | "service_role_only" | "append_only";
};

export type CoreIdentityMigrationContract = {
  version: "0001_core_identity";
  migrationPath: "database/migrations/0001_core_identity.sql";
  providerNeutral: true;
  executionStatus: "not_run";
  reviewRequiredBeforeProduction: true;
};

export type CoreIdentityPersistenceState = {
  connectionState: CoreIdentityConnectionState;
  databaseUrlConfigured: boolean;
  databaseRuntime: CoreDatabaseRuntimeState;
  schemaVersion: CoreIdentityMigrationContract["version"];
  requiredTables: number;
  rlsProtectedTables: number;
  migration: CoreIdentityMigrationContract;
  guardrails: string[];
};

export const coreIdentityTables: CoreIdentityTable[] = [
  {
    key: "accounts",
    tableName: "crays_core.crays_accounts",
    label: "Accounts",
    purpose: "Global CRAYS account, status, CRAYS ID and default role.",
    owner: "Identity",
    accessPattern: "account_lookup",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "auth-identities",
    tableName: "crays_core.auth_identities",
    label: "Access identities",
    purpose: "Provider subjects and verified contact or signer methods mapped to one CRAYS account.",
    owner: "Identity",
    accessPattern: "account_lookup",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "nostr-identities",
    tableName: "crays_core.nostr_identities",
    label: "Nostr identities",
    purpose: "CRAYS-issued public key, npub, NIP-05 handle and signer state for every account.",
    owner: "Identity",
    accessPattern: "proof_flow",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "nip05-handles",
    tableName: "crays_core.nip05_handles",
    label: "NIP-05 handles",
    purpose: "Unique CRAYS address reservation and public key mapping.",
    owner: "Identity",
    accessPattern: "proof_flow",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "organizations",
    tableName: "crays_core.organizations",
    label: "Organizations",
    purpose: "CRAYS, partner, bank, landlord, vendor and investor organization records.",
    owner: "Operations",
    accessPattern: "role_scope",
    rlsRequired: true,
    auditLevel: "standard",
  },
  {
    key: "memberships",
    tableName: "crays_core.organization_memberships",
    label: "Memberships",
    purpose: "Account-to-organization membership with role and scope state.",
    owner: "Operations",
    accessPattern: "role_scope",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "role-assignments",
    tableName: "crays_core.role_assignments",
    label: "Role assignments",
    purpose: "Role, scope, entity and mandatory Nostr binding for each account.",
    owner: "Security",
    accessPattern: "role_scope",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "nostr-challenges",
    tableName: "crays_core.nostr_challenges",
    label: "Nostr challenges",
    purpose: "Single-use signer proof challenges with expiry and replay protection.",
    owner: "Security",
    accessPattern: "proof_flow",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "key-handoffs",
    tableName: "crays_core.key_handoff_events",
    label: "Key handoffs",
    purpose: "One-time private-key handoff state without storing plaintext key material.",
    owner: "Security",
    accessPattern: "proof_flow",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "audit-events",
    tableName: "crays_core.audit_events",
    label: "Audit events",
    purpose: "Append-only access, identity, permission and security decisions.",
    owner: "Security",
    accessPattern: "audit_stream",
    rlsRequired: true,
    auditLevel: "append_only",
  },
];

export const coreIdentityIndexes: CoreIdentityIndex[] = [
  {
    tableName: "crays_core.crays_accounts",
    name: "crays_accounts_status_role_idx",
    columns: ["status", "default_role"],
    purpose: "Admin account review queues.",
  },
  {
    tableName: "crays_core.auth_identities",
    name: "auth_identities_provider_subject_idx",
    columns: ["provider_key", "provider_subject"],
    purpose: "Map provider subject to CRAYS account.",
  },
  {
    tableName: "crays_core.nostr_identities",
    name: "nostr_identities_active_pubkey_idx",
    columns: ["pubkey_hex"],
    purpose: "Resolve active public keys quickly.",
    partialWhere: "access_enabled = true",
  },
  {
    tableName: "crays_core.nip05_handles",
    name: "nip05_handles_domain_local_idx",
    columns: ["domain", "local_part"],
    purpose: "Serve well-known NIP-05 resolution.",
  },
  {
    tableName: "crays_core.organization_memberships",
    name: "organization_memberships_account_status_idx",
    columns: ["account_id", "status"],
    purpose: "Load active organization scope for an account.",
  },
  {
    tableName: "crays_core.role_assignments",
    name: "role_assignments_account_role_status_idx",
    columns: ["account_id", "role_key", "status"],
    purpose: "Evaluate active role grants.",
  },
  {
    tableName: "crays_core.nostr_challenges",
    name: "nostr_challenges_pending_expiry_idx",
    columns: ["status", "expires_at"],
    purpose: "Expire pending signer challenges.",
    partialWhere: "status = 'pending'",
  },
  {
    tableName: "crays_core.audit_events",
    name: "audit_events_target_created_idx",
    columns: ["target_type", "target_id", "created_at"],
    purpose: "Review target history.",
  },
];

export const coreIdentityRlsRules: CoreIdentityRlsRule[] = coreIdentityTables.map((table) => ({
  tableName: table.tableName,
  policyIntent:
    table.auditLevel === "append_only"
      ? "Append-only security review access."
      : "Deny by default until CRAYS account, role, organization and entity context is set.",
  enforcement: table.auditLevel === "append_only" ? "append_only" : table.accessPattern === "proof_flow" ? "service_role_only" : "deny_until_context",
}));

export const coreIdentityMigrationContract: CoreIdentityMigrationContract = {
  version: "0001_core_identity",
  migrationPath: "database/migrations/0001_core_identity.sql",
  providerNeutral: true,
  executionStatus: "not_run",
  reviewRequiredBeforeProduction: true,
};

export const coreIdentityPersistenceGuardrails = [
  "CRAYS core owns account, role, organization, Nostr and audit identity records.",
  "Module databases remain separate and connect through adapters and external record maps.",
  "Every account requires a CRAYS-issued Nostr identity after account mapping.",
  "Every active role assignment requires a Nostr public identity binding.",
  "Plaintext private keys are never stored in the database.",
  "Challenge nonces must be single-use, expiring and auditable before production access.",
  "Database row access must be denied by default and reinforced by server-side permission checks.",
];

export function getCoreIdentityPersistenceState(
  env: Record<string, string | undefined> = process.env,
): CoreIdentityPersistenceState {
  const databaseUrlConfigured = Boolean(env.CRAYS_DATABASE_URL);
  const databaseRuntime = getCoreDatabaseRuntimeState(env);

  return {
    connectionState: databaseUrlConfigured ? "configured" : "contract_ready",
    databaseUrlConfigured,
    databaseRuntime,
    schemaVersion: coreIdentityMigrationContract.version,
    requiredTables: coreIdentityTables.length,
    rlsProtectedTables: coreIdentityTables.filter((table) => table.rlsRequired).length,
    migration: coreIdentityMigrationContract,
    guardrails: coreIdentityPersistenceGuardrails,
  };
}

export function coreIdentityTableByKey(key: string | null | undefined) {
  return coreIdentityTables.find((table) => table.key === key);
}
