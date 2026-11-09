import { NextResponse } from "next/server";
import { getToolNativeUiReadiness } from "@/lib/tool-native-ui-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getToolNativeUiReadiness(role);
  const status = readModel.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: readModel.status,
      readModel,
      liveSourceRecordsReturned: false,
    },
    { status },
  );
}
