import { getCandidateDealPackageContract, getCandidateDealPackageRolePreview } from "@/lib/candidate-deal-package-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCandidateDealPackageContract();

  return Response.json({
    role,
    contract,
    rolePreview: getCandidateDealPackageRolePreview(role),
    liveDealsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    note: "This is the CRAYS Candidate deal package prerequisite contract. It returns package sections, gates and bank handoff rules only.",
  });
}
