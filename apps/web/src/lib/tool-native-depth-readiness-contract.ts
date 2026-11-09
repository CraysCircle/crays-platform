import type { RoleKey } from "./roles";

type AccessLevel = "internal_depth_readiness" | "scoped_depth_readiness" | "forbidden";
type DepthStatus = "implemented_read_only";

export type ToolNativeDepthModuleKey = "crm" | "files" | "erp" | "analytics" | "loans";

export type ToolNativeDepthArea = {
  key: string;
  label: string;
  blocks: string;
  status: DepthStatus;
  surface: string;
  localDraftOnly: true;
  sideEffectsEnabled: false;
};

export type ToolNativeDepthModule = {
  key: ToolNativeDepthModuleKey;
  label: string;
  blocks: string;
  summary: string;
  dataModel: string[];
  viewSurfaces: string[];
  governance: string[];
  areas: ToolNativeDepthArea[];
};

export type ToolNativeDepthReadinessContract = {
  role: RoleKey;
  status: "ready" | "forbidden";
  access: {
    allowed: boolean;
    level: AccessLevel;
    reason: string;
  };
  blockRange: "Blocks 121-150";
  completedBlocks: number;
  totalBlocks: 30;
  sourceOfTruth: "docs/CRAYS_TOOL_NATIVE_UI_RULES_AND_BLOCKS_101_120_2026_07_10.md";
  modules: ToolNativeDepthModule[];
  crossModuleCloseout: Array<{
    block: string;
    label: string;
    status: DepthStatus;
  }>;
  qaRequirements: string[];
  boundaries: {
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    providerCallsEnabled: false;
    liveAiCallsEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
    financeWritesEnabled: false;
    accountingExportsEnabled: false;
    bankSendsEnabled: false;
    destructiveReconciliationEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
    liveSourceRecordsReturned: false;
    liveBusinessRecordsReturned: false;
  };
  nextGate: "pause_after_block_150_user_review";
};

const implemented = "implemented_read_only" as const;
const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance"];

export const toolNativeDepthModules: ToolNativeDepthModule[] = [
  {
    key: "crm",
    label: "CRM",
    blocks: "Blocks 121-130",
    summary: "CRM native object, inbox, calendar, activity, record, pipeline, workflow, AI and settings parity as CRAYS-owned surfaces.",
    dataModel: [
      "Companies",
      "People",
      "Leads",
      "Opportunities",
      "Tasks",
      "Notes",
      "Emails",
      "Calendar events",
      "Activities",
      "Files",
      "Reports",
      "Views",
      "Record pages",
      "Workflow actions",
    ],
    viewSurfaces: [
      "Home",
      "Records table",
      "Pipeline board",
      "Inbox",
      "Calendar",
      "Activity timeline",
      "Tasks",
      "Files",
      "Reports",
      "Workflow timeline",
      "Record drawer",
      "Object settings",
    ],
    governance: ["Object permissions", "Field visibility", "Workflow approvals", "AI approval gate", "Calendar writes off", "External sending off"],
    areas: [
      { key: "crm-execution-brief", label: "Execution brief", blocks: "Block 121", status: implemented, surface: "Module-specific implementation scope", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-data-model", label: "Native data model", blocks: "Block 122", status: implemented, surface: "Objects, fields, relations, activity types and record pages", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-object-settings", label: "Object settings", blocks: "Block 123", status: implemented, surface: "Object, field, layout and permission settings", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-records-table", label: "Records table", blocks: "Block 124", status: implemented, surface: "Role-scoped object table", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-record-drawer", label: "Record drawer", blocks: "Block 125", status: implemented, surface: "Closeable editable local detail drawer", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-pipeline", label: "Pipeline UX", blocks: "Block 126", status: implemented, surface: "Opportunity board without duplicate canvas nav", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-inbox-calendar", label: "Inbox and calendar", blocks: "Block 127", status: implemented, surface: "Inbox, calendar and activity timeline controls", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-workflow", label: "Workflow UX", blocks: "Block 127", status: implemented, surface: "Workflow controls and staged events", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-ai", label: "AI UX", blocks: "Block 128", status: implemented, surface: "Approval-gated assistant controls", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-permissions", label: "Permissions and settings", blocks: "Block 129", status: implemented, surface: "Role, object and field governance", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "crm-qa", label: "CRM QA", blocks: "Block 130", status: implemented, surface: "Build, contract, vendor and browser smoke", localDraftOnly: true, sideEffectsEnabled: false },
    ],
  },
  {
    key: "files",
    label: "Files",
    blocks: "Blocks 131-134",
    summary: "Files vault, package, version and review flows as metadata-only CRAYS surfaces.",
    dataModel: ["Packages", "Metadata", "Versions", "Approvals", "Grants"],
    viewSurfaces: ["Vault table", "Package builder", "Release review", "Metadata drawer"],
    governance: ["Uploads off", "Previews off", "Public release off", "External share links off"],
    areas: [
      { key: "files-execution", label: "Files execution", blocks: "Block 131", status: implemented, surface: "Vault/package scope", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "files-data-model", label: "Files data model", blocks: "Block 132", status: implemented, surface: "Metadata, versions and package links", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "files-ux", label: "Files UX", blocks: "Block 133", status: implemented, surface: "Vault, package and review surfaces", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "files-governance", label: "Files governance", blocks: "Block 134", status: implemented, surface: "Upload, preview and release gates", localDraftOnly: true, sideEffectsEnabled: false },
    ],
  },
  {
    key: "erp",
    label: "ERP",
    blocks: "Blocks 135-138",
    summary: "ERP finance summary, invoice, budget and account review as staged read-only controls.",
    dataModel: ["Customers", "Invoices", "Budgets", "Accounts", "Cost centers"],
    viewSurfaces: ["Finance summary", "Invoice status", "Budget review", "Finance record drawer"],
    governance: ["Finance writes off", "Accounting exports off", "Bank sends off", "Approval gates visible"],
    areas: [
      { key: "erp-execution", label: "ERP execution", blocks: "Block 135", status: implemented, surface: "Finance workbench scope", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "erp-data-model", label: "ERP data model", blocks: "Block 136", status: implemented, surface: "Finance entities and policy settings", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "erp-ux", label: "ERP UX", blocks: "Block 137", status: implemented, surface: "Summary, invoice and budget surfaces", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "erp-governance", label: "ERP governance", blocks: "Block 138", status: implemented, surface: "Export and bank-send controls off", localDraftOnly: true, sideEffectsEnabled: false },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    blocks: "Blocks 139-141",
    summary: "Analytics scorecards, risk, portfolio, reports and alerts as role-scoped read-model surfaces.",
    dataModel: ["KPIs", "Reports", "Alerts", "Thresholds", "Snapshots"],
    viewSurfaces: ["Scorecards", "Risk matrix", "Portfolio board", "Report review"],
    governance: ["Metric definitions", "Visibility scopes", "Publish approval", "No provider calls"],
    areas: [
      { key: "analytics-execution", label: "Analytics execution", blocks: "Block 139", status: implemented, surface: "KPI/report scope", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "analytics-read-models", label: "Analytics read models", blocks: "Block 140", status: implemented, surface: "Scorecards, reports and alerts", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "analytics-ux", label: "Analytics UX", blocks: "Block 141", status: implemented, surface: "Dashboard views without card clutter", localDraftOnly: true, sideEffectsEnabled: false },
    ],
  },
  {
    key: "loans",
    label: "Loans",
    blocks: "Blocks 142-145",
    summary: "Loan package, case, condition and handoff review as closeable drawer-based controls.",
    dataModel: ["Packages", "Loan cases", "Conditions", "Handoff events", "Consent states"],
    viewSurfaces: ["Package readiness", "Cases", "Conditions table", "Handoff timeline"],
    governance: ["Provider calls off", "External sending off", "Regulated checks off", "Lender release off"],
    areas: [
      { key: "loans-execution", label: "Loans execution", blocks: "Block 142", status: implemented, surface: "Loan desk scope", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "loans-read-models", label: "Loans read models", blocks: "Block 143", status: implemented, surface: "Packages, cases and conditions", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "loans-ux", label: "Loans UX", blocks: "Block 144", status: implemented, surface: "Condition drawer and handoff timeline", localDraftOnly: true, sideEffectsEnabled: false },
      { key: "loans-governance", label: "Loans governance", blocks: "Block 145", status: implemented, surface: "Regulated/bank gates off", localDraftOnly: true, sideEffectsEnabled: false },
    ],
  },
];

function boundaries(): ToolNativeDepthReadinessContract["boundaries"] {
  return {
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    publicReleaseEnabled: false,
    financeWritesEnabled: false,
    accountingExportsEnabled: false,
    bankSendsEnabled: false,
    destructiveReconciliationEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
  };
}

export function getToolNativeDepthReadiness(role: RoleKey): ToolNativeDepthReadinessContract {
  const internal = internalRoles.includes(role);
  const scoped = scopedRoles.includes(role);
  const allowed = internal || scoped;

  return {
    role,
    status: allowed ? "ready" : "forbidden",
    access: {
      allowed,
      level: internal ? "internal_depth_readiness" : scoped ? "scoped_depth_readiness" : "forbidden",
      reason: allowed
        ? "Role can review Blocks 121-150 module-depth readiness."
        : "Tool-native depth readiness requires an internal or scoped planning role.",
    },
    blockRange: "Blocks 121-150",
    completedBlocks: allowed ? 30 : 0,
    totalBlocks: 30,
    sourceOfTruth: "docs/CRAYS_TOOL_NATIVE_UI_RULES_AND_BLOCKS_101_120_2026_07_10.md",
    modules: allowed ? toolNativeDepthModules : [],
    crossModuleCloseout: allowed
      ? [
          { block: "Block 146", label: "Shell audit", status: implemented },
          { block: "Block 147", label: "Local-draft audit", status: implemented },
          { block: "Block 148", label: "Contract expansion", status: implemented },
          { block: "Block 149", label: "Full QA", status: implemented },
          { block: "Block 150", label: "Handover pause", status: implemented },
        ]
      : [],
    qaRequirements: allowed
      ? ["Lint", "Build", "Contract verification", "Forbidden wording scan", "Desktop browser smoke", "Mobile browser smoke", "Drawer open/close proof"]
      : [],
    boundaries: boundaries(),
    nextGate: "pause_after_block_150_user_review",
  };
}
