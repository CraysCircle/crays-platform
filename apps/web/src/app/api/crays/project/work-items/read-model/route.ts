import { getOpeningProjectReadModel } from "@/db/opening-project-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { getResourceDescriptor } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const projectWorkItemSourceSystem = "plane" as const;
const projectWorkItemSchemaStatus = "requires-discovery" as const;

function toWorkItemRow(record: Awaited<ReturnType<typeof getOpeningProjectReadModel>>["records"][number], readModel: Awaited<ReturnType<typeof getOpeningProjectReadModel>>) {
  const fields = record.fields;
  const stringField = (key: string, fallback: string) => (typeof fields[key] === "string" && fields[key].trim() ? fields[key].trim() : fallback);
  return {
    id: record.id,
    workItemId: record.identifier ?? record.id,
    projectId: stringField("projectId", readModel.projectContext.projectId),
    preparedOfferId: stringField("decisionId", readModel.projectContext.decisionId),
    dealId: stringField("dealId", readModel.projectContext.dealId),
    propertyCaseId: stringField("propertyCaseId", readModel.projectContext.propertyCaseId),
    studioName: stringField("studioName", readModel.projectContext.studioName),
    siteName: stringField("siteName", readModel.projectContext.siteName),
    address: stringField("address", readModel.projectContext.address),
    title: record.label,
    family: record.family,
    stateKey: record.status,
    currentState: record.currentState,
    priority: record.priority,
    owner: record.owner,
    audience: record.audience,
    dueDate: record.dueDate,
    milestoneId: record.milestoneId,
    predecessorId: record.predecessorId,
    successorId: record.successorId,
    blocker: record.status === "blocked" || record.status === "attention" ? record.context : "",
    nextAction: record.nextAction,
    updatedAt: record.lastSyncedAt ?? record.dueDate ?? new Date().toISOString(),
    href: record.href,
    value: record.value,
    unit: record.unit,
  };
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const descriptor = getResourceDescriptor("project-work-items");

  if (!descriptor) {
    return Response.json(
      {
        status: "source_unavailable",
        message: "Project work item resource descriptor is not registered.",
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 503 },
    );
  }

  if (descriptor.sourceSystem !== projectWorkItemSourceSystem || descriptor.schemaStatus !== projectWorkItemSchemaStatus) {
    return Response.json(
      {
        status: "source_unavailable",
        message: "Project work item resource descriptor is not aligned with the Plane discovery contract.",
        expectedSourceSystem: projectWorkItemSourceSystem,
        expectedSchemaStatus: projectWorkItemSchemaStatus,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 503 },
    );
  }

  const readModel = await getOpeningProjectReadModel(context.role);
  const status = readModel.access.allowed
    ? "ready"
    : readModel.access.level === "release_blocked"
      ? "release_blocked"
      : "forbidden";

  return Response.json(
    {
      status,
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role: context.role,
      reviewPersona: context.reviewPersona,
      resource: {
        key: descriptor.key,
        label: descriptor.label,
        description: descriptor.description,
        sourceSystem: projectWorkItemSourceSystem,
        schemaStatus: projectWorkItemSchemaStatus,
        pagination: descriptor.pagination,
        fields: descriptor.fields,
      },
      access: readModel.access,
      projectContext: readModel.projectContext,
      summary: readModel.summary,
      rows: readModel.access.allowed ? readModel.records.map((record) => toWorkItemRow(record, readModel)) : [],
      payloadMode: "full",
      fullRowsAvailable: readModel.access.allowed ? readModel.records.length : 0,
      actions: {
        canStageCommandDraft: readModel.access.canStageWorkItem,
        commandRoute: "/api/crays/project/work-items/command",
        planeNativeWritesEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      note: "Project Work Items are served as a CRAYS Opening Project projection. Plane native metadata remains discovery-gated; no Plane API or credentials are exposed to the browser.",
    },
    { status: readModel.access.allowed ? 200 : readModel.access.level === "release_blocked" ? 423 : 403 },
  );
}
