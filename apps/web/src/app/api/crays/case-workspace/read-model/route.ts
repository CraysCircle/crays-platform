import { getCaseWorkspaceReadModel } from "@/db/case-workspace-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const preparedOfferId = url.searchParams.get("preparedOfferId") ?? url.searchParams.get("case");
  const readModel = await getCaseWorkspaceReadModel({
    role,
    preparedOfferId,
    dealId: url.searchParams.get("dealId") ?? url.searchParams.get("deal"),
    propertyCaseId: url.searchParams.get("propertyCaseId") ?? url.searchParams.get("propertyCase"),
  });

  return Response.json(
    {
      status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
      readModel,
      liveSourceCallsEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      releaseActionsEnabled: false,
      productionDeployEnabled: false,
      vpsChangingWorkEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Internal CRAYS Core case workspace read model only. Apply, release, upload, send, finance, bank, payment, deploy and VPS-changing work remain blocked."
        : "Case workspace read model is only available to internal workbench roles.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
