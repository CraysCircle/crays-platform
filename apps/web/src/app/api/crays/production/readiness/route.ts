import { getProductionReliabilityReadiness } from "@/db/production-reliability-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const model = await getProductionReliabilityReadiness(context.role);

  if (!model.access.allowed) {
    return Response.json(
      {
        status: "release_blocked",
        serverAuthority: context.authoritySource,
        role: context.role,
        tenantId: context.tenantId,
        access: {
          allowed: false,
          reason: "Production readiness is available only to Admin, Reviewer or CRAYS Management.",
        },
        ...model.gates,
      },
      { status: 423 },
    );
  }

  return Response.json(
    {
      status: model.status,
      block: 91,
      serverAuthority: context.authoritySource,
      role: context.role,
      tenantId: context.tenantId,
      runtime: model.runtime,
      environment: model.environment,
      productionDomain: new URL(request.url).host,
      checks: model.checks,
      observed: model.observed,
      gates: model.gates,
      note:
        "Block 91 production reliability gate proves that deployment runtime env and CRAYS Core read models are connected before a production release is considered healthy. It returns only env-name presence and aggregate counts, never secrets.",
    },
    { status: model.status === "ready" ? 200 : 503 },
  );
}
