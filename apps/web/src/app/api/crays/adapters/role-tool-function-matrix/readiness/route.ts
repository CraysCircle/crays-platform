import { NextResponse } from "next/server";
import { getRoleToolFunctionMatrix } from "@/lib/role-tool-function-matrix";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getRoleToolFunctionMatrix(role);
  const status = readModel.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: readModel.status,
      readModel,
      liveSourceRecordsReturned: false,
      liveBusinessRecordReturned: false,
    },
    { status },
  );
}
