import { getPropertyCaseAnalysisReadiness } from "@/db/property-case-review-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: string | null) {
  return value?.trim() ?? "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const caseId = cleanText(url.searchParams.get("caseId"));
  const readModel = await getPropertyCaseAnalysisReadiness(role, caseId || undefined);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns scoped CRAYS property-case analysis readiness from core records only. No uploads, provider calls or public release are enabled."
        : "Property-case analysis readiness requires Deal Manager, Expansion Manager or internal review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
