import { getCandidateOfferWorkflowReadModel, type CandidateOfferWorkflowRecord } from "@/db/candidate-offer-workflow-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { getResourceDescriptor } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function words(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function blockerFor(record: CandidateOfferWorkflowRecord) {
  if (record.status === "blocked") return record.nextAction;
  if (record.priority === "critical" || record.priority === "high") return record.context;
  return "";
}

function toDealRow(record: CandidateOfferWorkflowRecord, readModel: Awaited<ReturnType<typeof getCandidateOfferWorkflowReadModel>>) {
  return {
    id: record.id,
    dealId: readModel.offerContext.dealId,
    preparedOfferId: readModel.offerContext.offerId,
    propertyCaseId: readModel.offerContext.propertyCaseId,
    candidateName: readModel.offerContext.candidateName,
    candidateCompany: readModel.offerContext.candidateCompany,
    siteName: readModel.offerContext.siteName,
    stage: words(record.family),
    priority: record.priority,
    status: record.status,
    owner: record.owner,
    audience: record.audience,
    blocker: blockerFor(record),
    nextAction: record.nextAction,
    updatedAt: record.lastSyncedAt ?? record.dueDate ?? new Date().toISOString(),
    sourceRecordId: record.id,
    href: record.href,
    context: record.context,
    value: record.value,
    unit: record.unit,
    fields: record.fields,
  };
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const readModel = await getCandidateOfferWorkflowReadModel(context.role);
  const descriptor = getResourceDescriptor("deals");

  if (!descriptor) {
    return Response.json(
      {
        status: "source_unavailable",
        message: "Deals resource descriptor is not registered.",
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 503 },
    );
  }

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
        fields: descriptor.fields,
        operations: descriptor.supportedOperations,
      },
      access: readModel.access,
      summary: readModel.summary,
      offerContext: readModel.offerContext,
      rows: readModel.access.allowed ? readModel.records.map((record) => toDealRow(record, readModel)) : [],
      actions: {
        canUpdateDeal: readModel.access.canStageOfferReview,
        commandRoute: "/api/crays/resources/command",
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      note: "CRM Deal Collection is served by CRAYS Core/BFF only. Twenty native APIs and source credentials are not exposed to the browser.",
    },
    { status: readModel.access.allowed ? 200 : readModel.access.level === "release_blocked" ? 423 : 403 },
  );
}
