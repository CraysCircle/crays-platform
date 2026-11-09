import { NextResponse } from "next/server";
import { getErpFinanceLedgerReadModel } from "@/db/erp-finance-ledger-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getErpFinanceLedgerReadModel(role);

  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: "forbidden",
        readModel,
        sideEffects: {
          paymentInitiationEnabled: false,
          financePostingEnabled: false,
          accountingExportsEnabled: false,
          sourceWritesEnabled: false,
          syncApplyEnabled: false,
          targetApplyEnabled: false,
          externalSendingEnabled: false,
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "ready",
    readModel,
    sideEffects: {
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
    },
  });
}
