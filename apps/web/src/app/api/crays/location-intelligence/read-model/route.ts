import { NextResponse } from "next/server";
import { getLocationIntelligenceReadModel } from "@/db/location-intelligence-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getLocationIntelligenceReadModel(role);

  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden",
        readModel,
        sideEffects: {
          liveExternalReadEnabled: false,
          sourceWritesEnabled: false,
          syncApplyEnabled: false,
          targetApplyEnabled: false,
          reportPublicationEnabled: false,
          externalSendingEnabled: false,
          candidateReleaseEnabled: false,
          ownerReleaseEnabled: false,
          bankSendEnabled: false,
          paymentInitiationEnabled: false,
          financePostingEnabled: false,
        },
      },
      { status: readModel.access.level === "release_blocked" ? 423 : 403 },
    );
  }

  return NextResponse.json({
    status: "ready",
    readModel,
    sideEffects: {
      liveExternalReadEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      reportPublicationEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      ownerReleaseEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
    },
  });
}
