import { getCandidateEvidenceIntentPilotReadiness } from "@/db/pilot-candidate-evidence-intent-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateEvidenceIntentPilotReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: readModel.liveBusinessRecordsReturned,
      candidateVisibleRecordsReturned: false,
      commandRecordsWritten: false,
      intentRecordsWritten: false,
      candidateReleaseEnabled: false,
      regulatedChecksStarted: false,
      externalSendingEnabled: false,
      bankWorkflowStartEnabled: false,
      bankPackageCreationEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
