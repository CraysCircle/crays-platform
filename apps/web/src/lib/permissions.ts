import type { ModuleKey } from "./modules";
import type { RoleKey } from "./roles";
import type { SettingsSectionKey } from "./settings";

export type PermissionAction = "read" | "create" | "update" | "approve" | "configure" | "export" | "admin";

export type PermissionResource =
  | "users"
  | "roles"
  | "permissions"
  | "modules"
  | "organizations"
  | "studios"
  | "billing"
  | "integrations"
  | "security"
  | "audit-log"
  | "notifications"
  | "communication"
  | "branding"
  | "data-sync"
  | "deals"
  | "prepared-offers"
  | "properties"
  | "partner-pipeline"
  | "location-intelligence"
  | "documents"
  | "finance"
  | "bank-packages"
  | "kyc-aml"
  | "workflow-events"
  | "member-data";

export type PermissionKey = `${PermissionResource}:${PermissionAction}`;

export type PermissionScope =
  | "global"
  | "organization"
  | "studio"
  | "deal"
  | "project"
  | "candidate"
  | "property"
  | "partner"
  | "bank-package"
  | "loan-case"
  | "member"
  | "document"
  | "own";

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  resource: PermissionResource;
  action: PermissionAction;
  section: SettingsSectionKey;
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  roles: RoleKey[];
  scopes: PermissionScope[];
};

export type PermissionDecision = {
  allowed: boolean;
  reason: string;
};

export type PermissionCheckInput = {
  role: RoleKey;
  permission: PermissionKey;
  scope: PermissionScope;
  module?: ModuleKey;
};

const managementRoles: RoleKey[] = ["crays-management", "admin"];

export const permissionDefinitions: PermissionDefinition[] = [
  {
    key: "users:read",
    label: "Read users",
    resource: "users",
    action: "read",
    section: "users",
    description: "View global accounts, memberships and identity state.",
    risk: "medium",
    roles: [...managementRoles, "hr", "reviewer"],
    scopes: ["global", "organization"],
  },
  {
    key: "users:admin",
    label: "Administer users",
    resource: "users",
    action: "admin",
    section: "users",
    description: "Invite, suspend, restore and review account access.",
    risk: "critical",
    roles: ["admin"],
    scopes: ["global"],
  },
  {
    key: "roles:admin",
    label: "Administer roles",
    resource: "roles",
    action: "admin",
    section: "roles",
    description: "Change global role definitions and assignment policy.",
    risk: "critical",
    roles: ["admin"],
    scopes: ["global"],
  },
  {
    key: "permissions:admin",
    label: "Administer permissions",
    resource: "permissions",
    action: "admin",
    section: "permissions",
    description: "Change access grants, scope policy and permission reviews.",
    risk: "critical",
    roles: ["admin"],
    scopes: ["global"],
  },
  {
    key: "modules:configure",
    label: "Configure modules",
    resource: "modules",
    action: "configure",
    section: "modules",
    description: "Enable modules, feature gates and adapter readiness.",
    risk: "high",
    roles: ["admin", "crays-management"],
    scopes: ["global"],
  },
  {
    key: "organizations:update",
    label: "Update organizations",
    resource: "organizations",
    action: "update",
    section: "organizations",
    description: "Manage partner, bank, landlord and vendor organization state.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "expansion-manager", "finance"],
    scopes: ["global", "organization"],
  },
  {
    key: "studios:update",
    label: "Update studios",
    resource: "studios",
    action: "update",
    section: "studios",
    description: "Manage studio ownership, local settings and operating state.",
    risk: "high",
    roles: ["admin", "crays-management", "franchise-partner", "studio-manager"],
    scopes: ["global", "organization", "studio", "own"],
  },
  {
    key: "billing:read",
    label: "Read billing",
    resource: "billing",
    action: "read",
    section: "billing",
    description: "View payment settings, fee basis, invoice policy and finance exports.",
    risk: "high",
    roles: ["admin", "crays-management", "finance", "franchise-partner"],
    scopes: ["global", "organization", "studio", "own"],
  },
  {
    key: "integrations:configure",
    label: "Configure integrations",
    resource: "integrations",
    action: "configure",
    section: "integrations",
    description: "Manage adapter configuration and connection state without exposing secrets.",
    risk: "critical",
    roles: ["admin"],
    scopes: ["global"],
  },
  {
    key: "security:admin",
    label: "Administer security",
    resource: "security",
    action: "admin",
    section: "security",
    description: "Manage security policy, sensitive actions and key guardrails.",
    risk: "critical",
    roles: ["admin"],
    scopes: ["global"],
  },
  {
    key: "audit-log:read",
    label: "Read audit log",
    resource: "audit-log",
    action: "read",
    section: "audit-log",
    description: "Review high-risk access, document, finance and integration events.",
    risk: "high",
    roles: ["admin", "crays-management", "reviewer"],
    scopes: ["global", "organization"],
  },
  {
    key: "notifications:configure",
    label: "Configure notifications",
    resource: "notifications",
    action: "configure",
    section: "notifications",
    description: "Set channel, consent, escalation and digest rules.",
    risk: "medium",
    roles: ["admin", "crays-management", "deal-manager", "franchise-partner", "studio-manager"],
    scopes: ["global", "organization", "studio", "own"],
  },
  {
    key: "communication:read",
    label: "Read messages",
    resource: "communication",
    action: "read",
    section: "notifications",
    description: "View scoped internal, shared and external communication threads.",
    risk: "high",
    roles: [
      "admin",
      "crays-management",
      "deal-manager",
      "expansion-manager",
      "finance",
      "hr",
      "franchise-candidate",
      "franchise-partner",
      "studio-manager",
      "bank-partner",
      "landlord",
      "vendor",
      "reviewer",
      "gym-member",
    ],
    scopes: ["global", "organization", "studio", "deal", "project", "member", "document", "own"],
  },
  {
    key: "communication:create",
    label: "Create messages",
    resource: "communication",
    action: "create",
    section: "notifications",
    description: "Create scoped notes, comments or external messages after visibility checks.",
    risk: "high",
    roles: [
      "admin",
      "crays-management",
      "deal-manager",
      "expansion-manager",
      "finance",
      "hr",
      "franchise-candidate",
      "franchise-partner",
      "studio-manager",
      "bank-partner",
      "landlord",
      "vendor",
      "reviewer",
      "gym-member",
    ],
    scopes: ["global", "organization", "studio", "deal", "project", "member", "document", "own"],
  },
  {
    key: "communication:configure",
    label: "Configure messaging",
    resource: "communication",
    action: "configure",
    section: "notifications",
    description: "Manage channel policy, consent rules, templates and provider adapter readiness.",
    risk: "critical",
    roles: ["admin", "crays-management"],
    scopes: ["global", "organization"],
  },
  {
    key: "branding:configure",
    label: "Configure branding",
    resource: "branding",
    action: "configure",
    section: "branding",
    description: "Control CRAYS presentation, partner-facing surfaces and local options.",
    risk: "medium",
    roles: ["admin", "crays-management"],
    scopes: ["global"],
  },
  {
    key: "data-sync:configure",
    label: "Configure data sync",
    resource: "data-sync",
    action: "configure",
    section: "data-sync",
    description: "Control external mappings, sync jobs, conflicts and outbox events.",
    risk: "critical",
    roles: ["admin"],
    scopes: ["global"],
  },
  {
    key: "documents:approve",
    label: "Approve documents",
    resource: "documents",
    action: "approve",
    section: "permissions",
    description: "Approve scoped document versions and packages.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "reviewer", "finance"],
    scopes: ["global", "organization", "deal", "project", "document"],
  },
  {
    key: "deals:read",
    label: "Read deals",
    resource: "deals",
    action: "read",
    section: "permissions",
    description: "View scoped franchise candidate, prepared-offer and franchise partner deal records.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "finance", "reviewer"],
    scopes: ["global", "organization", "deal", "candidate"],
  },
  {
    key: "deals:update",
    label: "Update deals",
    resource: "deals",
    action: "update",
    section: "permissions",
    description: "Move active franchise deal records, readiness states, owner tasks and handoff status.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "reviewer"],
    scopes: ["global", "organization", "deal", "candidate"],
  },
  {
    key: "prepared-offers:read",
    label: "Read prepared offers",
    resource: "prepared-offers",
    action: "read",
    section: "permissions",
    description: "View released prepared offer summaries and scoped deal-detail read models.",
    risk: "medium",
    roles: ["admin", "crays-management", "deal-manager", "expansion-manager", "franchise-candidate", "reviewer"],
    scopes: ["global", "organization", "deal", "property", "own"],
  },
  {
    key: "prepared-offers:update",
    label: "Update prepared offers",
    resource: "prepared-offers",
    action: "update",
    section: "permissions",
    description: "Update reviewed prepared offer metadata before release into candidate-visible surfaces.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "reviewer"],
    scopes: ["global", "organization", "deal", "property"],
  },
  {
    key: "properties:read",
    label: "Read properties",
    resource: "properties",
    action: "read",
    section: "permissions",
    description: "View scoped property cases, owner submissions, location evidence and handoff state.",
    risk: "high",
    roles: ["admin", "crays-management", "expansion-manager", "deal-manager", "reviewer"],
    scopes: ["global", "organization", "property", "deal"],
  },
  {
    key: "properties:create",
    label: "Create properties",
    resource: "properties",
    action: "create",
    section: "permissions",
    description: "Create reviewed property cases from owner submissions or internal expansion work.",
    risk: "high",
    roles: ["admin", "crays-management", "expansion-manager"],
    scopes: ["global", "organization", "property"],
  },
  {
    key: "properties:update",
    label: "Update properties",
    resource: "properties",
    action: "update",
    section: "permissions",
    description: "Update property qualification, owner follow-up, location review and handoff readiness.",
    risk: "high",
    roles: ["admin", "crays-management", "expansion-manager", "reviewer"],
    scopes: ["global", "organization", "property"],
  },
  {
    key: "partner-pipeline:read",
    label: "Read partner pipeline",
    resource: "partner-pipeline",
    action: "read",
    section: "permissions",
    description: "View real estate, funding, finance and banking partner pipeline records.",
    risk: "high",
    roles: ["admin", "crays-management", "expansion-manager", "reviewer"],
    scopes: ["global", "organization", "partner"],
  },
  {
    key: "partner-pipeline:create",
    label: "Create partner pipeline",
    resource: "partner-pipeline",
    action: "create",
    section: "permissions",
    description: "Create partner development records before they are handed into active deal workflows.",
    risk: "high",
    roles: ["admin", "crays-management", "expansion-manager"],
    scopes: ["global", "organization", "partner"],
  },
  {
    key: "partner-pipeline:update",
    label: "Update partner pipeline",
    resource: "partner-pipeline",
    action: "update",
    section: "permissions",
    description: "Update partner qualification, access requests, relationship status and handoff readiness.",
    risk: "high",
    roles: ["admin", "crays-management", "expansion-manager"],
    scopes: ["global", "organization", "partner"],
  },
  {
    key: "location-intelligence:read",
    label: "Read location intelligence",
    resource: "location-intelligence",
    action: "read",
    section: "permissions",
    description: "View reviewed location evidence, market signals, property fit and released candidate summaries.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "expansion-manager", "finance", "franchise-candidate", "bank-partner", "reviewer"],
    scopes: ["global", "organization", "deal", "property", "own"],
  },
  {
    key: "location-intelligence:approve",
    label: "Approve location intelligence",
    resource: "location-intelligence",
    action: "approve",
    section: "permissions",
    description: "Approve location evidence before candidate release, bank package release or prepared-offer publication.",
    risk: "critical",
    roles: ["admin", "crays-management", "deal-manager", "expansion-manager", "reviewer"],
    scopes: ["global", "organization", "deal", "property"],
  },
  {
    key: "bank-packages:read",
    label: "Read bank packages",
    resource: "bank-packages",
    action: "read",
    section: "permissions",
    description: "View bank package records only after candidate, deal and document gates allow the role scope.",
    risk: "critical",
    roles: ["admin", "crays-management", "deal-manager", "finance", "bank-partner", "reviewer"],
    scopes: ["global", "deal", "candidate", "bank-package", "loan-case", "document"],
  },
  {
    key: "finance:read",
    label: "Read finance",
    resource: "finance",
    action: "read",
    section: "billing",
    description: "View scoped finance records, fee basis, cashflow summaries and approved finance signals.",
    risk: "critical",
    roles: ["admin", "crays-management", "finance", "deal-manager", "franchise-partner", "studio-manager"],
    scopes: ["global", "organization", "studio", "deal", "own"],
  },
  {
    key: "bank-packages:create",
    label: "Create bank packages",
    resource: "bank-packages",
    action: "create",
    section: "permissions",
    description: "Prepare controlled lender packages after CRAYS checks and before partner review.",
    risk: "critical",
    roles: ["admin", "crays-management", "deal-manager", "finance", "reviewer"],
    scopes: ["global", "deal", "bank-package", "document"],
  },
  {
    key: "kyc-aml:read",
    label: "Read KYC/AML",
    resource: "kyc-aml",
    action: "read",
    section: "permissions",
    description: "View KYC/AML status and released evidence only after regulated access gates are satisfied.",
    risk: "critical",
    roles: ["admin", "crays-management", "deal-manager", "finance", "bank-partner", "reviewer"],
    scopes: ["global", "deal", "candidate", "bank-package", "document"],
  },
  {
    key: "workflow-events:read",
    label: "Read workflow events",
    resource: "workflow-events",
    action: "read",
    section: "audit-log",
    description: "View role-scoped event, dashboard and audit signals for permitted business objects.",
    risk: "high",
    roles: ["admin", "crays-management", "deal-manager", "expansion-manager", "finance", "hr", "franchise-partner", "studio-manager", "bank-partner", "reviewer"],
    scopes: ["global", "organization", "studio", "deal", "project", "candidate", "property", "partner", "bank-package", "loan-case", "document", "own"],
  },
  {
    key: "member-data:read",
    label: "Read member data",
    resource: "member-data",
    action: "read",
    section: "studios",
    description: "Read member data only where legally and operationally allowed.",
    risk: "critical",
    roles: ["admin", "crays-management", "franchise-partner", "studio-manager", "gym-member"],
    scopes: ["global", "organization", "studio", "own", "member"],
  },
  {
    key: "bank-packages:approve",
    label: "Approve bank packages",
    resource: "bank-packages",
    action: "approve",
    section: "permissions",
    description: "Release controlled financing packages after CRAYS checks.",
    risk: "critical",
    roles: ["admin", "crays-management", "deal-manager", "finance", "reviewer"],
    scopes: ["global", "deal", "document"],
  },
];

const permissionByKey = new Map(permissionDefinitions.map((permission) => [permission.key, permission]));

export function permissionsForSection(section: SettingsSectionKey) {
  return permissionDefinitions.filter((permission) => permission.section === section);
}

export function permissionsForRole(role: RoleKey) {
  return permissionDefinitions.filter((permission) => permission.roles.includes(role));
}

export function evaluatePermission(input: PermissionCheckInput): PermissionDecision {
  const permission = permissionByKey.get(input.permission);

  if (!permission) {
    return { allowed: false, reason: "Permission is not defined." };
  }

  if (!permission.roles.includes(input.role)) {
    return { allowed: false, reason: "Role is not granted this permission." };
  }

  if (permission.scopes.includes("global") || permission.scopes.includes(input.scope)) {
    return { allowed: true, reason: "Role and scope match the permission policy." };
  }

  return { allowed: false, reason: "Scope is outside the permission policy." };
}
