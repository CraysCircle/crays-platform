import { getControlledDevWriteModelContract } from "@/lib/controlled-dev-write-model-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getControlledDevWriteModelContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      readModel: contract,
      liveBusinessRecordReturned: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      note: contract.access.allowed
        ? "Controlled Dev command model readiness only. It does not persist commands, apply tool writes, run sync writes, upload files, send externally, execute finance actions, start bank actions or release records."
        : "Controlled Dev command model access requires internal operations, review or scoped module ownership.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
