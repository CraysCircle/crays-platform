import { getManagementGateReviewReadModel } from "@/db/management-gate-review-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getManagementGateReviewReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
      readModel,
      commandQueueReturned: readModel.queue.length > 0,
      targetApplyEnabled: false,
      releaseEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Management gate review returns persisted command drafts and review queue state. It does not approve apply, release, source writes or external sending."
        : "Management gate review requires Reviewer, Admin or Management scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
