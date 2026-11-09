import { getProjectAdapterReadiness } from "@/db/project-adapter-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getProjectAdapterReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveBusinessRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns Project adapter readiness only. It does not create projects, write work items, embed source UI, call source APIs, upload files or send messages."
        : "Project adapter readiness requires internal delivery scope or future scoped stakeholder access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
