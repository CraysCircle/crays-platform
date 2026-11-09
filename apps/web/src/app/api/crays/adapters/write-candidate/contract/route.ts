import { getFinalWriteCandidateContract } from "@/lib/final-write-candidate-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getFinalWriteCandidateContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      writeAdaptersApproved: contract.finalDecision.approvedWriteAdapters,
      liveBusinessRecordReturned: false,
      note: "Final write-candidate contract only. It does not approve, execute or prepare source writes, sync writes, retries, reconciliation, uploads, provider calls, control actions or external sending.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
