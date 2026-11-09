import type { ModuleKey } from "./modules";
import type { PermissionKey, PermissionScope } from "./permissions";
import type { RoleKey } from "./roles";

export type OrganizationType =
  | "crays"
  | "franchise-partner"
  | "bank"
  | "landlord"
  | "vendor"
  | "investor"
  | "advisor";

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  status: "active" | "review" | "suspended";
  parentOrganizationId?: string;
};

export type Studio = {
  id: string;
  organizationId: string;
  name: string;
  status: "planned" | "opening" | "active" | "paused" | "closed";
  localSettingsProfileId?: string;
};

export type ModuleAccessRule = {
  id: string;
  module: ModuleKey;
  role: RoleKey;
  scope: PermissionScope;
  status: "enabled" | "review" | "disabled";
};

export type FeatureAccessRule = {
  id: string;
  featureKey: string;
  module: ModuleKey;
  role: RoleKey;
  organizationId?: string;
  studioId?: string;
  status: "enabled" | "review" | "disabled";
};

export type PermissionGrant = {
  id: string;
  permission: PermissionKey;
  role: RoleKey;
  scope: PermissionScope;
  organizationId?: string;
  studioId?: string;
  grantedBy: string;
  status: "active" | "review" | "revoked";
};

export type AuditLogEntry = {
  id: string;
  actorAccountId: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "allowed" | "denied" | "changed" | "failed";
  createdAt: string;
};
