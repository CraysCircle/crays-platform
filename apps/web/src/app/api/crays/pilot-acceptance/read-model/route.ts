import { getPilotAcceptanceReadModel } from "@/db/pilot-acceptance-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getPilotAcceptanceReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      internalPilotDemoReady: readModel.decision.internalPilotDemoReady,
      externalReleaseReady: false,
      productionDeployEnabled: false,
      publicReleaseEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      note: readModel.access.allowed
        ? "Pilot acceptance is an internal closeout read model. It does not run production deploy, external release, sends, uploads, payments, bank actions, target apply, source writes, sync apply, live external reads or live AI."
        : "Pilot acceptance closeout requires Admin, Reviewer or CRAYS Management access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
