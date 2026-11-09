import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "./client";

type ProjectWorkItemAction = "create" | "update" | "status_change";
type ProjectCommandActorRole = "deal-manager" | "expansion-manager" | "franchise-partner" | "studio-manager" | "reviewer" | "admin" | "crays-management";
type CrmActivityCommandType = "activity" | "task" | "calendar_event";
type CrmActivityAction = "log_activity" | "create_task" | "update_task" | "schedule_event" | "update_event";
type CrmCommandActorRole =
  | "deal-manager"
  | "expansion-manager"
  | "finance"
  | "hr"
  | "reviewer"
  | "admin"
  | "crays-management"
  | "franchise-candidate"
  | "franchise-partner"
  | "studio-manager"
  | "bank-partner"
  | "landlord"
  | "vendor";
type FilesPackageCommandType = "metadata_link" | "package_section" | "evidence_reference" | "visibility_review";
type FilesPackageAction = "link_metadata" | "update_package_section" | "attach_evidence_reference" | "request_visibility_review";
type FilesPackageActorRole = "deal-manager" | "expansion-manager" | "studio-manager" | "finance" | "reviewer" | "admin" | "crays-management" | "franchise-candidate" | "bank-partner";
type ErpFinanceCommandType = "finance_summary" | "budget_assumption";
type ErpFinanceAction = "stage_summary" | "update_budget_assumption" | "request_finance_review";
type ErpFinanceActorRole = "finance" | "deal-manager" | "reviewer" | "admin" | "crays-management" | "franchise-partner";
type LoansChecklistCommandType = "bank_package_checklist" | "loan_condition";
type LoansChecklistAction = "update_checklist" | "update_condition" | "request_bank_review";
type LoansChecklistActorRole = "finance" | "deal-manager" | "reviewer" | "admin" | "crays-management" | "bank-partner";
type SyncPreviewCommandType = "mapping_preview" | "diff_review" | "conflict_review" | "rollback_plan" | "apply_gate_request";
type SyncPreviewAction = "refresh_preview" | "classify_diff" | "classify_conflict" | "stage_rollback" | "request_apply_gate";
type SyncPreviewActorRole = "admin" | "crays-management" | "finance" | "deal-manager" | "reviewer" | "franchise-partner" | "studio-manager";
type OperationsStudioActionCommandType = "member_recovery" | "booking_follow_up" | "trainer_capacity_review" | "support_escalation" | "training_plan_update" | "studio_day_close";
type OperationsStudioAction = "stage_action" | "request_review" | "assign_owner" | "update_status";
type OperationsStudioActorRole = "studio-manager" | "franchise-partner" | "finance" | "reviewer" | "admin" | "crays-management";

export type StageProjectWorkItemCommandInput = {
  idempotencyKey: string;
  actorRole: ProjectCommandActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  workItemId?: string | null;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
  action: ProjectWorkItemAction;
  title: string;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  ownerRole?: string | null;
  notes?: string | null;
};

export type StageCoreCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "project.work_item.create_or_update";
  moduleKey: "project";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  liveCommandRecordsReturned: false;
};

export type StageCrmActivityCommandInput = {
  idempotencyKey: string;
  actorRole: CrmCommandActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  commandType: CrmActivityCommandType;
  action: CrmActivityAction;
  subject: string;
  body?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  assigneeRole?: string | null;
  companyId?: string | null;
  personId?: string | null;
  opportunityId?: string | null;
  activityId?: string | null;
  taskId?: string | null;
  calendarEventId?: string | null;
  preparedOfferId?: string | null;
  propertyCaseId?: string | null;
  dealId?: string | null;
};

export type StageCrmCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "crm.activity.log_or_task";
  moduleKey: "crm";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  externalSendingEnabled: false;
  liveCommandRecordsReturned: false;
};

export type StageFilesPackageCommandInput = {
  idempotencyKey: string;
  actorRole: FilesPackageActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  commandType: FilesPackageCommandType;
  action: FilesPackageAction;
  title: string;
  notes?: string | null;
  status?: string | null;
  sectionKey?: string | null;
  visibilityScope?: string | null;
  documentId?: string | null;
  packageId?: string | null;
  evidencePackageId?: string | null;
  evidenceRecordId?: string | null;
  preparedOfferId?: string | null;
  propertyCaseId?: string | null;
  dealId?: string | null;
  bankPackageId?: string | null;
};

export type StageFilesPackageCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "files.package.metadata_link";
  moduleKey: "files";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_FILES_PACKAGE_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  uploadEnabled: false;
  releaseActionsEnabled: false;
  liveCommandRecordsReturned: false;
};

export type StageErpFinanceCommandInput = {
  idempotencyKey: string;
  actorRole: ErpFinanceActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  commandType: ErpFinanceCommandType;
  action: ErpFinanceAction;
  title: string;
  notes?: string | null;
  status?: string | null;
  amount?: string | null;
  currency?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  financeSummaryId?: string | null;
  budgetId?: string | null;
  preparedOfferId?: string | null;
  propertyCaseId?: string | null;
  dealId?: string | null;
  bankPackageId?: string | null;
};

export type StageErpFinanceCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "erp.finance_summary.stage";
  moduleKey: "erp";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_ERP_FINANCE_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  financeActionsEnabled: false;
  bankActionsEnabled: false;
  liveCommandRecordsReturned: false;
};

export type StageLoansChecklistCommandInput = {
  idempotencyKey: string;
  actorRole: LoansChecklistActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  commandType: LoansChecklistCommandType;
  action: LoansChecklistAction;
  title: string;
  notes?: string | null;
  status?: string | null;
  checklistItemKey?: string | null;
  conditionKey?: string | null;
  bankPackageId?: string | null;
  loanCaseId?: string | null;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
};

export type StageLoansChecklistCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "loans.bank_package.checklist";
  moduleKey: "loans";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  financeActionsEnabled: false;
  bankActionsEnabled: false;
  releaseActionsEnabled: false;
  liveCommandRecordsReturned: false;
};

export type StageSyncPreviewCommandInput = {
  idempotencyKey: string;
  actorRole: SyncPreviewActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  commandType: SyncPreviewCommandType;
  action: SyncPreviewAction;
  title: string;
  notes?: string | null;
  status?: string | null;
  syncMappingId?: string | null;
  sourceModule?: string | null;
  targetModule?: string | null;
  entityTypeKey?: string | null;
  conflictClass?: string | null;
  retryClass?: string | null;
  rollbackPlan?: string | null;
};

export type StageSyncPreviewCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "sync.mapping.preview_refresh";
  moduleKey: "sync";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_SYNC_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  liveCommandRecordsReturned: false;
};

export type StageOperationsStudioActionCommandInput = {
  idempotencyKey: string;
  actorRole: OperationsStudioActorRole;
  actorAccountId?: string | null;
  organizationId?: string | null;
  commandType: OperationsStudioActionCommandType;
  action: OperationsStudioAction;
  title: string;
  notes?: string | null;
  status?: string | null;
  priority?: string | null;
  ownerRole?: string | null;
  studioId?: string | null;
  memberId?: string | null;
  bookingId?: string | null;
  trainerId?: string | null;
  supportRequestId?: string | null;
  trainingPlanId?: string | null;
};

export type StageOperationsStudioActionCommandResult = {
  created: boolean;
  commandId: string;
  commandKey: "operations.studio_action.stage";
  moduleKey: "operations";
  commandStatus: "validated" | "apply_blocked";
  validationStatus: "valid";
  targetApplyStatus: "blocked";
  applyGate: "OPEN_DEV_OPERATIONS_ACTION_APPLY";
  toolApplyEnabled: false;
  syncWritesEnabled: false;
  sourceWritesEnabled: false;
  financeActionsEnabled: false;
  externalSendingEnabled: false;
  paymentInitiationEnabled: false;
  liveCommandRecordsReturned: false;
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function nullableText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : null;
}

function actorRole(value: unknown): ProjectCommandActorRole {
  const cleaned = cleanText(value, "deal-manager");
  if (["deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "reviewer", "admin", "crays-management"].includes(cleaned)) {
    return cleaned as ProjectCommandActorRole;
  }
  return "deal-manager";
}

function action(value: unknown): ProjectWorkItemAction {
  const cleaned = cleanText(value, "create");
  if (["create", "update", "status_change"].includes(cleaned)) return cleaned as ProjectWorkItemAction;
  return "create";
}

function crmActorRole(value: unknown): CrmCommandActorRole {
  const cleaned = cleanText(value, "deal-manager");
  if (
    [
      "deal-manager",
      "expansion-manager",
      "finance",
      "hr",
      "reviewer",
      "admin",
      "crays-management",
      "franchise-candidate",
      "franchise-partner",
      "studio-manager",
      "bank-partner",
      "landlord",
      "vendor",
    ].includes(cleaned)
  ) {
    return cleaned as CrmCommandActorRole;
  }
  return "deal-manager";
}

function crmCommandType(value: unknown): CrmActivityCommandType {
  const cleaned = cleanText(value, "activity");
  if (["activity", "task", "calendar_event"].includes(cleaned)) return cleaned as CrmActivityCommandType;
  return "activity";
}

function crmAction(value: unknown, commandType: CrmActivityCommandType): CrmActivityAction {
  const fallbackByType: Record<CrmActivityCommandType, CrmActivityAction> = {
    activity: "log_activity",
    task: "create_task",
    calendar_event: "schedule_event",
  };
  const cleaned = cleanText(value, fallbackByType[commandType]);
  if (["log_activity", "create_task", "update_task", "schedule_event", "update_event"].includes(cleaned)) {
    return cleaned as CrmActivityAction;
  }
  return fallbackByType[commandType];
}

function crmEntityType(commandType: CrmActivityCommandType) {
  if (commandType === "calendar_event") return "calendar-event";
  return commandType;
}

function crmEntityId(input: StageCrmActivityCommandInput) {
  return input.activityId ?? input.taskId ?? input.calendarEventId ?? input.opportunityId ?? input.companyId ?? input.personId ?? null;
}

function filesActorRole(value: unknown): FilesPackageActorRole {
  const cleaned = cleanText(value, "deal-manager");
  if (["deal-manager", "expansion-manager", "studio-manager", "finance", "reviewer", "admin", "crays-management", "franchise-candidate", "bank-partner"].includes(cleaned)) {
    return cleaned as FilesPackageActorRole;
  }
  return "deal-manager";
}

function filesCommandType(value: unknown): FilesPackageCommandType {
  const cleaned = cleanText(value, "metadata_link");
  if (["metadata_link", "package_section", "evidence_reference", "visibility_review"].includes(cleaned)) {
    return cleaned as FilesPackageCommandType;
  }
  return "metadata_link";
}

function filesAction(value: unknown, commandType: FilesPackageCommandType): FilesPackageAction {
  const fallbackByType: Record<FilesPackageCommandType, FilesPackageAction> = {
    metadata_link: "link_metadata",
    package_section: "update_package_section",
    evidence_reference: "attach_evidence_reference",
    visibility_review: "request_visibility_review",
  };
  const cleaned = cleanText(value, fallbackByType[commandType]);
  if (["link_metadata", "update_package_section", "attach_evidence_reference", "request_visibility_review"].includes(cleaned)) {
    return cleaned as FilesPackageAction;
  }
  return fallbackByType[commandType];
}

function filesEntityType(commandType: FilesPackageCommandType) {
  if (commandType === "metadata_link") return "document";
  if (commandType === "evidence_reference") return "evidence-package";
  return "package";
}

function filesEntityId(input: StageFilesPackageCommandInput) {
  return input.documentId ?? input.packageId ?? input.evidencePackageId ?? input.evidenceRecordId ?? input.preparedOfferId ?? input.dealId ?? null;
}

function erpFinanceActorRole(value: unknown): ErpFinanceActorRole {
  const cleaned = cleanText(value, "finance");
  if (["finance", "deal-manager", "reviewer", "admin", "crays-management", "franchise-partner"].includes(cleaned)) {
    return cleaned as ErpFinanceActorRole;
  }
  return "finance";
}

function erpFinanceCommandType(value: unknown): ErpFinanceCommandType {
  const cleaned = cleanText(value, "finance_summary");
  if (["finance_summary", "budget_assumption"].includes(cleaned)) return cleaned as ErpFinanceCommandType;
  return "finance_summary";
}

function erpFinanceAction(value: unknown, commandType: ErpFinanceCommandType): ErpFinanceAction {
  const fallbackByType: Record<ErpFinanceCommandType, ErpFinanceAction> = {
    finance_summary: "stage_summary",
    budget_assumption: "update_budget_assumption",
  };
  const cleaned = cleanText(value, fallbackByType[commandType]);
  if (["stage_summary", "update_budget_assumption", "request_finance_review"].includes(cleaned)) {
    return cleaned as ErpFinanceAction;
  }
  return fallbackByType[commandType];
}

function erpFinanceEntityType(commandType: ErpFinanceCommandType) {
  return commandType === "budget_assumption" ? "budget" : "finance-summary";
}

function erpFinanceEntityId(input: StageErpFinanceCommandInput) {
  return input.financeSummaryId ?? input.budgetId ?? input.preparedOfferId ?? input.dealId ?? input.bankPackageId ?? null;
}

function loansActorRole(value: unknown): LoansChecklistActorRole {
  const cleaned = cleanText(value, "finance");
  if (["finance", "deal-manager", "reviewer", "admin", "crays-management", "bank-partner"].includes(cleaned)) {
    return cleaned as LoansChecklistActorRole;
  }
  return "finance";
}

function loansCommandType(value: unknown): LoansChecklistCommandType {
  const cleaned = cleanText(value, "bank_package_checklist");
  if (["bank_package_checklist", "loan_condition"].includes(cleaned)) return cleaned as LoansChecklistCommandType;
  return "bank_package_checklist";
}

function loansAction(value: unknown, commandType: LoansChecklistCommandType): LoansChecklistAction {
  const fallbackByType: Record<LoansChecklistCommandType, LoansChecklistAction> = {
    bank_package_checklist: "update_checklist",
    loan_condition: "update_condition",
  };
  const cleaned = cleanText(value, fallbackByType[commandType]);
  if (["update_checklist", "update_condition", "request_bank_review"].includes(cleaned)) {
    return cleaned as LoansChecklistAction;
  }
  return fallbackByType[commandType];
}

function loansEntityType(commandType: LoansChecklistCommandType) {
  return commandType === "loan_condition" ? "loan-case" : "bank-package";
}

function loansEntityId(input: StageLoansChecklistCommandInput) {
  return input.bankPackageId ?? input.loanCaseId ?? input.preparedOfferId ?? input.dealId ?? null;
}

function syncActorRole(value: unknown): SyncPreviewActorRole {
  const cleaned = cleanText(value, "admin");
  if (["admin", "crays-management", "finance", "deal-manager", "reviewer", "franchise-partner", "studio-manager"].includes(cleaned)) {
    return cleaned as SyncPreviewActorRole;
  }
  return "admin";
}

function syncCommandType(value: unknown): SyncPreviewCommandType {
  const cleaned = cleanText(value, "mapping_preview");
  if (["mapping_preview", "diff_review", "conflict_review", "rollback_plan", "apply_gate_request"].includes(cleaned)) {
    return cleaned as SyncPreviewCommandType;
  }
  return "mapping_preview";
}

function syncAction(value: unknown, commandType: SyncPreviewCommandType): SyncPreviewAction {
  const fallbackByType: Record<SyncPreviewCommandType, SyncPreviewAction> = {
    mapping_preview: "refresh_preview",
    diff_review: "classify_diff",
    conflict_review: "classify_conflict",
    rollback_plan: "stage_rollback",
    apply_gate_request: "request_apply_gate",
  };
  const cleaned = cleanText(value, fallbackByType[commandType]);
  if (["refresh_preview", "classify_diff", "classify_conflict", "stage_rollback", "request_apply_gate"].includes(cleaned)) {
    return cleaned as SyncPreviewAction;
  }
  return fallbackByType[commandType];
}

function syncEntityId(input: StageSyncPreviewCommandInput) {
  return input.syncMappingId ?? input.entityTypeKey ?? `${input.sourceModule ?? "source"}:${input.targetModule ?? "target"}`;
}

function operationsActorRole(value: unknown): OperationsStudioActorRole {
  const cleaned = cleanText(value, "studio-manager");
  if (["studio-manager", "franchise-partner", "finance", "reviewer", "admin", "crays-management"].includes(cleaned)) {
    return cleaned as OperationsStudioActorRole;
  }
  return "studio-manager";
}

function operationsCommandType(value: unknown): OperationsStudioActionCommandType {
  const cleaned = cleanText(value, "member_recovery");
  if (["member_recovery", "booking_follow_up", "trainer_capacity_review", "support_escalation", "training_plan_update", "studio_day_close"].includes(cleaned)) {
    return cleaned as OperationsStudioActionCommandType;
  }
  return "member_recovery";
}

function operationsAction(value: unknown): OperationsStudioAction {
  const cleaned = cleanText(value, "stage_action");
  if (["stage_action", "request_review", "assign_owner", "update_status"].includes(cleaned)) return cleaned as OperationsStudioAction;
  return "stage_action";
}

function operationsEntityType(commandType: OperationsStudioActionCommandType) {
  if (commandType === "booking_follow_up" || commandType === "training_plan_update") return "training";
  if (commandType === "trainer_capacity_review") return "employee";
  if (commandType === "support_escalation") return "support-ticket";
  if (commandType === "studio_day_close") return "studio";
  return "member";
}

function operationsEntityId(input: StageOperationsStudioActionCommandInput) {
  return input.memberId ?? input.bookingId ?? input.trainerId ?? input.supportRequestId ?? input.trainingPlanId ?? input.studioId ?? null;
}

function stableCommandId(commandKey: string, idempotencyKey: string) {
  const hash = createHash("sha256").update(`${commandKey}:${idempotencyKey}`).digest("hex").slice(0, 24);
  return `core_cmd_${hash}`;
}

export function parseProjectWorkItemCommandInput(body: unknown): StageProjectWorkItemCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const title = cleanText(input.title);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    idempotencyKey,
    actorRole: actorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    projectId: nullableText(input.projectId),
    workItemId: nullableText(input.workItemId),
    preparedOfferId: nullableText(input.preparedOfferId),
    dealId: nullableText(input.dealId),
    propertyCaseId: nullableText(input.propertyCaseId),
    action: action(input.action),
    title,
    status: nullableText(input.status),
    priority: nullableText(input.priority),
    dueDate: nullableText(input.dueDate),
    ownerRole: nullableText(input.ownerRole),
    notes: nullableText(input.notes),
  };
}

export function parseCrmActivityCommandInput(body: unknown): StageCrmActivityCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const subject = cleanText(input.subject);
  const commandType = crmCommandType(input.commandType);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!subject) {
    throw new Error("subject is required.");
  }

  return {
    idempotencyKey,
    actorRole: crmActorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    commandType,
    action: crmAction(input.action, commandType),
    subject,
    body: nullableText(input.body),
    status: nullableText(input.status),
    priority: nullableText(input.priority),
    dueDate: nullableText(input.dueDate),
    startAt: nullableText(input.startAt),
    endAt: nullableText(input.endAt),
    assigneeRole: nullableText(input.assigneeRole),
    companyId: nullableText(input.companyId),
    personId: nullableText(input.personId),
    opportunityId: nullableText(input.opportunityId),
    activityId: nullableText(input.activityId),
    taskId: nullableText(input.taskId),
    calendarEventId: nullableText(input.calendarEventId),
    preparedOfferId: nullableText(input.preparedOfferId),
    propertyCaseId: nullableText(input.propertyCaseId),
    dealId: nullableText(input.dealId),
  };
}

export function parseFilesPackageCommandInput(body: unknown): StageFilesPackageCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const title = cleanText(input.title);
  const commandType = filesCommandType(input.commandType);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    idempotencyKey,
    actorRole: filesActorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    commandType,
    action: filesAction(input.action, commandType),
    title,
    notes: nullableText(input.notes),
    status: nullableText(input.status),
    sectionKey: nullableText(input.sectionKey),
    visibilityScope: nullableText(input.visibilityScope),
    documentId: nullableText(input.documentId),
    packageId: nullableText(input.packageId),
    evidencePackageId: nullableText(input.evidencePackageId),
    evidenceRecordId: nullableText(input.evidenceRecordId),
    preparedOfferId: nullableText(input.preparedOfferId),
    propertyCaseId: nullableText(input.propertyCaseId),
    dealId: nullableText(input.dealId),
    bankPackageId: nullableText(input.bankPackageId),
  };
}

export function parseErpFinanceCommandInput(body: unknown): StageErpFinanceCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const title = cleanText(input.title);
  const commandType = erpFinanceCommandType(input.commandType);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    idempotencyKey,
    actorRole: erpFinanceActorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    commandType,
    action: erpFinanceAction(input.action, commandType),
    title,
    notes: nullableText(input.notes),
    status: nullableText(input.status),
    amount: nullableText(input.amount),
    currency: nullableText(input.currency),
    periodStart: nullableText(input.periodStart),
    periodEnd: nullableText(input.periodEnd),
    financeSummaryId: nullableText(input.financeSummaryId),
    budgetId: nullableText(input.budgetId),
    preparedOfferId: nullableText(input.preparedOfferId),
    propertyCaseId: nullableText(input.propertyCaseId),
    dealId: nullableText(input.dealId),
    bankPackageId: nullableText(input.bankPackageId),
  };
}

export function parseLoansChecklistCommandInput(body: unknown): StageLoansChecklistCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const title = cleanText(input.title);
  const commandType = loansCommandType(input.commandType);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    idempotencyKey,
    actorRole: loansActorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    commandType,
    action: loansAction(input.action, commandType),
    title,
    notes: nullableText(input.notes),
    status: nullableText(input.status),
    checklistItemKey: nullableText(input.checklistItemKey),
    conditionKey: nullableText(input.conditionKey),
    bankPackageId: nullableText(input.bankPackageId),
    loanCaseId: nullableText(input.loanCaseId),
    preparedOfferId: nullableText(input.preparedOfferId),
    dealId: nullableText(input.dealId),
    propertyCaseId: nullableText(input.propertyCaseId),
  };
}

export function parseSyncPreviewCommandInput(body: unknown): StageSyncPreviewCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const title = cleanText(input.title);
  const commandType = syncCommandType(input.commandType);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    idempotencyKey,
    actorRole: syncActorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    commandType,
    action: syncAction(input.action, commandType),
    title,
    notes: nullableText(input.notes),
    status: nullableText(input.status),
    syncMappingId: nullableText(input.syncMappingId),
    sourceModule: nullableText(input.sourceModule),
    targetModule: nullableText(input.targetModule),
    entityTypeKey: nullableText(input.entityTypeKey),
    conflictClass: nullableText(input.conflictClass),
    retryClass: nullableText(input.retryClass),
    rollbackPlan: nullableText(input.rollbackPlan),
  };
}

export function parseOperationsStudioActionCommandInput(body: unknown): StageOperationsStudioActionCommandInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const idempotencyKey = cleanText(input.idempotencyKey);
  const title = cleanText(input.title);
  const commandType = operationsCommandType(input.commandType);

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  return {
    idempotencyKey,
    actorRole: operationsActorRole(input.actorRole),
    actorAccountId: nullableText(input.actorAccountId),
    organizationId: nullableText(input.organizationId),
    commandType,
    action: operationsAction(input.action),
    title,
    notes: nullableText(input.notes),
    status: nullableText(input.status),
    priority: nullableText(input.priority),
    ownerRole: nullableText(input.ownerRole),
    studioId: nullableText(input.studioId),
    memberId: nullableText(input.memberId),
    bookingId: nullableText(input.bookingId),
    trainerId: nullableText(input.trainerId),
    supportRequestId: nullableText(input.supportRequestId),
    trainingPlanId: nullableText(input.trainingPlanId),
  };
}

async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role', 'core_service', true)");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureOperationsCommandScope(client: PoolClient) {
  await client.query(`
    alter table crays_core.core_command_requests
      drop constraint if exists core_command_requests_key_check,
      add constraint core_command_requests_key_check
      check (command_key in ('project.work_item.create_or_update', 'crm.activity.log_or_task', 'files.package.metadata_link', 'erp.finance_summary.stage', 'loans.bank_package.checklist', 'sync.mapping.preview_refresh', 'operations.studio_action.stage'))
  `);
  await client.query(`
    alter table crays_core.core_command_requests
      drop constraint if exists core_command_requests_module_check,
      add constraint core_command_requests_module_check
      check (module_key in ('project', 'crm', 'files', 'erp', 'loans', 'sync', 'operations'))
  `);
  await client.query(`
    alter table crays_core.core_command_requests
      drop constraint if exists core_command_requests_entity_type_check,
      add constraint core_command_requests_entity_type_check
      check (entity_type in ('project', 'work-item', 'company', 'person', 'opportunity', 'activity', 'task', 'calendar-event', 'document', 'package', 'prepared-offer', 'deal', 'property', 'property-case', 'bank-package', 'loan-case', 'sync-mapping', 'finance-summary', 'budget', 'evidence-package', 'opening-project', 'studio', 'member', 'training', 'employee', 'support-ticket'))
  `);
}

export async function stageProjectWorkItemCommand(input: StageProjectWorkItemCommandInput): Promise<StageCoreCommandResult> {
  const commandKey = "project.work_item.create_or_update" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    projectId: input.projectId,
    workItemId: input.workItemId,
    preparedOfferId: input.preparedOfferId,
    dealId: input.dealId,
    propertyCaseId: input.propertyCaseId,
    action: input.action,
  };
  const inputPayload = {
    action: input.action,
    title: input.title,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    ownerRole: input.ownerRole,
    notes: input.notes,
  };

  return withTransaction(async (client) => {
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'project', $3, $4, $5, $6::jsonb, 'work-item', $7, $8::jsonb, $9,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_PROJECT_WORK_ITEM_APPLY', 'closed',
          $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        input.workItemId ?? input.projectId ?? null,
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "title"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_tool_apply" }),
        JSON.stringify({ eventName: "project.command.work_item_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({ commandKey, moduleKey: "project", applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY" }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "project",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}

export async function stageCrmActivityCommand(input: StageCrmActivityCommandInput): Promise<StageCrmCommandResult> {
  const commandKey = "crm.activity.log_or_task" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    commandType: input.commandType,
    activityId: input.activityId,
    taskId: input.taskId,
    calendarEventId: input.calendarEventId,
    companyId: input.companyId,
    personId: input.personId,
    opportunityId: input.opportunityId,
    preparedOfferId: input.preparedOfferId,
    propertyCaseId: input.propertyCaseId,
    dealId: input.dealId,
    action: input.action,
  };
  const inputPayload = {
    commandType: input.commandType,
    action: input.action,
    subject: input.subject,
    body: input.body,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    startAt: input.startAt,
    endAt: input.endAt,
    assigneeRole: input.assigneeRole,
  };

  return withTransaction(async (client) => {
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'crm', $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_CRM_ACTIVITY_APPLY', 'closed',
          $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        crmEntityType(input.commandType),
        crmEntityId(input),
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "commandType", "subject"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_crm_apply_or_external_send" }),
        JSON.stringify({ eventName: "crm.command.activity_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({ commandKey, moduleKey: "crm", applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY", externalSendingEnabled: false }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "crm",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      externalSendingEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}

export async function stageFilesPackageCommand(input: StageFilesPackageCommandInput): Promise<StageFilesPackageCommandResult> {
  const commandKey = "files.package.metadata_link" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    commandType: input.commandType,
    documentId: input.documentId,
    packageId: input.packageId,
    evidencePackageId: input.evidencePackageId,
    evidenceRecordId: input.evidenceRecordId,
    preparedOfferId: input.preparedOfferId,
    propertyCaseId: input.propertyCaseId,
    dealId: input.dealId,
    bankPackageId: input.bankPackageId,
    action: input.action,
  };
  const inputPayload = {
    commandType: input.commandType,
    action: input.action,
    title: input.title,
    notes: input.notes,
    status: input.status,
    sectionKey: input.sectionKey,
    visibilityScope: input.visibilityScope,
  };

  return withTransaction(async (client) => {
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'files', $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_FILES_PACKAGE_APPLY', 'closed',
          $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        filesEntityType(input.commandType),
        filesEntityId(input),
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "commandType", "title"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_files_apply_upload_or_release" }),
        JSON.stringify({ eventName: "files.command.package_metadata_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({ commandKey, moduleKey: "files", applyGate: "OPEN_DEV_FILES_PACKAGE_APPLY", uploadEnabled: false, releaseActionsEnabled: false }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "files",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_FILES_PACKAGE_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      uploadEnabled: false,
      releaseActionsEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}

export async function stageErpFinanceCommand(input: StageErpFinanceCommandInput): Promise<StageErpFinanceCommandResult> {
  const commandKey = "erp.finance_summary.stage" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    commandType: input.commandType,
    financeSummaryId: input.financeSummaryId,
    budgetId: input.budgetId,
    preparedOfferId: input.preparedOfferId,
    propertyCaseId: input.propertyCaseId,
    dealId: input.dealId,
    bankPackageId: input.bankPackageId,
    action: input.action,
  };
  const inputPayload = {
    commandType: input.commandType,
    action: input.action,
    title: input.title,
    notes: input.notes,
    status: input.status,
    amount: input.amount,
    currency: input.currency,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };

  return withTransaction(async (client) => {
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'erp', $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_ERP_FINANCE_APPLY', 'closed',
          $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        erpFinanceEntityType(input.commandType),
        erpFinanceEntityId(input),
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "commandType", "title"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_finance_write_or_accounting_export" }),
        JSON.stringify({ eventName: "erp.command.finance_summary_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({ commandKey, moduleKey: "erp", applyGate: "OPEN_DEV_ERP_FINANCE_APPLY", financeActionsEnabled: false }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "erp",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_ERP_FINANCE_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}

export async function stageLoansChecklistCommand(input: StageLoansChecklistCommandInput): Promise<StageLoansChecklistCommandResult> {
  const commandKey = "loans.bank_package.checklist" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    commandType: input.commandType,
    bankPackageId: input.bankPackageId,
    loanCaseId: input.loanCaseId,
    preparedOfferId: input.preparedOfferId,
    dealId: input.dealId,
    propertyCaseId: input.propertyCaseId,
    action: input.action,
  };
  const inputPayload = {
    commandType: input.commandType,
    action: input.action,
    title: input.title,
    notes: input.notes,
    status: input.status,
    checklistItemKey: input.checklistItemKey,
    conditionKey: input.conditionKey,
  };

  return withTransaction(async (client) => {
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'loans', $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_LOANS_CHECKLIST_APPLY', 'closed',
          $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        loansEntityType(input.commandType),
        loansEntityId(input),
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "commandType", "title"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_bank_send_payment_or_lender_release" }),
        JSON.stringify({ eventName: "loans.command.bank_checklist_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({ commandKey, moduleKey: "loans", applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY", bankActionsEnabled: false, releaseActionsEnabled: false }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "loans",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      releaseActionsEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}

export async function stageSyncPreviewCommand(input: StageSyncPreviewCommandInput): Promise<StageSyncPreviewCommandResult> {
  const commandKey = "sync.mapping.preview_refresh" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    commandType: input.commandType,
    syncMappingId: input.syncMappingId,
    sourceModule: input.sourceModule,
    targetModule: input.targetModule,
    entityTypeKey: input.entityTypeKey,
    conflictClass: input.conflictClass,
    retryClass: input.retryClass,
    action: input.action,
  };
  const inputPayload = {
    commandType: input.commandType,
    action: input.action,
    title: input.title,
    notes: input.notes,
    status: input.status,
    conflictClass: input.conflictClass,
    retryClass: input.retryClass,
    rollbackPlan: input.rollbackPlan,
  };

  return withTransaction(async (client) => {
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'sync', $3, $4, $5, $6::jsonb, 'sync-mapping', $7, $8::jsonb, $9,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_SYNC_APPLY', 'closed',
          $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        syncEntityId(input),
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "commandType", "title"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_sync_apply" }),
        JSON.stringify({ eventName: "sync.command.preview_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({ commandKey, moduleKey: "sync", applyGate: "OPEN_DEV_SYNC_APPLY", syncWritesEnabled: false }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "sync",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_SYNC_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}

export async function stageOperationsStudioActionCommand(input: StageOperationsStudioActionCommandInput): Promise<StageOperationsStudioActionCommandResult> {
  const commandKey = "operations.studio_action.stage" as const;
  const commandId = stableCommandId(commandKey, input.idempotencyKey);
  const eventId = `core_cmd_event_${randomUUID()}`;
  const entityScope = {
    commandType: input.commandType,
    studioId: input.studioId,
    memberId: input.memberId,
    bookingId: input.bookingId,
    trainerId: input.trainerId,
    supportRequestId: input.supportRequestId,
    trainingPlanId: input.trainingPlanId,
    action: input.action,
  };
  const inputPayload = {
    commandType: input.commandType,
    action: input.action,
    title: input.title,
    notes: input.notes,
    status: input.status,
    priority: input.priority,
    ownerRole: input.ownerRole,
  };

  return withTransaction(async (client) => {
    await ensureOperationsCommandScope(client);
    const insertResult = await client.query<{ command_id: string }>(
      `
        insert into crays_core.core_command_requests (
          command_id,
          command_key,
          module_key,
          actor_account_id,
          actor_role,
          organization_id,
          organization_scope,
          entity_type,
          entity_id,
          entity_scope,
          idempotency_key,
          command_status,
          validation_status,
          dry_run_status,
          target_apply_status,
          apply_gate,
          apply_gate_status,
          input_payload,
          validation_summary,
          rollback_summary,
          audit_summary
        )
        values (
          $1, $2, 'operations', $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10,
          'validated', 'valid', 'not_requested', 'blocked', 'OPEN_DEV_OPERATIONS_ACTION_APPLY', 'closed',
          $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
        )
        on conflict (command_key, idempotency_key) do nothing
        returning command_id
      `,
      [
        commandId,
        commandKey,
        input.actorAccountId ?? null,
        input.actorRole,
        input.organizationId ?? null,
        JSON.stringify({ organizationId: input.organizationId ?? null }),
        operationsEntityType(input.commandType),
        operationsEntityId(input),
        JSON.stringify(entityScope),
        input.idempotencyKey,
        JSON.stringify(inputPayload),
        JSON.stringify({ result: "valid", requiredFields: ["idempotencyKey", "actorRole", "commandType", "title"] }),
        JSON.stringify({ policy: "supersede_or_cancel_before_operations_apply_payment_or_external_send" }),
        JSON.stringify({ eventName: "operations.command.studio_action_requested", retention: "dev_command_audit" }),
      ],
    );

    const created = insertResult.rowCount === 1;
    const resolvedCommandId =
      insertResult.rows[0]?.command_id ??
      (
        await client.query<{ command_id: string }>(
          `
            select command_id
            from crays_core.core_command_requests
            where command_key = $1
              and idempotency_key = $2
            limit 1
          `,
          [commandKey, input.idempotencyKey],
        )
      ).rows[0]?.command_id;

    if (!resolvedCommandId) {
      throw new Error("Core command request could not be staged.");
    }

    if (created) {
      await client.query(
        `
          insert into crays_core.core_command_events (
            event_id, command_id, event_type, event_status, actor_account_id, actor_role, payload_summary
          )
          values ($1, $2, 'command.drafted', 'recorded', $3, $4, $5::jsonb)
        `,
        [
          eventId,
          resolvedCommandId,
          input.actorAccountId ?? null,
          input.actorRole,
          JSON.stringify({
            commandKey,
            moduleKey: "operations",
            applyGate: "OPEN_DEV_OPERATIONS_ACTION_APPLY",
            externalSendingEnabled: false,
            financeActionsEnabled: false,
          }),
        ],
      );
    }

    return {
      created,
      commandId: resolvedCommandId,
      commandKey,
      moduleKey: "operations",
      commandStatus: "validated",
      validationStatus: "valid",
      targetApplyStatus: "blocked",
      applyGate: "OPEN_DEV_OPERATIONS_ACTION_APPLY",
      toolApplyEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      financeActionsEnabled: false,
      externalSendingEnabled: false,
      paymentInitiationEnabled: false,
      liveCommandRecordsReturned: false,
    };
  });
}
