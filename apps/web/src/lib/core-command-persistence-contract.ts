import type { CoreCommandPersistenceReadiness } from "@/db/core-command-persistence-readiness-repository";
import type { RoleKey } from "./roles";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "franchise-partner", "studio-manager"];

export type CoreCommandPersistenceContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_command_control" | "scoped_command_readiness" | "forbidden";
    reason: string;
  };
  blockRange: "Blocks 521-600";
  sourceOfTruth: "docs/CRAYS_CONTROLLED_DEV_WRITE_MODELS_BLOCKS_501_600_2026_07_10.md";
  productFit: {
    journeySegment: string;
    owningRoles: string[];
    consumingRoles: string[];
    coreObjects: string[];
    moduleSurfaces: string[];
    preservedFunctions: string[];
    closedGates: string[];
  };
  persistence: CoreCommandPersistenceReadiness;
  commandStore: {
    migrationId: "0006_core_command_persistence";
    tables: string[];
    readyForDraftCommands: boolean;
    readyForDryRunPreviews: boolean;
    readyForToolApply: false;
  };
  boundaries: {
    coreCommandPersistenceDefined: true;
    coreCommandPersistenceApplied: boolean;
    commandDraftWritesEnabled: false;
    commandDryRunWritesEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    financeActionsEnabled: false;
    bankActionsEnabled: false;
    releaseActionsEnabled: false;
    liveExternalReadsEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): CoreCommandPersistenceContract["access"] {
  if (internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_command_control",
      reason: "Role can review CRAYS Core command persistence, migration state and blocked apply gates.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_command_readiness",
      reason: "Role can review scoped command persistence readiness for owned work surfaces.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Core command persistence readiness requires internal control, review or scoped workbench ownership.",
  };
}

export function getCoreCommandPersistenceContract(
  role: RoleKey,
  persistence: CoreCommandPersistenceReadiness,
): CoreCommandPersistenceContract {
  const access = accessForRole(role);

  return {
    role,
    access,
    blockRange: "Blocks 521-600",
    sourceOfTruth: "docs/CRAYS_CONTROLLED_DEV_WRITE_MODELS_BLOCKS_501_600_2026_07_10.md",
    productFit: {
      journeySegment: "Prepared deal, opening handoff, evidence, finance and sync actions become accountable CRAYS Core commands before any tool apply.",
      owningRoles: ["Deal Manager", "Expansion Manager", "Finance", "Reviewer", "Admin"],
      consumingRoles: ["Project", "CRM", "Files", "ERP", "Loans", "Sync workbench users"],
      coreObjects: ["core_command_requests", "core_command_previews", "core_command_events", "core_command_apply_gate_reviews"],
      moduleSurfaces: ["Project", "CRM", "Files", "ERP", "Loans", "Sync", "Settings"],
      preservedFunctions: [
        "Project work item actions",
        "CRM activity and task actions",
        "Files package metadata actions",
        "ERP finance draft actions",
        "Loans checklist actions",
        "Sync preview actions",
      ],
      closedGates: ["Tool apply", "Sync apply", "Uploads", "External sending", "Finance actions", "Bank actions", "Releases"],
    },
    persistence,
    commandStore: {
      migrationId: "0006_core_command_persistence",
      tables: access.allowed ? [
        "core_command_requests",
        "core_command_previews",
        "core_command_events",
        "core_command_apply_gate_reviews",
      ] : [],
      readyForDraftCommands: false,
      readyForDryRunPreviews: false,
      readyForToolApply: false,
    },
    boundaries: {
      coreCommandPersistenceDefined: true,
      coreCommandPersistenceApplied: persistence.migrationApplied,
      commandDraftWritesEnabled: false,
      commandDryRunWritesEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      releaseActionsEnabled: false,
      liveExternalReadsEnabled: false,
      productionDeployEnabled: false,
      vpsChangingWorkEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
