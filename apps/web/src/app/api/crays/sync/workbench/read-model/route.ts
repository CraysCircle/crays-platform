import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { getSourceFaithfulWorkbench } from "@/lib/source-faithful-product-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const role = context.role;
  const readModel = getSourceFaithfulWorkbench("sync", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role,
      reviewPersona: context.reviewPersona,
      readModel,
      liveBusinessRecordReturned: false,
      note: "Sync CRAYS-native workbench read model. Sync writes, retries, destructive reconciliation and control actions remain disabled.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
