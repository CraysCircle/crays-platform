import type { RoleKey } from "./roles";

const internalControlRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedControlRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "franchise-partner", "studio-manager"];

export type ControlledDevWriteModelContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_dev_write_control" | "scoped_dev_command_shell" | "forbidden";
    reason: string;
  };
  blockRange: "Blocks 501-600";
  sourceOfTruth: "docs/CRAYS_CONTROLLED_DEV_WRITE_MODELS_BLOCKS_501_600_2026_07_10.md";
  summary: {
    commandModels: number;
    modelReady: number;
    applyReady: number;
    blockedApplyPaths: number;
    exactGateRequired: true;
  };
  commandEnvelope: {
    requiredFields: string[];
    idempotencyRequired: true;
    auditRequired: true;
    rollbackRequired: true;
    dryRunMatchesApplyPayload: true;
  };
  commandModels: Array<{
    key: string;
    module: "project" | "crm" | "files" | "erp" | "loans" | "sync";
    label: string;
    userAction: string;
    coreCommandStatus: "model_ready";
    applyStatus: "blocked_until_exact_gate";
    firstAllowedMode: "core_command_dry_run";
    targetToolApply: "disabled";
    idempotencyPolicy: string;
    validationPolicy: string;
    auditEvent: string;
    rollbackPolicy: string;
    applyGate: string;
  }>;
  gateChecklist: Array<{
    key: string;
    label: string;
    status: "ready" | "required";
  }>;
  boundaries: {
    craysCoreCommandModelsEnabled: true;
    craysCoreDryRunEnabled: true;
    craysCorePersistedCommandsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    financeWritesEnabled: false;
    bankSendsEnabled: false;
    paymentInitiationEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
    liveExternalReadsEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): ControlledDevWriteModelContract["access"] {
  if (internalControlRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_dev_write_control",
      reason: "Role can review the controlled Dev command model runway and exact apply gates.",
    };
  }

  if (scopedControlRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_dev_command_shell",
      reason: "Role can review scoped command models, dry-run policy and blocked apply gates.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Controlled Dev write model access requires internal operations, review or scoped module ownership.",
  };
}

function commandModels(): ControlledDevWriteModelContract["commandModels"] {
  return [
    {
      key: "project.work_item.create_or_update",
      module: "project",
      label: "Project work item command",
      userAction: "Create or update an opening work item from a prepared deal or operating task.",
      coreCommandStatus: "model_ready",
      applyStatus: "blocked_until_exact_gate",
      firstAllowedMode: "core_command_dry_run",
      targetToolApply: "disabled",
      idempotencyPolicy: "One command id per actor, organization, project and target work item intent.",
      validationPolicy: "Requires scoped project, title, owner role, status, priority and due-state validation.",
      auditEvent: "project.command.work_item_requested",
      rollbackPolicy: "Discard command draft or mark command superseded before any future apply.",
      applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
    },
    {
      key: "crm.activity.log_or_task",
      module: "crm",
      label: "CRM activity command",
      userAction: "Log an activity, create a follow-up task or prepare a meeting from a relationship record.",
      coreCommandStatus: "model_ready",
      applyStatus: "blocked_until_exact_gate",
      firstAllowedMode: "core_command_dry_run",
      targetToolApply: "disabled",
      idempotencyPolicy: "One command id per actor, relationship record, activity type and event time bucket.",
      validationPolicy: "Requires scoped person/company/deal reference, activity type, visibility and consent class.",
      auditEvent: "crm.command.activity_requested",
      rollbackPolicy: "Discard command draft or add a superseding activity draft before any future apply.",
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY",
    },
    {
      key: "files.package.metadata_link",
      module: "files",
      label: "Files metadata command",
      userAction: "Attach a document metadata reference to a prepared package without uploading binary content.",
      coreCommandStatus: "model_ready",
      applyStatus: "blocked_until_exact_gate",
      firstAllowedMode: "core_command_dry_run",
      targetToolApply: "disabled",
      idempotencyPolicy: "One command id per actor, package, section and document reference.",
      validationPolicy: "Requires package scope, document class, release state and evidence reference.",
      auditEvent: "files.command.metadata_link_requested",
      rollbackPolicy: "Remove or supersede metadata draft before file storage or release is enabled.",
      applyGate: "OPEN_DEV_FILES_METADATA_APPLY",
    },
    {
      key: "erp.finance_summary.stage",
      module: "erp",
      label: "ERP finance draft command",
      userAction: "Stage a finance summary draft for deal economics or opening budget review.",
      coreCommandStatus: "model_ready",
      applyStatus: "blocked_until_exact_gate",
      firstAllowedMode: "core_command_dry_run",
      targetToolApply: "disabled",
      idempotencyPolicy: "One command id per actor, deal, finance period and summary type.",
      validationPolicy: "Requires finance role scope, approved metric definitions and no payment or posting action.",
      auditEvent: "erp.command.finance_summary_requested",
      rollbackPolicy: "Discard draft or supersede the finance summary before any ledger/export apply.",
      applyGate: "OPEN_DEV_ERP_FINANCE_DRAFT_APPLY",
    },
    {
      key: "loans.bank_package.checklist",
      module: "loans",
      label: "Loans checklist command",
      userAction: "Stage a bank package readiness checklist item without bank release or send.",
      coreCommandStatus: "model_ready",
      applyStatus: "blocked_until_exact_gate",
      firstAllowedMode: "core_command_dry_run",
      targetToolApply: "disabled",
      idempotencyPolicy: "One command id per actor, bank package shell, checklist key and evidence reference.",
      validationPolicy: "Requires release-gated package scope, evidence class and lender visibility set to internal.",
      auditEvent: "loans.command.checklist_requested",
      rollbackPolicy: "Discard checklist draft or mark internal-only before any future lender release.",
      applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY",
    },
    {
      key: "sync.mapping.preview_refresh",
      module: "sync",
      label: "Sync preview command",
      userAction: "Generate a non-destructive map refresh preview from CRAYS Core to tool mapping.",
      coreCommandStatus: "model_ready",
      applyStatus: "blocked_until_exact_gate",
      firstAllowedMode: "core_command_dry_run",
      targetToolApply: "disabled",
      idempotencyPolicy: "One command id per actor, mapping family, target module and seed batch or time window.",
      validationPolicy: "Requires mapping scope, conflict class, dry-run diff and no retry/apply execution.",
      auditEvent: "sync.command.preview_refresh_requested",
      rollbackPolicy: "Discard preview result; no target state is changed in this block range.",
      applyGate: "OPEN_DEV_SYNC_PREVIEW_APPLY",
    },
  ];
}

function gateChecklist(): ControlledDevWriteModelContract["gateChecklist"] {
  return [
    { key: "command-envelope", label: "Core command envelope is defined.", status: "ready" },
    { key: "idempotency", label: "Idempotency policy is required for every command.", status: "ready" },
    { key: "role-scope", label: "Role, organization and entity scope are server-side requirements.", status: "ready" },
    { key: "audit", label: "Audit event names are defined before apply.", status: "ready" },
    { key: "rollback", label: "Rollback or supersede policy exists for every command.", status: "ready" },
    { key: "persisted-command-store", label: "Persisted command store migration and repository.", status: "required" },
    { key: "tool-apply-gate", label: "Exact tool apply gate per module/action.", status: "required" },
    { key: "sync-apply-gate", label: "Exact sync apply gate with conflict policy.", status: "required" },
  ];
}

export function getControlledDevWriteModelContract(role: RoleKey): ControlledDevWriteModelContract {
  const access = accessForRole(role);
  const models = access.allowed ? commandModels() : [];

  return {
    role,
    access,
    blockRange: "Blocks 501-600",
    sourceOfTruth: "docs/CRAYS_CONTROLLED_DEV_WRITE_MODELS_BLOCKS_501_600_2026_07_10.md",
    summary: {
      commandModels: models.length,
      modelReady: models.length,
      applyReady: 0,
      blockedApplyPaths: models.length,
      exactGateRequired: true,
    },
    commandEnvelope: {
      requiredFields: access.allowed
        ? [
            "commandKey",
            "module",
            "actorRole",
            "organizationScope",
            "entityScope",
            "idempotencyKeyPolicy",
            "validationPolicy",
            "auditPolicy",
            "rollbackPolicy",
            "dryRunPolicy",
            "applyGate",
          ]
        : [],
      idempotencyRequired: true,
      auditRequired: true,
      rollbackRequired: true,
      dryRunMatchesApplyPayload: true,
    },
    commandModels: models,
    gateChecklist: access.allowed ? gateChecklist() : [],
    boundaries: {
      craysCoreCommandModelsEnabled: true,
      craysCoreDryRunEnabled: true,
      craysCorePersistedCommandsEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      financeWritesEnabled: false,
      bankSendsEnabled: false,
      paymentInitiationEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
      liveExternalReadsEnabled: false,
      productionDeployEnabled: false,
      vpsChangingWorkEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
