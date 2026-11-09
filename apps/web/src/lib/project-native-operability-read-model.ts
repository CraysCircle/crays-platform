import type { RoleKey } from "./roles";

type ProjectAccessLevel = "internal_project_workbench" | "scoped_project_workbench" | "forbidden";

export type ProjectNativeAccess = {
  allowed: boolean;
  level: ProjectAccessLevel;
  reason: string;
};

export type ProjectStateGroup = "Backlog" | "To do" | "In progress" | "Done" | "Cancelled";

export type ProjectNativeWorkItem = {
  id: string;
  identifier: string;
  type: "Project" | "Task" | "Epic" | "Milestone" | "Bug" | "Page";
  title: string;
  description: string;
  state: ProjectStateGroup;
  priority: "Urgent" | "High" | "Medium" | "Low" | "None";
  lead: string;
  assignees: string[];
  labels: string[];
  startDate: string;
  dueDate: string;
  cycle: string;
  modules: string[];
  estimate: string;
  parent: string;
  blocking: string[];
  blockedBy: string[];
  related: string[];
  duplicateOf: string;
  links: string[];
  customFields: Array<{
    key: string;
    label: string;
    type: "text" | "select" | "multi-select" | "date" | "number" | "member";
    value: string;
  }>;
  comments: string[];
  history: string[];
};

type ProjectCycle = {
  id: string;
  name: string;
  state: "Planned" | "Active" | "Completed";
  startDate: string;
  endDate: string;
  progress: number;
  workItemIds: string[];
};

type ProjectModule = {
  id: string;
  name: string;
  state: "Backlog" | "Planned" | "In Progress" | "Paused" | "Completed" | "Cancelled";
  lead: string;
  startDate: string;
  dueDate: string;
  progress: number;
  workItemIds: string[];
};

type ProjectPage = {
  id: string;
  title: string;
  status: "Draft" | "Review" | "Published";
  owner: string;
  updatedAt: string;
  body: string;
  linkedWorkItemIds: string[];
};

type ProjectSavedView = {
  id: string;
  name: string;
  layout: "List" | "Board" | "Timeline" | "Calendar";
  groupBy: string;
  sortBy: string;
  filters: string[];
  fields: string[];
};

type ProjectTemplate = {
  id: string;
  name: string;
  type: "Work item" | "Project" | "Page";
  fields: string[];
};

type ProjectPermission = {
  role: "Workspace admin" | "Project admin" | "Member" | "Viewer" | "Guest";
  scope: string;
  canView: boolean;
  canEditLocalDrafts: boolean;
  canApproveWrites: boolean;
};

type ProjectSettingGroup = {
  key: string;
  label: string;
  items: Array<{
    key: string;
    label: string;
    enabled: boolean;
    editable: boolean;
  }>;
};

type ProjectAiCommand = {
  key: string;
  label: string;
  scope: string;
  providerCallEnabled: false;
  approvalRequired: true;
};

export type ProjectNativeOperabilityReadModel = {
  role: RoleKey;
  status: "ready" | "forbidden";
  blockRange: "Blocks 91-100" | "Blocks 461-475";
  access: ProjectNativeAccess;
  product: {
    module: "Project";
    craysNativeSurface: true;
    iframeEmbedded: false;
    visibleSourceWording: false;
    sourceFaithfulOperabilityRequired: true;
  };
  workspace: {
    id: string;
    name: string;
    projectId: string;
    projectName: string;
    identifier: string;
    visibility: "Private" | "Internal";
    lead: string;
    timezone: string;
  };
  navigation: Array<{
    key: "work-items" | "board" | "timeline" | "cycles" | "modules" | "pages" | "views" | "settings";
    label: string;
  }>;
  stateGroups: ProjectStateGroup[];
  workItemTypes: Array<{
    key: ProjectNativeWorkItem["type"];
    label: string;
    default: boolean;
    active: boolean;
    customFields: string[];
  }>;
  workItems: ProjectNativeWorkItem[];
  cycles: ProjectCycle[];
  modules: ProjectModule[];
  pages: ProjectPage[];
  savedViews: ProjectSavedView[];
  templates: ProjectTemplate[];
  permissions: ProjectPermission[];
  settingsGroups: ProjectSettingGroup[];
  aiCommands: ProjectAiCommand[];
  boundaries: {
    recordsAreCraysOwned: boolean;
    localDraftEditsEnabled: boolean;
    sourceRuntimeCallsEnabled: boolean;
    sourceWritesEnabled: boolean;
    syncWritesEnabled: boolean;
    providerCallsEnabled: boolean;
    aiProviderCallsEnabled: boolean;
    fileUploadEnabled: boolean;
    externalSendingEnabled: boolean;
    liveSourceRecordsReturned: boolean;
    secretsReturned: boolean;
    privateKeysReturned: boolean;
  };
};

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"];
const scopedRoles: RoleKey[] = ["franchise-partner", "studio-manager", "landlord", "vendor"];

const stateGroups: ProjectStateGroup[] = ["Backlog", "To do", "In progress", "Done", "Cancelled"];

const workItems: ProjectNativeWorkItem[] = [
  {
    id: "crays-project-westside",
    identifier: "OPEN-001",
    type: "Project",
    title: "Westside opening plan",
    description: "Coordinate lease, fit-out, permits, equipment, partner handoff and launch readiness.",
    state: "In progress",
    priority: "High",
    lead: "Deal Manager",
    assignees: ["Deal Manager", "Project Lead"],
    labels: ["opening", "critical-path"],
    startDate: "2026-07-10",
    dueDate: "2026-08-21",
    cycle: "Opening cycle",
    modules: ["Site readiness", "Partner handoff"],
    estimate: "21 points",
    parent: "",
    blocking: ["OPEN-117"],
    blockedBy: [],
    related: ["OPEN-C03", "OPEN-P05"],
    duplicateOf: "",
    links: ["Lease checklist", "Opening budget"],
    customFields: [
      { key: "studio", label: "Studio", type: "text", value: "Westside" },
      { key: "gate", label: "Opening gate", type: "select", value: "Build-out" },
      { key: "risk", label: "Risk level", type: "select", value: "High" },
      { key: "readiness", label: "Readiness", type: "number", value: "82" },
    ],
    comments: ["Review permit timeline before the next handoff."],
    history: ["Created from CRAYS opening seed", "Cycle assigned", "Risk field updated"],
  },
  {
    id: "crays-project-permit-review",
    identifier: "OPEN-117",
    type: "Task",
    title: "Permit blocker review",
    description: "Review the permit blocker, assign the owner and keep the critical path visible.",
    state: "To do",
    priority: "Urgent",
    lead: "Expansion Manager",
    assignees: ["Expansion Manager", "Reviewer"],
    labels: ["permit", "blocker"],
    startDate: "2026-07-10",
    dueDate: "2026-07-10",
    cycle: "Opening cycle",
    modules: ["Critical path"],
    estimate: "5 points",
    parent: "OPEN-001",
    blocking: [],
    blockedBy: ["Landlord document"],
    related: ["OPEN-118"],
    duplicateOf: "",
    links: ["Permit evidence", "Landlord thread"],
    customFields: [
      { key: "approvalOwner", label: "Approval owner", type: "member", value: "City office" },
      { key: "impact", label: "Launch impact", type: "text", value: "7 days" },
      { key: "evidence", label: "Evidence state", type: "select", value: "Requested" },
    ],
    comments: ["Keep partner-visible wording separate from internal notes."],
    history: ["Blocker linked", "Priority changed to Urgent"],
  },
  {
    id: "crays-project-equipment-stream",
    identifier: "OPEN-M02",
    type: "Epic",
    title: "Equipment delivery stream",
    description: "Group supplier delivery, installation, acceptance and dependency tasks.",
    state: "Backlog",
    priority: "Medium",
    lead: "Operations",
    assignees: ["Operations", "Project Lead"],
    labels: ["equipment", "supplier"],
    startDate: "2026-07-15",
    dueDate: "2026-08-02",
    cycle: "Build-out",
    modules: ["Supplier delivery"],
    estimate: "13 points",
    parent: "OPEN-001",
    blocking: [],
    blockedBy: ["OPEN-117"],
    related: ["OPEN-C03"],
    duplicateOf: "",
    links: ["Equipment package"],
    customFields: [
      { key: "supplier", label: "Supplier", type: "text", value: "Equipment partner" },
      { key: "delivery", label: "Delivery window", type: "date", value: "2026-07-31" },
      { key: "acceptance", label: "Acceptance state", type: "select", value: "Not started" },
    ],
    comments: ["Dates stay draft until supplier confirmation."],
    history: ["Module linked", "Dependency added"],
  },
  {
    id: "crays-project-handoff-cycle",
    identifier: "OPEN-C03",
    type: "Milestone",
    title: "Handoff readiness cycle",
    description: "Time-box final checklist, training, launch approvals and unresolved blockers.",
    state: "In progress",
    priority: "High",
    lead: "Franchise Partner",
    assignees: ["Franchise Partner", "Deal Manager"],
    labels: ["handoff", "launch"],
    startDate: "2026-07-22",
    dueDate: "2026-07-31",
    cycle: "Launch handoff",
    modules: ["Partner readiness"],
    estimate: "8 points",
    parent: "OPEN-001",
    blocking: [],
    blockedBy: [],
    related: ["OPEN-P05"],
    duplicateOf: "",
    links: ["Launch checklist", "Training path"],
    customFields: [
      { key: "training", label: "Training state", type: "select", value: "In review" },
      { key: "handoffOwner", label: "Handoff owner", type: "member", value: "Deal Manager" },
    ],
    comments: ["Partner-visible checklist excludes internal finance notes."],
    history: ["Cycle started", "Checklist linked"],
  },
  {
    id: "crays-project-opening-page",
    identifier: "OPEN-P05",
    type: "Page",
    title: "Opening playbook page",
    description: "Maintain opening playbook, decisions, scoped handoff notes and launch knowledge.",
    state: "To do",
    priority: "Low",
    lead: "Reviewer",
    assignees: ["Reviewer"],
    labels: ["page", "knowledge"],
    startDate: "2026-07-10",
    dueDate: "2026-07-24",
    cycle: "Knowledge base",
    modules: ["Documentation"],
    estimate: "3 points",
    parent: "OPEN-001",
    blocking: [],
    blockedBy: [],
    related: ["OPEN-C03"],
    duplicateOf: "",
    links: ["Launch notes", "Scope policy"],
    customFields: [
      { key: "visibility", label: "Visibility", type: "select", value: "Internal" },
      { key: "review", label: "Review state", type: "select", value: "Draft" },
      { key: "template", label: "Template", type: "text", value: "Opening playbook" },
    ],
    comments: ["Publish only after role-scope review."],
    history: ["Page draft created", "Review owner assigned"],
  },
];

const settingsGroups: ProjectSettingGroup[] = [
  {
    key: "workspace",
    label: "Workspace",
    items: [
      { key: "members", label: "Members", enabled: true, editable: true },
      { key: "roles", label: "Roles", enabled: true, editable: true },
      { key: "custom-roles", label: "Custom roles", enabled: true, editable: true },
      { key: "activity", label: "Activity", enabled: true, editable: false },
    ],
  },
  {
    key: "project",
    label: "Project",
    items: [
      { key: "states", label: "States", enabled: true, editable: true },
      { key: "labels", label: "Labels", enabled: true, editable: true },
      { key: "estimates", label: "Estimates", enabled: true, editable: true },
      { key: "work-item-types", label: "Work item types", enabled: true, editable: true },
      { key: "custom-properties", label: "Custom properties", enabled: true, editable: true },
    ],
  },
  {
    key: "delivery",
    label: "Delivery",
    items: [
      { key: "cycles", label: "Cycles", enabled: true, editable: true },
      { key: "modules", label: "Modules", enabled: true, editable: true },
      { key: "pages", label: "Pages", enabled: true, editable: true },
      { key: "views", label: "Views", enabled: true, editable: true },
      { key: "templates", label: "Templates", enabled: true, editable: true },
    ],
  },
  {
    key: "automation",
    label: "Automation",
    items: [
      { key: "workflow-rules", label: "Workflow rules", enabled: false, editable: false },
      { key: "webhooks", label: "Webhooks", enabled: false, editable: false },
      { key: "ai-use", label: "AI use", enabled: false, editable: false },
      { key: "semantic-search", label: "Semantic search", enabled: false, editable: false },
    ],
  },
];

function accessFor(role: RoleKey): ProjectNativeAccess {
  if (internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_project_workbench",
      reason: "Role can operate the CRAYS Project workbench with local draft edits.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_project_workbench",
      reason: "Role can view scoped Project work and stage local draft updates.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Project workbench requires a scoped Project role.",
  };
}

export function getProjectNativeOperabilityReadModel(role: RoleKey): ProjectNativeOperabilityReadModel {
  const access = accessFor(role);
  const allowed = access.allowed;

  return {
    role,
    status: allowed ? "ready" : "forbidden",
    blockRange: "Blocks 91-100",
    access,
    product: {
      module: "Project",
      craysNativeSurface: true,
      iframeEmbedded: false,
      visibleSourceWording: false,
      sourceFaithfulOperabilityRequired: true,
    },
    workspace: {
      id: "crays-expansion",
      name: "CRAYS Expansion",
      projectId: "westside-opening",
      projectName: "Westside opening plan",
      identifier: "OPEN",
      visibility: "Internal",
      lead: "Deal Manager",
      timezone: "Europe/Berlin",
    },
    navigation: allowed
      ? [
          { key: "work-items", label: "Work items" },
          { key: "board", label: "Board" },
          { key: "timeline", label: "Timeline" },
          { key: "cycles", label: "Cycles" },
          { key: "modules", label: "Modules" },
          { key: "pages", label: "Pages" },
          { key: "views", label: "Views" },
          { key: "settings", label: "Settings" },
        ]
      : [],
    stateGroups,
    workItemTypes: allowed
      ? [
          { key: "Task", label: "Task", default: true, active: true, customFields: ["Risk level", "Opening gate"] },
          { key: "Epic", label: "Epic", default: false, active: true, customFields: ["Launch impact", "Readiness"] },
          { key: "Bug", label: "Bug", default: false, active: true, customFields: ["Evidence state", "Impact"] },
          { key: "Milestone", label: "Milestone", default: false, active: true, customFields: ["Target date", "Owner"] },
          { key: "Page", label: "Page", default: false, active: true, customFields: ["Visibility", "Review state"] },
        ]
      : [],
    workItems: allowed ? workItems : [],
    cycles: allowed
      ? [
          { id: "opening-cycle", name: "Opening cycle", state: "Active", startDate: "2026-07-10", endDate: "2026-07-24", progress: 47, workItemIds: ["crays-project-westside", "crays-project-permit-review"] },
          { id: "build-out", name: "Build-out", state: "Planned", startDate: "2026-07-15", endDate: "2026-08-02", progress: 18, workItemIds: ["crays-project-equipment-stream"] },
          { id: "launch-handoff", name: "Launch handoff", state: "Planned", startDate: "2026-07-22", endDate: "2026-07-31", progress: 34, workItemIds: ["crays-project-handoff-cycle"] },
        ]
      : [],
    modules: allowed
      ? [
          { id: "site-readiness", name: "Site readiness", state: "In Progress", lead: "Project Lead", startDate: "2026-07-10", dueDate: "2026-08-21", progress: 58, workItemIds: ["crays-project-westside", "crays-project-permit-review"] },
          { id: "supplier-delivery", name: "Supplier delivery", state: "Planned", lead: "Operations", startDate: "2026-07-15", dueDate: "2026-08-02", progress: 22, workItemIds: ["crays-project-equipment-stream"] },
          { id: "partner-readiness", name: "Partner readiness", state: "Planned", lead: "Deal Manager", startDate: "2026-07-22", dueDate: "2026-07-31", progress: 41, workItemIds: ["crays-project-handoff-cycle"] },
        ]
      : [],
    pages: allowed
      ? [
          {
            id: "opening-playbook",
            title: "Opening playbook",
            status: "Draft",
            owner: "Reviewer",
            updatedAt: "2026-07-10",
            body: "Scope, launch gates, handoff notes, unresolved blockers and partner-visible decisions.",
            linkedWorkItemIds: ["crays-project-westside", "crays-project-opening-page"],
          },
          {
            id: "permit-notes",
            title: "Permit notes",
            status: "Review",
            owner: "Expansion Manager",
            updatedAt: "2026-07-10",
            body: "Permit evidence, owner decisions, timeline notes and blocked dependencies.",
            linkedWorkItemIds: ["crays-project-permit-review"],
          },
        ]
      : [],
    savedViews: allowed
      ? [
          { id: "critical-path", name: "Critical path", layout: "Board", groupBy: "State", sortBy: "Priority", filters: ["priority: Urgent or High", "label: critical-path"], fields: ["Identifier", "Title", "State", "Priority", "Assignees", "Due date"] },
          { id: "handoff-week", name: "Handoff week", layout: "Timeline", groupBy: "Cycle", sortBy: "Due date", filters: ["cycle: Launch handoff"], fields: ["Identifier", "Title", "Lead", "Start date", "Due date"] },
          { id: "knowledge-review", name: "Knowledge review", layout: "List", groupBy: "Type", sortBy: "Last updated", filters: ["type: Page"], fields: ["Identifier", "Title", "Owner", "Review state"] },
        ]
      : [],
    templates: allowed
      ? [
          { id: "opening-task", name: "Opening task", type: "Work item", fields: ["Title", "Description", "Assignee", "Priority", "Cycle", "Module", "Risk level"] },
          { id: "blocker-review", name: "Blocker review", type: "Work item", fields: ["Title", "Impact", "Blocked by", "Owner", "Evidence state"] },
          { id: "opening-page", name: "Opening page", type: "Page", fields: ["Summary", "Decisions", "Risks", "Next steps"] },
        ]
      : [],
    permissions: allowed
      ? [
          { role: "Workspace admin", scope: "All workspace settings and Project records", canView: true, canEditLocalDrafts: true, canApproveWrites: false },
          { role: "Project admin", scope: "Project settings, members, states, labels and templates", canView: true, canEditLocalDrafts: true, canApproveWrites: false },
          { role: "Member", scope: "Assigned and role-visible work", canView: true, canEditLocalDrafts: true, canApproveWrites: false },
          { role: "Viewer", scope: "Role-visible work", canView: true, canEditLocalDrafts: false, canApproveWrites: false },
          { role: "Guest", scope: "Explicitly shared work only", canView: true, canEditLocalDrafts: false, canApproveWrites: false },
        ]
      : [],
    settingsGroups: allowed ? settingsGroups : [],
    aiCommands: allowed
      ? [
          { key: "brief-builder", label: "Brief builder", scope: "Project, work items, cycles and pages", providerCallEnabled: false, approvalRequired: true },
          { key: "blocker-review", label: "Blocker review", scope: "Blocked and blocking work items", providerCallEnabled: false, approvalRequired: true },
          { key: "duplicate-detection", label: "Duplicate detection", scope: "Work item title, description and relations", providerCallEnabled: false, approvalRequired: true },
          { key: "project-qa", label: "Project Q&A", scope: "Role-visible Project context", providerCallEnabled: false, approvalRequired: true },
          { key: "delivery-agent", label: "Delivery agent", scope: "Assigned work only", providerCallEnabled: false, approvalRequired: true },
        ]
      : [],
    boundaries: {
      recordsAreCraysOwned: true,
      localDraftEditsEnabled: true,
      sourceRuntimeCallsEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      providerCallsEnabled: false,
      aiProviderCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      liveSourceRecordsReturned: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
