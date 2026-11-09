import { getSyncDataHealthReadModel } from "@/db/sync-data-health-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getSyncDataHealthReadModel(role);
  const status = readModel.queryStatus === "not_configured" ? "not_configured" : readModel.access.allowed ? "ready" : "forbidden";
  return Response.json({ status, readModel, sourceWritesEnabled: false, syncApplyEnabled: false, destructiveReconciliationEnabled: false, retryExecutionEnabled: false, mappingOverrideEnabled: false, toolApplyEnabled: false, externalSendingEnabled: false, paymentInitiationEnabled: false, bankActionsEnabled: false, financePostingEnabled: false, releaseEnabled: false, liveAiEnabled: false, secretsReturned: false, privateKeysReturned: false, note: "Data Health returns role-scoped Core connection, mapping, job, identity and provenance records plus guarded review drafts only. No retry, override, reconciliation or apply is executed." }, { status: readModel.queryStatus === "not_configured" ? 503 : readModel.access.allowed ? 200 : 423 });
}
