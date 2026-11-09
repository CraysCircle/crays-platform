import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";
import { BLOCK199_SESSION_LIMITS } from "@/lib/block199-strong-auth-policy";

export const tenantSessionCookieName = "crays_tenant_session";
export type TenantMembershipAction = "activate" | "suspend" | "restore" | "offboard";

export type IdentityTenantLifecycleReadModel = {
  access: { allowed: boolean };
  summary: {
    invitations: number;
    pendingInvitations: number;
    memberships: number;
    reviewMemberships: number;
    activeMemberships: number;
    suspendedMemberships: number;
    activeSessions: number;
    events: number;
  };
  invitations: Array<{
    invitationId: string;
    organizationId: string;
    inviteeContact: string;
    roleKey: string;
    status: string;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
  }>;
  memberships: Array<{
    membershipId: string;
    accountId: string;
    accountEmail: string | null;
    organizationId: string;
    organizationName: string;
    roleKey: string;
    status: string;
    scopes: string[];
    activatedAt: string | null;
    suspendedAt: string | null;
    offboardedAt: string | null;
    updatedAt: string;
  }>;
  sessions: Array<{
    sessionId: string;
    accountId: string;
    organizationId: string;
    roleKey: string;
    status: string;
    issuedAt: string;
    expiresAt: string;
    lastSeenAt: string | null;
    revokedAt: string | null;
    revokeReason: string | null;
  }>;
  events: Array<{
    eventId: string;
    accountId: string | null;
    organizationId: string | null;
    membershipId: string | null;
    roleKey: string | null;
    actorAccountId: string | null;
    action: string;
    fromState: string | null;
    toState: string;
    reason: string | null;
    createdAt: string;
  }>;
};

function uid(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function token() {
  return randomBytes(32).toString("base64url");
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function lifecycleEvent(client: PoolClient, input: {
  accountId?: string | null;
  organizationId?: string | null;
  membershipId?: string | null;
  roleKey?: string | null;
  actorAccountId?: string | null;
  action: string;
  fromState?: string | null;
  toState: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const eventId = uid("life");
  await client.query(
    `insert into crays_core.identity_lifecycle_events
      (event_id, account_id, organization_id, membership_id, role_key, actor_account_id, action, from_state, to_state, reason, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
    [eventId, input.accountId ?? null, input.organizationId ?? null, input.membershipId ?? null, input.roleKey ?? null, input.actorAccountId ?? null, input.action, input.fromState ?? null, input.toState, input.reason ?? null, JSON.stringify(input.metadata ?? {})],
  );
  return eventId;
}

export async function createTenantInvitation(input: {
  organizationId: string;
  inviteeContact: string;
  roleKey: RoleKey;
  scopes?: string[];
  invitedByAccountId: string;
  expiresAt: Date;
}) {
  const invitationToken = token();
  const invitationId = uid("invite");
  return transaction(async (client) => {
    const organization = await client.query<{ status: string }>("select status from crays_core.organizations where organization_id=$1 for share", [input.organizationId]);
    if (organization.rows[0]?.status !== "active") throw new Error("Invitations require an active organization.");
    await client.query(
      `update crays_core.tenant_invitations
       set status='revoked', revoked_at=now(), updated_at=now()
       where organization_id=$1 and invitee_contact=$2 and role_key=$3 and status='pending'`,
      [input.organizationId, input.inviteeContact.trim().toLowerCase(), input.roleKey],
    );
    await client.query(
      `insert into crays_core.tenant_invitations
       (invitation_id, organization_id, invitee_contact, token_hash, role_key, scopes, invited_by_account_id, expires_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [invitationId, input.organizationId, input.inviteeContact.trim().toLowerCase(), hash(invitationToken), input.roleKey, JSON.stringify(input.scopes ?? []), input.invitedByAccountId, input.expiresAt],
    );
    const eventId = await lifecycleEvent(client, { organizationId: input.organizationId, roleKey: input.roleKey, actorAccountId: input.invitedByAccountId, action: "tenant.invitation.created", toState: "pending", metadata: { invitationId, contactStored: true, externalSendPerformed: false } });
    return { invitationId, invitationToken, status: "pending" as const, expiresAt: input.expiresAt.toISOString(), eventId, externalSendPerformed: false as const };
  });
}

export async function acceptTenantInvitation(input: { invitationToken: string; accountId: string; verifiedContact: string }) {
  return transaction(async (client) => {
    const invitation = await client.query<{
      invitation_id: string; organization_id: string; invitee_contact: string; role_key: string; scopes: unknown; status: string; expires_at: Date;
    }>("select invitation_id, organization_id, invitee_contact, role_key, scopes, status, expires_at from crays_core.tenant_invitations where token_hash=$1 for update", [hash(input.invitationToken)]);
    const row = invitation.rows[0];
    if (!row) throw new Error("Invitation is invalid.");
    if (row.status !== "pending") throw new Error(`Invitation is ${row.status}.`);
    if (row.invitee_contact !== input.verifiedContact.trim().toLowerCase()) throw new Error("Invitation contact does not match the verified provider contact.");
    if (row.expires_at.getTime() <= Date.now()) {
      await client.query("update crays_core.tenant_invitations set status='expired', updated_at=now() where invitation_id=$1", [row.invitation_id]);
      throw new Error("Invitation has expired.");
    }
    const membership = await client.query<{ membership_id: string }>(
      `insert into crays_core.organization_memberships (membership_id, account_id, organization_id, role_key, status, scopes)
       values ($1,$2,$3,$4,'review',$5::jsonb)
       on conflict (account_id, organization_id, role_key) do update set status='review', scopes=excluded.scopes, suspended_at=null, offboarded_at=null, updated_at=now()
       returning membership_id`,
      [uid("membership"), input.accountId, row.organization_id, row.role_key, JSON.stringify(row.scopes ?? [])],
    );
    const membershipId = membership.rows[0].membership_id;
    await client.query(
      `insert into crays_core.role_assignments (assignment_id, account_id, role_key, organization_id, nostr_binding_required, nostr_binding_status, status)
       select $1,$2,$3,$4,true,'pending','review'
       where not exists (
         select 1 from crays_core.role_assignments
         where account_id=$2 and role_key=$3 and organization_id=$4 and status <> 'revoked'
       )`,
      [uid("role"), input.accountId, row.role_key, row.organization_id],
    );
    await client.query("update crays_core.tenant_invitations set status='accepted', accepted_by_account_id=$2, accepted_at=now(), updated_at=now() where invitation_id=$1", [row.invitation_id, input.accountId]);
    const eventId = await lifecycleEvent(client, { accountId: input.accountId, organizationId: row.organization_id, membershipId, roleKey: row.role_key, actorAccountId: input.accountId, action: "tenant.invitation.accepted", fromState: "pending", toState: "review", metadata: { invitationId: row.invitation_id } });
    return { invitationId: row.invitation_id, membershipId, organizationId: row.organization_id, roleKey: row.role_key as RoleKey, status: "review" as const, eventId };
  });
}

export async function transitionTenantMembership(input: {
  accountId: string;
  organizationId: string;
  roleKey: RoleKey;
  action: TenantMembershipAction;
  actorAccountId: string;
  reason: string;
}) {
  return transaction(async (client) => {
    const membership = await client.query<{ membership_id: string; status: string }>(
      "select membership_id, status from crays_core.organization_memberships where account_id=$1 and organization_id=$2 and role_key=$3 for update",
      [input.accountId, input.organizationId, input.roleKey],
    );
    const row = membership.rows[0];
    if (!row) throw new Error("Tenant membership was not found.");
    const target = input.action === "activate" ? "active" : input.action === "suspend" || input.action === "offboard" ? "suspended" : "review";
    if (input.action === "activate") {
      const binding = await client.query<{ ready: boolean }>(
        `select exists(select 1 from crays_core.role_assignments where account_id=$1 and organization_id=$2 and role_key=$3 and nostr_binding_status in ('verified','system_attested') and status <> 'revoked') ready`,
        [input.accountId, input.organizationId, input.roleKey],
      );
      if (!binding.rows[0]?.ready) throw new Error("Verified role binding is required before activation.");
    }
    await client.query(
      `update crays_core.organization_memberships set status=$4,
       activated_at=case when $5='activate' then now() else activated_at end,
       suspended_at=case when $5='suspend' then now() when $5 in ('restore','activate') then null else suspended_at end,
       offboarded_at=case when $5='offboard' then now() when $5='restore' then null else offboarded_at end,
       updated_at=now() where account_id=$1 and organization_id=$2 and role_key=$3`,
      [input.accountId, input.organizationId, input.roleKey, target, input.action],
    );
    const assignmentState = input.action === "activate" ? "active" : input.action === "offboard" ? "revoked" : "review";
    await client.query(
      `update crays_core.role_assignments set status=$4, revoked_at=case when $4='revoked' then now() else null end, updated_at=now()
       where account_id=$1 and organization_id=$2 and role_key=$3`,
      [input.accountId, input.organizationId, input.roleKey, assignmentState],
    );
    if (input.action === "activate") await client.query("update crays_core.crays_accounts set status='active', updated_at=now() where account_id=$1 and status <> 'blocked'", [input.accountId]);
    if (["suspend", "offboard"].includes(input.action)) {
      await client.query("update crays_core.tenant_sessions set status='revoked', revoked_at=now(), revoke_reason=$2 where account_id=$1 and organization_id=$3 and status='active'", [input.accountId, input.reason, input.organizationId]);
      await client.query("update crays_core.crays_accounts set security_version=security_version+1, updated_at=now() where account_id=$1", [input.accountId]);
    }
    const eventId = await lifecycleEvent(client, { accountId: input.accountId, organizationId: input.organizationId, membershipId: row.membership_id, roleKey: input.roleKey, actorAccountId: input.actorAccountId, action: `tenant.membership.${input.action}`, fromState: row.status, toState: target, reason: input.reason });
    return { accountId: input.accountId, organizationId: input.organizationId, roleKey: input.roleKey, fromState: row.status, status: target, roleAssignmentStatus: assignmentState, eventId, sessionsRevoked: ["suspend", "offboard"].includes(input.action) };
  });
}

export async function resolveUniqueActiveTenantRoleBinding(input: {
  accountId: string;
  roleKey: RoleKey;
}) {
  const result = await getCorePgPool().query<{ organization_id: string }>(
    `select membership.organization_id
     from crays_core.organization_memberships membership
     join crays_core.role_assignments assignment
       on assignment.account_id=membership.account_id
      and assignment.organization_id=membership.organization_id
      and assignment.role_key=membership.role_key
     join crays_core.crays_accounts account on account.account_id=membership.account_id
     join crays_core.organizations organization on organization.organization_id=membership.organization_id
     where membership.account_id=$1 and membership.role_key=$2
       and membership.status='active' and assignment.status='active'
       and assignment.nostr_binding_status in ('verified','system_attested')
       and account.status='active' and organization.status='active'
     order by membership.organization_id
     limit 2`,
    [input.accountId, input.roleKey],
  );
  return result.rows.length === 1
    ? { accountId: input.accountId, organizationId: result.rows[0].organization_id, roleKey: input.roleKey }
    : null;
}

export async function issueTenantSession(input: { accountId: string; organizationId: string; roleKey: RoleKey; ttlMinutes?: number }) {
  const sessionToken = token();
  const sessionId = uid("tenant_session");
  const maximumMinutes = Math.floor(BLOCK199_SESSION_LIMITS.craysTenantMaximumSeconds / 60);
  const ttl = Math.min(Math.max(input.ttlMinutes ?? maximumMinutes, 5), maximumMinutes);
  return transaction(async (client) => {
    const access = await client.query<{ security_version: number }>(
      `select a.security_version from crays_core.crays_accounts a
       join crays_core.organization_memberships m on m.account_id=a.account_id and m.organization_id=$2 and m.role_key=$3 and m.status='active'
       join crays_core.role_assignments r on r.account_id=a.account_id and r.organization_id=$2 and r.role_key=$3 and r.status='active' and r.nostr_binding_status in ('verified','system_attested')
       join crays_core.organizations o on o.organization_id=$2 and o.status='active'
       where a.account_id=$1 and a.status='active' limit 1`,
      [input.accountId, input.organizationId, input.roleKey],
    );
    const row = access.rows[0];
    if (!row) throw new Error("Active tenant membership and role binding are required.");
    const expiresAt = new Date(Date.now() + ttl * 60_000);
    await client.query(
      `update crays_core.tenant_sessions
       set status='revoked', revoked_at=now(), revoke_reason='session_rotated'
       where account_id=$1 and organization_id=$2 and role_key=$3 and status='active'`,
      [input.accountId, input.organizationId, input.roleKey],
    );
    await client.query(
      `insert into crays_core.tenant_sessions (session_id, token_hash, account_id, organization_id, role_key, account_security_version, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [sessionId, hash(sessionToken), input.accountId, input.organizationId, input.roleKey, row.security_version, expiresAt],
    );
    await lifecycleEvent(client, { accountId: input.accountId, organizationId: input.organizationId, roleKey: input.roleKey, actorAccountId: input.accountId, action: "tenant.session.issued", toState: "active", metadata: { sessionId, ttlMinutes: ttl } });
    return { sessionId, sessionToken, organizationId: input.organizationId, roleKey: input.roleKey, expiresAt: expiresAt.toISOString() };
  });
}

export async function resolveTenantSession(sessionToken: string | null | undefined, expectedAccountId?: string) {
  if (!sessionToken) return null;
  await getCorePgPool().query(
    `update crays_core.tenant_sessions
     set status='expired', revoked_at=coalesce(revoked_at, now()), revoke_reason=coalesce(revoke_reason, 'absolute_or_inactivity_timeout')
     where status='active'
       and (expires_at<=now() or (last_seen_at is not null and last_seen_at<=now()-($1::int * interval '1 second')))`,
    [BLOCK199_SESSION_LIMITS.auth0CookieInactivitySeconds],
  );
  const result = await getCorePgPool().query<{ session_id: string; account_id: string; organization_id: string; role_key: string; expires_at: Date }>(
    `update crays_core.tenant_sessions s set last_seen_at=now()
     from crays_core.crays_accounts a, crays_core.organization_memberships m, crays_core.role_assignments r, crays_core.organizations o
     where s.token_hash=$1 and s.status='active' and s.expires_at>now()
       and a.account_id=s.account_id and a.status='active' and a.security_version=s.account_security_version
       and m.account_id=s.account_id and m.organization_id=s.organization_id and m.role_key=s.role_key and m.status='active'
       and r.account_id=s.account_id and r.organization_id=s.organization_id and r.role_key=s.role_key and r.status='active'
       and r.nostr_binding_status in ('verified','system_attested')
       and o.organization_id=s.organization_id and o.status='active'
       and ($2::text is null or s.account_id=$2)
     returning s.session_id, s.account_id, s.organization_id, s.role_key, s.expires_at`,
    [hash(sessionToken), expectedAccountId ?? null],
  );
  const row = result.rows[0];
  return row ? { sessionId: row.session_id, accountId: row.account_id, organizationId: row.organization_id, roleKey: row.role_key as RoleKey, expiresAt: row.expires_at.toISOString() } : null;
}

export async function revokeTenantSession(sessionToken: string, accountId?: string | null, reason = "user_sign_out") {
  const result = await getCorePgPool().query(
    `update crays_core.tenant_sessions
     set status='revoked', revoked_at=now(), revoke_reason=$3
     where token_hash=$1 and ($2::text is null or account_id=$2) and status='active'`,
    [hash(sessionToken), accountId ?? null, reason],
  );
  return { revoked: (result.rowCount ?? 0) > 0 };
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(0).toISOString();
}

function nullableIso(value: unknown) {
  return value ? iso(value) : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getIdentityTenantLifecycleReadModel(role: RoleKey, organizationId?: string): Promise<IdentityTenantLifecycleReadModel> {
  if (!["admin", "crays-management", "reviewer"].includes(role)) return { access: { allowed: false }, summary: { invitations: 0, pendingInvitations: 0, memberships: 0, reviewMemberships: 0, activeMemberships: 0, suspendedMemberships: 0, activeSessions: 0, events: 0 }, invitations: [], memberships: [], sessions: [], events: [] };
  const filter = organizationId ? "where organization_id=$1" : "";
  const membershipFilter = organizationId ? "where m.organization_id=$1" : "";
  const values = organizationId ? [organizationId] : [];
  const [invitations, memberships, sessions, events] = await Promise.all([
    getCorePgPool().query(`select invitation_id, organization_id, invitee_contact, role_key, status, expires_at, accepted_at, created_at from crays_core.tenant_invitations ${filter} order by created_at desc limit 100`, values),
    getCorePgPool().query(`select m.membership_id, m.account_id, a.primary_contact as account_email, m.organization_id, o.name as organization_name, m.role_key, m.status, m.scopes, m.activated_at, m.suspended_at, m.offboarded_at, m.updated_at from crays_core.organization_memberships m join crays_core.crays_accounts a on a.account_id=m.account_id join crays_core.organizations o on o.organization_id=m.organization_id ${membershipFilter} order by m.updated_at desc limit 200`, values),
    getCorePgPool().query(`select session_id, account_id, organization_id, role_key, status, issued_at, expires_at, last_seen_at, revoked_at, revoke_reason from crays_core.tenant_sessions ${filter} order by issued_at desc limit 100`, values),
    getCorePgPool().query(`select event_id, account_id, organization_id, membership_id, role_key, actor_account_id, action, from_state, to_state, reason, created_at from crays_core.identity_lifecycle_events ${filter} order by created_at desc limit 200`, values),
  ]);
  return {
    access: { allowed: true },
    summary: {
      invitations: invitations.rowCount ?? 0,
      pendingInvitations: invitations.rows.filter((row) => row.status === "pending").length,
      memberships: memberships.rowCount ?? 0,
      reviewMemberships: memberships.rows.filter((row) => row.status === "review").length,
      activeMemberships: memberships.rows.filter((row) => row.status === "active").length,
      suspendedMemberships: memberships.rows.filter((row) => row.status === "suspended").length,
      activeSessions: sessions.rows.filter((row) => row.status === "active").length,
      events: events.rowCount ?? 0,
    },
    invitations: invitations.rows.map((row) => ({ invitationId: String(row.invitation_id), organizationId: String(row.organization_id), inviteeContact: String(row.invitee_contact), roleKey: String(row.role_key), status: String(row.status), expiresAt: iso(row.expires_at), acceptedAt: nullableIso(row.accepted_at), createdAt: iso(row.created_at) })),
    memberships: memberships.rows.map((row) => ({ membershipId: String(row.membership_id), accountId: String(row.account_id), accountEmail: typeof row.account_email === "string" ? row.account_email : null, organizationId: String(row.organization_id), organizationName: String(row.organization_name), roleKey: String(row.role_key), status: String(row.status), scopes: stringArray(row.scopes), activatedAt: nullableIso(row.activated_at), suspendedAt: nullableIso(row.suspended_at), offboardedAt: nullableIso(row.offboarded_at), updatedAt: iso(row.updated_at) })),
    sessions: sessions.rows.map((row) => ({ sessionId: String(row.session_id), accountId: String(row.account_id), organizationId: String(row.organization_id), roleKey: String(row.role_key), status: String(row.status), issuedAt: iso(row.issued_at), expiresAt: iso(row.expires_at), lastSeenAt: nullableIso(row.last_seen_at), revokedAt: nullableIso(row.revoked_at), revokeReason: typeof row.revoke_reason === "string" ? row.revoke_reason : null })),
    events: events.rows.map((row) => ({ eventId: String(row.event_id), accountId: typeof row.account_id === "string" ? row.account_id : null, organizationId: typeof row.organization_id === "string" ? row.organization_id : null, membershipId: typeof row.membership_id === "string" ? row.membership_id : null, roleKey: typeof row.role_key === "string" ? row.role_key : null, actorAccountId: typeof row.actor_account_id === "string" ? row.actor_account_id : null, action: String(row.action), fromState: typeof row.from_state === "string" ? row.from_state : null, toState: String(row.to_state), reason: typeof row.reason === "string" ? row.reason : null, createdAt: iso(row.created_at) })),
  };
}
