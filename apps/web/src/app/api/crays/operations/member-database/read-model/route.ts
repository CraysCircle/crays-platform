import { NextResponse } from "next/server";
import { getB2cMemberDatabaseReadModel } from "@/db/b2c-member-database-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const role = context.role;
  const readModel = await getB2cMemberDatabaseReadModel(role);

  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: "forbidden",
        serverAuthority: context.authoritySource,
        tenantId: context.tenantId,
        role,
        reviewPersona: context.reviewPersona,
        readModel,
        sideEffects: {
          memberAppApiWritesEnabled: false,
          sourceWritesEnabled: false,
          syncApplyEnabled: false,
          targetApplyEnabled: false,
          paymentInitiationEnabled: false,
          financePostingEnabled: false,
          externalSendingEnabled: false,
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "ready",
    serverAuthority: context.authoritySource,
    tenantId: context.tenantId,
    role,
    reviewPersona: context.reviewPersona,
    readModel,
    sideEffects: {
      memberAppApiWritesEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      externalSendingEnabled: false,
    },
  });
}
