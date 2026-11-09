import { modulesForRole, type ModuleKey } from "./modules";
import type { PermissionKey, PermissionScope } from "./permissions";
import { roleByKey, roles, type RoleKey } from "./roles";

export type AccessDomainKey =
  | "candidate-deals"
  | "prepared-offers"
  | "property-cases"
  | "partner-pipeline"
  | "location-evidence"
  | "bank-packages"
  | "document-packages"
  | "franchise-operations"
  | "member-data"
  | "corporate-finance"
  | "hr-private";

export type AccessAction = "read_summary" | "read_detail" | "create" | "update" | "approve" | "release" | "handoff" | "admin";

export type AccessRule = {
  action: AccessAction;
  roles: RoleKey[];
  scopes: PermissionScope[];
  requiredPermission?: PermissionKey;
  requiresExplicitHandoff?: boolean;
  guardrails: string[];
};

export type AccessDomainPolicy = {
  key: AccessDomainKey;
  label: string;
  ownerRole: RoleKey;
  primaryModules: ModuleKey[];
  records: string[];
  rules: AccessRule[];
  deniedByDefault: string[];
};

export type RoleAccessProfile = {
  role: RoleKey;
  primaryModules: ModuleKey[];
  owns: string[];
  canWorkWith: string[];
  deniedByDefault: string[];
  handoffRules: string[];
};

const internalOversightRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const dealExecutionRoles: RoleKey[] = ["deal-manager", "finance", "reviewer", "crays-management", "admin"];
const expansionPipelineRoles: RoleKey[] = ["expansion-manager", "reviewer", "crays-management", "admin"];

export const roleAccessProfiles: Record<RoleKey, RoleAccessProfile> = {
  "crays-management": {
    role: "crays-management",
    primaryModules: modulesForRole("crays-management").map((module) => module.key),
    owns: ["Portfolio oversight", "Risk oversight", "Strategic approvals"],
    canWorkWith: ["All role-scoped dashboards", "Reviewed partner and deal records", "Escalations"],
    deniedByDefault: ["Raw private key material", "Provider secrets", "Unscoped member personal data"],
    handoffRules: ["Management can review handoff state, but operational ownership remains with the assigned role."],
  },
  admin: {
    role: "admin",
    primaryModules: modulesForRole("admin").map((module) => module.key),
    owns: ["Platform administration", "Role grants", "Security policy", "Adapter configuration"],
    canWorkWith: ["Global settings", "Access reviews", "Audit records"],
    deniedByDefault: ["Raw private key material", "Provider secrets"],
    handoffRules: ["Admin can grant scopes only through audited role assignment and permission records."],
  },
  "deal-manager": {
    role: "deal-manager",
    primaryModules: ["crm", "project", "files", "analytics", "loans"],
    owns: ["Franchise Candidate pipeline", "Franchise Partner deal execution", "Bank package coordination", "Opening handoff"],
    canWorkWith: ["Prepared offers linked to active deals", "Candidate communication", "Released property evidence", "Loan package workflow"],
    deniedByDefault: ["Real estate owner strategy outside active deals", "Funding or banking partner acquisition strategy", "HR-private records", "Corporate finance outside deal scope"],
    handoffRules: [
      "Receives property, funding or banking partner context only after Expansion Manager marks it ready for an active prepared offer or candidate deal.",
      "Can coordinate bank packages after candidate, deal and document gates are satisfied.",
    ],
  },
  "expansion-manager": {
    role: "expansion-manager",
    primaryModules: ["crm", "project", "files", "analytics"],
    owns: ["Real estate owner pipeline", "Property case intake", "Funding partner development", "Finance partner development", "Banking partner acquisition"],
    canWorkWith: ["Property submissions", "Location evidence", "Partner qualification", "Prepared offer inputs before candidate handoff"],
    deniedByDefault: ["Loans execution", "Candidate KYC/AML", "Candidate source-of-funds", "Bank package execution notes", "Franchise Partner operating finance unrelated to expansion"],
    handoffRules: [
      "Hands reviewed property and partner relationships to Deal Manager when they become part of an active candidate or prepared-offer workflow.",
      "Keeps partner-development records separate from candidate private diligence unless a scoped handoff exists.",
    ],
  },
  finance: {
    role: "finance",
    primaryModules: modulesForRole("finance").map((module) => module.key),
    owns: ["Finance review", "Fee basis", "Bank package financial checks", "Payout blockers"],
    canWorkWith: ["Finance records", "Bank packages after release", "Studio financial summaries"],
    deniedByDefault: ["HR-private notes", "Unrelated deal communication", "Unscoped partner strategy"],
    handoffRules: ["Finance enters candidate/deal workflows through explicit finance review or bank-package scope."],
  },
  hr: {
    role: "hr",
    primaryModules: modulesForRole("hr").map((module) => module.key),
    owns: ["People readiness", "Training state", "HR workflow"],
    canWorkWith: ["Staffing needs", "Training records", "HR documents"],
    deniedByDefault: ["Deal finance", "Bank packages", "Candidate private diligence outside HR need"],
    handoffRules: ["HR data is exposed to other roles only as scoped readiness signals."],
  },
  "franchise-candidate": {
    role: "franchise-candidate",
    primaryModules: ["loans", "chat"],
    owns: ["Own candidate profile", "Own deal selection", "Own due diligence journey"],
    canWorkWith: ["Released prepared offer details", "Own documents", "Deal Manager thread", "Own financing preparation"],
    deniedByDefault: ["Internal CRAYS notes", "Other candidates", "Bank internal decisions before release", "Partner pipeline"],
    handoffRules: ["Candidate data can enter bank package workflow only after CRAYS checks and consent gates."],
  },
  "franchise-partner": {
    role: "franchise-partner",
    primaryModules: modulesForRole("franchise-partner").map((module) => module.key),
    owns: ["Own studios", "Opening tasks", "Own operating KPIs"],
    canWorkWith: ["Own studio finance", "Own project documents", "Support and operations threads"],
    deniedByDefault: ["Other partner records", "CRAYS corporate finance", "Bank internal notes"],
    handoffRules: ["Partner scope starts after approved franchise handoff and remains limited to owned studios and deals."],
  },
  "studio-manager": {
    role: "studio-manager",
    primaryModules: modulesForRole("studio-manager").map((module) => module.key),
    owns: ["Local studio operations", "Local tasks", "Member service queues"],
    canWorkWith: ["Own studio member operations", "Local support", "Maintenance and readiness tasks"],
    deniedByDefault: ["Franchise deal finance", "Bank packages", "Other studio records", "Corporate finance"],
    handoffRules: ["Studio Manager access starts at assigned studio scope."],
  },
  "holiday-manager": {
    role: "holiday-manager",
    primaryModules: modulesForRole("holiday-manager").map((module) => module.key),
    owns: ["Assigned Clubs property operations", "Availability and reservation queues", "Stay readiness and guest service"],
    canWorkWith: ["Assigned Clubs properties", "Assigned reservations and stays", "Property maintenance and operational exceptions"],
    deniedByDefault: ["Gym member, class, workout or studio records", "Other Clubs Franchise Partners", "Unassigned Clubs properties", "Corporate finance"],
    handoffRules: ["Holiday Manager access requires an active Clubs Franchise Partner assignment and exact property scope on every request."],
  },
  "bank-partner": {
    role: "bank-partner",
    primaryModules: modulesForRole("bank-partner").map((module) => module.key),
    owns: ["Own lender review", "Conditions", "Credit decision workflow"],
    canWorkWith: ["Released bank package", "Released candidate checks", "Released location and cashflow evidence"],
    deniedByDefault: ["Unrelated borrowers", "CRAYS corporate finance", "HR", "Member personal data"],
    handoffRules: ["Bank access starts only after CRAYS releases a checked bank package."],
  },
  investor: {
    role: "investor",
    primaryModules: modulesForRole("investor").map((module) => module.key),
    owns: ["Approved investment reporting", "Portfolio updates"],
    canWorkWith: ["Approved reports", "Investment-scoped KPIs"],
    deniedByDefault: ["Candidate private diligence", "Bank packages", "HR", "Member personal data"],
    handoffRules: ["Investor records are released reporting artifacts, not source operational records."],
  },
  landlord: {
    role: "landlord",
    primaryModules: modulesForRole("landlord").map((module) => module.key),
    owns: ["Own property submission", "Lease and fit-out coordination"],
    canWorkWith: ["Own property case", "Lease documents", "Released fit-out milestones"],
    deniedByDefault: ["Candidate KYC/AML", "Bank internal decision", "CRAYS corporate finance"],
    handoffRules: ["Landlord scope follows property records and ends outside the property or lease workflow."],
  },
  vendor: {
    role: "vendor",
    primaryModules: modulesForRole("vendor").map((module) => module.key),
    owns: ["Supplier delivery", "Service records", "Scoped project tasks"],
    canWorkWith: ["Assigned project tasks", "Own supplier documents", "Delivery status"],
    deniedByDefault: ["Candidate diligence", "Bank packages", "Member personal data", "Corporate finance"],
    handoffRules: ["Vendor scope requires assigned project, order or service record."],
  },
  reviewer: {
    role: "reviewer",
    primaryModules: modulesForRole("reviewer").map((module) => module.key),
    owns: ["Approval queues", "Compliance review", "Quality review"],
    canWorkWith: ["Review-scoped records", "Document approvals", "Policy exceptions"],
    deniedByDefault: ["Raw private key material", "Provider secrets", "Unassigned operational ownership"],
    handoffRules: ["Reviewer can approve or block, but does not become business owner of the workflow."],
  },
  "gym-member": {
    role: "gym-member",
    primaryModules: modulesForRole("gym-member").map((module) => module.key),
    owns: ["Own membership", "Own bookings", "Own support requests"],
    canWorkWith: ["Own payments", "Own training state", "Own support communication"],
    deniedByDefault: ["Internal business metrics", "Other members", "Franchise records", "Bank and partner data"],
    handoffRules: ["Member data can feed dashboards only as scoped aggregate or own-account data."],
  },
  guest: {
    role: "guest",
    primaryModules: modulesForRole("guest").map((module) => module.key),
    owns: ["Public discovery", "Access request intent"],
    canWorkWith: ["Public prepared-offer teasers", "Public proof", "Public web forms"],
    deniedByDefault: ["Deal detail", "Documents", "Bank packages", "Internal SaaS workbenches"],
    handoffRules: ["Guest becomes mapped account before seeing prepared deal detail."],
  },
};

export const accessDomainPolicies: AccessDomainPolicy[] = [
  {
    key: "candidate-deals",
    label: "Candidate Deals",
    ownerRole: "deal-manager",
    primaryModules: ["crm", "project", "files", "analytics", "loans"],
    records: ["Candidate", "Deal", "Readiness", "Communication", "Opening Handoff"],
    rules: [
      {
        action: "read_detail",
        roles: ["deal-manager", ...internalOversightRoles, "finance"],
        scopes: ["deal", "candidate", "organization"],
        requiredPermission: "deals:read",
        guardrails: ["Candidate private diligence stays inside explicit deal scope."],
      },
      {
        action: "update",
        roles: ["deal-manager", ...internalOversightRoles],
        scopes: ["deal", "candidate"],
        requiredPermission: "deals:update",
        guardrails: ["Deal state changes must create workflow and audit events."],
      },
    ],
    deniedByDefault: ["Expansion partner strategy", "Unrelated candidate records", "HR-private data"],
  },
  {
    key: "prepared-offers",
    label: "Prepared Offers",
    ownerRole: "deal-manager",
    primaryModules: ["crm", "files", "analytics", "sites"],
    records: ["Prepared Offer", "Offer Evidence", "Candidate Release State"],
    rules: [
      {
        action: "read_summary",
        roles: ["guest", "franchise-candidate", "deal-manager", "expansion-manager", ...internalOversightRoles],
        scopes: ["own", "deal", "property", "organization"],
        requiredPermission: "prepared-offers:read",
        guardrails: ["Guest access is teaser-only; detail requires mapped candidate scope."],
      },
      {
        action: "update",
        roles: ["deal-manager", ...internalOversightRoles],
        scopes: ["deal", "property"],
        requiredPermission: "prepared-offers:update",
        guardrails: ["Candidate-visible changes require reviewed evidence and release state."],
      },
    ],
    deniedByDefault: ["Unreleased bank package", "Unreviewed property owner material", "Candidate private diligence"],
  },
  {
    key: "property-cases",
    label: "Property Cases",
    ownerRole: "expansion-manager",
    primaryModules: ["crm", "project", "files", "analytics"],
    records: ["Property Case", "Owner Submission", "Lease Signal", "Location Review"],
    rules: [
      {
        action: "read_detail",
        roles: expansionPipelineRoles,
        scopes: ["property", "organization"],
        requiredPermission: "properties:read",
        guardrails: ["Expansion owns property review until an explicit prepared-offer or deal handoff exists."],
      },
      {
        action: "create",
        roles: expansionPipelineRoles,
        scopes: ["property", "organization"],
        requiredPermission: "properties:create",
        guardrails: ["Property intake stays separate from candidate private diligence."],
      },
      {
        action: "update",
        roles: expansionPipelineRoles,
        scopes: ["property", "organization"],
        requiredPermission: "properties:update",
        guardrails: ["Handoff to deal workflow requires reviewed property state."],
      },
      {
        action: "read_detail",
        roles: ["deal-manager"],
        scopes: ["property", "deal", "organization"],
        requiredPermission: "properties:read",
        requiresExplicitHandoff: true,
        guardrails: ["Deal Manager reads property detail only when linked to an active prepared offer or candidate deal."],
      },
    ],
    deniedByDefault: ["Candidate KYC/AML", "Bank package execution notes", "Franchise Partner operating finance"],
  },
  {
    key: "partner-pipeline",
    label: "Partner Pipeline",
    ownerRole: "expansion-manager",
    primaryModules: ["crm", "project", "files", "analytics"],
    records: ["Real Estate Partner", "Funding Partner", "Finance Partner", "Banking Partner", "Qualification"],
    rules: [
      {
        action: "create",
        roles: expansionPipelineRoles,
        scopes: ["partner", "organization"],
        requiredPermission: "partner-pipeline:create",
        guardrails: ["Partner acquisition records remain separate from active deal execution until handoff."],
      },
      {
        action: "update",
        roles: expansionPipelineRoles,
        scopes: ["partner", "organization"],
        requiredPermission: "partner-pipeline:update",
        guardrails: ["Partner qualification changes must be auditable."],
      },
      {
        action: "handoff",
        roles: ["expansion-manager", ...internalOversightRoles],
        scopes: ["partner", "deal", "organization"],
        requiredPermission: "partner-pipeline:update",
        guardrails: ["Handoff creates a scoped record for Deal Manager, Finance or Management."],
      },
    ],
    deniedByDefault: ["Loans execution", "Candidate private diligence", "Bank package release authority"],
  },
  {
    key: "location-evidence",
    label: "Location Evidence",
    ownerRole: "expansion-manager",
    primaryModules: ["files", "analytics", "project"],
    records: ["Location Score", "Market Evidence", "Property Fit", "Released Summary"],
    rules: [
      {
        action: "read_detail",
        roles: ["deal-manager", "expansion-manager", "finance", "bank-partner", "franchise-candidate", ...internalOversightRoles],
        scopes: ["deal", "property", "organization", "own"],
        requiredPermission: "location-intelligence:read",
        guardrails: ["Candidate and bank views receive only released evidence packages."],
      },
      {
        action: "approve",
        roles: ["deal-manager", "expansion-manager", ...internalOversightRoles],
        scopes: ["deal", "property"],
        requiredPermission: "location-intelligence:approve",
        guardrails: ["Approval defines what can appear in candidate, bank and owner surfaces."],
      },
    ],
    deniedByDefault: ["Raw unreviewed partner notes", "Unscoped candidate records"],
  },
  {
    key: "bank-packages",
    label: "Bank Packages",
    ownerRole: "deal-manager",
    primaryModules: ["loans", "files", "analytics"],
    records: ["Bank Package", "Loan Case", "KYC/AML Status", "Source Of Funds", "Conditions"],
    rules: [
      {
        action: "read_detail",
        roles: dealExecutionRoles.concat("bank-partner"),
        scopes: ["deal", "candidate", "bank-package", "loan-case", "document"],
        requiredPermission: "bank-packages:read",
        guardrails: ["Bank package access starts only after CRAYS-reviewed candidate and deal gates."],
      },
      {
        action: "create",
        roles: dealExecutionRoles,
        scopes: ["deal", "bank-package", "document"],
        requiredPermission: "bank-packages:create",
        guardrails: ["Package creation must not include unverified raw candidate data."],
      },
      {
        action: "approve",
        roles: dealExecutionRoles,
        scopes: ["deal", "bank-package", "document"],
        requiredPermission: "bank-packages:approve",
        guardrails: ["Release requires KYC/AML, equity and deal readiness checks."],
      },
    ],
    deniedByDefault: ["Expansion Manager partner acquisition view", "Guest access", "Unrelated lender records"],
  },
  {
    key: "corporate-finance",
    label: "Corporate Finance",
    ownerRole: "finance",
    primaryModules: ["erp", "analytics", "files"],
    records: ["Corporate Ledger", "Finance Export", "Payout", "Fee Basis"],
    rules: [
      {
        action: "read_detail",
        roles: ["finance", "crays-management", "admin"],
        scopes: ["global", "organization"],
        requiredPermission: "finance:read",
        guardrails: ["Deal Manager sees only deal-related summaries where explicitly scoped."],
      },
    ],
    deniedByDefault: ["Franchise Candidate", "Bank Partner unless released as covenant summary", "Deal Manager global finance"],
  },
  {
    key: "hr-private",
    label: "HR Private",
    ownerRole: "hr",
    primaryModules: ["hr", "files", "learning"],
    records: ["People Record", "Training Check", "HR Document"],
    rules: [
      {
        action: "read_detail",
        roles: ["hr", "admin", "crays-management", "reviewer"],
        scopes: ["global", "organization", "document"],
        requiredPermission: "users:read",
        guardrails: ["Other roles receive only operational readiness signals where needed."],
      },
    ],
    deniedByDefault: ["Deal Manager", "Expansion Manager", "Finance outside payroll need", "External partners"],
  },
  {
    key: "member-data",
    label: "Member Data",
    ownerRole: "studio-manager",
    primaryModules: ["operations", "support", "analytics"],
    records: ["Member Account", "Payment State", "Booking", "Support Request"],
    rules: [
      {
        action: "read_detail",
        roles: ["studio-manager", "franchise-partner", "gym-member", "admin", "crays-management"],
        scopes: ["studio", "member", "own"],
        requiredPermission: "member-data:read",
        guardrails: ["Member data is own-account or assigned-studio scoped; dashboards use aggregates where possible."],
      },
    ],
    deniedByDefault: ["Deal Manager", "Expansion Manager", "Bank Partner", "Investor", "Guest"],
  },
];

export function roleAccessProfileForRole(roleParam: string | null | undefined): RoleAccessProfile {
  const role = roleByKey(roleParam).key;
  return roleAccessProfiles[role];
}

export function accessPoliciesForRole(roleParam: string | null | undefined): AccessDomainPolicy[] {
  const role = roleByKey(roleParam).key;
  return accessDomainPolicies.filter((policy) => policy.rules.some((rule) => rule.roles.includes(role)));
}

export function evaluateAccessDomain(input: {
  role: RoleKey;
  domain: AccessDomainKey;
  action: AccessAction;
  scope: PermissionScope;
  explicitHandoff?: boolean;
}) {
  const policy = accessDomainPolicies.find((item) => item.key === input.domain);

  if (!policy) {
    return { allowed: false, reason: "Access domain is not defined." };
  }

  const rule = policy.rules.find((item) => item.action === input.action && item.roles.includes(input.role));

  if (!rule) {
    return { allowed: false, reason: "Role is not granted this domain action." };
  }

  if (!rule.scopes.includes("global") && !rule.scopes.includes(input.scope)) {
    return { allowed: false, reason: "Scope is outside the domain policy." };
  }

  if (rule.requiresExplicitHandoff && !input.explicitHandoff) {
    return { allowed: false, reason: "Explicit handoff is required before this domain action is allowed." };
  }

  return { allowed: true, reason: "Role, action and scope match the access boundary policy." };
}

export function getAccessControlContract(roleParam: string | null | undefined = null) {
  const role = roleByKey(roleParam).key;
  const roleProfile = roleAccessProfiles[role];

  return {
    status: "contract_ready",
    role,
    roleProfile,
    availableRoles: roles.map((item) => ({
      key: item.key,
      label: item.label,
      mode: item.mode,
      primaryModules: roleAccessProfiles[item.key].primaryModules,
    })),
    visibleModules: modulesForRole(role).map((module) => ({
      key: module.key,
      label: module.label,
      purpose: module.purpose,
    })),
    domainPolicies: accessPoliciesForRole(role),
    globalGuardrails: [
      "Deny by default when no role, scope or handoff rule matches.",
      "Provider login never grants product access by itself.",
      "Nostr role binding is required before protected permissions can be used.",
      "Private keys, provider secrets and tokens are never part of access contracts.",
      "Deal Manager and Expansion Manager boundaries stay separate until an explicit handoff record links the workflows.",
    ],
  };
}
