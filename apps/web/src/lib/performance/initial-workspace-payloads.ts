import { getCachedCrmOperationalReadModel, normalizeCrmOperationalFamily } from "@/db/crm-operational-read-model-repository";
import { getCachedOpeningProjectReadModel, type OpeningProjectReadModel } from "@/db/opening-project-read-model-repository";
import { getResourceDescriptor } from "@/lib/resources";
import type { ResourceKey } from "@/lib/resources";
import type { RoleKey } from "@/lib/roles";
import type { CrmFamily, CrmPayload } from "@/components/crm-operational-workspace-page";
import type { ProjectWorkItemsPayload } from "@/components/project-work-item-slice-page";

const descriptorByFamily: Record<string, ResourceKey | null> = {
  companies: "crm-companies",
  people: "crm-people",
  leads: "crm-leads",
  opportunities: "crm-opportunities",
  emails: "crm-emails",
  "calendar-events": "crm-calendar-events",
  tasks: "crm-tasks",
  activities: "crm-activities",
  notes: null,
};
const projectInitialRowLimit = 30;

const defaultSortByFamily: Record<CrmFamily, { field: string; direction: "asc" | "desc" }> = {
  companies: { field: "updatedAt", direction: "desc" },
  people: { field: "updatedAt", direction: "desc" },
  leads: { field: "score", direction: "desc" },
  opportunities: { field: "amountEur", direction: "desc" },
  emails: { field: "receivedAt", direction: "desc" },
  "calendar-events": { field: "startAt", direction: "asc" },
  tasks: { field: "dueDate", direction: "asc" },
  activities: { field: "activityAt", direction: "desc" },
  notes: { field: "updatedAt", direction: "desc" },
};

export function crmFamilyFromRoute(view?: string, record?: string): CrmFamily {
  const value = record || view || "opportunities";
  if (value === "home") return "opportunities";
  if (value === "inbox") return "emails";
  if (value === "calendar") return "calendar-events";
  if (value === "pipeline") return "opportunities";
  if (value === "timeline") return "activities";
  return normalizeCrmOperationalFamily(value) as CrmFamily;
}

export async function getInitialCrmOperationalPayload(role: RoleKey, view?: string, record?: string): Promise<CrmPayload | null> {
  const family = crmFamilyFromRoute(view, record);
  const descriptorKey = descriptorByFamily[family];
  const descriptor = descriptorKey ? getResourceDescriptor(descriptorKey) : null;
  const sort = defaultSortByFamily[family];
  const readModel = getCachedCrmOperationalReadModel({
    role,
    family,
    sortField: sort.field,
    sortDirection: sort.direction,
    offset: 0,
    limit: 25,
  });
  if (!readModel) return null;

  return {
    status: readModel.status,
    role,
    resource: descriptor
      ? {
          label: descriptor.label,
          description: descriptor.description,
          sourceSystem: descriptor.sourceSystem,
          schemaStatus: descriptor.schemaStatus,
        }
      : {
          label: family,
          description: "CRAYS CRM operational source-map projection.",
          sourceSystem: "twenty",
          schemaStatus: "requires-discovery",
        },
    access: readModel.access,
    summary: readModel.summary,
    family: readModel.family,
    rows: readModel.access.allowed ? readModel.rows : [],
    pageInfo: readModel.pageInfo,
    actions: readModel.actions,
    provenance: readModel.provenance,
    note: "CRM operational initial payload is server-rendered to avoid the first client waterfall.",
  };
}

function toProjectWorkItemRow(record: OpeningProjectReadModel["records"][number], readModel: OpeningProjectReadModel) {
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

export async function getInitialProjectWorkItemsPayload(role: RoleKey): Promise<ProjectWorkItemsPayload | null> {
  const descriptor = getResourceDescriptor("project-work-items");
  const readModel = getCachedOpeningProjectReadModel(role);
  if (!readModel) return null;
  const status = readModel.access.allowed ? "ready" : readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden";

  return {
    status,
    resource: {
      sourceSystem: "plane",
      schemaStatus: "requires-discovery",
      fields: descriptor?.fields ?? [],
    },
    access: readModel.access,
    projectContext: {
      projectId: readModel.projectContext.projectId,
      studioName: readModel.projectContext.studioName,
      siteName: readModel.projectContext.siteName,
      targetOpeningDate: readModel.projectContext.targetOpeningDate,
    },
    summary: readModel.summary,
    rows: readModel.access.allowed ? readModel.records.slice(0, projectInitialRowLimit).map((record) => toProjectWorkItemRow(record, readModel)) : [],
    payloadMode: "initial-page",
    fullRowsAvailable: readModel.access.allowed ? readModel.records.length : 0,
    actions: {
      canStageCommandDraft: readModel.access.canStageWorkItem,
      commandRoute: "/api/crays/project/work-items/command",
      planeNativeWritesEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
    },
    note: "Project work items initial payload is server-rendered to avoid the first client waterfall.",
  };
}
