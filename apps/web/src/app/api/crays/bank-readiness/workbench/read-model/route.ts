import { getBankReadinessWorkbenchReadModel } from "@/db/bank-readiness-workbench-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getBankReadinessWorkbenchReadModel({
    role,
    preparedOfferId: url.searchParams.get("preparedOfferId") ?? url.searchParams.get("case"),
    dealId: url.searchParams.get("dealId") ?? url.searchParams.get("deal"),
    propertyCaseId: url.searchParams.get("propertyCaseId") ?? url.searchParams.get("propertyCase"),
  });

  return Response.json(
    {
      status: readModel.access.allowed ? readModel.queryStatus : "forbidden",
      readModel,
      liveSourceCallsEnabled: false,
      bankPackageCreationEnabled: false,
      bankHandoffEnabled: false,
      lenderReleaseEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      financeWritesEnabled: false,
      accountingExportsEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      releaseActionsEnabled: false,
      toolApplyEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
