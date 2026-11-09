import { getProcessSuiteReadModel } from "@/db/process-suite-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getProcessSuiteReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      sourceReadsEnabled: readModel.boundaries.sourceReadsEnabled,
      coreCommandDraftsEnabled: readModel.boundaries.coreCommandDraftsEnabled,
      targetApplyEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      note: readModel.access.allowed
        ? "A-Z process suites compose source-backed records, Core command drafts, stakeholder-room preflight and Member App reads only. They do not run releases, sends, uploads, payments, bank actions, target apply, source writes, sync apply, live AI or deployment."
        : "A-Z process suites require internal or scoped operating access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
