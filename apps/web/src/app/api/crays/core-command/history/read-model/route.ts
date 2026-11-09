import { getCoreCommandHistoryReadModel } from "@/db/core-command-history-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function limitFromParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCoreCommandHistoryReadModel({
    role,
    preparedOfferId: url.searchParams.get("preparedOfferId"),
    dealId: url.searchParams.get("dealId"),
    propertyCaseId: url.searchParams.get("propertyCaseId"),
    limit: limitFromParam(url.searchParams.get("limit")),
  });

  return Response.json(
    {
      status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
      readModel,
      coreCommandRecordsReturned: readModel.persistedCommandHistoryReturned,
      externalRecordsReturned: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      financeActionsEnabled: false,
      bankActionsEnabled: false,
      releaseActionsEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Persisted CRAYS Core command draft history only. Target apply, sync apply, uploads, external sends, finance actions, bank actions and releases remain blocked."
        : "Core command history is only available to internal workbench roles.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
