import { getWriteAdapterDecisionContract } from "@/lib/write-adapter-decision-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getWriteAdapterDecisionContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      writeAdaptersApproved: contract.decision.approvedWriteAdapters,
      liveBusinessRecordReturned: false,
      note: contract.access.allowed
        ? "This endpoint returns the write-adapter decision contract only. It does not approve, execute, dry-run or prepare source writes, sync writes, retries, reconciliation, provider calls, uploads, control actions or external sending."
        : "Write-adapter decision access requires internal platform, review or scoped module planning access.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
