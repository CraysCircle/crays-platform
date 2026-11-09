import { getAdapterBidirectionalPolicyReadModel } from "@/db/adapter-bidirectional-policy-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getAdapterBidirectionalPolicyReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      sourceReadsEnabled: readModel.boundaries.sourceReadsEnabled,
      commandDraftsEnabled: readModel.boundaries.commandDraftsEnabled,
      targetApplyEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      destructiveApplyEnabled: false,
      externalSendingEnabled: false,
      note: readModel.access.allowed
        ? "Adapter policy exposes safe read/write orchestration semantics only. It does not run target apply, source writes, sync apply, destructive reconciliation, uploads, sends, payments, bank actions, live AI or deploys."
        : "Adapter policy requires internal or scoped operating access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
