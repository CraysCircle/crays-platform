import { getCaseWorkspaceReadModel } from "@/db/case-workspace-read-model-repository";
import { buildWorkflowActionRegistryReadModel } from "@/lib/workflow-action-registry";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const workspace = await getCaseWorkspaceReadModel({
    role,
    preparedOfferId: url.searchParams.get("preparedOfferId") ?? url.searchParams.get("case"),
    dealId: url.searchParams.get("dealId") ?? url.searchParams.get("deal"),
    propertyCaseId: url.searchParams.get("propertyCaseId") ?? url.searchParams.get("propertyCase"),
  });
  const readModel = buildWorkflowActionRegistryReadModel(workspace, role);

  return Response.json(
    {
      status: readModel.access.allowed ? (readModel.queryStatus === "schema_ready" ? "ready" : readModel.queryStatus) : "forbidden",
      readModel,
      targetApplyEnabled: false,
      releaseEnabled: false,
      uploadEnabled: false,
      externalSendingEnabled: false,
      financeWritesEnabled: false,
      bankSendsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Workflow action registry read model only. Actions can stage CRAYS Core command drafts; apply, release, upload, send, finance, bank, payment, source write and sync apply gates remain closed."
        : "Workflow action registry is only available to internal workbench roles.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
