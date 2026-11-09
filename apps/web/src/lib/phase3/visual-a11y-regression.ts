export type VisualA11yRouteSpec = {
  key: string;
  label: string;
  path: string;
  role?: string;
  purpose: "public" | "workspace" | "portal" | "quality";
  requiredText: string[];
  forbiddenText: string[];
  minInteractiveTargets: number;
};

export const visualA11yRouteSpecs: VisualA11yRouteSpec[] = [
  {
    key: "portal",
    label: "Portal bridge",
    path: "/portal",
    purpose: "portal",
    requiredText: ["One temporary bridge", "Open a role directly"],
    forbiddenText: ["undefined", "[object Object]"],
    minInteractiveTargets: 12,
  },
  {
    key: "crm-home",
    label: "CRM operating database",
    path: "/crm?role=deal-manager&view=home",
    role: "deal-manager",
    purpose: "workspace",
    requiredText: ["CRM operating database", "Companies", "People", "Leads", "Opportunities"],
    forbiddenText: ["0 CRM records", "Lea Schneider"],
    minInteractiveTargets: 10,
  },
  {
    key: "crm-inbox",
    label: "CRM inbox",
    path: "/crm?role=deal-manager&view=inbox&record=emails",
    role: "deal-manager",
    purpose: "workspace",
    requiredText: ["Inbox", "Received", "Subject"],
    forbiddenText: ["Selected deal", "Deal work queue"],
    minInteractiveTargets: 8,
  },
  {
    key: "crm-calendar",
    label: "CRM calendar",
    path: "/crm?role=deal-manager&view=calendar&record=calendar-events",
    role: "deal-manager",
    purpose: "workspace",
    requiredText: ["Calendar", "Start", "Event"],
    forbiddenText: ["Selected deal", "Deal work queue"],
    minInteractiveTargets: 8,
  },
  {
    key: "project-board",
    label: "Project board",
    path: "/project?role=deal-manager&view=board",
    role: "deal-manager",
    purpose: "workspace",
    requiredText: ["Project work items", "Stage CRAYS project review"],
    forbiddenText: ["OpeningProjectWorkflowPanel", "native Plane write"],
    minInteractiveTargets: 8,
  },
  {
    key: "franchise",
    label: "Franchise landing",
    path: "/franchise",
    purpose: "public",
    requiredText: ["franchise", "CRAYS"],
    forbiddenText: ["preparedFranchiseOffers", "internal"],
    minInteractiveTargets: 2,
  },
];

export const visualA11yQualityGates = {
  screenshotsRequired: true,
  keyboardTraversalRequired: true,
  contrastCheckRequired: true,
  noDeadTabsRequired: true,
  noRepeatedWrongTabContentRequired: true,
  noConsoleErrorsRequired: true,
  maxCriticalA11yViolations: 0,
  maxBadResponses: 0,
} as const;
