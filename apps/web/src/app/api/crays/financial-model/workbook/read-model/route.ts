import { NextResponse } from "next/server";
import { getFinancialWorkbookReadModel } from "@/db/financial-workbook-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getFinancialWorkbookReadModel(role);

  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden",
        readModel,
        sideEffects: {
          sourceWritesEnabled: false,
          syncApplyEnabled: false,
          targetApplyEnabled: false,
          reportPublicationEnabled: false,
          externalSendingEnabled: false,
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
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      reportPublicationEnabled: false,
      externalSendingEnabled: false,
      financePostingEnabled: false,
    },
  });
}
