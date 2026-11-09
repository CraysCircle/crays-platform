import { getRealProjectNativeOperabilityReadModel } from "@/db/project-native-read-model-repository";
import {
  getProjectNativeOperabilityReadModel,
  type ProjectNativeOperabilityReadModel,
  type ProjectNativeWorkItem,
  type ProjectStateGroup,
} from "@/lib/project-native-operability-read-model";
import { getProjectOperationalSourceSlice, type ProjectSourceRow } from "@/lib/project-operational-source-adapter";
import { safeLocalEngineError } from "@/lib/local-engine-runtime";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stateFromStatus(status: string): ProjectStateGroup {
  const normalized = status.toLowerCase();
  if (/(done|complete|completed|closed|submitted|approved)/.test(normalized)) return "Done";
  if (/(cancel|archived)/.test(normalized)) return "Cancelled";
  if (/(progress|active|started|review|pending)/.test(normalized)) return "In progress";
  if (/(todo|open|draft|planned)/.test(normalized)) return "To do";
  return "Backlog";
}

function priorityFromRow(row: ProjectSourceRow): ProjectNativeWorkItem["priority"] {
  const priority = String(row.fields.priority ?? row.status).toLowerCase();
  if (/(urgent|critical|blocked)/.test(priority)) return "Urgent";
  if (/high/.test(priority)) return "High";
  if (/low/.test(priority)) return "Low";
  if (/(none|n\/a)/.test(priority)) return "None";
  return "Medium";
}

function asDate(value: string | number | boolean | null | undefined, fallback = "Unscheduled") {
  return typeof value === "string" && value.trim() ? value.slice(0, 10) : fallback;
}

function fieldValue(value: string | number | boolean | null) {
  if (value === null) return "n/a";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value || "n/a");
}

function workItemFromSource(row: ProjectSourceRow, index: number): ProjectNativeWorkItem {
  const sequence = String(row.fields.sequence ?? index + 1).padStart(3, "0");
  return {
    id: row.id,
    identifier: sequence.includes("-") ? sequence : `LIVE-${sequence}`,
    type: "Task",
    title: row.label,
    description: `Live delivery work item from the Project source. CRAYS stages edits and command history before apply.`,
    state: stateFromStatus(row.status),
    priority: priorityFromRow(row),
    lead: row.owner || "Operations",
    assignees: [row.owner || "Operations"],
    labels: ["live", row.status].filter(Boolean),
    startDate: asDate(row.fields.startDate, row.modifiedAt?.slice(0, 10) ?? "Live source"),
    dueDate: asDate(row.fields.targetDate, "Unscheduled"),
    cycle: "Live cycle",
    modules: ["Live delivery"],
    estimate: fieldValue(row.fields.estimate ?? null),
    parent: "",
    blocking: [],
    blockedBy: [],
    related: [],
    duplicateOf: "",
    links: [],
    customFields: Object.entries(row.fields).map(([key, value]) => ({
      key,
      label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
      type: "text",
      value: fieldValue(value),
    })),
    comments: [],
    history: [`Read from live Project source at ${row.modifiedAt ?? "runtime"}`],
  };
}

function mergeLiveProjectSource(
  readModel: ProjectNativeOperabilityReadModel,
  source: Awaited<ReturnType<typeof getProjectOperationalSourceSlice>>,
): ProjectNativeOperabilityReadModel {
  const workItemRows = source.sections.find((section) => section.key === "work-items")?.rows ?? [];
  const projectRows = source.sections.find((section) => section.key === "projects")?.rows ?? [];
  const cycleRows = source.sections.find((section) => section.key === "cycles")?.rows ?? [];
  const moduleRows = source.sections.find((section) => section.key === "modules")?.rows ?? [];
  const pageRows = source.sections.find((section) => section.key === "pages")?.rows ?? [];
  const liveWorkItems = workItemRows.map(workItemFromSource);

  if (!liveWorkItems.length && !projectRows.length) return readModel;

  return {
    ...readModel,
    workspace: {
      ...readModel.workspace,
      projectId: projectRows[0]?.id ?? readModel.workspace.projectId,
      projectName: projectRows[0]?.label ?? readModel.workspace.projectName,
      identifier: String(projectRows[0]?.fields.identifier ?? readModel.workspace.identifier),
      lead: projectRows[0]?.owner ?? readModel.workspace.lead,
    },
    workItems: liveWorkItems.length ? liveWorkItems : readModel.workItems,
    cycles: cycleRows.length
      ? cycleRows.map((row) => ({
          id: row.id,
          name: row.label,
          state: stateFromStatus(row.status) === "Done" ? ("Completed" as const) : stateFromStatus(row.status) === "In progress" ? ("Active" as const) : ("Planned" as const),
          startDate: asDate(row.fields.startDate, "Unscheduled"),
          endDate: asDate(row.fields.endDate, "Unscheduled"),
          progress: Number(row.fields.progress ?? 0) || 0,
          workItemIds: [],
        }))
      : readModel.cycles,
    modules: moduleRows.length
      ? moduleRows.map((row) => ({
          id: row.id,
          name: row.label,
          state:
            stateFromStatus(row.status) === "Done"
              ? ("Completed" as const)
              : stateFromStatus(row.status) === "Cancelled"
                ? ("Cancelled" as const)
                : stateFromStatus(row.status) === "In progress"
                  ? ("In Progress" as const)
                  : ("Planned" as const),
          lead: row.owner,
          startDate: asDate(row.fields.startDate, "Unscheduled"),
          dueDate: asDate(row.fields.targetDate, "Unscheduled"),
          progress: 0,
          workItemIds: [],
        }))
      : readModel.modules,
    pages: pageRows.length
      ? pageRows.map((row) => ({
          id: row.id,
          title: row.label,
          status: row.status === "locked" ? ("Review" as const) : row.status === "archived" ? ("Published" as const) : ("Draft" as const),
          owner: row.owner,
          updatedAt: row.modifiedAt ?? source.generatedAt,
          body: `Live Project page metadata. CRAYS stages page edits before apply.`,
          linkedWorkItemIds: [],
        }))
      : readModel.pages,
    boundaries: {
      ...readModel.boundaries,
      recordsAreCraysOwned: false,
      sourceRuntimeCallsEnabled: true,
      liveSourceRecordsReturned: true,
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const seedBatchId = url.searchParams.get("seedBatchId") ?? undefined;
  const realProductMode = url.searchParams.get("mode") === "real-product" || Boolean(seedBatchId);
  const baseReadModel = realProductMode ? await getRealProjectNativeOperabilityReadModel(role, seedBatchId) : getProjectNativeOperabilityReadModel(role);

  if (!baseReadModel.access.allowed) {
    return Response.json(
      {
        status: baseReadModel.status,
        readModel: baseReadModel,
        sourceWritesEnabled: false,
        providerCallsEnabled: false,
        aiProviderCallsEnabled: false,
        externalSendingEnabled: false,
        liveSourceRecordsReturned: false,
        note: "Project native operability access is forbidden for this role.",
      },
      { status: 403 },
    );
  }

  let readModel = baseReadModel;
  let sourceRecordStatus = "not_requested";
  let sourceError: ReturnType<typeof safeLocalEngineError> | null = null;

  try {
    const source = await getProjectOperationalSourceSlice({ limit: Number(url.searchParams.get("limit") ?? 25) });
    readModel = mergeLiveProjectSource(baseReadModel, source);
    sourceRecordStatus = readModel.boundaries.liveSourceRecordsReturned ? "ready" : "empty";
  } catch (error) {
    sourceRecordStatus = "source_unavailable";
    sourceError = safeLocalEngineError(error);
  }

  return Response.json(
    {
      status: readModel.status,
      sourceRecordStatus,
      readModel,
      sourceWritesEnabled: false,
      providerCallsEnabled: false,
      aiProviderCallsEnabled: false,
      externalSendingEnabled: false,
      liveSourceRecordsReturned: readModel.boundaries.liveSourceRecordsReturned,
      error: sourceError,
      note:
        sourceRecordStatus === "ready"
          ? "Project native operability is backed by live delivery records. Review edits can be staged; source writes remain gated."
          : "Project native operability is available, but live delivery records are unavailable or not configured right now.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
