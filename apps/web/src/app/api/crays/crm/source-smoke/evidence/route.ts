import { getSourceSmokeEvidence } from "@/lib/source-smoke-evidence-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceSmokeEvidence("crm", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "CRM source-smoke evidence is sanitized read-only evidence from the approved inspection window. No runtime source call, source row, write, source UI, workflow automation or external sending is enabled.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
