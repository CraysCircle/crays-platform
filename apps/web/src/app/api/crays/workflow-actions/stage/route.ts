import {
  stageErpFinanceCommand,
  stageFilesPackageCommand,
  stageLoansChecklistCommand,
  stageProjectWorkItemCommand,
  type StageErpFinanceCommandInput,
  type StageFilesPackageCommandInput,
  type StageLoansChecklistCommandInput,
  type StageProjectWorkItemCommandInput,
} from "@/db/core-command-write-repository";
import { getCaseWorkspaceReadModel } from "@/db/case-workspace-read-model-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";
import {
  buildWorkflowActionRegistryReadModel,
  getWorkflowActionSpec,
  workflowActionIdempotencyKey,
  type WorkflowActionReadModelItem,
} from "@/lib/workflow-action-registry";
import { type RoleKey } from "@/lib/roles";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function commandNotes(action: WorkflowActionReadModelItem, title: string) {
  return [
    `${action.label} staged from Workflow Action Registry for ${title}.`,
    `Preflight: ${action.preflightSummary}`,
    `Audit: ${action.auditEvent}`,
    `Rollback: ${action.rollbackNote}`,
    `Closed gates: ${action.closedGates.join(", ")}`,
  ].join(" ");
}

function projectInput(action: WorkflowActionReadModelItem, role: RoleKey, caseRecord: NonNullable<ReturnType<typeof buildWorkflowActionRegistryReadModel>["case"]>): StageProjectWorkItemCommandInput {
  return {
    idempotencyKey: workflowActionIdempotencyKey(action.key, caseRecord.preparedOfferId, role),
    actorRole: role as StageProjectWorkItemCommandInput["actorRole"],
    preparedOfferId: caseRecord.preparedOfferId,
    dealId: caseRecord.dealId,
    propertyCaseId: caseRecord.propertyCaseId,
    action: "update",
    title: action.nextAction || action.label,
    status: "drafted",
    priority: action.preflightStatus === "attention" ? "urgent" : "high",
    ownerRole: role,
    notes: commandNotes(action, caseRecord.title),
  };
}

function filesInput(action: WorkflowActionReadModelItem, role: RoleKey, caseRecord: NonNullable<ReturnType<typeof buildWorkflowActionRegistryReadModel>["case"]>): StageFilesPackageCommandInput {
  return {
    idempotencyKey: workflowActionIdempotencyKey(action.key, caseRecord.preparedOfferId, role),
    actorRole: role as StageFilesPackageCommandInput["actorRole"],
    preparedOfferId: caseRecord.preparedOfferId,
    dealId: caseRecord.dealId,
    propertyCaseId: caseRecord.propertyCaseId,
    commandType: "visibility_review",
    action: "request_visibility_review",
    title: action.label,
    notes: commandNotes(action, caseRecord.title),
    status: "drafted",
    sectionKey: action.key,
    visibilityScope: "internal_preflight",
  };
}

function erpInput(action: WorkflowActionReadModelItem, role: RoleKey, caseRecord: NonNullable<ReturnType<typeof buildWorkflowActionRegistryReadModel>["case"]>): StageErpFinanceCommandInput {
  return {
    idempotencyKey: workflowActionIdempotencyKey(action.key, caseRecord.preparedOfferId, role),
    actorRole: role as StageErpFinanceCommandInput["actorRole"],
    preparedOfferId: caseRecord.preparedOfferId,
    dealId: caseRecord.dealId,
    propertyCaseId: caseRecord.propertyCaseId,
    commandType: "finance_summary",
    action: "request_finance_review",
    title: action.label,
    notes: commandNotes(action, caseRecord.title),
    status: "drafted",
    currency: "EUR",
  };
}

function loansInput(action: WorkflowActionReadModelItem, role: RoleKey, caseRecord: NonNullable<ReturnType<typeof buildWorkflowActionRegistryReadModel>["case"]>): StageLoansChecklistCommandInput {
  return {
    idempotencyKey: workflowActionIdempotencyKey(action.key, caseRecord.preparedOfferId, role),
    actorRole: role as StageLoansChecklistCommandInput["actorRole"],
    preparedOfferId: caseRecord.preparedOfferId,
    dealId: caseRecord.dealId,
    propertyCaseId: caseRecord.propertyCaseId,
    commandType: "bank_package_checklist",
    action: "request_bank_review",
    title: action.label,
    notes: commandNotes(action, caseRecord.title),
    status: "drafted",
    checklistItemKey: action.key,
  };
}

async function stageAction(action: WorkflowActionReadModelItem, role: RoleKey, caseRecord: NonNullable<ReturnType<typeof buildWorkflowActionRegistryReadModel>["case"]>) {
  if (action.commandKind === "files-package") return stageFilesPackageCommand(filesInput(action, role, caseRecord));
  if (action.commandKind === "erp-finance") return stageErpFinanceCommand(erpInput(action, role, caseRecord));
  if (action.commandKind === "loans-checklist") return stageLoansChecklistCommand(loansInput(action, role, caseRecord));
  return stageProjectWorkItemCommand(projectInput(action, role, caseRecord));
}

export async function POST(request: Request) {
  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-workflow-action-command");
  if (!guard.allowed) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const spec = getWorkflowActionSpec(cleanText(body.actionKey));
    if (!spec) {
      return Response.json({ status: "invalid", error: "Unknown workflow action.", secretsReturned: false, privateKeysReturned: false }, { status: 400 });
    }

    const workspace = await getCaseWorkspaceReadModel({
      role,
      preparedOfferId: cleanText(body.preparedOfferId ?? body.caseId ?? body.case),
      dealId: cleanText(body.dealId ?? body.deal) || null,
      propertyCaseId: cleanText(body.propertyCaseId ?? body.propertyCase) || null,
    });
    const registry = buildWorkflowActionRegistryReadModel(workspace, role);

    if (!registry.access.allowed) {
      return Response.json({ status: "forbidden", error: "Workflow action registry is not available to this role.", secretsReturned: false, privateKeysReturned: false }, { status: 403 });
    }

    if (!registry.case) {
      return Response.json({ status: "not_found", error: "No case is loaded for workflow action staging.", secretsReturned: false, privateKeysReturned: false }, { status: 404 });
    }

    const action = registry.actions.find((item) => item.key === spec.key);
    if (!action) {
      return Response.json({ status: "invalid", error: "Workflow action is not available for this case.", secretsReturned: false, privateKeysReturned: false }, { status: 400 });
    }

    if (!action.roleAllowed || action.preflightStatus === "blocked") {
      return Response.json(
        {
          status: "blocked",
          writeEnabled: true,
          action,
          reason: action.preflightSummary,
          targetApplyEnabled: false,
          releaseEnabled: false,
          uploadEnabled: false,
          externalSendingEnabled: false,
          financeWritesEnabled: false,
          bankSendsEnabled: false,
          paymentInitiationEnabled: false,
          sourceWritesEnabled: false,
          syncApplyEnabled: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
        { status: 403 },
      );
    }

    const result = await stageAction(action, role, registry.case);

    return Response.json({
      status: result.created ? "created" : "idempotent_existing",
      writeEnabled: true,
      action: {
        key: action.key,
        label: action.label,
        moduleLabel: action.moduleLabel,
        preflightStatus: action.preflightStatus,
        preflightSummary: action.preflightSummary,
        auditEvent: action.auditEvent,
        rollbackNote: action.rollbackNote,
      },
      result,
      targetApplyEnabled: false,
      releaseEnabled: false,
      uploadEnabled: false,
      externalSendingEnabled: false,
      financeWritesEnabled: false,
      bankSendsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: "Workflow action staged a CRAYS Core command draft only. Target apply, release, upload, external send, finance write, bank send, payment, source write and sync apply remain blocked.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid workflow action request.",
        targetApplyEnabled: false,
        releaseEnabled: false,
        uploadEnabled: false,
        externalSendingEnabled: false,
        financeWritesEnabled: false,
        bankSendsEnabled: false,
        paymentInitiationEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
