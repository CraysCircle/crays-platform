import { getWorkbenchSavedViewsReadModel } from "@/db/workbench-saved-views-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import type { WorkbenchModuleKey } from "@/lib/workbench-saved-views";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const moduleKeys = new Set(["crm", "project", "erp", "files", "analytics", "loans", "operations"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const role = context.role;
  const moduleKeyParam = url.searchParams.get("moduleKey") ?? "";

  if (!moduleKeys.has(moduleKeyParam)) {
    return Response.json(
      {
        status: "forbidden",
        error: "Workbench module is not available.",
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        toolApplyEnabled: false,
        externalSendingEnabled: false,
        releaseEnabled: false,
      },
      { status: 403 },
    );
  }

  const readModel = await getWorkbenchSavedViewsReadModel({ role, moduleKey: moduleKeyParam as WorkbenchModuleKey });
  return Response.json(
    {
      status: readModel.access.allowed ? readModel.source.queryStatus : "forbidden",
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role,
      reviewPersona: context.reviewPersona,
      readModel,
      persistedInCore: readModel.source.persistedInCore,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      externalSendingEnabled: false,
      releaseEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
