import { getOpeningProjectReadModel } from "@/db/opening-project-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getOpeningProjectReadModel(role);
  if (!readModel.access.allowed) return Response.json({ status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden", readModel, projectApplyEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, externalSendingEnabled: false, stakeholderReleaseEnabled: false, note: readModel.access.reason }, { status: readModel.access.level === "release_blocked" ? 423 : 403 });
  return Response.json({ status: "ready", readModel, projectApplyEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, externalSendingEnabled: false, stakeholderReleaseEnabled: false, financePostingEnabled: false, paymentInitiationEnabled: false, bankSendEnabled: false, secretsReturned: false, privateKeysReturned: false, note: "Opening Project returns role-scoped Core/source-map records and guarded command-draft capability only. Project apply and all external side effects remain closed." });
}
