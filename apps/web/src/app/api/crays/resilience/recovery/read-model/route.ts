import { getResilienceRecoveryReadModel } from "@/db/resilience-recovery-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getResilienceRecoveryReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      targetApplyEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      paymentInitiationEnabled: false,
      note: readModel.access.allowed
        ? "Resilience recovery exposes audit, rollback, idempotency, redaction and boundary evidence only. It does not run release, send, upload, payment, bank action, target apply, source write, sync apply, live AI or deployment."
        : "Resilience recovery review requires Admin, Reviewer or CRAYS Management access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
