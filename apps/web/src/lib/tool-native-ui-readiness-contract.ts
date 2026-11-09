import type { RoleKey } from "./roles";

type AccessLevel = "internal_ui_readiness" | "scoped_ui_readiness" | "forbidden";

type ToolUiModuleKey = "project" | "crm" | "files" | "erp" | "analytics" | "loans";

type ToolUiModule = {
  key: ToolUiModuleKey;
  label: string;
  blocks: string;
  toolSpecificLeftNavigation: true;
  duplicateNavigationInCanvas: false;
  permanentDetailColumn: false;
  detailDrawerCloseable: true;
  localDraftEditsEnabled: true;
  sourceWritesEnabled: false;
  providerCallsEnabled: false;
  liveAiCallsEnabled: false;
  uploadsEnabled: false;
  externalSendingEnabled: false;
};

export type ToolNativeUiReadinessContract = {
  role: RoleKey;
  status: "ready" | "forbidden";
  access: {
    allowed: boolean;
    level: AccessLevel;
    reason: string;
  };
  blockRange: "Blocks 101-120";
  completedBlocks: number;
  totalBlocks: 20;
  sourceOfTruth: "docs/CRAYS_TOOL_NATIVE_UI_RULES_AND_BLOCKS_101_120_2026_07_10.md";
  shellRule: {
    globalRailPurpose: "module_switch_only";
    wideLeftRailPurpose: "active_tool_navigation";
    mainCanvasPurpose: "active_work_surface";
    detailsSurface: "closeable_drawer_after_selection";
    duplicateToolNavigationAllowed: false;
  };
  modules: ToolUiModule[];
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
  };
  nextGate: "pause_after_block_120_user_review";
};

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance"];

const modules: ToolUiModule[] = [
  {
    key: "project",
    label: "Project",
    blocks: "Blocks 101-105",
    toolSpecificLeftNavigation: true,
    duplicateNavigationInCanvas: false,
    permanentDetailColumn: false,
    detailDrawerCloseable: true,
    localDraftEditsEnabled: true,
    sourceWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "crm",
    label: "CRM",
    blocks: "Blocks 106-111",
    toolSpecificLeftNavigation: true,
    duplicateNavigationInCanvas: false,
    permanentDetailColumn: false,
    detailDrawerCloseable: true,
    localDraftEditsEnabled: true,
    sourceWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "files",
    label: "Files",
    blocks: "Blocks 112-113",
    toolSpecificLeftNavigation: true,
    duplicateNavigationInCanvas: false,
    permanentDetailColumn: false,
    detailDrawerCloseable: true,
    localDraftEditsEnabled: true,
    sourceWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "erp",
    label: "ERP",
    blocks: "Blocks 114-115",
    toolSpecificLeftNavigation: true,
    duplicateNavigationInCanvas: false,
    permanentDetailColumn: false,
    detailDrawerCloseable: true,
    localDraftEditsEnabled: true,
    sourceWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "analytics",
    label: "Analytics",
    blocks: "Block 116",
    toolSpecificLeftNavigation: true,
    duplicateNavigationInCanvas: false,
    permanentDetailColumn: false,
    detailDrawerCloseable: true,
    localDraftEditsEnabled: true,
    sourceWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "loans",
    label: "Loans",
    blocks: "Block 117",
    toolSpecificLeftNavigation: true,
    duplicateNavigationInCanvas: false,
    permanentDetailColumn: false,
    detailDrawerCloseable: true,
    localDraftEditsEnabled: true,
    sourceWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
];

function boundaries(): ToolNativeUiReadinessContract["boundaries"] {
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
  };
}

export function getToolNativeUiReadiness(role: RoleKey): ToolNativeUiReadinessContract {
  const internal = internalRoles.includes(role);
  const scoped = scopedRoles.includes(role);
  const allowed = internal || scoped;

  return {
    role,
    status: allowed ? "ready" : "forbidden",
    access: {
      allowed,
      level: internal ? "internal_ui_readiness" : scoped ? "scoped_ui_readiness" : "forbidden",
      reason: allowed
        ? "Role can review the CRAYS tool-native UI readiness contract."
        : "Tool-native UI readiness requires an internal or scoped planning role.",
    },
    blockRange: "Blocks 101-120",
    completedBlocks: allowed ? 20 : 0,
    totalBlocks: 20,
    sourceOfTruth: "docs/CRAYS_TOOL_NATIVE_UI_RULES_AND_BLOCKS_101_120_2026_07_10.md",
    shellRule: {
      globalRailPurpose: "module_switch_only",
      wideLeftRailPurpose: "active_tool_navigation",
      mainCanvasPurpose: "active_work_surface",
      detailsSurface: "closeable_drawer_after_selection",
      duplicateToolNavigationAllowed: false,
    },
    modules: allowed ? modules : [],
    qaRequirements: allowed
      ? [
          "Build",
          "Contract verification",
          "Forbidden wording scan",
          "Desktop browser smoke",
          "Mobile browser smoke",
          "Detail drawer open and close check",
        ]
      : [],
    boundaries: boundaries(),
    nextGate: "pause_after_block_120_user_review",
  };
}
