import { modulesForRole, type ModuleKey } from "./modules";
import { roleByKey, roles, type RoleKey } from "./roles";

export const portalBridgeRoleCookieName = "crays_portal_bridge_role";
export const portalBridgeIssuedCookieName = "crays_portal_bridge_issued";
export const portalBridgeIssuedMarker = "block84-temporary-portal-bridge";
export const portalBridgeMaxAgeSeconds = 60 * 60 * 4;

export type PortalBridgeSection = "CRAYS workspaces" | "Stakeholder pages" | "Public pages";

export type PortalBridgeTarget = {
  key: string;
  label: string;
  description: string;
  path: `/${string}`;
  section: PortalBridgeSection;
  moduleKey?: ModuleKey;
  publicSurface?: boolean;
  recommendedRole: RoleKey;
};

export type PortalRoleEntry = {
  role: RoleKey;
  label: string;
  mode: string;
  summary: string;
  href: string;
  targetLabel: string;
  modules: string[];
};

export type PortalSurfaceEntry = PortalBridgeTarget & {
  href: string;
};

const roleDefaultTarget: Record<RoleKey, string> = {
  "crays-management": "dashboard-overview",
  admin: "settings",
  "deal-manager": "crm-home",
  "expansion-manager": "project-real-estate",
  finance: "loans-bank-package",
  hr: "hr",
  "franchise-candidate": "candidate-deal-room",
  "franchise-partner": "franchise-partner-portal",
  "studio-manager": "operations",
  "holiday-manager": "operations",
  "bank-partner": "bank-partner-portal",
  investor: "investments",
  landlord: "landlord-portal",
  vendor: "project-board",
  reviewer: "dashboard-work-queue",
  "gym-member": "support",
  guest: "public-deal-discovery",
};

export const portalBridgeTargets: PortalBridgeTarget[] = [
  {
    key: "dashboard-overview",
    label: "Dashboard overview",
    description: "Role-scoped operating picture with queues, rooms, signals and safe actions.",
    path: "/dashboard",
    section: "CRAYS workspaces",
    moduleKey: "dashboard",
    recommendedRole: "crays-management",
  },
  {
    key: "dashboard-work-queue",
    label: "Dashboard work queue",
    description: "Open role work without diagnostic walls in the normal workspace.",
    path: "/dashboard?view=work-queue",
    section: "CRAYS workspaces",
    moduleKey: "dashboard",
    recommendedRole: "reviewer",
  },
  {
    key: "crm-home",
    label: "CRM home",
    description: "Operational CRM workspace for companies, people, leads and opportunities.",
    path: "/crm",
    section: "CRAYS workspaces",
    moduleKey: "crm",
    recommendedRole: "deal-manager",
  },
  {
    key: "crm-inbox",
    label: "CRM inbox",
    description: "Real message records instead of the deal table repeated under Inbox.",
    path: "/crm?view=inbox&record=emails",
    section: "CRAYS workspaces",
    moduleKey: "crm",
    recommendedRole: "deal-manager",
  },
  {
    key: "crm-calendar",
    label: "CRM calendar",
    description: "Calendar events and scheduled operating follow-ups.",
    path: "/crm?view=calendar&record=calendar-events",
    section: "CRAYS workspaces",
    moduleKey: "crm",
    recommendedRole: "deal-manager",
  },
  {
    key: "project-work-items",
    label: "Project work items",
    description: "Opening work portfolio sourced through the CRAYS project read model.",
    path: "/project",
    section: "CRAYS workspaces",
    moduleKey: "project",
    recommendedRole: "deal-manager",
  },
  {
    key: "project-board",
    label: "Project board",
    description: "Kanban board with gated CRAYS transition staging and rollback.",
    path: "/project?view=board",
    section: "CRAYS workspaces",
    moduleKey: "project",
    recommendedRole: "deal-manager",
  },
  {
    key: "project-real-estate",
    label: "Real estate decision",
    description: "Property and owner decision surface for expansion and landlord workflows.",
    path: "/project?view=real-estate-decision",
    section: "Stakeholder pages",
    moduleKey: "project",
    recommendedRole: "landlord",
  },
  {
    key: "erp",
    label: "ERP finance workbench",
    description: "Finance, procurement and gated posting/export workflows.",
    path: "/erp",
    section: "CRAYS workspaces",
    moduleKey: "erp",
    recommendedRole: "finance",
  },
  {
    key: "files",
    label: "Files and evidence",
    description: "Document packages, release checks and vault grants.",
    path: "/files",
    section: "CRAYS workspaces",
    moduleKey: "files",
    recommendedRole: "deal-manager",
  },
  {
    key: "franchise-partner-portal",
    label: "Franchise Partner portal",
    description: "Relationship-scoped partner workspace for decision, performance, documents and gated messages.",
    path: "/franchise/partner",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "franchise-partner",
  },
  {
    key: "analytics-partner",
    label: "Analytics",
    description: "Partner, finance and management scorecards by role scope.",
    path: "/analytics",
    section: "CRAYS workspaces",
    moduleKey: "analytics",
    recommendedRole: "franchise-partner",
  },
  {
    key: "bank-partner-portal",
    label: "Bank Partner portal",
    description: "Relationship-scoped bank workspace for package readiness, conditions and closed send/payment gates.",
    path: "/funding-partner-bank/portal",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "bank-partner",
  },
  {
    key: "loans-bank-package",
    label: "Loans and bank package",
    description: "Bank package readiness, conditions and gated handoff state.",
    path: "/loans",
    section: "Stakeholder pages",
    moduleKey: "loans",
    recommendedRole: "bank-partner",
  },
  {
    key: "chat",
    label: "Messages",
    description: "Role-scoped communication threads and stakeholder rooms.",
    path: "/chat",
    section: "CRAYS workspaces",
    moduleKey: "chat",
    recommendedRole: "deal-manager",
  },
  {
    key: "operations",
    label: "Operations",
    description: "Studio operations, recovery, member data and service queues.",
    path: "/operations",
    section: "CRAYS workspaces",
    moduleKey: "operations",
    recommendedRole: "studio-manager",
  },
  {
    key: "hr",
    label: "HR",
    description: "Workforce, training and staff readiness controls.",
    path: "/hr",
    section: "CRAYS workspaces",
    moduleKey: "hr",
    recommendedRole: "hr",
  },
  {
    key: "learning",
    label: "Learning",
    description: "Partner and staff enablement paths.",
    path: "/learning",
    section: "CRAYS workspaces",
    moduleKey: "learning",
    recommendedRole: "franchise-partner",
  },
  {
    key: "support",
    label: "Support",
    description: "Member, partner and operations support queues.",
    path: "/support",
    section: "Stakeholder pages",
    moduleKey: "support",
    recommendedRole: "gym-member",
  },
  {
    key: "sites",
    label: "Sites",
    description: "Public site operations and content/data surface controls.",
    path: "/sites",
    section: "CRAYS workspaces",
    moduleKey: "sites",
    recommendedRole: "admin",
  },
  {
    key: "sync",
    label: "Sync",
    description: "Adapter mappings, sync jobs and data health queues.",
    path: "/sync",
    section: "CRAYS workspaces",
    moduleKey: "sync",
    recommendedRole: "admin",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Users, roles, modules, integrations and data-sync settings.",
    path: "/settings",
    section: "CRAYS workspaces",
    moduleKey: "settings",
    recommendedRole: "admin",
  },
  {
    key: "public-deal-discovery",
    label: "Pre-packed deal discovery",
    description: "Public franchise deal discovery backed by released Public DTOs only.",
    path: "/pre-packed-deals",
    section: "Public pages",
    publicSurface: true,
    recommendedRole: "guest",
  },
  {
    key: "candidate-deal-room",
    label: "Candidate deal room",
    description: "Candidate-safe released deal room, evidence, finance and timeline path.",
    path: "/pre-packed-deals/candidate",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "franchise-candidate",
  },
  {
    key: "franchise-landing",
    label: "Franchise landing page",
    description: "The existing franchise landing page, preserved as the public front door.",
    path: "/franchise",
    section: "Public pages",
    publicSurface: true,
    recommendedRole: "guest",
  },
  {
    key: "landlord-portal",
    label: "Landlord portal",
    description: "Relationship-scoped owner workspace for lease evidence, property documents and closed signing gates.",
    path: "/real-estate/portal",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "landlord",
  },
  {
    key: "real-estate",
    label: "Real estate owner page",
    description: "Owner-facing real estate entry and property submission path.",
    path: "/real-estate",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "landlord",
  },
  {
    key: "real-estate-partners",
    label: "Real estate partners",
    description: "Partner-facing property route and relationship context.",
    path: "/real-estate-partners",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "landlord",
  },
  {
    key: "funding-partner-bank",
    label: "Funding partner bank",
    description: "Funding and bank partner webfront door.",
    path: "/funding-partner-bank",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "bank-partner",
  },
  {
    key: "investments",
    label: "Investments",
    description: "Investor-facing investment and portfolio entry path.",
    path: "/investments",
    section: "Stakeholder pages",
    publicSurface: true,
    recommendedRole: "investor",
  },
];

const targetByKey = new Map(portalBridgeTargets.map((target) => [target.key, target]));

export function portalEntryHref(role: RoleKey, targetKey?: string) {
  const safeRole = roleByKey(role).key;
  const safeTarget = targetByKey.has(targetKey ?? "") ? targetKey! : roleDefaultTarget[safeRole];
  return `/portal/enter/${encodeURIComponent(safeRole)}/${encodeURIComponent(safeTarget)}`;
}

export function getPortalRoleEntries(): PortalRoleEntry[] {
  return roles.map((role) => {
    const modules = modulesForRole(role.key).map((module) => module.label);
    const target = targetByKey.get(roleDefaultTarget[role.key]) ?? portalBridgeTargets[0];

    return {
      role: role.key,
      label: role.label,
      mode: role.mode,
      summary: role.summary,
      href: portalEntryHref(role.key, target.key),
      targetLabel: target.label,
      modules,
    };
  });
}

export function getPortalSurfaceEntries(): PortalSurfaceEntry[] {
  return portalBridgeTargets.map((target) => ({
    ...target,
    href: portalEntryHref(target.recommendedRole, target.key),
  }));
}

function isTargetAllowedForRole(role: RoleKey, target: PortalBridgeTarget) {
  if (target.publicSurface) return true;
  if (target.recommendedRole === role) return true;
  if (!target.moduleKey) return false;
  return modulesForRole(role).some((module) => module.key === target.moduleKey);
}

export function resolvePortalBridgeTarget(rawRole: string | undefined, rawTarget: string | undefined) {
  const role = roleByKey(rawRole).key;
  const requestedTarget = rawTarget ? targetByKey.get(rawTarget) : undefined;
  const fallbackTarget = targetByKey.get(roleDefaultTarget[role]) ?? portalBridgeTargets[0];
  const target = requestedTarget && isTargetAllowedForRole(role, requestedTarget) ? requestedTarget : fallbackTarget;

  return {
    role,
    target,
    acceptedRequestedTarget: target === requestedTarget,
  };
}
