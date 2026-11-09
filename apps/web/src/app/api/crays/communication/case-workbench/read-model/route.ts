import { getCaseCommunicationWorkbenchReadModel } from "@/db/case-communication-workbench-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function limitFromParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const readModel = await getCaseCommunicationWorkbenchReadModel({
      role,
      preparedOfferId: url.searchParams.get("preparedOfferId") ?? url.searchParams.get("case"),
      dealId: url.searchParams.get("dealId") ?? url.searchParams.get("deal"),
      propertyCaseId: url.searchParams.get("propertyCaseId") ?? url.searchParams.get("propertyCase"),
      limit: limitFromParam(url.searchParams.get("limit")),
    });

    return Response.json(
      {
        status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
        readModel,
        providerConnectionsEnabled: false,
        externalSendingEnabled: false,
        sourceWritesEnabled: false,
        syncWritesEnabled: false,
        uploadEnabled: false,
        releaseEnabled: false,
        paymentInitiationEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: readModel.access.allowed ? 200 : 403 },
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Communication read model failed.",
        providerConnectionsEnabled: false,
        externalSendingEnabled: false,
        sourceWritesEnabled: false,
        syncWritesEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 500 },
    );
  }
}
