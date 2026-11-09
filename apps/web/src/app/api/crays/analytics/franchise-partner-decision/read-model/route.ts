import { NextResponse } from "next/server";
import { getFranchisePartnerDecisionReadModel } from "@/db/franchise-partner-decision-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getFranchisePartnerDecisionReadModel(role);
  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden",
        readModel,
      },
      { status: readModel.access.level === "release_blocked" ? 423 : 403 },
    );
  }
  return NextResponse.json({ status: "ready", readModel });
}
