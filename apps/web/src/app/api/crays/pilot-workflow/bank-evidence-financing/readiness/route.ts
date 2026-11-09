import { getBankEvidenceFinancingPilotReadiness } from "@/db/pilot-bank-evidence-financing-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getBankEvidenceFinancingPilotReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: readModel.liveBusinessRecordsReturned,
      bankPartnerPackageRecordsReturned: false,
      financeRecordsWritten: false,
      externalPackageReleased: false,
      bankPackageCreationEnabled: false,
      bankHandoffEnabled: false,
      lenderReleaseEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      externalSendingEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
