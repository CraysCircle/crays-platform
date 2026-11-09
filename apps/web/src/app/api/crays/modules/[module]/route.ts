import { isKnownModuleKey, moduleBffContractForModule } from "@/lib/module-bff";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ module: string }> }) {
  const params = await context.params;
  const routeContext = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = routeContext.role;

  if (!isKnownModuleKey(params.module)) {
    return Response.json(
      {
        error: "unknown_module",
        module: params.module,
        liveDataReturned: false,
      },
      { status: 404 },
    );
  }

  return Response.json({
    role,
    contract: moduleBffContractForModule(params.module, role),
  });
}
