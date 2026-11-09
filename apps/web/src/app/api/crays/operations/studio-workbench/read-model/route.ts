import { getStudioOperationsWorkbenchReadModel } from "@/db/studio-operations-workbench-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
    const role = context.role;
    const readModel = await getStudioOperationsWorkbenchReadModel(role);

    return Response.json(
      {
        status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
        serverAuthority: context.authoritySource,
        tenantId: context.tenantId,
        role,
        reviewPersona: context.reviewPersona,
        readModel,
        memberAppApiWritesEnabled: false,
        sourceWritesEnabled: false,
        syncWritesEnabled: false,
        toolApplyEnabled: false,
        paymentInitiationEnabled: false,
        financeWritesEnabled: false,
        externalSendingEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: readModel.access.allowed ? 200 : 403 },
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Studio operations read model failed.",
        sourceWritesEnabled: false,
        syncWritesEnabled: false,
        toolApplyEnabled: false,
        paymentInitiationEnabled: false,
        financeWritesEnabled: false,
        externalSendingEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 500 },
    );
  }
}
