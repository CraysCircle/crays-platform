import { getCandidateRegulatedChecksContract } from "@/lib/candidate-regulated-checks-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCandidateRegulatedChecksContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "decision_required" : "forbidden",
      contract,
      decisionRequired: true,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      note: contract.access.allowed
        ? "This endpoint returns the CRAYS regulated-check decision contract only. It does not start KYC/AML, equity checks, source-of-funds collection, provider calls or bank handoff."
        : "Regulated-check scope requires Candidate, Deal Manager, Finance or review scope.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
