import {
  createAuditEvent,
  getIdentityBundleByAccountId,
  getIdentityBundleByNostrPubkeyHex,
  markNostrSignerProofVerified,
  type IdentityBundle,
} from "@/db/core-identity-repository";
import { createAnonymousSession, type CraysAuthSession } from "./auth-boundary";
import type { AuthIdentity, CraysAccount, NostrIdentity, OrganizationMembership, RoleAssignment } from "./identity";
import { isRoleNostrBindingSatisfied } from "./role-nostr-policy";
import { defaultRole, roleByKey, type RoleKey } from "./roles";

type VerifiedNostrProofMappingInput = {
  pubkeyHex: string;
  challengeId: string;
  eventId: string | null;
  proofMethod: "nip07" | "nip46" | "nip98";
};

export type VerifiedNostrProofMapping = {
  accountMapped: boolean;
  accountKnown: boolean;
  accessEnabled: boolean;
  session: CraysAuthSession;
  auditId?: string;
  requiredActions: CraysAuthSession["requiredActions"];
  reason?: string;
};

function stringValue(row: Record<string, unknown> | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === "string" ? value : undefined;
}

function booleanValue(row: Record<string, unknown> | null | undefined, key: string) {
  return row?.[key] === true;
}

function isoValue(row: Record<string, unknown> | null | undefined, key: string) {
  const value = row?.[key];
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function roleKeyValue(value: string | undefined): RoleKey {
  return roleByKey(value ?? defaultRole).key;
}

function mapAuthIdentity(row: Record<string, unknown>): AuthIdentity {
  return {
    id: stringValue(row, "identity_id") ?? "",
    accountId: stringValue(row, "account_id") ?? "",
    type: (stringValue(row, "method_type") ?? "nostr") as AuthIdentity["type"],
    provider: stringValue(row, "provider_key") ?? "crays",
    verified: booleanValue(row, "verified"),
    lastUsedAt: isoValue(row, "last_used_at"),
  };
}

function mapNostrIdentity(row: Record<string, unknown> | null, accountId: string): NostrIdentity {
  return {
    accountId,
    npub: stringValue(row, "npub"),
    pubkeyHex: stringValue(row, "pubkey_hex"),
    nip05: stringValue(row, "nip05"),
    nip05Status: (stringValue(row, "nip05_status") ?? "not_claimed") as NostrIdentity["nip05Status"],
    issuer: (stringValue(row, "issuer") ?? "crays") as NostrIdentity["issuer"],
    issuanceStatus: (stringValue(row, "issuance_status") ?? "required") as NostrIdentity["issuanceStatus"],
    privateKeyHandoff: (stringValue(row, "private_key_handoff") ?? "not_created") as NostrIdentity["privateKeyHandoff"],
    accessEnabled: booleanValue(row, "access_enabled"),
    proofMethod: stringValue(row, "proof_method") as NostrIdentity["proofMethod"],
    signerStatus: (stringValue(row, "signer_status") ?? "not_connected") as NostrIdentity["signerStatus"],
    linkedAt: isoValue(row, "linked_at"),
    lastSignedEventAt: isoValue(row, "last_signed_event_at"),
  };
}

function mapMembership(row: Record<string, unknown>): OrganizationMembership {
  return {
    accountId: stringValue(row, "account_id") ?? "",
    organizationId: stringValue(row, "organization_id") ?? "",
    role: roleKeyValue(stringValue(row, "role_key")),
    status: (stringValue(row, "status") ?? "review") as OrganizationMembership["status"],
    scopes: stringArrayValue(row.scopes),
  };
}

function mapRoleAssignment(row: Record<string, unknown>): RoleAssignment {
  const role = roleKeyValue(stringValue(row, "role_key"));
  return {
    id: stringValue(row, "assignment_id") ?? "",
    accountId: stringValue(row, "account_id") ?? "",
    role,
    nostrBinding: {
      required: true,
      status: (stringValue(row, "nostr_binding_status") ?? "pending") as RoleAssignment["nostrBinding"]["status"],
      pubkeyHex: stringValue(row, "nostr_pubkey_hex"),
      nip05: stringValue(row, "nostr_nip05"),
      verifiedAt: isoValue(row, "nostr_verified_at"),
    },
    organizationId: stringValue(row, "organization_id"),
    entityType: stringValue(row, "entity_type") as RoleAssignment["entityType"],
    entityId: stringValue(row, "entity_id"),
    grantedBy: stringValue(row, "granted_by_account_id") ?? "crays-system",
    status: (stringValue(row, "status") ?? "review") as RoleAssignment["status"],
  };
}

export function createCraysSessionFromIdentityBundle(bundle: IdentityBundle): CraysAuthSession {
  const accountRow = bundle.account;
  const accountId = stringValue(accountRow, "account_id") ?? "";
  const roleAssignments = bundle.roleAssignments.map(mapRoleAssignment);
  const defaultAccountRole = roleKeyValue(stringValue(accountRow, "default_role"));
  const activeAssignment =
    roleAssignments.find((assignment) => assignment.role === defaultAccountRole && assignment.status !== "revoked") ??
    roleAssignments.find((assignment) => assignment.status !== "revoked");
  const activeRole = activeAssignment?.role ?? defaultAccountRole;

  const account: CraysAccount = {
    id: accountId,
    displayName: stringValue(accountRow, "display_name") ?? "CRAYS Account",
    primaryContact: stringValue(accountRow, "primary_contact"),
    primaryContactRevision: stringValue(accountRow, "primary_contact_revision"),
    primaryContactType: (stringValue(accountRow, "primary_contact_type") ?? "contact") as CraysAccount["primaryContactType"],
    status: (stringValue(accountRow, "status") ?? "review") as CraysAccount["status"],
    craysId: stringValue(accountRow, "crays_id") ?? accountId,
    defaultRole: defaultAccountRole,
    authIdentities: bundle.accessIdentities.map(mapAuthIdentity),
    nostrIdentity: mapNostrIdentity(bundle.nostrIdentity, accountId),
    memberships: bundle.memberships.map(mapMembership),
    roleAssignments,
  };

  const requiredActions: CraysAuthSession["requiredActions"] = [];
  if (account.status === "blocked") requiredActions.push("review_membership");
  if (!roleAssignments.length) requiredActions.push("assign_role");
  if (!activeAssignment || activeAssignment.status !== "active") requiredActions.push("review_membership");
  if (!account.nostrIdentity.accessEnabled || !isRoleNostrBindingSatisfied(activeAssignment?.nostrBinding.status)) {
    requiredActions.push("connect_signer", "verify_nostr_identity");
  }

  return {
    status: account.status === "blocked" ? "blocked" : "crays_mapped",
    account,
    activeRole,
    roleAssignments,
    requiredActions: [...new Set(requiredActions)],
  };
}

export async function mapVerifiedNostrProofToCraysSession(input: VerifiedNostrProofMappingInput): Promise<VerifiedNostrProofMapping> {
  const existingBundle = await getIdentityBundleByNostrPubkeyHex(input.pubkeyHex);

  if (!existingBundle) {
    const audit = await createAuditEvent({
      action: "identity.nostr.signer_proof.unmapped",
      targetType: "nostr-pubkey",
      targetId: input.pubkeyHex,
      outcome: "denied",
      riskLevel: "sensitive",
      metadata: {
        challengeId: input.challengeId,
        eventId: input.eventId,
        reason: "No CRAYS account is mapped to this public key.",
      },
    });

    const session = createAnonymousSession();
    return {
      accountMapped: false,
      accountKnown: false,
      accessEnabled: false,
      session,
      auditId: audit.auditId,
      requiredActions: session.requiredActions,
      reason: "No CRAYS account is mapped to this public key.",
    };
  }

  const accountId = stringValue(existingBundle.account, "account_id") ?? "";
  await markNostrSignerProofVerified({ pubkeyHex: input.pubkeyHex, proofMethod: input.proofMethod });

  const refreshedBundle = accountId ? await getIdentityBundleByAccountId(accountId) : existingBundle;
  const session = createCraysSessionFromIdentityBundle(refreshedBundle ?? existingBundle);
  const accessEnabled = booleanValue((refreshedBundle ?? existingBundle).nostrIdentity, "access_enabled");
  const accountMapped = accessEnabled && session.status === "crays_mapped";
  const audit = await createAuditEvent({
    actorAccountId: accountId || null,
    action: accountMapped ? "identity.nostr.signer_proof.mapped" : "identity.nostr.signer_proof.blocked",
    targetType: "crays-account",
    targetId: accountId || input.pubkeyHex,
    outcome: accountMapped ? "allowed" : "denied",
    riskLevel: "sensitive",
    metadata: {
      challengeId: input.challengeId,
      eventId: input.eventId,
      pubkeyHex: input.pubkeyHex,
      accessEnabled,
      sessionStatus: session.status,
      requiredActions: session.requiredActions,
    },
  });

  return {
    accountMapped,
    accountKnown: true,
    accessEnabled,
    session,
    auditId: audit.auditId,
    requiredActions: session.requiredActions,
    reason: accountMapped ? undefined : "The public key is known, but CRAYS access is not enabled for this identity.",
  };
}
