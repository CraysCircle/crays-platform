import { getOpeningProjectReadModel } from "@/db/opening-project-read-model-repository";
import { stageProjectWorkItemCommand, type StageProjectWorkItemCommandInput } from "@/db/core-command-write-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import type { ResourceCommandReceipt } from "@/lib/resources";
import type { RoleKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const projectCommandRoles = new Set<RoleKey>(["deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "reviewer", "admin", "crays-management"]);

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function commandId(prefix: string) {
  return `core_cmd_${prefix}_project_${crypto.randomUUID().replaceAll("-", "")}`;
}

function receipt(input: {
  commandId: string;
  status: ResourceCommandReceipt["status"];
  message: string;
  gateReason: string;
}): ResourceCommandReceipt {
  return {
    status: input.status,
    commandId: input.commandId,
    resource: "project-work-items",
    operation: "transition",
    acceptedAt: new Date().toISOString(),
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    auditRequired: true,
    message: input.message,
    gate: { key: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY", reason: input.gateReason },
  };
}

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const body = await request.json().catch(() => null);
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const readModel = await getOpeningProjectReadModel(context.role);

  if (!readModel.access.allowed || !readModel.access.canStageWorkItem || !projectCommandRoles.has(context.role)) {
    return Response.json(
      {
        status: "forbidden",
        receipt: receipt({
          commandId: commandId("blocked"),
          status: "forbidden",
          message: readModel.access.reason,
          gateReason: "Role is not allowed to stage an Opening Project command draft.",
        }),
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 403 },
    );
  }

  const requestedWorkItemId = text(input.workItemId);
  const scopedRecord = requestedWorkItemId
    ? readModel.records.find((record) => (record.identifier ?? record.id) === requestedWorkItemId || record.id === requestedWorkItemId)
    : null;

  if (!requestedWorkItemId || !scopedRecord) {
    return Response.json(
      {
        status: "validation_failed",
        receipt: receipt({
          commandId: commandId("validation"),
          status: "validation_failed",
          message: "Project work item is missing or outside this role's server-authorized scope.",
          gateReason: "CRAYS only stages commands for work items returned by the server-side Opening Project read model.",
        }),
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 400 },
    );
  }

  const allowedStates = new Set(readModel.records.map((record) => record.status).filter(Boolean));
  const targetStatus = text(input.targetState) || text(input.status) || scopedRecord.status;

  if (!allowedStates.has(targetStatus)) {
    return Response.json(
      {
        status: "validation_failed",
        receipt: receipt({
          commandId: commandId("validation"),
          status: "validation_failed",
          message: "Requested Project state is not part of the server-authorized Project work-item state projection.",
          gateReason: "CRAYS only stages board transitions into states returned by the server-side Opening Project read model.",
        }),
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 400 },
    );
  }

  const scopedFields = scopedRecord.fields;
  const fieldText = (key: string, fallback: string | null | undefined) => {
    const value = scopedFields[key];
    return typeof value === "string" && value.trim() ? value.trim() : fallback ?? null;
  };
  const statusChanged = targetStatus !== scopedRecord.status;

  const commandInput: StageProjectWorkItemCommandInput = {
    idempotencyKey: text(input.idempotencyKey) || `project-work-item:${requestedWorkItemId}:${context.role}:block81-v1`,
    actorRole: context.role as StageProjectWorkItemCommandInput["actorRole"],
    organizationId: context.authoritySource === "auth0-crays-session" ? context.tenantId : null,
    projectId: fieldText("projectId", readModel.projectContext.projectId),
    workItemId: scopedRecord.identifier ?? scopedRecord.id,
    preparedOfferId: fieldText("decisionId", readModel.projectContext.decisionId),
    dealId: fieldText("dealId", readModel.projectContext.dealId),
    propertyCaseId: fieldText("propertyCaseId", readModel.projectContext.propertyCaseId),
    action: statusChanged ? "status_change" : "update",
    title: scopedRecord.label,
    status: targetStatus,
    priority: scopedRecord.priority,
    dueDate: scopedRecord.dueDate,
    ownerRole: scopedRecord.owner,
    notes: statusChanged
      ? `Stage board transition from ${scopedRecord.status} to ${targetStatus}. ${scopedRecord.nextAction}`
      : scopedRecord.nextAction,
  };

  const result = await stageProjectWorkItemCommand(commandInput);
  const commandReceipt = receipt({
    commandId: result.commandId,
    status: "gated",
    message: "Opening Project review was staged in CRAYS Core. External project-system apply, source writes, sync apply and target apply remain closed.",
    // Contract marker: Plane native writes require deployed metadata discovery before any apply gate can open.
    gateReason: "External project-system writes require deployed metadata discovery and an opened apply gate.",
  });

  return Response.json({
    status: "gated",
    receipt: commandReceipt,
    result,
    planeNativeWritesEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    targetApplyEnabled: false,
  });
}
