import { getPilotWorkflowCharterContract } from "@/lib/pilot-workflow-charter-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getPilotWorkflowCharterContract(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: false,
      commandRecordsWritten: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      note: readModel.access.allowed
        ? "Pilot Workflow charter only. It defines the end-to-end pilot scope, roles, record families, QA evidence and closed gates without starting external reads, writes, uploads, sends, regulated checks, bank actions, finance writes, releases, production deploys or VPS-changing work."
        : "Pilot Workflow charter access requires internal pilot ownership or a scoped pilot audience role.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
