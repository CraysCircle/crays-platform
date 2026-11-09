export type RoleKey =
  | "crays-management"
  | "admin"
  | "deal-manager"
  | "expansion-manager"
  | "finance"
  | "hr"
  | "franchise-candidate"
  | "franchise-partner"
  | "studio-manager"
  | "holiday-manager"
  | "bank-partner"
  | "investor"
  | "landlord"
  | "vendor"
  | "reviewer"
  | "gym-member"
  | "guest";

export type RoleMode = "portal" | "workbench" | "member";

export type RoleDefinition = {
  key: RoleKey;
  label: string;
  mode: RoleMode;
  summary: string;
};

export const roles: RoleDefinition[] = [
  {
    key: "crays-management",
    label: "CRAYS Management",
    mode: "workbench",
    summary: "Full portfolio, risk, finance and operating oversight.",
  },
  {
    key: "admin",
    label: "Admin",
    mode: "workbench",
    summary: "Global platform administration and access control.",
  },
  {
    key: "deal-manager",
    label: "Deal Manager",
    mode: "workbench",
    summary: "Franchise candidate and franchise partner deal execution, bank package coordination and opening handoff.",
  },
  {
    key: "expansion-manager",
    label: "Expansion Manager",
    mode: "workbench",
    summary: "Real estate pipeline, property owner onboarding and funding or banking partner development.",
  },
  {
    key: "finance",
    label: "CRAYS Finance",
    mode: "workbench",
    summary: "Fees, payouts, accounting, facility and cash control.",
  },
  {
    key: "hr",
    label: "CRAYS HR",
    mode: "workbench",
    summary: "People, training and workforce readiness.",
  },
  {
    key: "franchise-candidate",
    label: "Franchise Candidate",
    mode: "portal",
    summary: "Guided buying, due diligence and bank package journey.",
  },
  {
    key: "franchise-partner",
    label: "Franchise Partner",
    mode: "workbench",
    summary: "Own studio portfolio, opening projects and operating KPIs.",
  },
  {
    key: "studio-manager",
    label: "Studio Manager",
    mode: "workbench",
    summary: "Local studio operations, tasks, classes and service queues.",
  },
  {
    key: "holiday-manager",
    label: "Holiday Manager",
    mode: "workbench",
    summary: "Authorized Property, Unit, booking, stay and hospitality operations.",
  },
  {
    key: "bank-partner",
    label: "Funding Partner Bank",
    mode: "portal",
    summary: "Credit files, conditions, drawdowns and covenant monitoring.",
  },
  {
    key: "investor",
    label: "Investor",
    mode: "portal",
    summary: "Approved reporting, performance and portfolio updates.",
  },
  {
    key: "landlord",
    label: "Landlord",
    mode: "portal",
    summary: "Property, lease, fit-out and handover coordination.",
  },
  {
    key: "vendor",
    label: "Vendor",
    mode: "portal",
    summary: "Scoped supplier, delivery, service and document work.",
  },
  {
    key: "reviewer",
    label: "Reviewer",
    mode: "workbench",
    summary: "Legal, compliance, approval and quality review queues.",
  },
  {
    key: "gym-member",
    label: "Gym Member",
    mode: "member",
    summary: "Membership, payments, bookings, training and support.",
  },
  {
    key: "guest",
    label: "Guest",
    mode: "portal",
    summary: "Public franchise discovery and access request journey.",
  },
];

export const defaultRole: RoleKey = "deal-manager";

export function roleByKey(key: string | null | undefined) {
  return roles.find((role) => role.key === key) ?? roles.find((role) => role.key === defaultRole)!;
}
