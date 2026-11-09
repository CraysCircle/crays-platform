import { getDocumentLifecycleReadModel } from "@/db/document-lifecycle-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getDocumentLifecycleReadModel({
    role,
    preparedOfferId: url.searchParams.get("preparedOfferId") ?? url.searchParams.get("case"),
    dealId: url.searchParams.get("dealId") ?? url.searchParams.get("deal"),
    propertyCaseId: url.searchParams.get("propertyCaseId") ?? url.searchParams.get("propertyCase"),
  });

  return Response.json(
    {
      status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
      readModel,
      liveSourceCallsEnabled: false,
      documentBodiesReturned: false,
      binaryUploadsEnabled: false,
      privatePreviewEnabled: false,
      publicFileReleaseEnabled: false,
      roomReleaseEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      externalSendingEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      productionDeployEnabled: false,
      vpsChangingWorkEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Internal CRAYS Core document lifecycle read model only. File bodies, uploads, previews, releases, sends and apply actions remain blocked."
        : "Document lifecycle is only available to internal workbench roles.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
