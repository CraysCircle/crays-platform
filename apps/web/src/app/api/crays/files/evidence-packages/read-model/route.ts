import { getEvidencePackagesReadModel } from "@/db/evidence-packages-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getEvidencePackagesReadModel(role);
  const status = readModel.queryStatus === "not_configured" ? "not_configured" : readModel.access.allowed ? "ready" : "release_blocked";
  return Response.json({ status, readModel, uploadsEnabled: false, privatePreviewsEnabled: false, fileBodyAccessEnabled: false, packageReleaseEnabled: false, externalSendingEnabled: false, bankSendEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, financePostingEnabled: false, liveAiEnabled: false, secretsReturned: false, privateKeysReturned: false, note: "Evidence Packages returns role-scoped package metadata and guarded internal command drafts only. No upload, preview, release, send, posting or apply is executed." }, { status: readModel.access.allowed ? 200 : readModel.queryStatus === "not_configured" ? 503 : 423 });
}
