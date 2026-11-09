import { getRealEstateDecisionReadModel } from "@/db/real-estate-decision-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getRealEstateDecisionReadModel(role);

  if (!readModel.access.allowed) {
    return Response.json(
      {
        status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden",
        readModel,
        landlordReleaseEnabled: false,
        ownerSendEnabled: false,
        leaseSigningEnabled: false,
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
    landlordReleaseEnabled: false,
    ownerSendEnabled: false,
    leaseSigningEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    targetApplyEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    note: "Real Estate Decision returns role-scoped Core/source-map records only. Partner release, sends, uploads, lease signing, source writes, sync apply and target apply remain closed.",
  });
}
