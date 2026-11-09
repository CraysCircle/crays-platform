import { getCaseActivityBackboneReadModel } from "@/db/case-activity-backbone-read-model-repository";
import { getCaseWorkspaceReadModel } from "@/db/case-workspace-read-model-repository";
import { getCandidateOfferWorkflowReadModel } from "@/db/candidate-offer-workflow-read-model-repository";
import { getCoreCommandHistoryReadModel } from "@/db/core-command-history-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function labelize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function fallbackSections(records: Awaited<ReturnType<typeof getCandidateOfferWorkflowReadModel>>["records"]) {
  const byFamily = new Map<string, typeof records>();

  for (const record of records) {
    byFamily.set(record.family, [...(byFamily.get(record.family) ?? []), record]);
  }

  return [...byFamily.entries()].map(([family, familyRecords]) => {
    const blocked = familyRecords.find((record) => record.status === "blocked");
    const attention = familyRecords.find((record) => record.status === "attention");
    const lead = blocked ?? attention ?? familyRecords[0];

    return {
      key: `crm-${family}`,
      label: labelize(family),
      status: blocked ? "blocked" : attention ? "waiting" : "ready",
      state: labelize(lead.status),
      ownerRole: lead.owner,
      blocker: blocked?.context ?? "No blocker recorded in the CRM projection.",
      nextAction: lead.nextAction,
    };
  });
}

function fallbackEvents(records: Awaited<ReturnType<typeof getCandidateOfferWorkflowReadModel>>["records"]) {
  return records
    .filter((record) => record.lastSyncedAt)
    .slice(0, 12)
    .map((record) => ({
      eventId: `crm-projection-${record.id}`,
      source: "crm-projection",
      label: `${record.label}: ${record.nextAction}`,
      occurredAt: record.lastSyncedAt ?? new Date().toISOString(),
    }));
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const url = new URL(request.url);
  const dealId = url.searchParams.get("dealId");
  const preparedOfferId = url.searchParams.get("preparedOfferId");
  const propertyCaseId = url.searchParams.get("propertyCaseId");

  if (!dealId || !preparedOfferId) {
    return Response.json(
      {
        status: "validation_failed",
        message: "dealId and preparedOfferId are required.",
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 422 },
    );
  }

  const [workspace, activity, history, crmProjection] = await Promise.all([
    getCaseWorkspaceReadModel({
      role: context.role,
      preparedOfferId,
      dealId,
      propertyCaseId,
    }),
    getCaseActivityBackboneReadModel({
      role: context.role,
      preparedOfferId,
      dealId,
      propertyCaseId,
      limit: 12,
    }),
    getCoreCommandHistoryReadModel({
      role: context.role,
      preparedOfferId,
      dealId,
      propertyCaseId,
      limit: 8,
    }),
    getCandidateOfferWorkflowReadModel(context.role),
  ]);

  const crmSections = fallbackSections(crmProjection.records);
  const crmEvents = fallbackEvents(crmProjection.records);
  const workspaceSections = workspace.sections.length ? workspace.sections : crmSections;
  const activityEvents = activity.events.length ? activity.events : crmEvents;
  const workspaceForResponse = {
    ...workspace,
    queryStatus: workspace.sections.length ? workspace.queryStatus : "crm_projection_ready",
    sections: workspaceSections,
    summary: {
      ...workspace.summary,
      sections: workspaceSections.length,
      readySections: workspaceSections.filter((section) => section.status === "ready").length,
      blockedSections: workspaceSections.filter((section) => section.status === "blocked").length,
      commandDrafts: history.records.length,
    },
  };
  const activityForResponse = {
    ...activity,
    events: activityEvents,
    summary: {
      ...activity.summary,
      workflowEvents: activityEvents.length,
    },
  };
  const allowed = workspace.access.allowed && activity.access.allowed && history.access.allowed && crmProjection.access.allowed;

  return Response.json(
    {
      status: allowed ? "ready" : "forbidden",
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role: context.role,
      reviewPersona: context.reviewPersona,
      workspace: workspaceForResponse,
      activity: activityForResponse,
      history,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      releaseActionsEnabled: false,
      note: "CRM entity workspace uses CRAYS Core case, activity and command-history read models only. Source writes, uploads, releases, sends and apply remain closed.",
    },
    { status: allowed ? 200 : 403 },
  );
}
