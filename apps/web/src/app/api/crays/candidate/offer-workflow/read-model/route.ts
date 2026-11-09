import { getCandidateOfferWorkflowReadModel } from "@/db/candidate-offer-workflow-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateOfferWorkflowReadModel(role);

  if (!readModel.access.allowed) {
    return Response.json(
      {
        status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden",
        readModel,
        candidateReleaseEnabled: false,
        publicReleaseEnabled: false,
        candidateSendEnabled: false,
        uploadsEnabled: false,
        externalSendingEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
        note: readModel.access.reason,
      },
      { status: readModel.access.level === "release_blocked" ? 423 : 403 },
    );
  }

  return Response.json({
    status: "ready",
    readModel,
    candidateReleaseEnabled: false,
    publicReleaseEnabled: false,
    candidateSendEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    targetApplyEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    note: "Candidate Offer returns role-scoped Core/source-map records only. Candidate release, sends, uploads, source writes, sync apply and target apply remain closed.",
  });
}
