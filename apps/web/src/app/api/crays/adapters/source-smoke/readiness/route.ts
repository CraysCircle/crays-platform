import { getSourceSmokeReadiness } from "@/db/source-smoke-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceSmokeReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: readModel.access.allowed
        ? "This endpoint returns source-smoke readiness only. It does not call source APIs, return source records, expose source UI, return payload bodies, run sync jobs, write to source systems, upload files, call providers, execute control actions or send external messages."
        : "Source-smoke readiness requires internal platform, review or scoped module-readiness access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
