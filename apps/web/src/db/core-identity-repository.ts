import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

type AccountStatus = "active" | "review" | "blocked";
type ContactType = "contact" | "nip05" | "npub";
type AccessMethodType = "contact" | "social" | "passkey" | "mfa" | "signer" | "nostr";
type OrganizationType =
  | "crays"
  | "franchise-partner"
  | "bank"
  | "landlord"
  | "real-estate-partner"
  | "funding-partner"
  | "finance-partner"
  | "vendor"
  | "investor"
  | "advisor";
type OrganizationStatus = "active" | "review" | "suspended";
type MembershipStatus = "invited" | "active" | "review" | "suspended";
type RoleAssignmentStatus = "active" | "review" | "revoked";
type NostrBindingStatus = "missing" | "pending" | "verified" | "system_attested" | "revoked";
type ChallengeMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type CoreIdentityAccountInput = {
  accountId?: string;
  craysId: string;
  displayName: string;
  primaryContact?: string | null;
  primaryContactType: ContactType;
  defaultRole: string;
  status?: AccountStatus;
};

export type AuthIdentityInput = {
  identityId?: string;
  methodType: AccessMethodType;
  providerKey: string;
  providerSubject: string;
  verified?: boolean;
};

export type NostrIdentityInput = {
  npub?: string | null;
  pubkeyHex?: string | null;
  nip05?: string | null;
  nip05Status?: "not_claimed" | "claimed" | "resolved" | "mismatch" | "verified";
  issuanceStatus?: "required" | "queued" | "issued" | "handoff_pending" | "active" | "revoked";
  privateKeyHandoff?: "not_created" | "one_time_pending" | "confirmed" | "not_applicable";
  accessEnabled?: boolean;
  proofMethod?: "nip07" | "nip46" | "nip98" | "server_generated_once" | null;
  signerStatus?: "not_connected" | "pending" | "connected" | "verified";
};

export type Nip05HandleInput = {
  handleId?: string;
  localPart: string;
  domain: string;
  pubkeyHex: string;
  status?: "reserved" | "active" | "revoked";
};

export type OrganizationInput = {
  organizationId?: string;
  name: string;
  organizationType: OrganizationType;
  status?: OrganizationStatus;
  parentOrganizationId?: string | null;
};

export type OrganizationMembershipInput = {
  membershipId?: string;
  organizationId: string;
  roleKey: string;
  status?: MembershipStatus;
  scopes?: string[];
};

export type RoleAssignmentInput = {
  assignmentId?: string;
  roleKey: string;
  organizationId?: string | null;
  entityType?: "portfolio" | "studio" | "deal" | "project" | "property" | "property-case" | "partner" | "bank-package" | "loan-case" | "member" | "document" | null;
  entityId?: string | null;
  nostrBindingStatus?: NostrBindingStatus;
  nostrPubkeyHex?: string | null;
  nostrNip05?: string | null;
  status?: RoleAssignmentStatus;
  grantedByAccountId?: string | null;
};

export type AuditEventInput = {
  auditId?: string;
  actorAccountId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "allowed" | "denied" | "changed" | "failed";
  riskLevel?: "standard" | "sensitive" | "critical";
  metadata?: Record<string, unknown>;
};

export type UpsertCoreIdentityInput = {
  account: CoreIdentityAccountInput;
  authIdentity?: AuthIdentityInput;
  nostrIdentity?: NostrIdentityInput;
  nip05Handle?: Nip05HandleInput;
  organization?: OrganizationInput;
  membership?: OrganizationMembershipInput;
  roleAssignment?: RoleAssignmentInput;
  auditEvent?: AuditEventInput;
};

export type NostrChallengeInput = {
  challengeId?: string;
  accountId?: string | null;
  identifier?: string | null;
  pubkeyHex?: string | null;
  challenge: string;
  absoluteUrl: string;
  method: ChallengeMethod;
  expiresAt: Date;
};

export type VerifiedNostrSignerProofInput = {
  pubkeyHex: string;
  proofMethod: "nip07" | "nip46" | "nip98";
};

export type NostrIdentityHandoffInput = {
  accountId: string;
  pubkeyHex: string;
  npub?: string | null;
  expiresAt: Date;
  deliveryChannel?: "client_generated_once" | "external_signer" | "one_time_handoff";
  actorAccountId?: string | null;
};

export type NostrIdentityHandoffResult = {
  handoffId: string;
  expiresAt: string;
  bundle: IdentityBundle | null;
};

type CountRow = {
  table_name: string;
  row_count: string;
};

export type CoreIdentityRepositoryHealth = {
  configured: boolean;
  schema: "crays_core";
  expectedTables: number;
  existingTables: number;
  missingTables: string[];
  rowCounts: Array<{ tableName: string; rowCount: number }>;
};

export type IdentityBundle = {
  account: Record<string, unknown>;
  accessIdentities: Array<Record<string, unknown>>;
  nostrIdentity: Record<string, unknown> | null;
  nip05Handles: Array<Record<string, unknown>>;
  memberships: Array<Record<string, unknown>>;
  roleAssignments: Array<Record<string, unknown>>;
};

const expectedTables = [
  "crays_accounts",
  "auth_identities",
  "nostr_identities",
  "nip05_handles",
  "organizations",
  "organization_memberships",
  "role_assignments",
  "nostr_challenges",
  "key_handoff_events",
  "audit_events",
];

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function normalizeLower(value: string | null | undefined) {
  return value ? value.toLowerCase() : value;
}

async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getCoreIdentityRepositoryHealth(): Promise<CoreIdentityRepositoryHealth> {
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured) {
    return {
      configured: false,
      schema: "crays_core",
      expectedTables: expectedTables.length,
      existingTables: 0,
      missingTables: [...expectedTables],
      rowCounts: [],
    };
  }

  const pool = getCorePgPool();
  const existingResult = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedTables],
  );
  const existing = new Set(existingResult.rows.map((row) => row.table_name));
  const missingTables = expectedTables.filter((tableName) => !existing.has(tableName));

  const counts = await pool.query<CountRow>(`
    select 'crays_accounts' as table_name, count(*)::text as row_count from crays_core.crays_accounts
    union all select 'auth_identities', count(*)::text from crays_core.auth_identities
    union all select 'nostr_identities', count(*)::text from crays_core.nostr_identities
    union all select 'nip05_handles', count(*)::text from crays_core.nip05_handles
    union all select 'organizations', count(*)::text from crays_core.organizations
    union all select 'organization_memberships', count(*)::text from crays_core.organization_memberships
    union all select 'role_assignments', count(*)::text from crays_core.role_assignments
    union all select 'nostr_challenges', count(*)::text from crays_core.nostr_challenges
    union all select 'key_handoff_events', count(*)::text from crays_core.key_handoff_events
    union all select 'audit_events', count(*)::text from crays_core.audit_events
  `);

  return {
    configured: true,
    schema: "crays_core",
    expectedTables: expectedTables.length,
    existingTables: existing.size,
    missingTables,
    rowCounts: counts.rows.map((row) => ({ tableName: row.table_name, rowCount: Number(row.row_count) })),
  };
}

export async function getIdentityBundleByAccountId(accountId: string): Promise<IdentityBundle | null> {
  const pool = getCorePgPool();
  const account = await pool.query<Record<string, unknown>>("select * from crays_core.crays_accounts where account_id = $1", [accountId]);
  if (!account.rows[0]) return null;

  const [accessIdentities, nostrIdentity, nip05Handles, memberships, roleAssignments] = await Promise.all([
    pool.query<Record<string, unknown>>("select * from crays_core.auth_identities where account_id = $1 order by created_at", [accountId]),
    pool.query<Record<string, unknown>>("select * from crays_core.nostr_identities where account_id = $1", [accountId]),
    pool.query<Record<string, unknown>>("select * from crays_core.nip05_handles where account_id = $1 order by created_at", [accountId]),
    pool.query<Record<string, unknown>>("select * from crays_core.organization_memberships where account_id = $1 order by created_at", [accountId]),
    pool.query<Record<string, unknown>>("select * from crays_core.role_assignments where account_id = $1 order by created_at", [accountId]),
  ]);

  return {
    account: account.rows[0],
    accessIdentities: accessIdentities.rows,
    nostrIdentity: nostrIdentity.rows[0] ?? null,
    nip05Handles: nip05Handles.rows,
    memberships: memberships.rows,
    roleAssignments: roleAssignments.rows,
  };
}

export async function getIdentityBundleByProviderSubject(providerKey: string, providerSubject: string): Promise<IdentityBundle | null> {
  const result = await getCorePgPool().query<{ account_id: string }>(
    "select account_id from crays_core.auth_identities where provider_key = $1 and provider_subject = $2",
    [providerKey, providerSubject],
  );
  const accountId = result.rows[0]?.account_id;
  return accountId ? getIdentityBundleByAccountId(accountId) : null;
}

export async function getIdentityBundleByNostrPubkeyHex(pubkeyHex: string): Promise<IdentityBundle | null> {
  const result = await getCorePgPool().query<{ account_id: string }>(
    `
      select account_id
      from crays_core.nostr_identities
      where pubkey_hex = $1
        and issuance_status <> 'revoked'
      order by access_enabled desc, updated_at desc
      limit 1
    `,
    [normalizeLower(pubkeyHex)],
  );
  const accountId = result.rows[0]?.account_id;
  return accountId ? getIdentityBundleByAccountId(accountId) : null;
}

export async function markNostrSignerProofVerified(input: VerifiedNostrSignerProofInput) {
  const pubkeyHex = input.pubkeyHex.toLowerCase();
  let updatedIdentity: Record<string, unknown> | null = null;

  await withTransaction(async (client) => {
    const result = await client.query<Record<string, unknown>>(
      `
        update crays_core.nostr_identities
        set signer_status = 'verified',
            proof_method = $2,
            last_signed_event_at = now(),
            access_enabled = true,
            issuance_status = case when issuance_status in ('queued', 'issued', 'handoff_pending') then 'active' else issuance_status end,
            private_key_handoff = case when private_key_handoff = 'one_time_pending' then 'confirmed' else private_key_handoff end,
            updated_at = now()
        where pubkey_hex = $1
          and issuance_status <> 'revoked'
        returning *
      `,
      [pubkeyHex, input.proofMethod],
    );
    updatedIdentity = result.rows[0] ?? null;

    const accountId = typeof updatedIdentity?.account_id === "string" ? updatedIdentity.account_id : null;
    if (!accountId) return;

    await client.query(
      `
        update crays_core.role_assignments
        set nostr_binding_status = 'verified',
            nostr_pubkey_hex = $2,
            nostr_verified_at = now(),
            updated_at = now()
        where account_id = $1
          and status <> 'revoked'
          and (nostr_pubkey_hex is null or nostr_pubkey_hex = $2)
      `,
      [accountId, pubkeyHex],
    );

    await client.query(
      `
        update crays_core.key_handoff_events
        set status = 'confirmed',
            confirmed_at = now()
        where account_id = $1
          and pubkey_hex = $2
          and status = 'pending'
          and private_key_material_stored = false
      `,
      [accountId, pubkeyHex],
    );
  });

  return updatedIdentity;
}

export async function prepareNostrIdentityHandoff(input: NostrIdentityHandoffInput): Promise<NostrIdentityHandoffResult> {
  const pubkeyHex = input.pubkeyHex.toLowerCase();
  const handoffId = id("handoff");

  await withTransaction(async (client) => {
    const accountResult = await client.query<Record<string, unknown>>(
      "select account_id from crays_core.crays_accounts where account_id = $1",
      [input.accountId],
    );

    if (!accountResult.rows[0]) {
      throw new Error("CRAYS account not found for Nostr handoff.");
    }

    const existingIdentity = await client.query<Record<string, unknown>>(
      "select * from crays_core.nostr_identities where account_id = $1 for update",
      [input.accountId],
    );
    const existing = existingIdentity.rows[0];
    const existingPubkey = typeof existing?.pubkey_hex === "string" ? existing.pubkey_hex : null;
    const existingAccessEnabled = existing?.access_enabled === true;
    const existingSignerStatus = typeof existing?.signer_status === "string" ? existing.signer_status : null;

    if (existingPubkey && existingPubkey !== pubkeyHex && (existingAccessEnabled || existingSignerStatus === "verified")) {
      throw new Error("A verified Nostr public key is already bound to this CRAYS account.");
    }

    await client.query(
      `
        update crays_core.nostr_identities
        set npub = coalesce($2, npub),
            pubkey_hex = $3,
            nip05_status = case when nip05 is null then nip05_status else 'claimed' end,
            issuance_status = 'handoff_pending',
            private_key_handoff = 'one_time_pending',
            access_enabled = false,
            proof_method = null,
            signer_status = 'pending',
            linked_at = coalesce(linked_at, now()),
            updated_at = now()
        where account_id = $1
      `,
      [input.accountId, input.npub ?? null, pubkeyHex],
    );

    await client.query(
      `
        update crays_core.nip05_handles
        set pubkey_hex = $2,
            status = case when status = 'revoked' then status else 'reserved' end,
            updated_at = now()
        where account_id = $1
      `,
      [input.accountId, pubkeyHex],
    );

    await client.query(
      `
        update crays_core.role_assignments
        set nostr_binding_status = 'pending',
            nostr_pubkey_hex = $2,
            updated_at = now()
        where account_id = $1
          and status <> 'revoked'
      `,
      [input.accountId, pubkeyHex],
    );

    await client.query(
      `
        insert into crays_core.key_handoff_events (
          handoff_id, account_id, pubkey_hex, status, delivery_channel, private_key_material_stored, expires_at
        )
        values ($1, $2, $3, 'pending', $4, false, $5)
        on conflict (handoff_id) do nothing
      `,
      [handoffId, input.accountId, pubkeyHex, input.deliveryChannel ?? "client_generated_once", input.expiresAt],
    );

    await client.query(
      `
        insert into crays_core.audit_events (
          audit_id, actor_account_id, action, target_type, target_id, outcome, risk_level, metadata
        )
        values ($1, $2, 'identity.nostr.handoff.prepared', 'crays-account', $3, 'changed', 'sensitive', $4::jsonb)
      `,
      [
        id("audit"),
        input.actorAccountId ?? input.accountId,
        input.accountId,
        JSON.stringify({
          handoffId,
          pubkeyHex,
          deliveryChannel: input.deliveryChannel ?? "client_generated_once",
          privateKeyMaterialStored: false,
          privateKeysReturned: false,
        }),
      ],
    );
  });

  return {
    handoffId,
    expiresAt: input.expiresAt.toISOString(),
    bundle: await getIdentityBundleByAccountId(input.accountId),
  };
}

export async function createAuditEvent(input: AuditEventInput) {
  const auditId = input.auditId ?? id("audit");
  await getCorePgPool().query(
    `
      insert into crays_core.audit_events (
        audit_id, actor_account_id, action, target_type, target_id, outcome, risk_level, metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      on conflict (audit_id) do nothing
    `,
    [
      auditId,
      input.actorAccountId ?? null,
      input.action,
      input.targetType,
      input.targetId,
      input.outcome,
      input.riskLevel ?? "standard",
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return { auditId };
}

export async function upsertCoreIdentity(input: UpsertCoreIdentityInput) {
  const accountId = input.account.accountId ?? id("acct");
  const accountStatus = input.account.status ?? "review";
  const pubkeyHex = normalizeLower(input.nostrIdentity?.pubkeyHex ?? input.nip05Handle?.pubkeyHex ?? input.roleAssignment?.nostrPubkeyHex ?? null);
  const nip05 = input.nostrIdentity?.nip05 ?? (input.nip05Handle ? `${input.nip05Handle.localPart}@${input.nip05Handle.domain}` : null);

  await withTransaction(async (client) => {
    await client.query(
      `
        insert into crays_core.crays_accounts (
          account_id, crays_id, display_name, primary_contact, primary_contact_type, default_role, status
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (account_id) do update set
          crays_id = excluded.crays_id,
          display_name = excluded.display_name,
          primary_contact = excluded.primary_contact,
          primary_contact_type = excluded.primary_contact_type,
          default_role = excluded.default_role,
          status = excluded.status,
          updated_at = now()
      `,
      [
        accountId,
        input.account.craysId,
        input.account.displayName,
        input.account.primaryContact ?? null,
        input.account.primaryContactType,
        input.account.defaultRole,
        accountStatus,
      ],
    );

    if (input.authIdentity) {
      await client.query(
        `
          insert into crays_core.auth_identities (
            identity_id, account_id, method_type, provider_key, provider_subject, verified, last_used_at
          )
          values ($1, $2, $3, $4, $5, $6, now())
          on conflict (provider_key, provider_subject) do update set
            account_id = excluded.account_id,
            method_type = excluded.method_type,
            verified = excluded.verified,
            last_used_at = now(),
            updated_at = now()
        `,
        [
          input.authIdentity.identityId ?? id("auth"),
          accountId,
          input.authIdentity.methodType,
          input.authIdentity.providerKey,
          input.authIdentity.providerSubject,
          Boolean(input.authIdentity.verified),
        ],
      );
    }

    if (input.nostrIdentity || pubkeyHex || nip05) {
      await client.query(
        `
          insert into crays_core.nostr_identities (
            account_id, npub, pubkey_hex, nip05, nip05_status, issuance_status,
            private_key_handoff, access_enabled, proof_method, signer_status, linked_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
          on conflict (account_id) do update set
            npub = excluded.npub,
            pubkey_hex = excluded.pubkey_hex,
            nip05 = excluded.nip05,
            nip05_status = excluded.nip05_status,
            issuance_status = excluded.issuance_status,
            private_key_handoff = excluded.private_key_handoff,
            access_enabled = excluded.access_enabled,
            proof_method = excluded.proof_method,
            signer_status = excluded.signer_status,
            linked_at = now(),
            updated_at = now()
        `,
        [
          accountId,
          input.nostrIdentity?.npub ?? null,
          pubkeyHex,
          nip05,
          input.nostrIdentity?.nip05Status ?? (nip05 ? "verified" : "not_claimed"),
          input.nostrIdentity?.issuanceStatus ?? "required",
          input.nostrIdentity?.privateKeyHandoff ?? "not_created",
          Boolean(input.nostrIdentity?.accessEnabled),
          input.nostrIdentity?.proofMethod ?? null,
          input.nostrIdentity?.signerStatus ?? "not_connected",
        ],
      );
    }

    if (input.nip05Handle) {
      await client.query(
        `
          insert into crays_core.nip05_handles (
            handle_id, account_id, local_part, domain, pubkey_hex, status, activated_at
          )
          values ($1, $2, $3, $4, $5, $6, case when $6 = 'active' then now() else null end)
          on conflict (domain, local_part) do update set
            account_id = excluded.account_id,
            pubkey_hex = excluded.pubkey_hex,
            status = excluded.status,
            activated_at = case when excluded.status = 'active' then coalesce(crays_core.nip05_handles.activated_at, now()) else crays_core.nip05_handles.activated_at end,
            updated_at = now()
        `,
        [
          input.nip05Handle.handleId ?? id("nip05"),
          accountId,
          input.nip05Handle.localPart.toLowerCase(),
          input.nip05Handle.domain.toLowerCase(),
          normalizeLower(input.nip05Handle.pubkeyHex),
          input.nip05Handle.status ?? "reserved",
        ],
      );
    }

    if (input.organization) {
      const organizationId = input.organization.organizationId ?? id("org");
      await client.query(
        `
          insert into crays_core.organizations (
            organization_id, name, organization_type, status, parent_organization_id
          )
          values ($1, $2, $3, $4, $5)
          on conflict (organization_id) do update set
            name = excluded.name,
            organization_type = excluded.organization_type,
            status = excluded.status,
            parent_organization_id = excluded.parent_organization_id,
            updated_at = now()
        `,
        [
          organizationId,
          input.organization.name,
          input.organization.organizationType,
          input.organization.status ?? "review",
          input.organization.parentOrganizationId ?? null,
        ],
      );
    }

    if (input.membership) {
      await client.query(
        `
          insert into crays_core.organization_memberships (
            membership_id, account_id, organization_id, role_key, status, scopes
          )
          values ($1, $2, $3, $4, $5, $6::jsonb)
          on conflict (account_id, organization_id, role_key) do update set
            status = excluded.status,
            scopes = excluded.scopes,
            updated_at = now()
        `,
        [
          input.membership.membershipId ?? id("member"),
          accountId,
          input.membership.organizationId,
          input.membership.roleKey,
          input.membership.status ?? "review",
          JSON.stringify(input.membership.scopes ?? []),
        ],
      );
    }

    if (input.roleAssignment) {
      await client.query(
        `
          insert into crays_core.role_assignments (
            assignment_id, account_id, role_key, organization_id, entity_type, entity_id,
            nostr_binding_required, nostr_binding_status, nostr_pubkey_hex, nostr_nip05,
            nostr_verified_at, granted_by_account_id, status
          )
          values ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, case when $7 in ('verified', 'system_attested') then now() else null end, $10, $11)
          on conflict (assignment_id) do update set
            role_key = excluded.role_key,
            organization_id = excluded.organization_id,
            entity_type = excluded.entity_type,
            entity_id = excluded.entity_id,
            nostr_binding_status = excluded.nostr_binding_status,
            nostr_pubkey_hex = excluded.nostr_pubkey_hex,
            nostr_nip05 = excluded.nostr_nip05,
            nostr_verified_at = excluded.nostr_verified_at,
            granted_by_account_id = excluded.granted_by_account_id,
            status = excluded.status,
            updated_at = now()
        `,
        [
          input.roleAssignment.assignmentId ?? id("role"),
          accountId,
          input.roleAssignment.roleKey,
          input.roleAssignment.organizationId ?? null,
          input.roleAssignment.entityType ?? null,
          input.roleAssignment.entityId ?? null,
          input.roleAssignment.nostrBindingStatus ?? "pending",
          normalizeLower(input.roleAssignment.nostrPubkeyHex ?? pubkeyHex),
          input.roleAssignment.nostrNip05 ?? nip05,
          input.roleAssignment.grantedByAccountId ?? null,
          input.roleAssignment.status ?? "review",
        ],
      );
    }

    if (input.auditEvent) {
      await client.query(
        `
          insert into crays_core.audit_events (
            audit_id, actor_account_id, action, target_type, target_id, outcome, risk_level, metadata
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          on conflict (audit_id) do nothing
        `,
        [
          input.auditEvent.auditId ?? id("audit"),
          input.auditEvent.actorAccountId ?? null,
          input.auditEvent.action,
          input.auditEvent.targetType,
          input.auditEvent.targetId,
          input.auditEvent.outcome,
          input.auditEvent.riskLevel ?? "standard",
          JSON.stringify(input.auditEvent.metadata ?? {}),
        ],
      );
    }
  });

  return getIdentityBundleByAccountId(accountId);
}

export async function createNostrChallengeRecord(input: NostrChallengeInput) {
  const challengeId = input.challengeId ?? id("challenge");
  await getCorePgPool().query(
    `
      insert into crays_core.nostr_challenges (
        challenge_id, account_id, identifier, pubkey_hex, challenge, absolute_url, method, expires_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      challengeId,
      input.accountId ?? null,
      input.identifier ?? null,
      normalizeLower(input.pubkeyHex),
      input.challenge,
      input.absoluteUrl,
      input.method,
      input.expiresAt,
    ],
  );

  return { challengeId, status: "pending" as const, expiresAt: input.expiresAt.toISOString() };
}

export async function getPendingNostrChallengeRecord(challengeId: string) {
  const result = await getCorePgPool().query<Record<string, unknown>>(
    `
      select *
      from crays_core.nostr_challenges
      where challenge_id = $1
        and status = 'pending'
        and expires_at > now()
    `,
    [challengeId],
  );

  return result.rows[0] ?? null;
}

export async function consumeNostrChallengeRecord(challengeId: string, pubkeyHex?: string | null) {
  const result = await getCorePgPool().query<Record<string, unknown>>(
    `
      update crays_core.nostr_challenges
      set status = 'verified', consumed_at = now(), pubkey_hex = coalesce(pubkey_hex, $2)
      where challenge_id = $1
        and status = 'pending'
        and expires_at > now()
        and $2::text is not null
        and (pubkey_hex is null or pubkey_hex = $2)
      returning *
    `,
    [challengeId, normalizeLower(pubkeyHex)],
  );

  return result.rows[0] ?? null;
}

export function createDevelopmentIdentitySeedInput(domain = "crays.net"): UpsertCoreIdentityInput {
  const pubkeyHex = "1".repeat(64);
  const localPart = "dev.candidate";
  const nip05 = `${localPart}@${domain}`;

  return {
    account: {
      accountId: "acct_dev_franchise_candidate_001",
      craysId: "crays_dev_candidate_001",
      displayName: "Johannes Adler",
      primaryContact: nip05,
      primaryContactType: "nip05",
      defaultRole: "franchise-candidate",
      status: "review",
    },
    authIdentity: {
      identityId: "auth_dev_candidate_001",
      methodType: "social",
      providerKey: "auth0-dev",
      providerSubject: "dev|candidate-001",
      verified: true,
    },
    nostrIdentity: {
      npub: "npub1johannesadlerverifieddemo000000000000000000000000000000000000000000000000",
      pubkeyHex,
      nip05,
      nip05Status: "verified",
      issuanceStatus: "active",
      privateKeyHandoff: "not_applicable",
      accessEnabled: true,
      proofMethod: "server_generated_once",
      signerStatus: "verified",
    },
    nip05Handle: {
      handleId: "nip05_dev_candidate_001",
      localPart,
      domain,
      pubkeyHex,
      status: "active",
    },
    organization: {
      organizationId: "org_crays_dev",
      name: "CRAYS Development",
      organizationType: "crays",
      status: "active",
    },
    membership: {
      membershipId: "member_dev_candidate_001",
      organizationId: "org_crays_dev",
      roleKey: "franchise-candidate",
      status: "review",
      scopes: ["deal:munich-west"],
    },
    roleAssignment: {
      assignmentId: "role_dev_candidate_001",
      roleKey: "franchise-candidate",
      organizationId: "org_crays_dev",
      entityType: "deal",
      entityId: "munich-west",
      nostrBindingStatus: "verified",
      nostrPubkeyHex: pubkeyHex,
      nostrNip05: nip05,
      status: "review",
    },
    auditEvent: {
      auditId: "audit_dev_candidate_seed_001",
      action: "identity.dev_seed.upsert",
      targetType: "account",
      targetId: "acct_dev_franchise_candidate_001",
      outcome: "changed",
      riskLevel: "standard",
      metadata: {
        devSeed: true,
        privateKeyStored: false,
      },
    },
  };
}
