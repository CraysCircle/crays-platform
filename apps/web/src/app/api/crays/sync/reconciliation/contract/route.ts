import { getReconciliationDecisionContract } from "@/lib/reconciliation-decision-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getReconciliationDecisionContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      reconciliationExecutionApproved: contract.decision.reconciliationExecutionApproved,
      liveBusinessRecordReturned: false,
      note: "Reconciliation decision contract only. It does not run reconciliation, retries, mapping overrides, sync writes, source writes or control actions.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
