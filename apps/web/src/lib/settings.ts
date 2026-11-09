export type SettingsSectionKey =
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
  | "branding"
  | "data-sync";

export type SettingsSection = {
  key: SettingsSectionKey;
  label: string;
  path: `/settings/${string}`;
  purpose: string;
  owner: string;
  visibility: "Admin" | "Admin / Management" | "Scoped Admin" | "Local Admin";
  status: "Foundation" | "Inventory" | "Policy" | "Adapter-ready";
  records: string[];
  guardrails: string[];
};

export const settingsSections: SettingsSection[] = [
  {
    key: "users",
    label: "Users",
    path: "/settings/users",
    purpose: "Manage global accounts, identities, invitations and account lifecycle.",
    owner: "Platform Admin",
    visibility: "Admin / Management",
    status: "Foundation",
    records: ["Account", "Identity", "Membership", "Invitation"],
    guardrails: ["Provider proves identity", "CRAYS grants access", "No secret values in UI"],
  },
  {
    key: "roles",
    label: "Roles",
    path: "/settings/roles",
    purpose: "Define role behavior across portal, workbench and member surfaces.",
    owner: "Platform Admin",
    visibility: "Admin / Management",
    status: "Foundation",
    records: ["Role", "Mode", "Summary", "Assignment"],
    guardrails: ["One role source of truth", "Role Switch remains development-only", "Role labels stay functional"],
  },
  {
    key: "permissions",
    label: "Permissions",
    path: "/settings/permissions",
    purpose: "Control action, resource, organization, entity and document access.",
    owner: "Security",
    visibility: "Admin",
    status: "Policy",
    records: ["Permission", "Scope", "Grant", "Review"],
    guardrails: ["Deny by default", "Server-side checks required", "Document grants are separate"],
  },
  {
    key: "modules",
    label: "Modules",
    path: "/settings/modules",
    purpose: "Control module access, adapter readiness and feature visibility.",
    owner: "Platform Admin",
    visibility: "Admin",
    status: "Adapter-ready",
    records: ["Module", "Feature", "Adapter", "Access"],
    guardrails: ["No implementation names in UI", "Adapters remain module-specific", "Feature access is role-scoped"],
  },
  {
    key: "organizations",
    label: "Organizations",
    path: "/settings/organizations",
    purpose: "Manage CRAYS, franchise partner, bank, landlord and vendor organizations.",
    owner: "Operations",
    visibility: "Scoped Admin",
    status: "Foundation",
    records: ["Organization", "Membership", "Scope", "Relationship"],
    guardrails: ["Organization scope limits access", "External parties see only granted entities", "Legal entities stay auditable"],
  },
  {
    key: "studios",
    label: "Studios",
    path: "/settings/studios",
    purpose: "Manage studio records, local settings, ownership and operating scope.",
    owner: "Operations",
    visibility: "Local Admin",
    status: "Foundation",
    records: ["Studio", "Owner", "Local Policy", "Operating State"],
    guardrails: ["Studio scope protects member data", "Partner sees own studios only", "Local settings inherit global policy"],
  },
  {
    key: "billing",
    label: "Billing",
    path: "/settings/billing",
    purpose: "Control payment settings, fee basis, invoicing policy and finance exports.",
    owner: "Finance",
    visibility: "Scoped Admin",
    status: "Inventory",
    records: ["Payment Setting", "Fee Rule", "Invoice Policy", "Export"],
    guardrails: ["Franchise partner finance stays separated", "Corporate finance remains restricted", "Exports require audit events"],
  },
  {
    key: "integrations",
    label: "Integrations",
    path: "/settings/integrations",
    purpose: "Track adapter configuration, connection state and module-specific technical settings.",
    owner: "Platform Admin",
    visibility: "Admin",
    status: "Adapter-ready",
    records: ["Integration", "Adapter", "Webhook", "Connection"],
    guardrails: ["Never show secrets", "Technical settings are admin-only", "Adapter health feeds Sync"],
  },
  {
    key: "security",
    label: "Security",
    path: "/settings/security",
    purpose: "Manage security posture, session policy, sensitive actions and key guardrails.",
    owner: "Security",
    visibility: "Admin",
    status: "Policy",
    records: ["Policy", "Challenge", "Sensitive Action", "Key Guardrail"],
    guardrails: ["Private keys are never stored", "Sensitive actions require confirmation", "Audit trail is mandatory"],
  },
  {
    key: "audit-log",
    label: "Audit Log",
    path: "/settings/audit-log",
    purpose: "Review access, permission, document, finance and integration events.",
    owner: "Security",
    visibility: "Admin / Management",
    status: "Foundation",
    records: ["Audit Event", "Actor", "Target", "Decision"],
    guardrails: ["Append-only event model", "High-risk events stay searchable", "Audit data is role-restricted"],
  },
  {
    key: "notifications",
    label: "Notifications",
    path: "/settings/notifications",
    purpose: "Define channel, consent, escalation and digest rules.",
    owner: "Operations",
    visibility: "Scoped Admin",
    status: "Inventory",
    records: ["Channel", "Consent", "Digest", "Escalation"],
    guardrails: ["External messages require consent", "Internal notes remain internal", "Quiet hours can be role-scoped"],
  },
  {
    key: "branding",
    label: "Branding",
    path: "/settings/branding",
    purpose: "Control CRAYS branding, partner-facing presentation and local studio options.",
    owner: "Growth",
    visibility: "Admin",
    status: "Inventory",
    records: ["Brand", "Theme", "Studio Option", "Public Surface"],
    guardrails: ["CRAYS remains primary", "Partner surfaces follow grants", "Public changes require review"],
  },
  {
    key: "data-sync",
    label: "Data Sync",
    path: "/settings/data-sync",
    purpose: "Control mappings, sync jobs, outbox events and adapter data movement.",
    owner: "Platform Admin",
    visibility: "Admin",
    status: "Adapter-ready",
    records: ["External Map", "Sync Job", "Outbox Event", "Conflict"],
    guardrails: ["No direct cross-database writes", "Conflicts require review", "Events feed dashboards"],
  },
];

export function settingsSectionByKey(key: string | null | undefined) {
  return settingsSections.find((section) => section.key === key);
}
