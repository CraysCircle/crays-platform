import { createHash, randomUUID } from "node:crypto";
import { getIdentityBundleByProviderSubject, upsertCoreIdentity, type IdentityBundle } from "@/db/core-identity-repository";
import { createCraysSessionFromIdentityBundle } from "./auth-session-mapping";
import type { CraysAuthSession } from "./auth-boundary";
import type { RoleKey } from "./roles";

type ProviderMethod = "contact" | "social" | "passkey" | "mfa" | "signer" | "nostr";

export type ProviderAccountProvisioningInput = {
  providerKey: "auth0";
  providerSubject: string;
  displayName?: string | null;
  contactAddress?: string | null;
  contactVerified?: boolean;
  requestedRole?: RoleKey;
  methodType?: ProviderMethod;
  source?: "franchise" | "platform" | "member-app";
};

export type ProviderAccountProvisioningResult = {
  status: "already_mapped" | "provisioned_review";
  accountMapped: boolean;
  accessEnabled: boolean;
  session: CraysAuthSession;
  accountId?: string;
  craysId?: string;
  requestedRole: RoleKey;
  nip05Reserved: boolean;
  privateKeysReturned: false;
  secretsReturned: false;
};

const selfServiceRoles = new Set<RoleKey>(["franchise-candidate", "gym-member", "investor"]);

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function cleanLocalPart(value: string | null | undefined) {
  const base = (value ?? "user")
    .split("@")[0]
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 42);

  return base.length >= 3 ? base : "user";
}

function displayNameFor(input: ProviderAccountProvisioningInput) {
  return input.displayName?.trim() || input.contactAddress?.split("@")[0] || "Pending CRAYS Account";
}

function defaultRoleFor(input: ProviderAccountProvisioningInput): RoleKey {
  if (input.requestedRole && selfServiceRoles.has(input.requestedRole)) return input.requestedRole;
  return input.source === "member-app" ? "gym-member" : "franchise-candidate";
}

function primaryContactType(input: ProviderAccountProvisioningInput): "contact" {
  void input;
  return "contact";
}

function sessionFromBundle(bundle: IdentityBundle) {
  const session = createCraysSessionFromIdentityBundle(bundle);
  return {
    session,
    accessEnabled: session.status === "crays_mapped" && session.requiredActions.length === 0,
  };
}

export function isSelfServiceProvisioningRole(role: RoleKey) {
  return selfServiceRoles.has(role);
}

export async function provisionProviderAccount(input: ProviderAccountProvisioningInput): Promise<ProviderAccountProvisioningResult> {
  const existing = await getIdentityBundleByProviderSubject(input.providerKey, input.providerSubject);
  const requestedRole = defaultRoleFor(input);

  if (existing) {
    const mapped = sessionFromBundle(existing);
    return {
      status: "already_mapped",
      accountMapped: true,
      accessEnabled: mapped.accessEnabled,
      session: mapped.session,
      accountId: typeof existing.account.account_id === "string" ? existing.account.account_id : undefined,
      craysId: typeof existing.account.crays_id === "string" ? existing.account.crays_id : undefined,
      requestedRole,
      nip05Reserved: Boolean(existing.nostrIdentity?.nip05),
      privateKeysReturned: false,
      secretsReturned: false,
    };
  }

  const accountId = `acct_${randomUUID()}`;
  const suffix = shortHash(`${input.providerKey}:${input.providerSubject}`);
  const craysId = `crays_${suffix}`;
  const domain = (process.env.CRAYS_NIP05_DOMAIN || "crays.net").toLowerCase();
  const localPart = `${cleanLocalPart(input.contactAddress ?? input.displayName)}.${suffix.slice(0, 6)}`;
  const nip05 = `${localPart}@${domain}`;

  const bundle = await upsertCoreIdentity({
    account: {
      accountId,
      craysId,
      displayName: displayNameFor(input),
      primaryContact: input.contactAddress ?? null,
      primaryContactType: primaryContactType(input),
      defaultRole: requestedRole,
      status: "review",
    },
    authIdentity: {
      methodType: input.methodType ?? "social",
      providerKey: input.providerKey,
      providerSubject: input.providerSubject,
      verified: Boolean(input.contactVerified),
    },
    nostrIdentity: {
      nip05,
      nip05Status: "claimed",
      issuanceStatus: "queued",
      privateKeyHandoff: "not_created",
      accessEnabled: false,
      signerStatus: "pending",
    },
    organization: {
      organizationId: "org_crays_identity_review",
      name: "CRAYS Identity Review",
      organizationType: "crays",
      status: "active",
    },
    membership: {
      organizationId: "org_crays_identity_review",
      roleKey: requestedRole,
      status: "review",
      scopes: [],
    },
    roleAssignment: {
      roleKey: requestedRole,
      organizationId: "org_crays_identity_review",
      entityType: requestedRole === "gym-member" ? "member" : "deal",
      entityId: requestedRole === "gym-member" ? "pending-member" : "pending-franchise-deal",
      nostrBindingStatus: "pending",
      nostrNip05: nip05,
      status: "review",
    },
    auditEvent: {
      action: "identity.provider_account.provisioned",
      targetType: "crays-account",
      targetId: accountId,
      outcome: "changed",
      riskLevel: "sensitive",
      metadata: {
        providerKey: input.providerKey,
        providerSubjectPresent: true,
        requestedRole,
        source: input.source ?? "platform",
        accessEnabled: false,
        privateKeyStored: false,
      },
    },
  });

  if (!bundle) {
    throw new Error("CRAYS account provisioning failed.");
  }

  const mapped = sessionFromBundle(bundle);
  return {
    status: "provisioned_review",
    accountMapped: true,
    accessEnabled: false,
    session: mapped.session,
    accountId,
    craysId,
    requestedRole,
    nip05Reserved: true,
    privateKeysReturned: false,
    secretsReturned: false,
  };
}
