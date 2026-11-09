import { getFranchisePartnerPerformanceReadModel } from "@/db/franchise-partner-performance-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const readModel = await getFranchisePartnerPerformanceReadModel(role);

    return Response.json(
      {
        status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
        readModel,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
        paymentInitiationEnabled: false,
        financePostingEnabled: false,
        accountingExportsEnabled: false,
        externalSendingEnabled: false,
        liveAiEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: readModel.access.allowed ? 200 : 403 },
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Franchise Partner Performance read model failed.",
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
        paymentInitiationEnabled: false,
        financePostingEnabled: false,
        accountingExportsEnabled: false,
        externalSendingEnabled: false,
        liveAiEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 500 },
    );
  }
}
