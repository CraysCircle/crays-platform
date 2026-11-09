import { getBankPackageWorkflowReadModel } from "@/db/bank-package-workflow-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getBankPackageWorkflowReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      bankSendEnabled: false,
      lenderReleaseEnabled: false,
      packagePublicationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
