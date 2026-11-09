import { getCandidateFinancingPrepWorkbenchReadModel } from "@/db/candidate-financing-prep-workbench-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateFinancingPrepWorkbenchReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: Boolean(readModel.activeCase),
      candidatePrivateDataReturned: false,
      regulatedChecksStarted: false,
      bankSendEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Candidate financing prep is backed by Core intent, evidence, loans and command history records. Regulated checks, bank handoff and external sending remain closed."
        : "Candidate financing prep requires Candidate, Deal Manager, Finance or review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
