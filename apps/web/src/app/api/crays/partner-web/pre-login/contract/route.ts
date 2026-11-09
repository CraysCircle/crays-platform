import {
  getPartnerPreloginContract,
  getPartnerPreloginRolePreview,
  parsePartnerPreloginSurface,
} from "@/lib/partner-prelogin-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const surface = parsePartnerPreloginSurface(url.searchParams.get("surface"));
  const contract = getPartnerPreloginContract(surface);
  const rolePreview = getPartnerPreloginRolePreview(contract, role);

  return Response.json(
    {
      status: rolePreview.canReadContract ? "ready" : "forbidden",
      role,
      surface,
      contract,
      rolePreview,
      livePartnerRecordsReturned: false,
      liveProjectPipelineReturned: false,
      livePropertyRecordsReturned: false,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      note: rolePreview.canReadContract
        ? "This endpoint returns CRAYS pre-login partner web contracts only. Public Next.js routes are enabled; write access requests, property uploads, provider calls and live partner data remain disabled."
        : "Pre-login partner contracts require Guest, target partner or internal review scope.",
    },
    { status: rolePreview.canReadContract ? 200 : 403 },
  );
}
