import { roles, type RoleKey } from "./roles";

export type RoleNostrBindingStatus = "missing" | "pending" | "verified" | "system_attested" | "revoked";

export type RoleNostrBinding = {
  role: RoleKey;
  required: true;
  statusCoupling: Array<"role" | "permissions" | "account_status" | "audit" | "events">;
  acceptedProof: Array<"nip05_resolved" | "npub_matched" | "signer_verified" | "system_attested">;
};

export const roleNostrBindings: RoleNostrBinding[] = roles.map((role) => ({
  role: role.key,
  required: true,
  statusCoupling: ["role", "permissions", "account_status", "audit", "events"],
  acceptedProof:
    role.key === "guest"
      ? ["nip05_resolved", "npub_matched", "signer_verified", "system_attested"]
      : ["nip05_resolved", "npub_matched", "signer_verified"],
}));

export function nostrBindingForRole(role: RoleKey) {
  return roleNostrBindings.find((binding) => binding.role === role)!;
}

export function isRoleNostrBindingSatisfied(status: RoleNostrBindingStatus | undefined) {
  return status === "verified" || status === "system_attested";
}
